const hamburgerMenu = () => $('#header-dropdown-link');
const logoutButton =  () => $('.fa-power-off');
const modalBody = () => $('div.modal-body');
const yesButton = () => $('a.btn.submit.btn-danger');
const messagesTab = () => $('#messages-tab');
const analyticsTab =  () => $('#analytics-tab');
const getReportsButtonLabel = () => $('#reports-tab .button-label');
const getMessagesButtonLabel = () => $('#messages-tab .button-label');
const getTasksButtonLabel = () => $('#tasks-tab .button-label');
const contactsPage = require('../contacts/contacts.wdio.page');


const navigateToLogoutModal = async () => {
  await (await hamburgerMenu()).click();
  await (await logoutButton()).click();
  await (await modalBody()).waitForDisplayed();
};

const logout = async () => {
  await navigateToLogoutModal();
  await (await yesButton()).click();
};

const getLogoutMessage = async () => {
  await navigateToLogoutModal();
  const body = await modalBody();
  await body.waitForDisplayed();
  return body.getText();
};

const goToBase = async () => {
  await browser.url('/');
  await (await analyticsTab()).waitForDisplayed();
  await (await messagesTab()).waitForDisplayed();
};

const goToReports = async () => {
  await browser.url('/#/reports');
};

const goToPeople = async () => {
  await browser.url('/#/contacts');
  await (await contactsPage.contactList()).waitForDisplayed();
};

module.exports = {
  logout,
  logoutButton,
  getLogoutMessage,
  yesButton,
  messagesTab,
  analyticsTab,
  goToReports,
  goToPeople,
  getReportsButtonLabel,
  getMessagesButtonLabel,
  getTasksButtonLabel,
  goToBase
};
