const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const auth = require('../../auth')();


describe('Login and logout tests', () => {
  const defaultLocales = [
    { code: 'bm', name: 'Bamanankan (Bambara)' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español (Spanish)' },
    { code: 'fr', name: 'Français (French)' },
    { code: 'hi', name: 'हिन्दी (Hindi)' },
    { code: 'id', name: 'Bahasa Indonesia (Indonesian)' },
    { code: 'ne', name: 'नेपाली (Nepali)' },
    { code: 'sw', name: 'Kiswahili (Swahili)' }
  ];

  const frTranslations = {
    user: `Nom d'utilisateur`,
    pass: 'Mot de passe',
    error: `Nom d'utilisateur ou mot de passe incorrect. Veuillez réessayer`
  };

  const esTranslations = {
    user: 'Nombre de usuario',
    pass: 'Contraseña',
    error: 'Nombre de usuario o contraseña incorrecto. Favor intentar de nuevo.'
  };

  afterEach(async () => {
    await browser.deleteCookies();
    await browser.refresh();
  });

  it('should show locale selector on login page', async () => {
    const locales = await loginPage.getAllLocales();
    expect(locales).toEqual(defaultLocales);
  });

  it('should change locale to French', async () => {
    //French translations
    expect(await loginPage.changeLanguage('fr',frTranslations.user)).toEqual(frTranslations);
  });

  it('should change locale to Spanish', async () => {
    //Spanish translations
    expect(await loginPage.changeLanguage('es',esTranslations.user)).toEqual(esTranslations);
  });

  it('should show a warning before log out', async () => {
    await loginPage.cookieLogin(auth.username, auth.password);
    const warning = await commonPage.getLogoutMessage();
    expect(warning).toBe('Are you sure you want to log out?');
    await (await commonPage.yesButton()).click();
  });

  it('should log in using username and password fields', async () => {
    await loginPage.login(auth.username, auth.password);
    expect(await commonPage.analyticsTab()).toBeDisplayed();
    expect(await commonPage.messagesTab()).toBeDisplayed();
  });
});
