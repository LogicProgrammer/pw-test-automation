import { component } from '@playwright-utils';
import { expect, test } from '@test-setup';
import { SauceDemoPage } from './sauce-demo.page';
import { DemoPage2 } from './demo-page2.page';

test(
  'sample test',
  {
    tag: ['@smoke', '@regression', '@[1234567]'],
  },
  async ({ page, message, data }) => {
    console.log(message);
    console.log(data);
    await page.goto('https://www.saucedemo.com/');
    await page.locator('#user-name').fill('standard_user');
    await page.locator('#password').fill('secret_sauce');
    await page.locator('#login-button').click();
    await page.locator('.inventory_item_name').first().click();
    await expect(page.locator('.inventory_details_name')).toHaveText('Sauce Labs Backpack');
  },
);

test('sample test 1', async ({ page }) => {
  const demoPage = new SauceDemoPage();
  await demoPage.navigate();
  await demoPage.login('standard_user', 'secret_sauce');
  await demoPage.firstItem.click();
  await demoPage.validateItemName('Sauce Labs Backpack');
});

test('sample test 3', async ({ page }) => {
  const demoPage = new DemoPage2();
  await demoPage.navigate();
  await demoPage.login('standard_user', 'secret_sauce');
  await demoPage.firstItem.click();
  await demoPage.validateItemName('Sauce Labs Backpack');
});

test('sample test 2', async ({ page }) => {
  const loginButton = component('#login-button', 'Login Button');
  const username = component('#user-name', 'Username field');
  const password = component('#password', 'Password field');
  const firstItem = component('.inventory_item_name', 'First inventory item').first();
  const itemName = component('.inventory_details_name', 'Inventory details name');
  await page.goto('https://www.saucedemo.com/');
  await username.fill('standard_user');
  await password.fill('secret_sauce');
  await loginButton.click();
  await firstItem.click();
  await expect(itemName).toHaveText('Sauce Labs Backpack blah blah');
});
