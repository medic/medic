const utils = require('../../../utils');
const loginPage = require('../../page-objects/login.page');
const placeFactory = require('../../../factories/cht/contacts/place');
const commonPage = require('../../page-objects/common.page');
const contactElements = require('../../page-objects/contacts.page');
const district_hospital = placeFactory.generateHierarchy(['district_hospital'])[0];

describe('MessageFormat', () => {
  const createContact = async () => {
    await utils.saveDoc(district_hospital);
  };

  before(async () => {
    await createContact();
    await loginPage.cookieLogin();
  });

  it('should display plurals correctly', async () => {
    await commonPage.goToPeople();
    await contactElements.selectLHSRowByText(district_hospital.name);

    const reportsFilter = await contactElements.getReportFiltersText();
    expect(reportsFilter.sort()).toEqual(['3 months', '6 months', 'View all'].sort());

    const tasksFilter = await contactElements.getReportTaskFiltersText();
    expect(tasksFilter.sort()).toEqual(['1 week', '2 weeks', 'View all'].sort());

  });

  it('should work with botched translations', async () => {
    await commonPage.goToReports();
    await utils.addTranslations('en', {
      'Messages': 'Messages {thing}',
      'Tasks': 'Tasks {thing',
      'Reports': 'Reports {{thing}}'
    });

    // wait for language to load
    await browser.waitUntil(async () => {
      return await (await commonPage.getReportsButtonLabel()).getText() === 'Reports {{thing}}';
    }, {
      timeout: 2000,
      timeoutMsg: 'Timed out waiting for translations to update'
    });

    expect(await (await commonPage.getReportsButtonLabel()).getText()).toEqual('Reports {{thing}}');
    expect(await (await commonPage.getTasksButtonLabel()).getText()).toEqual('Tasks {thing');
    expect(await (await commonPage.getMessagesButtonLabel()).getText()).toEqual('Messages {thing}');
  });
});
