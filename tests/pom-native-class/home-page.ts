import { component, getLocator } from '@playwright-utils';
import { expect } from '@test-setup';

export class HomePage {
  readonly firstItem = component(() => getLocator('.inventory_item_name').first());
  readonly itemName = component(() => getLocator('.inventory_details_name').first());

  constructor() {}

  async clickOnFirstItem() {
    await this.firstItem.click();
  }

  async validateItemName(expectedName: string) {
    await expect(this.itemName).toHaveText(expectedName);
  }
}
