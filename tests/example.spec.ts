import { component, pageContext } from '@playwright-utils';
import { expect, test } from '@test-setup';
import { SauceDemoPage } from './sauce-demo.page';
import { DemoPage2 } from './demo-page2.page';
import { sauceApp } from './pom-native-class/app';
import { app } from './pom-native-without-class/app';

test('login without using page object model', async () => {
  await pageContext.get().goto('https://www.saucedemo.com/');
  await app.loginPage.doLogin('standard_user', 'secret_sauce');
  await app.homePage.clickOnFirstProduct();
  await app.homePage.validateProductName('Sauce Labs Backpack');
});

test('login using page object model class structure', async () => {
  const app = new sauceApp();
  await app.navigate();
  await app.loginPage().doLogin('standard_user', 'secret_sauce');
  await app.homePage().clickOnFirstItem();
  await app.homePage().validateItemName('Sauce Labs Backpack');
});

test(
  'sample test',
  {
    tag: ['@smoke', '@regression', '@[1234567]'],
  },
  async ({ page }) => {
    await page.goto('https://www.saucedemo.com/');
    await page.locator('#user-name').fill('standard_user');
    await page.locator('#password').fill('secret_sauce');
    await page.locator('#login-button').click();
    await page.locator('.inventory_item_name').first().click();
    await expect(page.locator('.inventory_details_name')).toHaveText('Sauce Labs Backpack');
  },
);

test('sample test 1', async () => {
  const demoPage = new SauceDemoPage();
  await demoPage.navigate();
  await demoPage.login('standard_user', 'secret_sauce');
  await demoPage.firstItem.click();
  await demoPage.validateItemName('Sauce Labs Backpack');
});

test('sample test 3', async () => {
  const demoPage = new DemoPage2();
  await demoPage.navigate();
  await demoPage.login('standard_user', 'secret_sauce');
  await demoPage.firstItem.click();
  await demoPage.validateItemName('Sauce Labs Backpack');
});

test('sample test 2', async () => {
  const loginButton = component('#login-button', 'Login Button');
  const username = component('#user-name', 'Username field');
  const password = component('#password', 'Password field');
  const firstItem = component('.inventory_item_name', 'First inventory item').first();
  const itemName = component('.inventory_details_name', 'Inventory details name');
  await pageContext.get().goto('https://www.saucedemo.com/');
  await username.fill('standard_user');
  await password.fill('secret_sauce');
  await loginButton.click();
  await firstItem.click();
  await expect(itemName).toHaveText('Sauce Labs Backpack blah blah');
});
