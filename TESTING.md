# Testing

An overview of testing within CHT-CORE. Check out the [Gruntfile](Gruntfile.js) for all the tests you can run.

## Unit tests

They live in the `tests` directories of each app. Run them with grunt: `grunt unit-continuous`.

## API integration tests

`grunt api-e2e`

## Integration tests

[Travis](https://travis-ci.org/github/medic/cht-core) runs `grunt ci` every time some new code is pushed to github.

# End to End Testing 
## Stack overview

### Requirements
Follow the guide [DEVELOPMENT.md](DEVELOPMENT.MD)
JDK installed for Selenium.
Docker to run couchdb.

### Local Run

`grunt e2e` installs and runs chromedriver, starts couchdb in docker, pushes the compiled app to couchdb, starts api, starts sentinel, and then runs protractor tests against your local environment. 

### WebdriverIO Local Run

Run `npm ci`
Run `grunt`
Run `npm run wdio-local`
Viewing the report 
Run `npx allure open`

### Github Actions Protractor Run 

The build process compiles our application. Then installs horticulturalist to run the app. This puts us closer to production. Executes `grunt ci-e2e`. Which then installs and runs chromedriver. Runs the protractor tests against the installed app version. Currently there are 3 jobs that execute in the supported node environments.  

### WebdriverIO Github Actions Run

The main difference now is that `grunt ci-webdriver` is executed now instead of `ci-e2e`. This executes the Webdriver IO tests.

## Protractor Tips

### File Structure
Test files should represent a feature within the application. Using `describe` to identify the feature and `it` to detail the individual functions of the feature.

EX: `describe('Users can login )`  `it(with valid credentials)`

### Page Object Model
We are leveraging the [page object model](https://www.thoughtworks.com/insights/blog/using-page-objects-overcome-protractors-shortcomings) for structure. When identifying elements they should be added to a page object and not within a test file. Add functions that perform actions to the page within the page object. Keep expects outside of page objects. The tests should be self-documenting. 

### Adding identifiers
In some cases, adding a unique identifier to an element may be necessary. This could be a piece of data related to the element, or a unique name (which can be done by adding a `test-` attribute to the app code).

Ex:  `attr.test-id="{{ msg.key }}" ` Will add a `test-id` attribute with the data from the app. 

Then it can be consumed in the test by getting an element by css. EX: ``element(by.css(`#message-list li[test-id="${identifier}"]`)),``

Adding a test identifier a good option for cases where a CSS selector would otherwise be fragile such as selecting based on an assumed element structure or selecting on CSS classes intended for visual design that may change.

## Debugging
Documented here are two ways to run individual tests and have your IDE break on the specific test.

### Visual Studio Code

#### Setting up Vscode for e2e debugging. 

1. This assumes you have gone through the [development](https://github.com/medic/cht-core/blob/master/DEVELOPMENT.md) setup guide. 
1. Copy the vscode launch.json and tasks.json files from this [location](https://github.com/medic/medic-release-testing/tree/master/ide_config/vscode).
1. Paste those files into a directory called .vscode within your cht-core repo. 
1. Click the debug icon on the left tool bar.
1. Select launch e2e.
1. This will now run as if you ran the command `grunt e2e-deploy` and start the `scripts/e2e/e2e-servers` script. Then launch protractor to debug the test(s). 

#### Debugging a single test by using the "grep" feature.

1. Open launch.json.
1. Update the grep argument with the name of your test to the args array.
      Note: if you have defined specs or suites that do not include the spec.js. It will not find the test to run.  
      EX: `["${workspaceRoot}/tests/conf.js","--grep=should show the correct privacy policy on login"]`
1. Click the debug icon on the left tool bar.
1. Select launch e2e.


### IntelliJ Based

1. Click the run menu across the top.
1. Click Edit Configurations.
1. Click the plus to add a configuration.
1. Select Protractor.
1. Set the configuration file to the path of `<cht-core-repo>/tests/conf.js`.
1. Set Node Interpreter is set to your node install. 
1. Set Protractor package is set to the `<cht-core-repo>/node_modules/protractor`.
1. Optionally set the Protractor options to `--capabilities.chromeOptions.args=start-maximized --jasmine.DEFAULT_TIMEOUT_INTERVAL=120000`.
1. Select the radio button for Test.
1. Enter the path to the Test file Ex: `<cht-core-repo>/tests/e2e/login/login.specs.js`.
1. Enter the test name. This is a bit of a chore. IntelliJ will automatically add the regex flags for begins(`^`) of line and end of line(`$`). Protractor presents the name for matching as the Describe description followed by the It description. To run the login test for should have a title you would need to put this as your matcher. `Login tests : should have a title`. An alternative would be to select Test File and run the entire file. You can add an `x` in front of `it` to disable the ones you do not need. EX: `xit('should login`)
1. Click ok.
1. Click the run configuration dropdown and select the protractor config. 
1. In a terminal run `grunt e2e-deploy`   NOTE: This has to happen each time you run. 
1. Click debug button in IntelliJ.


## Migration To Webdriver IO

Treat the migration as if you were writing a brand new e2e suite. Not everything we have in the protractor suite needs a 1 to 1 migration. The implicit waits seem to work better in wdio

Each spec file runs independently. There is no need to manage browser state between spec files. 



### Glossary 

wdio = WebdriverIo
