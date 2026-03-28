import { Component, pageContext } from '@playwright-utils';
import {
  type Page,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  TestInfo,
  test as base,
  expect as pwExpect,
} from '@playwright/test';

// ─── Fixture types ────────────────────────────────────────────────────────────

export type BaseFixtures = {
  /**
   * The Playwright Page instance for the current test.
   * Automatically stored in PageContext at the start of every test
   * and cleared at teardown.
   */
  page: Page;
  message: string;
  data: Record<string, string>;
};

// ─── Base test ────────────────────────────────────────────────────────────────

/**
 * Base test fixture that wires the Playwright Page into PageContext.
 *
 * Every test file in the project should import `test` and `expect`
 * from this file instead of from `@playwright/test` directly.
 *
 * ```ts
 * import { test, expect } from '../test-setup/base-test';
 * ```
 */

type HookFunctionType = [
  (
    args: PlaywrightTestArgs & PlaywrightTestOptions,
    use: (r: void) => Promise<void>,
    testInfo: TestInfo,
  ) => Promise<void>,
  { auto: boolean },
];

const createTestHook = (): HookFunctionType => [
  async ({ page }, use) => {
    pageContext.set(page);
    await use();
    pageContext.clear();
  },
  { auto: true },
];

export const baseTest = base.extend<{ testHook: void }>({
  testHook: createTestHook(),
});

export const test = baseTest;

// ─── Custom expect ────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for Playwright's `expect()` that transparently
 * accepts a Component in addition to all native Playwright types.
 *
 * ## Why this is needed
 * Playwright's native `expect()` performs an `instanceof` check against
 * its internal Locator class and accesses private fields (`#context`, `#page`)
 * bound to the real Locator instance. No Proxy trick can satisfy this —
 * passing a Component to native `expect()` throws at runtime.
 *
 * This wrapper intercepts the call, unwraps the Component's underlying
 * Locator, and delegates to Playwright's `expect()`. From the caller's
 * perspective it is identical to native — no `.locator()` needed.
 *
 * ## Usage
 * Import from `base-test.ts` — not from `@playwright/test`:
 * ```ts
 * import { test, expect } from '../test-setup/base-test';
 * ```
 *
 * All of the following work naturally:
 * ```ts
 * await expect(policyType).toBeVisible();
 * await expect(form.child('Effective date')).toHaveValue('01/01/2025');
 * await expect(page).toHaveURL('/policy/new');   // Page still works
 * await expect(response.status()).toBe(200);      // Primitives still work
 * ```
 *
 * @param value    Component, Locator, Page, or any primitive
 * @param options  Optional assertion message and timeout
 */
export function expect(value: unknown, options?: { message?: string; timeout?: number }) {
  if (value instanceof Component) {
    return pwExpect(value.locator(), options);
  }
  return pwExpect(value as any, options);
}
