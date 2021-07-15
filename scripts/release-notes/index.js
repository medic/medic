/*
 * Generates a changelog given a GH report and milestone.
 *
 * USAGE:
 *  1) Make sure all the issues in the release are assigned to the milestone
 *  2) Each issue should have one and only one Type label - the script will tell you which ones don't
 *  3) Make sure you have generated a GH token and created a token.json file, eg: { "githubApiToken": "..." }
 *     This token needs at least `read:org` permissions
 *  4) Execute the command: node index.js <project_name> > <output_file>
 *      eg: node index.js 3.0.0 > tmp.md
 *  5) Insert the contents of the output file into the appropriate location in Changes.md
 */

const { Octokit } = require('@octokit/rest');
const octokit = new Octokit({
  auth: require('../token.json').githubApiToken,
  userAgent: 'cht-release-note-generator',
});

const OWNER = 'medic';
const ISSUE_STATE = 'all';

const REPO_NAME = process.argv[2];
if (!REPO_NAME) {
  throw new Error('You must specify a repo name (eg: "cht-core") as the first argument');
}
const MILESTONE_NAME = process.argv[3];
if (!MILESTONE_NAME) {
  throw new Error('You must specify a milestone name (eg: "2.15.0") as the second argument');
}

const WARNINGS = [
  { labels: ['Breaking change'], title: 'Breaking changes' },
  { labels: ['UI/UX'], title: 'UI/UX changes' },
];

const TYPES = [
  { labels: ['Type: Feature'], title: 'Features' },
  { labels: ['enhancement', 'Type: Improvement'], title: 'Improvements' },
  { labels: ['Type: Security'], title: 'Security fixes' },
  { labels: ['Type: Performance'], title: 'Performance improvements' },
  { labels: ['bug', 'Type: Bug'], title: 'Bug fixes' },
  { labels: ['Type: Technical issue'], title: 'Technical improvements' },
];

const PREFIXES_TO_IGNORE = [
  'Type: Internal process',
  'Won\'t fix:',
  'Type: Investigation',
];

const getMilestone = async () => {
  const response = await octokit.rest.issues.listMilestones({ owner: OWNER, repo: REPO_NAME });
  return response.data.find(milestone => milestone.title === MILESTONE_NAME);
};

const getMilestoneNumber = async () => {
  const milestone = await getMilestone();
  if (!milestone) {
    throw new Error(`Could not find milestone with the repo ${REPO_NAME} and name ${MILESTONE_NAME}`);
  }
  return milestone.number;
};

const validateIssue = issue => {
  const matchingTypes = TYPES.filter(type => issue.labels.find(label => type.labels.includes(label.name)));
  if (!matchingTypes.length) {
    return `Issue doesn't have any Type label: ${issue.html_url}`;
  }
  if (matchingTypes.length > 1) {
    return `Issue has too many Type labels: ${issue.html_url}`;
  }
};

const validateIssues = issues => {
  const errors = issues
    .map(validateIssue)
    .filter(error => !!error);
  if (errors.length) {
    console.error(JSON.stringify(errors, null, 2));
    throw new Error('Some issues are in an invalid state');
  }
  return issues;
};

const getIssues = async (milestoneId) => {
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner: OWNER,
    repo: REPO_NAME,
    milestone: milestoneId,
    state: ISSUE_STATE,
    per_page: 100
  });
  return validateIssues(issues);
};

const filterIssues = issues => {
  return issues.filter(issue => {
    return issue.labels.every(label => {
      return !PREFIXES_TO_IGNORE.some(prefix => label.name.startsWith(prefix));
    });
  });
};

const group = (group, issues) => {
  const filtered = issues
    .filter(issue => issue.labels.find(label => group.labels.includes(label.name)))
    .sort((lhs, rhs) => lhs.html_url.localeCompare(rhs.html_url));
  return { title: group.title, issues: filtered };
};

const groupIssues = issues => {
  return {
    warnings: WARNINGS.map(warning => group(warning, issues)),
    types: TYPES.map(type => group(type, issues))
  };
};

const format = issue => `- [#${issue.number}](${issue.html_url}): ${issue.title}\n`;

const formatAll = issues => issues.length ? issues.map(format).join('') : 'None.\n';

const outputGroups = (groups) => {
  return groups.map(group => `### ${group.title}\n\n${formatAll(group.issues)}\n`).join('');
};

const output = ({ warnings, types }) => {
  console.log(`
# ${MILESTONE_NAME} Release Notes

- [Known issues](#known-issues)
- [Upgrade notes](#upgrade-notes)
- [Breaking changes](#breaking-changes)
- [UI/UX changes](#uiux-changes)
- [Highlights](#highlights)
- [And more...](#and-more)

## Known issues

<<< TODO >>>

## Upgrade notes

${outputGroups(warnings)}
## Highlights

<<< TODO >>>

## And more...

${outputGroups(types)}`);
};

Promise.resolve()
  .then(getMilestoneNumber)
  .then(getIssues)
  .then(filterIssues)
  .then(groupIssues)
  .then(output)
  .catch(console.error);
