import { type Locator } from '@playwright/test';
import { pageContext } from './page-context';
import type {
  GetByLabelOptions,
  GetByPlaceholderOptions,
  GetByRoleOptions,
  GetByRoleTypes,
  GetByTextOptions,
  LocatorOptions,
} from './types/parameter-types';

// ─── Lazy Locator Factories ────────────────────────────────────────────────────
//
// Each function returns a factory function (() => Locator) instead of a Locator directly.
// This enables lazy loading — the locator is only created when first accessed.
//
// No page argument needed. PageContext provides the current page automatically.

/**
 * Create a locator from a CSS or XPath selector.
 *
 * @param selector CSS selector or XPath expression
 * @param options Locator options including visibility
 * @returns Playwright Locator instance
 *
 * @example
 * ```ts
 * const buttonLocator = getLocator('.submit-btn');
 * await buttonLocator.click();
 *
 * const firstItem = getLocator('.inventory_item').first();
 * await firstItem.click();
 * ```
 */
export function getLocator(selector: string, options?: LocatorOptions): Locator {
  return pageContext.get().locator(selector, options);
}

/**
 * Create a locator from an accessibility role.
 *
 * @param role Accessibility role (button, link, textbox, etc.)
 * @param options Options for filtering by name, pressed state, etc.
 * @returns Playwright Locator instance
 *
 * @example
 * ```ts
 * const submitBtn = getLocatorByRole('button', { name: 'Submit' });
 * await submitBtn.click();
 *
 * const links = getLocatorByRole('link', { name: /profile/i });
 * ```
 */
export function getLocatorByRole(role: GetByRoleTypes, options?: GetByRoleOptions): Locator {
  return pageContext.get().getByRole(role, options);
}

/**
 * Create a locator by test id attribute.
 *
 * @param testId Value of data-testid attribute
 * @returns Playwright Locator instance
 *
 * @example
 * ```ts
 * const loginForm = getLocatorByTestId('login-form');
 * await loginForm.click();
 * ```
 */
export function getLocatorByTestId(testId: string): Locator {
  return pageContext.get().getByTestId(testId);
}

/**
 * Create a locator by label text.
 *
 * @param text The label text to search for (exact string or regex)
 * @param options Additional options for the locator
 * @returns Playwright Locator instance
 *
 * @example
 * ```ts
 * const emailInput = getLocatorByLabel('Email Address');
 * const checkbox = getLocatorByLabel(/terms/i);
 * const exactMatch = getLocatorByLabel('Email', { exact: true });
 * ```
 */
export function getLocatorByLabel(text: string | RegExp, options?: GetByLabelOptions): Locator {
  return pageContext.get().getByLabel(text, options);
}

/**
 * Create a locator by placeholder text.
 *
 * @param text Placeholder text to match (exact string or regex)
 * @param options Options for placeholder matching
 * @returns Playwright Locator instance
 *
 * @example
 * ```ts
 * const searchInput = getLocatorByPlaceholder('Search...');
 * const emailField = getLocatorByPlaceholder(/email/i);
 * ```
 */
export function getLocatorByPlaceholder(text: string | RegExp, options?: GetByPlaceholderOptions): Locator {
  return pageContext.get().getByPlaceholder(text, options);
}

/**
 * Create a locator by visible text content.
 *
 * @param text Text to match (exact or regex)
 * @param options Options for text matching
 * @returns Playwright Locator instance
 *
 * @example
 * ```ts
 * const button = getLocatorByText('Click Me');
 * const link = getLocatorByText(/products/i);
 * const exactMatch = getLocatorByText('Click Me', { exact: true });
 * ```
 */
export function getLocatorByText(text: string | RegExp, options?: GetByTextOptions): Locator {
  return pageContext.get().getByText(text, options);
}

/**
 * Create a locator by alt text (for images).
 *
 * @param text Alt text to match (exact or regex)
 * @param exact Whether to match exact text (default: false)
 * @returns Playwright Locator instance
 *
 * @example
 * ```ts
 * const logo = getLocatorByAltText('Company Logo');
 * const exactMatch = getLocatorByAltText('Company Logo', true);
 * ```
 */
export function getLocatorByAltText(text: string | RegExp, exact?: boolean): Locator {
  return pageContext.get().getByAltText(text, exact !== undefined ? { exact } : undefined);
}

/**
 * Create a locator by title attribute.
 *
 * @param text Title attribute value to match (exact or regex)
 * @param exact Whether to match exact text (default: false)
 * @returns Playwright Locator instance
 *
 * @example
 * ```ts
 * const helpIcon = getLocatorByTitle('Help Information');
 * const exactMatch = getLocatorByTitle('Help Information', true);
 * ```
 */
export function getLocatorByTitle(text: string | RegExp, exact?: boolean): Locator {
  return pageContext.get().getByTitle(text, exact !== undefined ? { exact } : undefined);
}
