import { type Page } from '@playwright/test';

// ─── PageContext ───────────────────────────────────────────────────────────────

/**
 * Ambient holder for the current Playwright Page instance.
 *
 * Not related to Playwright's BrowserContext. This is a lightweight
 * per-worker singleton that makes the current test's Page available
 * to framework internals without passing it as an argument.
 *
 * ## Why this exists
 * Without PageContext, every Component and action utility call requires
 * a `page` argument to be threaded through manually:
 *
 * ```ts
 * // Without PageContext — page passed everywhere
 * const form  = Component.from('.form', page, 'Policy form');
 * const field = form.find('.field', page, 'Effective date');
 * await DropdownActions.selectByText(field, 'Homeowners', page);
 * ```
 *
 * With PageContext, page is ambient — set once by the fixture, never passed:
 *
 * ```ts
 * // With PageContext — completely clean
 * const form  = Component.from('.form', 'Policy form');
 * const field = form.find('.field', 'Effective date');
 * await DropdownActions.selectByText(field, 'Homeowners');
 * ```
 *
 * ## Lifecycle
 * The base fixture in `test-setup/base-test.ts` manages the full lifecycle:
 * - `set(page)` is called before the test body runs
 * - `clear()` is called after the test completes (pass or fail)
 *
 * ## Worker safety
 * Playwright runs each worker in its own Node.js process. This module-level
 * singleton is therefore safe — there is no shared state between workers.
 * Within a single worker, the base fixture resets PageContext between tests.
 *
 * ## Usage
 * Do not call `set()` or `clear()` in tests, page objects, or action utilities.
 * Those are managed exclusively by the base fixture. Call `get()` only inside
 * framework internals — `resolveLocator()` and `Component.from()`.
 */
class PageContext {
  private _page: Page | null = null;

  // ─── Lifecycle (base fixture only) ────────────────────────────────────────

  /**
   * Store the Page for the current test.
   * Called by the base fixture before the test body runs.
   * Do not call this directly in tests or page objects.
   */
  set(page: Page): void {
    this._page = page;
  }

  /**
   * Clear the stored Page after the current test completes.
   * Called by the base fixture at teardown, regardless of test outcome.
   * Do not call this directly in tests or page objects.
   */
  clear(): void {
    this._page = null;
  }

  // ─── Access ───────────────────────────────────────────────────────────────

  /**
   * Returns the current Page instance.
   *
   * Throws a descriptive error if called before the base fixture has
   * set the page — i.e. if a test is using the raw `@playwright/test`
   * `test` instead of the project's base test from `base-test.ts`.
   *
   * Used internally by `resolveLocator()` and `Component.from()`.
   *
   * @throws If no page has been set for the current test.
   */
  get(): Page {
    if (!this._page) {
      throw new Error(
        '[PageContext] No page available. ' +
          'Make sure your test imports from test-setup/base-test.ts ' +
          'and not directly from @playwright/test.',
      );
    }
    return this._page;
  }

  /**
   * Returns the current Page or `null` if not yet set.
   *
   * Use in framework internals where the absence of a page is
   * acceptable — for example, when creating Components in
   * test utility code that runs outside a test body.
   */
  tryGet(): Page | null {
    return this._page;
  }
}

// ─── Singleton export ──────────────────────────────────────────────────────────

/**
 * The single PageContext instance for this worker process.
 * Imported by `component.ts` and `resolveLocator` in action utilities.
 */
export const pageContext = new PageContext();
