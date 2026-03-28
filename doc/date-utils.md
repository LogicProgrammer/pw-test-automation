# date-fns Date Utility Guide

_Parsing, Formatting, Timezone Conversion & Test Automation with `DateUtils`_

---

## 1. Overview

This guide demonstrates how to build a robust `DateUtils` class using **date-fns** and **date-fns-tz** — the industry-standard, tree-shakable date manipulation libraries. The utility supports three input strategies:

- **JavaScript `Date` object** — validated and stored directly
- **String value** — requires an explicit format pattern (using date-fns tokens) so the library can unambiguously parse the input
- **Unix timestamp (`number`)** — treated as seconds since epoch

Internally, `DateUtils` always stores a **pure UTC `Date`** as its single source of truth. Timezone handling is explicit and opt-in via the `timezone` option.

> **Why date-fns?**
> date-fns is immutable, tree-shakable, and has zero dependencies. It follows the same design philosophy as lodash — import only what you need. It is the preferred library for TypeScript-first, test automation, and enterprise JavaScript projects.

---

## 2. Installation

### 2.1 npm / yarn

```bash
# Core date library
npm install date-fns

# Timezone support
npm install date-fns-tz

# Or with yarn
yarn add date-fns date-fns-tz
```

### 2.2 TypeScript Support

Both `date-fns` and `date-fns-tz` ship with built-in TypeScript types — no `@types` package needed. Works out of the box with `tsconfig` strict mode.

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

## 4. The DateUtils Class

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
  subHours,
  subMinutes,
  subMonths,
  subYears,
} from 'date-fns';
import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz';

// ─────────────────────────────────────────────────────────────────────────────
// DATE FORMAT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const DATE_FORMATS = {
  /** ISO date only: 2026-03-28 */
  ISO_DATE: 'yyyy-MM-dd',
  /** ISO full datetime with ms and timezone: 2026-03-28T14:30:00.000+00:00 */
  ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  /** ISO datetime without timezone (local): 2026-03-28T14:30:00 */
  ISO_DATETIME_LOCAL: "yyyy-MM-dd'T'HH:mm:ss",
  /** US short date: 03/28/2026 */
  US_SHORT: 'MM/dd/yyyy',
  /** US date with time: 03/28/2026 02:30 PM */
  US_DATETIME: 'MM/dd/yyyy hh:mm a',
  /** European short date: 28/03/2026 */
  EU_SHORT: 'dd/MM/yyyy',
  /** European date with time: 28/03/2026 14:30 */
  EU_DATETIME: 'dd/MM/yyyy HH:mm',
  /** Dot-separated European: 28.03.2026 */
  EU_DOT: 'dd.MM.yyyy',
  /** Full month name: March 28, 2026 */
  LONG: 'MMMM d, yyyy',
  /** Abbreviated month: 28 Mar 2026 */
  SHORT_MONTH: 'dd MMM yyyy',
  /** Date and 24h time: 2026-03-28 14:30:00 */
  DATETIME_24H: 'yyyy-MM-dd HH:mm:ss',
  /** Date and 24h time without seconds: 2026-03-28 14:30 */
  DATETIME_24H_SHORT: 'yyyy-MM-dd HH:mm',
  /** Time only 24h: 14:30:00 */
  TIME_24H: 'HH:mm:ss',
  /** Time only 12h: 02:30 PM */
  TIME_12H: 'hh:mm a',
  /** Year and month only: 2026-03 */
  YEAR_MONTH: 'yyyy-MM',
  /** Day, full date: Saturday, March 28, 2026 */
  FULL_WITH_DAY: 'EEEE, MMMM d, yyyy',
} as const;

export type DateFormatKey = keyof typeof DATE_FORMATS;
export type DateFormatValue = (typeof DATE_FORMATS)[DateFormatKey];

// ─────────────────────────────────────────────────────────────────────────────
// TIMEZONE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const TIMEZONES = {
  US: {
    PACIFIC: 'America/Los_Angeles', // UTC-8 / UTC-7 (DST)
    MOUNTAIN: 'America/Denver', // UTC-7 / UTC-6 (DST)
    CENTRAL: 'America/Chicago', // UTC-6 / UTC-5 (DST)
    EASTERN: 'America/New_York', // UTC-5 / UTC-4 (DST)
    HAWAII: 'Pacific/Honolulu', // UTC-10, no DST
    ALASKA: 'America/Anchorage', // UTC-9 / UTC-8 (DST)
  },
  EUROPE: {
    LONDON: 'Europe/London', // UTC+0 / UTC+1 (BST)
    PARIS: 'Europe/Paris', // UTC+1 / UTC+2 (CEST)
    BERLIN: 'Europe/Berlin', // UTC+1 / UTC+2 (CEST)
    ATHENS: 'Europe/Athens', // UTC+2 / UTC+3 (EEST)
    MOSCOW: 'Europe/Moscow', // UTC+3, no DST
  },
  ASIA: {
    KOLKATA: 'Asia/Kolkata', // UTC+5:30, no DST
    KATHMANDU: 'Asia/Kathmandu', // UTC+5:45, no DST
    BANGKOK: 'Asia/Bangkok', // UTC+7, no DST
    SHANGHAI: 'Asia/Shanghai', // UTC+8, no DST
    SINGAPORE: 'Asia/Singapore', // UTC+8, no DST
    TOKYO: 'Asia/Tokyo', // UTC+9, no DST
    SEOUL: 'Asia/Seoul', // UTC+9 / UTC+10 (KDT)
  },
  PACIFIC: {
    SYDNEY: 'Australia/Sydney', // UTC+10 / UTC+11 (AEDT)
    AUCKLAND: 'Pacific/Auckland', // UTC+12 / UTC+13 (NZDT)
  },
  UTC: 'UTC',
} as const;

/** Any valid IANA timezone string. Use TIMEZONES constants for type safety. */
export type Timezone = string;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Accepted input types for DateUtils construction. */
export type DateInput = Date | string | number;

export interface DateUtilsOptions {
  /** Format pattern matching the input string (required for non-ISO strings). */
  format?: string;
  /** Reference date used as base for relative parsing. Defaults to new Date(). */
  referenceDate?: Date;
  /**
   * IANA timezone of the input value. When provided, the input is interpreted
   * as wall-clock time in this zone and converted to UTC for internal storage.
   */
  timezone?: Timezone;
}

export interface SafeParseResult {
  success: boolean;
  value: DateUtils | null;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DateUtils CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class DateUtils {
  private readonly _date: Date;
  private readonly _sourcePattern: string | undefined;
  private readonly _timezone: Timezone | undefined;

  constructor(input: DateInput, options: DateUtilsOptions = {}) {
    this._date = DateUtils._resolveInput(input, options);
    this._sourcePattern = typeof input === 'string' ? options.format : undefined;
    this._timezone = options.timezone;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private static _resolveInput(input: DateInput, options: DateUtilsOptions): Date {
    if (input instanceof Date) {
      if (!isValid(input)) throw new Error('[DateUtils] Invalid Date object provided.');
      return options.timezone ? fromZonedTime(input, options.timezone) : input;
    }
    if (typeof input === 'number') {
      const date = fromUnixTime(input);
      if (!isValid(date)) throw new Error(`[DateUtils] Invalid Unix timestamp: ${input}`);
      return date;
    }
    if (typeof input === 'string') return DateUtils._parseString(input, options);
    throw new Error('[DateUtils] Input must be a Date, string, or Unix timestamp (number).');
  }

  private static _parseString(input: string, options: DateUtilsOptions): Date {
    let localDate: Date;
    if (!options.format) {
      const iso = parseISO(input);
      if (!isValid(iso)) {
        throw new Error(
          `[DateUtils] String input "${input}" could not be parsed as ISO 8601. ` +
            `Provide a format pattern via options e.g. { format: DATE_FORMATS.EU_SHORT }.`,
        );
      }
      localDate = iso;
    } else {
      const ref = options.referenceDate ?? new Date();
      const parsed = parse(input, options.format, ref);
      if (!isValid(parsed)) {
        throw new Error(
          `[DateUtils] Failed to parse "${input}" with pattern "${options.format}". ` +
            `Verify the pattern matches the input exactly.`,
        );
      }
      localDate = parsed;
    }
    return options.timezone ? fromZonedTime(localDate, options.timezone) : localDate;
  }

  private _wrap(date: Date): DateUtils {
    return new DateUtils(date);
  }
  private _resolve(other: DateInput, opts?: DateUtilsOptions): Date {
    return new DateUtils(other, opts).toDate();
  }

  // ── Static factories ─────────────────────────────────────────────────────────

  static today(): DateUtils {
    return new DateUtils(startOfDay(new Date()));
  }
  static now(): DateUtils {
    return new DateUtils(new Date());
  }
  static fromUnix(timestamp: number): DateUtils {
    return new DateUtils(timestamp);
  }

  static safeParse(input: DateInput, options?: DateUtilsOptions): SafeParseResult {
    try {
      return { success: true, value: new DateUtils(input, options), error: null };
    } catch (err) {
      return { success: false, value: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  static max(inputs: DateInput[], options?: DateUtilsOptions): DateUtils {
    return new DateUtils(max(inputs.map(i => new DateUtils(i, options).toDate())));
  }

  static min(inputs: DateInput[], options?: DateUtilsOptions): DateUtils {
    return new DateUtils(min(inputs.map(i => new DateUtils(i, options).toDate())));
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
  get timezone() {
    return this._timezone;
  }

  // ── Timezone ─────────────────────────────────────────────────────────────────

  /** Converts the internal UTC moment to wall-clock time in the target timezone. */
  toTimezone(tz: Timezone): DateUtils {
    return new DateUtils(toZonedTime(this._date, tz), { timezone: tz });
  }

  /** Formats the date as it appears in the given timezone (display only). */
  formatInTimezone(pattern: string, tz: Timezone): string {
    return formatTz(toZonedTime(this._date, tz), pattern, { timeZone: tz });
  }

  /** Returns a native JS Date whose local time reflects the target timezone. */
  toDateInTimezone(tz: Timezone): Date {
    return toZonedTime(this._date, tz);
  }

  // ── Boundaries ───────────────────────────────────────────────────────────────

  startOfDay(): DateUtils {
    return this._wrap(startOfDay(this._date));
  }
  endOfDay(): DateUtils {
    return this._wrap(endOfDay(this._date));
  }
  startOfMonth(): DateUtils {
    return this._wrap(startOfMonth(this._date));
  }
  endOfMonth(): DateUtils {
    return this._wrap(endOfMonth(this._date));
  }
  startOfWeek(): DateUtils {
    return this._wrap(startOfWeek(this._date));
  }
  endOfWeek(): DateUtils {
    return this._wrap(endOfWeek(this._date));
  }

  // ── Addition ─────────────────────────────────────────────────────────────────

  addDays(n: number): DateUtils {
    return this._wrap(addDays(this._date, n));
  }
  addMonths(n: number): DateUtils {
    return this._wrap(addMonths(this._date, n));
  }
  addYears(n: number): DateUtils {
    return this._wrap(addYears(this._date, n));
  }
  addHours(n: number): DateUtils {
    return this._wrap(addHours(this._date, n));
  }
  addMinutes(n: number): DateUtils {
    return this._wrap(addMinutes(this._date, n));
  }

  // ── Subtraction ──────────────────────────────────────────────────────────────

  subDays(n: number): DateUtils {
    return this._wrap(subDays(this._date, n));
  }
  subHours(n: number): DateUtils {
    return this._wrap(subHours(this._date, n));
  }
  subMinutes(n: number): DateUtils {
    return this._wrap(subMinutes(this._date, n));
  }
  subMonths(n: number): DateUtils {
    return this._wrap(subMonths(this._date, n));
  }
  subYears(n: number): DateUtils {
    return this._wrap(subYears(this._date, n));
  }

  // ── Differences ──────────────────────────────────────────────────────────────

  diffInDays(other: DateInput, opts?: DateUtilsOptions): number {
    return differenceInDays(this._resolve(other, opts), this._date);
  }
  diffInHours(other: DateInput, opts?: DateUtilsOptions): number {
    return differenceInHours(this._resolve(other, opts), this._date);
  }
  diffInMinutes(other: DateInput, opts?: DateUtilsOptions): number {
    return differenceInMinutes(this._resolve(other, opts), this._date);
  }
  diffInSeconds(other: DateInput, opts?: DateUtilsOptions): number {
    return differenceInSeconds(this._resolve(other, opts), this._date);
  }

  // ── Comparisons ──────────────────────────────────────────────────────────────

  isBefore(other: DateInput, opts?: DateUtilsOptions): boolean {
    return isBefore(this._date, this._resolve(other, opts));
  }
  isAfter(other: DateInput, opts?: DateUtilsOptions): boolean {
    return isAfter(this._date, this._resolve(other, opts));
  }
  isEqual(other: DateInput, opts?: DateUtilsOptions): boolean {
    return isEqual(this._date, this._resolve(other, opts));
  }

  isInRange(start: DateInput, end: DateInput, startOpts?: DateUtilsOptions, endOpts?: DateUtilsOptions): boolean {
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

  clamp(start: DateInput, end: DateInput, startOpts?: DateUtilsOptions, endOpts?: DateUtilsOptions): DateUtils {
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

## 5. Playwright Test Examples

### 5.1 Parsing

```typescript
import { test, expect } from '@playwright/test';
import { DateUtils, DATE_FORMATS } from './DateUtils';

test.describe('Parsing', () => {
  test('from a JS Date object', () => {
    const du = new DateUtils(new Date('2026-03-28T14:30:00.000Z'));
    expect(du.format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28');
  });

  test('from a Unix timestamp', () => {
    const du = new DateUtils(1743170400);
    expect(du.toISO()).toContain('2026-03-28');
  });

  test('from an ISO string — no format needed', () => {
    const du = new DateUtils('2026-03-28T14:30:00.000Z');
    expect(du.format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28');
  });

  test('from a US date string', () => {
    const du = new DateUtils('03/28/2026', { format: DATE_FORMATS.US_SHORT });
    expect(du.format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28');
  });

  test('from a European date string', () => {
    const du = new DateUtils('28/03/2026', { format: DATE_FORMATS.EU_SHORT });
    expect(du.format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28');
  });

  test('from a long-form string', () => {
    const du = new DateUtils('March 28, 2026', { format: DATE_FORMATS.LONG });
    expect(du.format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28');
  });

  test('safeParse returns success for valid input', () => {
    const result = DateUtils.safeParse('2026-03-28', { format: DATE_FORMATS.ISO_DATE });
    expect(result.success).toBe(true);
    expect(result.value).not.toBeNull();
  });

  test('safeParse returns failure for invalid input', () => {
    const result = DateUtils.safeParse('not-a-date', { format: DATE_FORMATS.ISO_DATE });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to parse');
  });

  test('throws when string format is missing and input is not ISO', () => {
    expect(() => new DateUtils('28/03/2026')).toThrow('could not be parsed as ISO 8601');
  });
});
```

### 5.2 Formatting

```typescript
test.describe('Formatting', () => {
  const du = new DateUtils('2026-03-28T14:30:00.000Z');

  test('ISO date only', () => expect(du.format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28'));
  test('US short', () => expect(du.format(DATE_FORMATS.US_SHORT)).toBe('03/28/2026'));
  test('EU short', () => expect(du.format(DATE_FORMATS.EU_SHORT)).toBe('28/03/2026'));
  test('long form', () => expect(du.format(DATE_FORMATS.LONG)).toBe('March 28, 2026'));
  test('full with day', () => expect(du.format(DATE_FORMATS.FULL_WITH_DAY)).toBe('Saturday, March 28, 2026'));
  test('year month', () => expect(du.format(DATE_FORMATS.YEAR_MONTH)).toBe('2026-03'));

  test('toISO', () => expect(du.toISO()).toBe('2026-03-28T14:30:00.000Z'));
  test('toMillis', () => expect(du.toMillis()).toBe(new Date('2026-03-28T14:30:00.000Z').getTime()));

  test('toDate returns a native JS Date', () => {
    const date = du.toDate();
    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe('2026-03-28T14:30:00.000Z');
  });
});
```

### 5.3 Timezone

```typescript
import { TIMEZONES } from './DateUtils';

test.describe('Timezone', () => {
  test('parse Pacific time → convert to Eastern', () => {
    // 14:30 PST (UTC-8) = 17:30 EST (UTC-5)
    const pacific = new DateUtils('2026-03-28 14:30:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.US.PACIFIC,
    });
    expect(pacific.toTimezone(TIMEZONES.US.EASTERN).format(DATE_FORMATS.TIME_24H)).toBe('17:30:00');
  });

  test('parse Pacific time → convert to UTC', () => {
    // 14:30 PST = 22:30 UTC
    const pacific = new DateUtils('2026-03-28 14:30:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.US.PACIFIC,
    });
    expect(pacific.toTimezone(TIMEZONES.UTC).format(DATE_FORMATS.TIME_24H)).toBe('22:30:00');
  });

  test('convert London time to Tokyo time', () => {
    // 09:00 GMT = 18:00 JST (UTC+9)
    const london = new DateUtils('2026-03-28 09:00:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.EUROPE.LONDON,
    });
    expect(london.toTimezone(TIMEZONES.ASIA.TOKYO).format(DATE_FORMATS.TIME_24H)).toBe('18:00:00');
  });

  test('formatInTimezone — display only, no new instance', () => {
    const du = new DateUtils('2026-03-28T22:30:00.000Z');
    expect(du.formatInTimezone(DATE_FORMATS.TIME_24H, TIMEZONES.US.PACIFIC)).toBe('14:30:00');
  });

  test('toDateInTimezone returns a native Date in target zone', () => {
    const du = new DateUtils('2026-03-28T22:30:00.000Z');
    const date = du.toDateInTimezone(TIMEZONES.US.PACIFIC);
    expect(date).toBeInstanceOf(Date);
    expect(date.getHours()).toBe(14);
  });

  test('chaining toTimezone preserves the UTC moment', () => {
    const pacific = new DateUtils('2026-03-28 14:30:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.US.PACIFIC,
    });
    const viaEastern = pacific.toTimezone(TIMEZONES.US.EASTERN).toTimezone(TIMEZONES.UTC);
    const directUTC = pacific.toTimezone(TIMEZONES.UTC);
    expect(viaEastern.format(DATE_FORMATS.TIME_24H)).toBe(directUTC.format(DATE_FORMATS.TIME_24H));
  });
});
```

### 5.4 Arithmetic

```typescript
test.describe('Arithmetic', () => {
  const base = new DateUtils('2026-03-28T10:00:00.000Z');

  test('addDays', () => expect(base.addDays(7).format(DATE_FORMATS.ISO_DATE)).toBe('2026-04-04'));
  test('subDays', () => expect(base.subDays(7).format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-21'));
  test('addMonths', () => expect(base.addMonths(2).format(DATE_FORMATS.ISO_DATE)).toBe('2026-05-28'));
  test('subMonths', () => expect(base.subMonths(2).format(DATE_FORMATS.ISO_DATE)).toBe('2026-01-28'));
  test('addYears', () => expect(base.addYears(1).format(DATE_FORMATS.ISO_DATE)).toBe('2027-03-28'));
  test('subYears', () => expect(base.subYears(1).format(DATE_FORMATS.ISO_DATE)).toBe('2025-03-28'));
  test('addHours', () => expect(base.addHours(5).format(DATE_FORMATS.TIME_24H)).toBe('15:00:00'));
  test('subHours', () => expect(base.subHours(4).format(DATE_FORMATS.TIME_24H)).toBe('06:00:00'));
  test('addMinutes', () => expect(base.addMinutes(90).format(DATE_FORMATS.TIME_24H)).toBe('11:30:00'));
  test('subMinutes', () => expect(base.subMinutes(30).format(DATE_FORMATS.TIME_24H)).toBe('09:30:00'));

  test('chaining multiple operations', () => {
    const result = base.addDays(3).addMonths(1).subHours(2).addMinutes(15);
    expect(result.format(DATE_FORMATS.DATETIME_24H)).toBe('2026-04-30 08:15:00');
  });

  test('immutability — original is unchanged after arithmetic', () => {
    const original = base.format(DATE_FORMATS.ISO_DATE);
    base.addDays(100);
    expect(base.format(DATE_FORMATS.ISO_DATE)).toBe(original);
  });
});
```

### 5.5 Differences

```typescript
test.describe('Differences', () => {
  const start = new DateUtils('2026-03-28T10:00:00.000Z');
  const end = new DateUtils('2026-04-04T12:30:45.000Z');

  test('diffInDays', () => expect(start.diffInDays(end.toISO())).toBe(7));
  test('diffInHours', () => expect(start.diffInHours(end.toISO())).toBe(170));
  test('diffInMinutes', () => expect(start.diffInMinutes(end.toISO())).toBe(10230));
  test('diffInSeconds', () => expect(start.diffInSeconds(end.toISO())).toBe(613845));

  test('negative diff when other is in the past', () => {
    expect(start.diffInDays('2026-03-21')).toBe(-7);
  });
});
```

### 5.6 Comparisons

```typescript
test.describe('Comparisons', () => {
  const past = new DateUtils('2025-01-01');
  const present = new DateUtils('2026-03-28');
  const future = new DateUtils('2027-12-31');

  test('isBefore', () => {
    expect(past.isBefore(present.toISO())).toBe(true);
    expect(future.isBefore(present.toISO())).toBe(false);
  });

  test('isAfter', () => {
    expect(future.isAfter(present.toISO())).toBe(true);
    expect(past.isAfter(present.toISO())).toBe(false);
  });

  test('isEqual — same instant', () => {
    const a = new DateUtils('2026-03-28T10:00:00.000Z');
    const b = new DateUtils('2026-03-28T10:00:00.000Z');
    expect(a.isEqual(b.toISO())).toBe(true);
  });

  test('isEqual — different times on same day', () => {
    const a = new DateUtils('2026-03-28T10:00:00.000Z');
    const b = new DateUtils('2026-03-28T10:00:01.000Z');
    expect(a.isEqual(b.toISO())).toBe(false);
  });
});
```

### 5.7 Ranges

```typescript
test.describe('Ranges', () => {
  const rangeStart = '2026-01-01';
  const rangeEnd = '2026-12-31';

  test('isInRange — within', () => expect(new DateUtils('2026-06-15').isInRange(rangeStart, rangeEnd)).toBe(true));
  test('isInRange — on start boundary', () =>
    expect(new DateUtils(rangeStart).isInRange(rangeStart, rangeEnd)).toBe(true));
  test('isInRange — on end boundary', () => expect(new DateUtils(rangeEnd).isInRange(rangeStart, rangeEnd)).toBe(true));
  test('isInRange — outside', () => expect(new DateUtils('2025-12-31').isInRange(rangeStart, rangeEnd)).toBe(false));

  test('clamp — within range', () => {
    expect(new DateUtils('2026-06-15').clamp(rangeStart, rangeEnd).format(DATE_FORMATS.ISO_DATE)).toBe('2026-06-15');
  });

  test('clamp — before range → returns start', () => {
    expect(new DateUtils('2025-06-15').clamp(rangeStart, rangeEnd).format(DATE_FORMATS.ISO_DATE)).toBe('2026-01-01');
  });

  test('clamp — after range → returns end', () => {
    expect(new DateUtils('2027-06-15').clamp(rangeStart, rangeEnd).format(DATE_FORMATS.ISO_DATE)).toBe('2026-12-31');
  });

  test('max — returns latest date', () => {
    expect(DateUtils.max(['2026-01-01', '2026-06-01', '2025-12-31']).format(DATE_FORMATS.ISO_DATE)).toBe('2026-06-01');
  });

  test('min — returns earliest date', () => {
    expect(DateUtils.min(['2026-01-01', '2026-06-01', '2025-12-31']).format(DATE_FORMATS.ISO_DATE)).toBe('2025-12-31');
  });
});
```

### 5.8 Predicates

```typescript
test.describe('Predicates', () => {
  test('isToday', () => expect(DateUtils.today().isToday()).toBe(true));
  test('isFuture', () => expect(new DateUtils('2099-01-01').isFuture()).toBe(true));
  test('isPast', () => expect(new DateUtils('2020-01-01').isPast()).toBe(true));
  test('isWeekend — Saturday', () => expect(new DateUtils('2026-03-28').isWeekend()).toBe(true));
  test('isWeekend — Monday', () => expect(new DateUtils('2026-03-30').isWeekend()).toBe(false));
});
```

### 5.9 Boundaries

```typescript
test.describe('Boundaries', () => {
  const du = new DateUtils('2026-03-28T14:30:00.000Z');

  test('startOfDay', () => expect(du.startOfDay().format(DATE_FORMATS.DATETIME_24H)).toBe('2026-03-28 00:00:00'));
  test('endOfDay', () => expect(du.endOfDay().format(DATE_FORMATS.DATETIME_24H)).toBe('2026-03-28 23:59:59'));
  test('startOfMonth', () => expect(du.startOfMonth().format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-01'));
  test('endOfMonth', () => expect(du.endOfMonth().format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-31'));
  test('startOfWeek', () => expect(du.startOfWeek().format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-22'));
  test('endOfWeek', () => expect(du.endOfWeek().format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28'));

  test('chaining — startOfMonth + addDays', () => {
    expect(du.startOfMonth().addDays(14).format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-15');
  });
});
```

### 5.10 Static Factories

```typescript
test.describe('Static factories', () => {
  test('today() returns start of current day', () => {
    expect(DateUtils.today().isToday()).toBe(true);
    expect(DateUtils.today().format(DATE_FORMATS.TIME_24H)).toBe('00:00:00');
  });

  test('now() returns current date and time', () => {
    expect(DateUtils.now().isToday()).toBe(true);
  });

  test('fromUnix() round-trips the timestamp', () => {
    const du = DateUtils.fromUnix(1743170400);
    expect(du.toUnix()).toBe(1743170400);
  });
});
```

### 5.11 Real-World Scenarios

```typescript
test.describe('Real-world scenarios', () => {
  test('generate check-in / check-out dates for a booking form', () => {
    const checkIn = DateUtils.today().addDays(7);
    const checkOut = checkIn.addDays(3);

    expect(checkIn.diffInDays(checkOut.toDate())).toBe(3);
    expect(checkIn.isBefore(checkOut.toISO())).toBe(true);

    // Assert the displayed confirmation text round-trips correctly
    const displayed = checkIn.format(DATE_FORMATS.LONG);
    const parsed = new DateUtils(displayed, { format: DATE_FORMATS.LONG });
    expect(parsed.format(DATE_FORMATS.ISO_DATE)).toBe(checkIn.format(DATE_FORMATS.ISO_DATE));
  });

  test('assert an API timestamp falls within the expected window', () => {
    const apiTimestamp = '2026-03-28T14:30:00.000Z';
    const windowStart = DateUtils.now().subHours(1);
    const windowEnd = DateUtils.now().addHours(1);

    expect(new DateUtils(apiTimestamp).isInRange(windowStart.toDate(), windowEnd.toDate())).toBe(true);
  });

  test('convert UTC API timestamp to Pacific display format', () => {
    const apiUtc = new DateUtils('2026-03-28T22:30:00.000Z');
    expect(apiUtc.formatInTimezone(DATE_FORMATS.US_DATETIME, TIMEZONES.US.PACIFIC)).toBe('03/28/2026 02:30 PM');
  });

  test('session expiry is within the next 30 minutes', () => {
    const expiresAt = DateUtils.now().addMinutes(25);
    expect(expiresAt.isBefore(DateUtils.now().addMinutes(30).toISO())).toBe(true);
    expect(expiresAt.isFuture()).toBe(true);
  });

  test('filter dates to Q2 2026 only', () => {
    const q2Start = new DateUtils('2026-04-01');
    const q2End = new DateUtils('2026-06-30');
    const dates = [
      new DateUtils('2026-01-15'),
      new DateUtils('2026-04-10'),
      new DateUtils('2026-05-20'),
      new DateUtils('2026-07-01'),
    ];
    const inQ2 = dates.filter(d => d.isInRange(q2Start.toDate(), q2End.toDate()));
    expect(inQ2).toHaveLength(2);
    expect(inQ2[0].format(DATE_FORMATS.ISO_DATE)).toBe('2026-04-10');
    expect(inQ2[1].format(DATE_FORMATS.ISO_DATE)).toBe('2026-05-20');
  });

  test('multi-timezone meeting scheduler', () => {
    // 09:00 Eastern
    const meeting = new DateUtils('2026-03-28 09:00:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.US.EASTERN,
    });

    expect(meeting.toTimezone(TIMEZONES.EUROPE.LONDON).format(DATE_FORMATS.TIME_24H)).toBe('14:00:00');
    expect(meeting.toTimezone(TIMEZONES.ASIA.TOKYO).format(DATE_FORMATS.TIME_24H)).toBe('22:00:00');
    expect(meeting.toTimezone(TIMEZONES.US.PACIFIC).format(DATE_FORMATS.TIME_24H)).toBe('06:00:00');
  });
});
```

---

## 6. Error Handling

The utility throws descriptive errors on invalid input. Use `safeParse` when working with untrusted or external data:

```typescript
const result = DateUtils.safeParse('bad-input', { format: DATE_FORMATS.ISO_DATE });

if (!result.success) {
  console.warn(result.error);
  // [DateUtils] Failed to parse "bad-input" with pattern "yyyy-MM-dd".
} else {
  console.log(result.value!.toISO());
}
```

| Scenario                        | Error Message                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------- |
| String without format (non-ISO) | `String input "..." could not be parsed as ISO 8601. Provide a format pattern...` |
| Invalid `Date` object           | `Invalid Date object provided.`                                                   |
| Mismatched pattern              | `Failed to parse "28-03-2026" with pattern "MM/dd/yyyy". Verify the pattern...`   |
| Invalid Unix timestamp          | `Invalid Unix timestamp: <value>`                                                 |
| Wrong input type                | `Input must be a Date, string, or Unix timestamp (number).`                       |

---

## 7. Best Practices

### 7.1 Always Declare the Pattern for Strings

```typescript
// ✅ Correct — use DATE_FORMATS constants
const du = new DateUtils('28/03/2026', { format: DATE_FORMATS.EU_SHORT });

// ❌ Avoid inline string literals
const du = new DateUtils('28/03/2026', { format: 'dd/MM/yyyy' });
```

### 7.2 Always Declare the Timezone for Zoned Inputs

```typescript
// ✅ Correct — input is unambiguously anchored to Pacific time
const du = new DateUtils('2026-03-28 14:30:00', {
  format: DATE_FORMATS.DATETIME_24H,
  timezone: TIMEZONES.US.PACIFIC,
});

// ❌ Ambiguous — parsed as local system time, not Pacific
const du = new DateUtils('2026-03-28 14:30:00', { format: DATE_FORMATS.DATETIME_24H });
```

### 7.3 Prefer `formatInTimezone` for Display, `toTimezone` for Chaining

```typescript
// Display only — no new instance needed
du.formatInTimezone(DATE_FORMATS.TIME_24H, TIMEZONES.US.EASTERN);

// Chaining — use toTimezone to keep working with the result
du.toTimezone(TIMEZONES.US.EASTERN).addDays(1).format(DATE_FORMATS.ISO_DATE);
```

### 7.4 Immutability

```typescript
// Every method returns a new instance — the original is never mutated
const original = DateUtils.today();
const modified = original.addDays(7).startOfDay();
// original is unchanged
```

### 7.5 Tree-Shaking

```typescript
// ✅ Tree-shakable — import only what you need
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

---

## 9. Timezone Quick Reference

| Constant                   | IANA Identifier       | Offset          |
| -------------------------- | --------------------- | --------------- |
| `TIMEZONES.US.PACIFIC`     | `America/Los_Angeles` | UTC-8 / UTC-7   |
| `TIMEZONES.US.MOUNTAIN`    | `America/Denver`      | UTC-7 / UTC-6   |
| `TIMEZONES.US.CENTRAL`     | `America/Chicago`     | UTC-6 / UTC-5   |
| `TIMEZONES.US.EASTERN`     | `America/New_York`    | UTC-5 / UTC-4   |
| `TIMEZONES.US.HAWAII`      | `Pacific/Honolulu`    | UTC-10          |
| `TIMEZONES.EUROPE.LONDON`  | `Europe/London`       | UTC+0 / UTC+1   |
| `TIMEZONES.EUROPE.PARIS`   | `Europe/Paris`        | UTC+1 / UTC+2   |
| `TIMEZONES.EUROPE.BERLIN`  | `Europe/Berlin`       | UTC+1 / UTC+2   |
| `TIMEZONES.ASIA.KOLKATA`   | `Asia/Kolkata`        | UTC+5:30        |
| `TIMEZONES.ASIA.SINGAPORE` | `Asia/Singapore`      | UTC+8           |
| `TIMEZONES.ASIA.TOKYO`     | `Asia/Tokyo`          | UTC+9           |
| `TIMEZONES.PACIFIC.SYDNEY` | `Australia/Sydney`    | UTC+10 / UTC+11 |
| `TIMEZONES.UTC`            | `UTC`                 | UTC+0           |
