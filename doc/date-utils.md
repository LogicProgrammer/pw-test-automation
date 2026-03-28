# date-fns Date Utility Guide

_Parsing, Formatting & Transformation for Strings and JS Dates_

---

## 1. Overview

This guide demonstrates how to build a robust `DateUtility` class using **date-fns** — the industry-standard, tree-shakable date manipulation library. The utility supports two primary input strategies:

- **JavaScript `Date` object** — parsed natively with no format required
- **String value** — requires an explicit format pattern (using date-fns tokens) so the library can unambiguously parse the input
- **Unix timestamp (`number`)** — treated as seconds since epoch

> **Why date-fns?**
> date-fns is immutable, tree-shakable, and has zero dependencies. It follows the same design philosophy as lodash — import only what you need. It is the preferred library for TypeScript-first, test automation, and enterprise JavaScript projects.

---

## 2. Installation

### 2.1 npm / yarn

```bash
# Install date-fns
npm install date-fns

# Or with yarn
yarn add date-fns
```

### 2.2 TypeScript Support

date-fns ships with built-in TypeScript types — no `@types` package needed. Works out of the box with `tsconfig` strict mode.

---

## 3. Format Token Reference

When passing a string to the utility, you must declare the format pattern that matches your input. The table below covers the most common tokens used in test automation and QA contexts:

| Token  | Description / Example Output              |
| ------ | ----------------------------------------- |
| `yyyy` | Full 4-digit year — `2024`                |
| `yy`   | 2-digit year — `24`                       |
| `MM`   | Month, zero-padded — `01..12`             |
| `M`    | Month, no padding — `1..12`               |
| `MMMM` | Full month name — `January`               |
| `MMM`  | Abbreviated month — `Jan`                 |
| `dd`   | Day of month, zero-padded — `01..31`      |
| `d`    | Day of month, no padding — `1..31`        |
| `HH`   | 24-hour hour, zero-padded — `00..23`      |
| `hh`   | 12-hour hour, zero-padded — `01..12`      |
| `mm`   | Minutes, zero-padded — `00..59`           |
| `ss`   | Seconds, zero-padded — `00..59`           |
| `a`    | AM / PM meridiem marker                   |
| `'T'`  | Literal character T — e.g. ISO separator  |
| `xxx`  | Timezone offset — `+05:30`, `-08:00`, `Z` |

> **Tip:** Always quote literal characters using single quotes in the pattern: `'T'` for the ISO separator, `'Z'` for a literal Z.

---

## 4. The DateUtility Class

### 4.1 Full TypeScript Implementation

```typescript
import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addYears,
  clamp,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  fromUnixTime,
  getUnixTime,
  isAfter,
  isBefore,
  isEqual,
  isFuture,
  isPast,
  isToday,
  isValid,
  isWeekend,
  max,
  min,
  parse,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// DATE FORMAT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const DATE_FORMATS = {
  ISO_DATE: 'yyyy-MM-dd',
  ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  ISO_DATETIME_LOCAL: "yyyy-MM-dd'T'HH:mm:ss",
  US_SHORT: 'MM/dd/yyyy',
  US_DATETIME: 'MM/dd/yyyy hh:mm a',
  EU_SHORT: 'dd/MM/yyyy',
  EU_DATETIME: 'dd/MM/yyyy HH:mm',
  EU_DOT: 'dd.MM.yyyy',
  LONG: 'MMMM d, yyyy',
  SHORT_MONTH: 'dd MMM yyyy',
  DATETIME_24H: 'yyyy-MM-dd HH:mm:ss',
  DATETIME_24H_SHORT: 'yyyy-MM-dd HH:mm',
  TIME_24H: 'HH:mm:ss',
  TIME_12H: 'hh:mm a',
  YEAR_MONTH: 'yyyy-MM',
  FULL_WITH_DAY: 'EEEE, MMMM d, yyyy',
} as const;

export type DateFormatKey = keyof typeof DATE_FORMATS;
export type DateFormatValue = (typeof DATE_FORMATS)[DateFormatKey];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DateInput = Date | string | number;

export interface DateUtilityOptions {
  format?: string;
  referenceDate?: Date;
}

export interface SafeParseResult {
  success: boolean;
  value: DateUtility | null;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DateUtility CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class DateUtility {
  private readonly _date: Date;
  private readonly _sourcePattern: string | undefined;

  constructor(input: DateInput, options: DateUtilityOptions = {}) {
    this._date = DateUtility._resolveInput(input, options);
    this._sourcePattern = typeof input === 'string' ? options.format : undefined;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private static _resolveInput(input: DateInput, options: DateUtilityOptions): Date {
    if (input instanceof Date) {
      if (!isValid(input)) throw new Error('[DateUtility] Invalid Date object provided.');
      return input;
    }
    if (typeof input === 'number') {
      const date = fromUnixTime(input);
      if (!isValid(date)) throw new Error(`[DateUtility] Invalid Unix timestamp: ${input}`);
      return date;
    }
    if (typeof input === 'string') return DateUtility._parseString(input, options);
    throw new Error('[DateUtility] Input must be a Date, string, or Unix timestamp (number).');
  }

  private static _parseString(input: string, options: DateUtilityOptions): Date {
    if (!options.format) {
      const iso = parseISO(input);
      if (!isValid(iso)) {
        throw new Error(
          `[DateUtility] String input "${input}" could not be parsed as ISO 8601. ` +
            `Provide a format pattern via options e.g. { format: DATE_FORMATS.EU_SHORT }.`,
        );
      }
      return iso;
    }
    const ref = options.referenceDate ?? new Date();
    const parsed = parse(input, options.format, ref);
    if (!isValid(parsed)) {
      throw new Error(
        `[DateUtility] Failed to parse "${input}" with pattern "${options.format}". ` +
          `Verify the pattern matches the input exactly.`,
      );
    }
    return parsed;
  }

  private _wrap(date: Date): DateUtility {
    return new DateUtility(date);
  }
  private _resolve(other: DateInput, opts?: DateUtilityOptions): Date {
    return new DateUtility(other, opts).toDate();
  }

  // ── Static factories ─────────────────────────────────────────────────────────

  static today(): DateUtility {
    return new DateUtility(startOfDay(new Date()));
  }
  static now(): DateUtility {
    return new DateUtility(new Date());
  }
  static fromUnix(timestamp: number): DateUtility {
    return new DateUtility(timestamp);
  }

  static safeParse(input: DateInput, options?: DateUtilityOptions): SafeParseResult {
    try {
      return { success: true, value: new DateUtility(input, options), error: null };
    } catch (err) {
      return { success: false, value: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  static max(inputs: DateInput[], options?: DateUtilityOptions): DateUtility {
    return new DateUtility(max(inputs.map(i => new DateUtility(i, options).toDate())));
  }

  static min(inputs: DateInput[], options?: DateUtilityOptions): DateUtility {
    return new DateUtility(min(inputs.map(i => new DateUtility(i, options).toDate())));
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  toDate(): Date {
    return this._date;
  }
  format(pattern: string): string {
    return format(this._date, pattern);
  }
  toISO(): string {
    return this._date.toISOString();
  }
  toUnix(): number {
    return getUnixTime(this._date);
  }
  toMillis(): number {
    return this._date.getTime();
  }
  get sourcePattern() {
    return this._sourcePattern;
  }

  // ── Boundaries ───────────────────────────────────────────────────────────────

  startOfDay(): DateUtility {
    return this._wrap(startOfDay(this._date));
  }
  endOfDay(): DateUtility {
    return this._wrap(endOfDay(this._date));
  }
  startOfMonth(): DateUtility {
    return this._wrap(startOfMonth(this._date));
  }
  endOfMonth(): DateUtility {
    return this._wrap(endOfMonth(this._date));
  }
  startOfWeek(): DateUtility {
    return this._wrap(startOfWeek(this._date));
  }
  endOfWeek(): DateUtility {
    return this._wrap(endOfWeek(this._date));
  }

  // ── Addition ─────────────────────────────────────────────────────────────────

  addDays(n: number): DateUtility {
    return this._wrap(addDays(this._date, n));
  }
  addMonths(n: number): DateUtility {
    return this._wrap(addMonths(this._date, n));
  }
  addYears(n: number): DateUtility {
    return this._wrap(addYears(this._date, n));
  }
  addHours(n: number): DateUtility {
    return this._wrap(addHours(this._date, n));
  }
  addMinutes(n: number): DateUtility {
    return this._wrap(addMinutes(this._date, n));
  }

  // ── Subtraction ──────────────────────────────────────────────────────────────

  subDays(n: number): DateUtility {
    return this._wrap(subDays(this._date, n));
  }
  subMonths(n: number): DateUtility {
    return this._wrap(subMonths(this._date, n));
  }
  subYears(n: number): DateUtility {
    return this._wrap(subYears(this._date, n));
  }

  // ── Differences ──────────────────────────────────────────────────────────────

  diffInDays(other: DateInput, opts?: DateUtilityOptions): number {
    return differenceInDays(this._resolve(other, opts), this._date);
  }
  diffInHours(other: DateInput, opts?: DateUtilityOptions): number {
    return differenceInHours(this._resolve(other, opts), this._date);
  }
  diffInMinutes(other: DateInput, opts?: DateUtilityOptions): number {
    return differenceInMinutes(this._resolve(other, opts), this._date);
  }
  diffInSeconds(other: DateInput, opts?: DateUtilityOptions): number {
    return differenceInSeconds(this._resolve(other, opts), this._date);
  }

  // ── Comparisons ──────────────────────────────────────────────────────────────

  isBefore(other: DateInput, opts?: DateUtilityOptions): boolean {
    return isBefore(this._date, this._resolve(other, opts));
  }
  isAfter(other: DateInput, opts?: DateUtilityOptions): boolean {
    return isAfter(this._date, this._resolve(other, opts));
  }
  isEqual(other: DateInput, opts?: DateUtilityOptions): boolean {
    return isEqual(this._date, this._resolve(other, opts));
  }

  isInRange(start: DateInput, end: DateInput, startOpts?: DateUtilityOptions, endOpts?: DateUtilityOptions): boolean {
    const s = this._resolve(start, startOpts);
    const e = this._resolve(end, endOpts);
    return (isAfter(this._date, s) || isEqual(this._date, s)) && (isBefore(this._date, e) || isEqual(this._date, e));
  }

  // ── Predicates ───────────────────────────────────────────────────────────────

  isWeekend(): boolean {
    return isWeekend(this._date);
  }
  isToday(): boolean {
    return isToday(this._date);
  }
  isFuture(): boolean {
    return isFuture(this._date);
  }
  isPast(): boolean {
    return isPast(this._date);
  }

  // ── Clamping ─────────────────────────────────────────────────────────────────

  clamp(start: DateInput, end: DateInput, startOpts?: DateUtilityOptions, endOpts?: DateUtilityOptions): DateUtility {
    return this._wrap(
      clamp(this._date, {
        start: this._resolve(start, startOpts),
        end: this._resolve(end, endOpts),
      }),
    );
  }
}
```

---

## 5. Usage Examples

### 5.1 Passing a JavaScript Date

When you already have a `Date` object, pass it directly — no format option needed:

```typescript
import { DateUtility, DATE_FORMATS } from './DateUtility';

const now = new Date();
const du = new DateUtility(now);

console.log(du.format(DATE_FORMATS.EU_SHORT)); // e.g. 28/03/2026
console.log(du.format(DATE_FORMATS.LONG)); // e.g. March 28, 2026
console.log(du.toISO()); // e.g. 2026-03-28T14:32:00.000Z
console.log(du.startOfDay().toISO()); // 2026-03-28T00:00:00.000Z
```

### 5.2 Passing a Date String with a Pattern

When the input is a string, declare the matching format pattern so date-fns can unambiguously parse it:

```typescript
// US date string
const us = new DateUtility('03/28/2026', { format: DATE_FORMATS.US_SHORT });
console.log(us.format(DATE_FORMATS.ISO_DATE)); // 2026-03-28

// European date string
const eu = new DateUtility('28.03.2026', { format: DATE_FORMATS.EU_DOT });
console.log(eu.format(DATE_FORMATS.LONG)); // March 28, 2026

// Datetime with time
const dt = new DateUtility('28/03/2026 14:30', { format: DATE_FORMATS.EU_DATETIME });
console.log(dt.format(DATE_FORMATS.TIME_12H)); // 02:30 PM

// ISO 8601 string — no format needed (auto-detected)
const iso = new DateUtility('2026-03-28T14:30:00.000Z');
console.log(iso.toISO()); // 2026-03-28T14:30:00.000Z
```

### 5.3 Static Factories

```typescript
// Current date at midnight
const today = DateUtility.today();

// Current date and time
const now = DateUtility.now();

// From Unix timestamp
const fromUnix = DateUtility.fromUnix(1743163200);
console.log(fromUnix.format(DATE_FORMATS.ISO_DATE));

// Find latest / earliest from a list
const latest = DateUtility.max(['2026-01-01', '2026-06-01', '2025-12-31']);
const earliest = DateUtility.min(['2026-01-01', '2026-06-01', '2025-12-31']);
```

### 5.4 Date Arithmetic & Comparison

```typescript
const today = DateUtility.today();

// Chaining — fully immutable
const future = today.addDays(30).addMonths(1).addYears(1);
console.log(future.format(DATE_FORMATS.ISO_DATE));

// Subtraction
const past = today.subDays(7).subMonths(2);

// Differences
console.log(today.diffInDays('2026-12-31')); // days until end of year
console.log(today.diffInHours('2026-12-31')); // hours until end of year

// Comparisons
const deadline = new DateUtility('31/12/2026', { format: DATE_FORMATS.EU_SHORT });
console.log(today.isBefore(deadline)); // true
console.log(today.isInRange('2026-01-01', '2026-12-31')); // true

// Predicates
console.log(today.isToday()); // true
console.log(today.isFuture()); // false
console.log(today.isWeekend()); // depends on day

// Clamping
const clamped = today.clamp('2026-01-01', '2026-06-30');
```

### 5.5 Test Automation Usage (Playwright / WebdriverIO)

The utility is particularly valuable in test automation for generating dynamic date inputs and asserting displayed date values:

```typescript
// Playwright example
test('booking form accepts future date', async ({ page }) => {
  const checkIn = DateUtility.today().addDays(7);
  const checkOut = checkIn.addDays(3);

  // Fill date fields using the UI's expected format
  await page.fill('#check-in', checkIn.format(DATE_FORMATS.US_SHORT));
  await page.fill('#check-out', checkOut.format(DATE_FORMATS.US_SHORT));

  // Assert displayed confirmation date
  const displayed = await page.locator('.confirm-date').textContent();
  const parsed = new DateUtility(displayed!.trim(), { format: DATE_FORMATS.LONG });
  expect(parsed.format(DATE_FORMATS.ISO_DATE)).toBe(checkIn.format(DATE_FORMATS.ISO_DATE));
});
```

---

## 6. Error Handling Strategy

The utility throws descriptive errors on invalid input. Use the `safeParse` static method when working with untrusted or external data sources:

```typescript
// Static safeParse — returns { success, value, error } instead of throwing
const result = DateUtility.safeParse('bad-input', { format: DATE_FORMATS.ISO_DATE });

if (!result.success) {
  console.warn(result.error);
  // [DateUtility] Failed to parse "bad-input" with pattern "yyyy-MM-dd".
} else {
  console.log(result.value!.toISO());
}
```

**Common error scenarios:**

| Scenario                        | Error Message                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------- |
| String without format (non-ISO) | `String input "..." could not be parsed as ISO 8601. Provide a format pattern...` |
| Invalid `Date` object           | `Invalid Date object provided.`                                                   |
| Mismatched pattern              | `Failed to parse "28-03-2026" with pattern "MM/dd/yyyy". Verify the pattern...`   |
| Invalid Unix timestamp          | `Invalid Unix timestamp: <value>`                                                 |
| Wrong type                      | `Input must be a Date, string, or Unix timestamp (number).`                       |

---

## 7. Best Practices

### 7.1 Always Declare the Pattern for Strings

- **Never rely on implicit parsing** — date-fns' `parse()` function requires an explicit format pattern for string inputs. Ambiguous strings like `"01/02/03"` are impossible to parse without a declared format.
- **Use `DATE_FORMATS` constants** — define all date patterns from the exported constants object so they are consistent and refactorable across your test suite.

```typescript
// ✅ Correct
const du = new DateUtility('28/03/2026', { format: DATE_FORMATS.EU_SHORT });

// ❌ Avoid inline string literals
const du = new DateUtility('28/03/2026', { format: 'dd/MM/yyyy' });
```

### 7.2 Immutability

- date-fns functions are pure and return new values — `DateUtility` follows this pattern by returning new instances from all arithmetic methods.
- All boundary helpers (`startOfDay`, `endOfMonth`, etc.) also return new `DateUtility` instances, enabling full method chaining.

```typescript
// Every method returns a new instance — the original is never mutated
const original = DateUtility.today();
const modified = original.addDays(7).startOfDay();
// original is unchanged
```

### 7.3 Tree-Shaking

- Import individual functions from `'date-fns'` to benefit from tree-shaking in your build output.

```typescript
// ✅ Tree-shakable
import { parse, format, isValid } from 'date-fns';

// ❌ Imports everything
import dateFns from 'date-fns';
```

---

## 8. Quick Pattern Reference

| Input String Example       | Required Format Pattern        |
| -------------------------- | ------------------------------ |
| `2026-03-28`               | `yyyy-MM-dd`                   |
| `28/03/2026`               | `dd/MM/yyyy`                   |
| `03/28/2026`               | `MM/dd/yyyy`                   |
| `28.03.2026`               | `dd.MM.yyyy`                   |
| `March 28, 2026`           | `MMMM d, yyyy`                 |
| `28 Mar 2026`              | `dd MMM yyyy`                  |
| `2026-03-28 14:30:00`      | `yyyy-MM-dd HH:mm:ss`          |
| `28/03/2026 14:30`         | `dd/MM/yyyy HH:mm`             |
| `03/28/2026 02:30 PM`      | `MM/dd/yyyy hh:mm a`           |
| `2026-03-28T14:30:00.000Z` | `yyyy-MM-dd'T'HH:mm:ss.SSSxxx` |
