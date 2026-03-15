import { component } from '@playwright-utils';
import { expect, test } from '@test-setup';

test('sample test', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
  await page.locator('#user-name').fill('standard_user');
  await page.locator('#password').fill('secret_sauce');
  await page.locator('#login-button').click();
  await page.locator('.inventory_item_name').first().click();
  await expect(page.locator('.inventory_details_name')).toHaveText('Sauce Labs Backpack');
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
