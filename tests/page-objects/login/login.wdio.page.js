const utils = require('../../utils');
const auth = require('../../auth')();
const commonPage = require('../common/common.wdio.page');
const loginButton = () => $('#login');
const userField = () => $('#user');
const passwordField = () => $('#password');
const labelForUser = () => $('label[for="user"]');
const labelForPassword = () => $('label[for="password"]');
const errorMessageField = () => $('p.error.incorrect');


const login = async (username, password) => {
  await (await userField()).setValue(username);
  await (await passwordField()).setValue(password);
  await (await loginButton()).click();
};

const cookieLogin = async (username = auth.username, password = auth.password) => {
  const opts = {
    path: '/medic/login',
    body: { user: username, password: password },
    method: 'POST',
    simple: false,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const resp = await utils.request(opts);
  const cookieArray = utils.parseCookieResponse(resp.headers['set-cookie']);

  await browser.setCookies(cookieArray);
  await utils.setupUserDoc(username);
  await commonPage.goToBase();
};

const open = () => {
  return browser.url();
};

const getLanguage = async (selector) => {
  const lang = await Promise.all((await $$(selector)).map(async localeElement => {
    return {
      code: await localeElement.getAttribute('name'),
      name: await localeElement.getText(),
    };
  }));
  return lang;
};

const changeLocale = async locale => {
  if (!locale) {
    return;
  }
  return (await $(`.locale[name="${locale}"]`)).click();
};

const changeLanguage = async (languageCode, userTranslation) => {
  await changeLocale(languageCode);
  browser.waitUntil(async () => { return (await labelForUser()).getText() === userTranslation; });
  return {
    user: await (await labelForUser()).getText(),
    pass: await (await labelForPassword()).getText(),
    error: await (await errorMessageField()).getText()
  };
};


module.exports = {
  open,
  login,
  cookieLogin,
  getAllLocales: async () => await getLanguage('.locale'),
  changeLanguage,
};
