import { component, getLocator } from '@playwright-utils';

export class LoginPage {
  readonly username = component(() => getLocator('#user-name'), 'Username field');
  readonly password = component(() => getLocator('#password'), 'Password field');
  readonly submitButton = component(() => getLocator('#login-button'), 'Submit button');

  constructor() {}

  async doLogin(usernameValue: string, passwordValue: string) {
    await this.username.fill(usernameValue);
    await this.password.fill(passwordValue);
    await this.submitButton.click();
  }
}
