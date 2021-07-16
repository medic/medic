const searchBox = () => $('#freetext');
const searchButton = () => $('#search');
const contentRow = () => $('.content-row');
const rowByText = async (text) => { return (await contentRow()).$(`span=${text}`); };
const reportFilterSelector = '.card.reports .table-filter a';
const reportFilter = () => $(reportFilterSelector);
const reportFilters = () => $$(reportFilterSelector);
const taskFilterSelector = '.card.tasks .table-filter a';
const taskFilter = () => $(taskFilterSelector);
const taskFilters = () => $$(taskFilterSelector);
const contactList = () => $('#contacts-list');

const search = async (query) => {
  await (await searchBox()).clearValue();
  await (await searchBox()).setValue(query);
  await (await searchButton()).click();
};

const selectLHSRowByText = async (text) => {
  await search(text);
  await (await rowByText(text)).click();
};

const getReportFiltersText = async () => {
  await (await reportFilter()).waitForDisplayed();
  return Promise.all((await reportFilters()).map(filter => filter.getText()));
};

const getReportTaskFiltersText = async () => {
  await (await taskFilter()).waitForDisplayed();
  const blah = await Promise.all((await taskFilters()).map(filter => filter.getText()));
  return blah;
};


module.exports = {
  selectLHSRowByText,
  reportFilters,
  getReportFiltersText,
  getReportTaskFiltersText,
  contactList
};
