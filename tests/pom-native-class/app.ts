import { pageContext } from '@playwright-utils';
import { HomePage } from './home-page';
import { LoginPage } from './login-page';

export class sauceApp {
  _homePage: HomePage | undefined = undefined;
  _loginPage: LoginPage | undefined = undefined;
  constructor() {}

  async navigate() {
    await pageContext.get().goto('https://www.saucedemo.com/');
  }

  homePage(): HomePage {
    if (!this._homePage) {
      this._homePage = new HomePage();
    }
    return this._homePage!;
  }

  loginPage(): LoginPage {
    if (!this._loginPage) {
      this._loginPage = new LoginPage();
    }
    return this._loginPage!;
  }
}
