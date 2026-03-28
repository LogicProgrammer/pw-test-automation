import { pageContext } from '@playwright-utils';

export const username = () => pageContext.get().locator('#user-name');
export const password = () => pageContext.get().locator('#password');
export const submitButton = () => pageContext.get().locator('#login-button');

export async function doLogin(usernameValue: string, passwordValue: string) {
  await username().fill(usernameValue);
  await password().fill(passwordValue);
  await submitButton().click();
}

export async function thisIsLoginPageFunction() {
  console.log('This is a function in login page');
}
