import { pageContext } from '@playwright-utils';
import { expect, test } from '@test-setup';
import { basicComponent } from 'src/playwright/component/basic-component';

export class DemoPage2 {
  username = basicComponent('#user-name', 'Username field');
  password = basicComponent('#password', 'Password field');
  loginButton = basicComponent('#login-button', 'Login Button');
  firstItem = basicComponent(() => pageContext.get().locator('.inventory_item_name').first(), 'First inventory item');
  itemName = basicComponent(() => pageContext.get().locator('.inventory_details_name'), 'Inventory details name');

  constructor() {}

  async navigate() {
    await pageContext.get().goto('https://www.saucedemo.com/');
  }

  async login(username: string, password: string) {
    await test.step('Logging into the application', async () => {
      await this.username.fill(username);
      await this.password.fill(password);
      await this.loginButton.click();
    });
  }

  async selectFirstItem() {
    await this.firstItem.click();
  }

  async validateItemName(expectedName: string) {
    await expect(this.itemName.getLocator()).toHaveText(expectedName);
  }
}
