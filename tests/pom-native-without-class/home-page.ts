import { component, getLocator } from '@playwright-utils';
import { expect } from '@test-setup';

export const firstProduct = component(() => getLocator('.inventory_item_name').first());
export const productName = component(() => getLocator('.inventory_details_name').first());

export async function clickOnFirstProduct() {
  await firstProduct.click();
}

export async function validateProductName(expectedName: string) {
  await expect(productName).toHaveText(expectedName);
}

export async function thisIsHomePageFunction() {
  console.log('This is a function in home page');
}
