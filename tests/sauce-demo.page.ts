import { component, pageContext } from '@playwright-utils';
import { expect } from '@test-setup';

export class SauceDemoPage {
  username = component('#user-name', 'Username field');
  password = component('#password', 'Password field');
  loginButton = component('#login-button', 'Login Button');
  firstItem = component('.inventory_item_name', 'First inventory item').first();
  itemName = component('.inventory_details_name', 'Inventory details name');

  constructor() {}

  async navigate() {
    await pageContext.get().goto('https://www.saucedemo.com/');
  }

  async login(username: string, password: string) {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.loginButton.click();
  }

  async selectFirstItem() {
    await this.firstItem.click();
  }

  async validateItemName(expectedName: string) {
    await expect(this.itemName).toHaveText(expectedName);
  }
}
