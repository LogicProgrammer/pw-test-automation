import { pageContext } from '@playwright-utils';
import { type Locator } from '@playwright/test';

export class BasicComponent {
  locator: string | (() => Locator);
  alias: string | undefined;

  constructor(locator: string | (() => Locator), alias?: string) {
    this.locator = locator;
    this.alias = alias;
  }

  getLocator(): Locator {
    this.alias = this.alias ? ` (${this.alias})` : 'unnamed component';
    if (typeof this.locator === 'string') {
      return pageContext.get().locator(this.locator).describe(this.alias);
    } else {
      return this.locator().describe(this.alias);
    }
  }

  async click() {
    await this.getLocator().click();
  }

  async fill(value: string) {
    await this.getLocator().fill(value);
  }
}

export const basicComponent = (locator: string | (() => Locator), alias?: string) => new BasicComponent(locator, alias);
