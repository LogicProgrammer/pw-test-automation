import { expect, test } from '@playwright/test';

// FIXME: need to revise this
test('sample test', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
  await page.locator('#user-name').fill('standard_user');
  await page.locator('#password').fill('secret_sauce');
  await page.locator('#login-button').click();
  await page.locator('.inventory_item_name').first().click();
});

test('sample test 2', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
  await page.locator('#user-name').fill('standard_user');
  await page.locator('#password').fill('secret_sauce');
  await page.locator('#login-button').click();
  await page.locator('.inventory_item_name').first().click();
  await expect(page.locator('.inventory_details_name')).toHaveText('Sauce Labs Backpack blah blah');
});
