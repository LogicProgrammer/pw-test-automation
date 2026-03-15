import { type Locator } from '@playwright/test';
import { pageContext } from '@playwright-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Anything that can be resolved into a Playwright Locator.
 *
 * - string    : CSS / XPath selector. Resolved against the current page
 *               via PageContext automatically — no source needed.
 * - Locator   : Raw Playwright Locator. Used as-is.
 * - Component : Framework wrapper. The underlying Locator is extracted.
 */
export type LocatorLike = string | Locator | Component;

/**
 * A Component with all Playwright Locator methods available directly.
 *
 * Every factory method and find() returns this type so callers get
 * full autocomplete for both Component methods and Locator methods
 * without needing to call .locator() first.
 */
export type ProxiedComponent = Component & Locator;

// ─── Module-level parent tracking ─────────────────────────────────────────────
//
// Stored outside the class to avoid `as any` casts.
// WeakMap allows orphaned Components to be garbage collected correctly.
//
const parentMap = new WeakMap<Component, Component>();

// ─── Locator identity guard ───────────────────────────────────────────────────
//
// Distinguishes a raw Playwright Locator from a Component when the Proxy
// intercepts a return value. Prevents double-wrapping.
//
function isRawLocator(value: unknown): value is Locator {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as any).click === 'function' &&
    typeof (value as any).waitFor === 'function' &&
    !('_isComponent' in (value as any))
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Component — a named, tree-aware wrapper around a Playwright Locator.
 *
 * ## What it is
 * ```
 * Component = Locator + alias + find() + child() + path
 * ```
 *
 * Every Component:
 * - Carries a human-readable `alias` used in error messages and tree navigation
 * - Forwards all Playwright Locator methods transparently via a JavaScript Proxy
 * - Belongs to an optional parent → child tree via `find()` and `child()`
 * - Exposes `path` tracing full ancestry: "Policy form > Premium section > Effective date"
 * - Provides `locator()` as a no-argument escape hatch to the raw Playwright Locator
 *
 * ## Clean API — no page passing
 * PageContext holds the current page for the duration of each test.
 * Neither `Component.from()` nor `find()` require a page or source argument.
 *
 * ```ts
 * // Clean — no page threading
 * const form  = Component.from('.policy-form', 'Policy form');
 * const field = form.find('[data-id="eff-date"]', 'Effective date');
 * ```
 *
 * ## Frames and explicit scoping
 * When you need to scope to a frame or a specific Locator rather than
 * the page root, pass the scoped Locator directly:
 *
 * ```ts
 * const frame = page.frameLocator('#content-frame');
 * const field = Component.from(frame.locator('[data-id="eff-date"]'), 'Effective date');
 * ```
 *
 * ## What it is NOT
 * Not responsible for interaction logic. Dropdowns, date inputs, radio groups
 * are handled by action utilities (DropdownActions, DateActions, etc.) mixed
 * in via the gwComponents factory in locator-templates.ts.
 */
export class Component {
  /**
   * Brand flag that identifies this object as a Component.
   * Used by `isRawLocator()` to prevent double-wrapping inside the Proxy.
   * Must not be removed or renamed.
   */
  readonly _isComponent = true as const;

  /**
   * Human-readable name for this Component.
   * Used in `path`, `child()` retrieval, and error messages.
   * Defaults to `'unnamed'` if not provided at creation.
   */
  readonly alias: string;

  /**
   * The underlying Playwright Locator this Component wraps.
   * Not part of the public API — use `locator()` externally.
   */
  protected readonly _locator: Locator;

  /**
   * Named children registered via `find()` with an alias.
   * Anonymous children (no alias) are not stored here — only the
   * reference returned by `find()` provides access to them.
   */
  private readonly _children = new Map<string, Component>();

  // ─── Constructor ──────────────────────────────────────────────────────────

  /**
   * Not called directly. Use `Component.from()` to create instances.
   * Protected so the gwComponents factory can extend if needed.
   */
  protected constructor(locator: Locator, alias = 'unnamed') {
    this._locator = locator;
    this.alias = alias;
  }

  // ─── Static factory ───────────────────────────────────────────────────────

  /**
   * Create a Component from any LocatorLike input.
   *
   * ```
   * Component.from(input: LocatorLike, alias?: string)
   * ```
   *
   * No page or source argument needed. When `input` is a selector string,
   * PageContext provides the current page automatically.
   *
   * @param input  What to wrap — selector string, Locator, or Component
   * @param alias  Human-readable name. Used in path and error messages.
   *
   * @example From a selector string — page comes from PageContext
   * ```ts
   * Component.from('#policy-type', 'Policy type')
   * Component.from('[data-id="submit"]', 'Submit button')
   * ```
   *
   * @example From a Playwright Locator
   * ```ts
   * Component.from(page.getByRole('button', { name: 'Submit' }), 'Submit')
   * Component.from(page.getByTestId('policy-type'), 'Policy type')
   * ```
   *
   * @example From an existing Component (re-alias)
   * ```ts
   * Component.from(existingComponent, 'New alias')
   * ```
   *
   * @example Scoping to a frame
   * ```ts
   * Component.from(page.frameLocator('#frame').locator('.field'), 'Frame field')
   * ```
   */
  static from(input: LocatorLike, alias?: string): ProxiedComponent {
    const locator = resolveLocator(input);
    return new Component(locator, alias)._proxify();
  }

  // ─── Tree navigation ──────────────────────────────────────────────────────

  /**
   * Create a child Component scoped to this Component.
   *
   * ```
   * component.find(input: LocatorLike, alias?: string)
   * ```
   *
   * When `input` is a selector string, it is resolved relative to this
   * Component's Locator — not the page root. No page or source needed.
   *
   * Named children (alias provided) are stored and retrievable via `child()`.
   * Anonymous children are valid but only accessible via the returned reference.
   *
   * @param input  What to wrap — selector string, Locator, or Component
   * @param alias  Human-readable name. Required for `child()` retrieval.
   *
   * @example Selector string — scoped to parent automatically
   * ```ts
   * const form    = Component.from('.policy-form', 'Policy form');
   * const section = form.find('.premium-section', 'Premium section');
   * const field   = section.find('[data-id="eff-date"]', 'Effective date');
   *
   * field.path // → "Policy form > Premium section > Effective date"
   * ```
   *
   * @example Absolute Locator child — not scoped to parent
   * ```ts
   * // Toast is at document root, not inside the form
   * const toast = form.find(page.locator('.toast-notification'), 'Toast');
   * ```
   *
   * @example Anonymous child — accessible only via returned reference
   * ```ts
   * const icon = form.find('.icon-close');
   * await icon.click();
   * ```
   */
  find(input: LocatorLike, alias?: string): ProxiedComponent {
    // Selector strings are scoped to this Component's Locator.
    // Locator and Component inputs are used as-is.
    const locator = typeof input === 'string' ? this._locator.locator(input) : resolveLocator(input);

    const child = new Component(locator, alias)._proxify();

    parentMap.set(child, this);
    if (alias) this._children.set(alias, child);

    return child;
  }

  /**
   * Retrieve a named child Component by its alias.
   *
   * Only children created with an alias via `find()` are stored.
   * Throws a descriptive error including this Component's path and a
   * list of available child names if the alias is not found.
   *
   * @param alias  The alias provided when the child was created
   *
   * @example
   * ```ts
   * const form    = Component.from('.policy-form', 'Policy form');
   * const section = form.find('.premium-section', 'Premium section');
   *
   * // Retrieve anywhere in the page object:
   * form.child('Premium section') // → same Component as section
   * ```
   */
  child(alias: string): ProxiedComponent {
    const found = this._children.get(alias);

    if (!found) {
      throw new Error(
        `[Component] No child with alias "${alias}" found under "${this.path}".\n` + `Available: ${this._childNames()}`,
      );
    }

    return found as ProxiedComponent;
  }

  // ─── Identity ─────────────────────────────────────────────────────────────

  /**
   * Full ancestry path from the root Component to this one.
   *
   * Built by walking up the parentMap chain. Each Component contributes
   * its alias, joined by " > ".
   *
   * @example
   * ```ts
   * field.path  // → "Policy form > Premium section > Effective date"
   * submit.path // → "Policy form > Submit"
   * flat.path   // → "Policy type"
   * ```
   */
  get path(): string {
    const parts: string[] = [];
    let current: Component | undefined = this;

    while (current !== undefined) {
      parts.unshift(current.alias);
      current = parentMap.get(current);
    }

    return parts.join(' > ');
  }

  // ─── Escape hatch ─────────────────────────────────────────────────────────

  /**
   * Returns the underlying raw Playwright Locator.
   *
   * Use when:
   * - Passing to `expect()` if native Proxy duck-typing does not work
   * - Passing to a third-party utility that explicitly requires a Locator type
   *
   * Takes NO arguments. For child element scoping, use `find()`.
   *
   * @example
   * ```ts
   * await expect(field.locator()).toBeVisible();
   * await expect(field.locator()).toHaveValue('Homeowners');
   * ```
   */
  locator(): Locator {
    return this._locator;
  }

  // ─── Proxy ────────────────────────────────────────────────────────────────

  /**
   * Wraps `this` in a JavaScript Proxy that forwards unknown properties
   * and methods to the underlying Playwright Locator.
   *
   * Called once at the end of every factory method after `this` is fully
   * initialised. Never called inside the constructor.
   *
   * Proxy resolution order:
   * 1. Property exists on Component         → Component handles it
   * 2. Property exists on Locator           → forwarded to Locator
   *    a. Return value is a raw Locator     → wrapped in new base Component
   *    b. Return value is anything else     → returned as-is
   * 3. Errors from Locator calls            → re-thrown with path context
   */
  protected _proxify(): ProxiedComponent {
    return new Proxy(this, {
      get(target: Component, prop: string | symbol, receiver: unknown) {
        // ── 1. Component own properties take priority ──────────────────────
        if (prop in target) {
          const value = Reflect.get(target, prop, receiver);
          return typeof value === 'function' ? (value as Function).bind(target) : value;
        }

        // ── 2. Forward to Locator ──────────────────────────────────────────
        const locatorProp = (target._locator as any)[prop];

        if (typeof locatorProp === 'function') {
          // Named function for readable stack traces.
          // Anonymous Proxy trap functions produce unhelpful frames.
          return function proxyForward(...args: unknown[]) {
            try {
              const result = (locatorProp as Function).apply(target._locator, args);

              // Locator methods that return a Locator (nth, first, filter, etc.)
              // are wrapped back into a Component so chaining always returns
              // Component, never a raw Locator.
              if (isRawLocator(result)) {
                return new Component(result)._proxify();
              }

              return result;
            } catch (err) {
              // Prepend component path to every Locator error so failures
              // are immediately actionable without decoding raw selectors.
              // "Policy form > Effective date — Timeout 30000ms exceeded"
              // instead of "locator('#effDate') — Timeout 30000ms exceeded"
              const error = err instanceof Error ? err : new Error(String(err));
              error.message = `[${target.path}] ${error.message}`;
              throw error;
            }
          };
        }

        // Non-function Locator properties pass through as-is
        return locatorProp;
      },
    }) as ProxiedComponent;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Comma-separated list of registered child aliases for error messages. */
  private _childNames(): string {
    const names = [...this._children.keys()];
    return names.length > 0 ? names.map(n => `"${n}"`).join(', ') : 'none';
  }
}

// ─── resolveLocator ───────────────────────────────────────────────────────────

/**
 * Resolves any LocatorLike value to a raw Playwright Locator.
 *
 * The single conversion point used by `Component.from()` and all action
 * utilities. Callers never convert manually.
 *
 * - Component → extracts the underlying Locator via `.locator()`
 * - string    → resolved against the current page from PageContext
 * - Locator   → returned as-is
 *
 * Note: `find()` does NOT use this for selector strings — it scopes to
 * the parent Locator directly. This function is for root-level resolution.
 *
 * @example Inside an action utility
 * ```ts
 * async function selectByText(target: LocatorLike, text: string): Promise<void> {
 *   const locator = resolveLocator(target);
 *   await locator.selectOption({ label: text });
 * }
 * ```
 */
export function resolveLocator(input: LocatorLike): Locator {
  if (input instanceof Component) {
    return input.locator();
  }

  if (typeof input === 'string') {
    // PageContext provides the current page automatically.
    // No source argument needed anywhere.
    return pageContext.get().locator(input);
  }

  // Raw Playwright Locator — use as-is
  return input;
}

/**
 * Shorthand for creating a Component from any LocatorLike input.
 *
 * ```ts
 * component('#policy-type', 'Policy type')
 * component(page.getByRole('button', { name: 'Submit' }), 'Submit')
 * ```
 */
export function component(input: LocatorLike, alias?: string): ProxiedComponent {
  return Component.from(input, alias);
}
