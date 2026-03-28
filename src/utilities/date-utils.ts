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

/**
 * Commonly used date format patterns across test automation and API integrations.
 * Always use these constants instead of inline string literals to ensure
 * consistency across the test suite.
 *
 * @example
 * const du = new DateUtility('28/03/2026', { format: DATE_FORMATS.EU_SHORT });
 * du.format(DATE_FORMATS.ISO_DATE); // '2026-03-28'
 */
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
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Accepted input types for DateUtility construction. */
export type DateInput = Date | string | number;

/** Options for string-based date parsing. */
export interface DateUtilityOptions {
  /**
   * Format pattern matching the input string (required for non-ISO strings).
   * Use tokens from DATE_FORMATS or any valid date-fns format string.
   */
  format?: string;

  /**
   * Reference date used as base for relative date-fns parsing.
   * Defaults to the current date/time if not provided.
   */
  referenceDate?: Date;
}

/** Result of a safe parse attempt. */
export interface SafeParseResult {
  success: boolean;
  value: DateUtility | null;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DateUtility CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A fluent, immutable date utility built on top of date-fns.
 *
 * Supports three input strategies:
 *  - `Date`   — validated and stored directly
 *  - `string` — requires an explicit `format` option (ISO 8601 auto-detected as fallback)
 *  - `number` — treated as a Unix timestamp (seconds)
 *
 * All mutation methods (addDays, subMonths, etc.) return a **new** DateUtility instance,
 * preserving immutability and enabling method chaining.
 *
 * @example
 * // From a JS Date
 * const du = new DateUtility(new Date());
 * du.format(DATE_FORMATS.ISO_DATE); // '2026-03-28'
 *
 * @example
 * // From a string with explicit pattern
 * const du = new DateUtility('28/03/2026', { format: DATE_FORMATS.EU_SHORT });
 * du.addDays(7).format(DATE_FORMATS.US_SHORT); // '04/04/2026'
 *
 * @example
 * // From a Unix timestamp
 * const du = new DateUtility(1743163200);
 * du.toISO(); // '2025-03-28T00:00:00.000Z'
 */
export class DateUtility {
  private readonly _date: Date;
  private readonly _sourcePattern: string | undefined;

  // ── Constructor ─────────────────────────────────────────────────────────────

  constructor(input: DateInput, options: DateUtilityOptions = {}) {
    this._date = DateUtility._resolveInput(input, options);
    this._sourcePattern = typeof input === 'string' ? options.format : undefined;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private static _resolveInput(input: DateInput, options: DateUtilityOptions): Date {
    if (input instanceof Date) {
      if (!isValid(input)) {
        throw new Error('[DateUtility] Invalid Date object provided.');
      }
      return input;
    }

    if (typeof input === 'number') {
      const date = fromUnixTime(input);
      if (!isValid(date)) {
        throw new Error(`[DateUtility] Invalid Unix timestamp: ${input}`);
      }
      return date;
    }

    if (typeof input === 'string') {
      return DateUtility._parseString(input, options);
    }

    throw new Error('[DateUtility] Input must be a Date, string, or Unix timestamp (number).');
  }

  private static _parseString(input: string, options: DateUtilityOptions): Date {
    if (!options.format) {
      // Fallback: attempt ISO 8601 auto-detection
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

  // ── Static factory methods ───────────────────────────────────────────────────

  /**
   * Creates a DateUtility representing the current date at midnight (00:00:00.000).
   *
   * @example
   * DateUtility.today().format(DATE_FORMATS.ISO_DATE); // '2026-03-28'
   */
  static today(): DateUtility {
    return new DateUtility(startOfDay(new Date()));
  }

  /**
   * Creates a DateUtility representing the current date and time.
   *
   * @example
   * DateUtility.now().toISO(); // '2026-03-28T14:32:00.000Z'
   */
  static now(): DateUtility {
    return new DateUtility(new Date());
  }

  /**
   * Creates a DateUtility from a Unix timestamp (seconds since epoch).
   *
   * @example
   * DateUtility.fromUnix(1743163200).format(DATE_FORMATS.ISO_DATE);
   */
  static fromUnix(timestamp: number): DateUtility {
    return new DateUtility(timestamp);
  }

  /**
   * Safely attempts to parse a DateInput.
   * Returns a SafeParseResult instead of throwing on failure.
   *
   * @example
   * const result = DateUtility.safeParse('bad-date', { format: DATE_FORMATS.ISO_DATE });
   * if (!result.success) console.warn(result.error);
   */
  static safeParse(input: DateInput, options?: DateUtilityOptions): SafeParseResult {
    try {
      return { success: true, value: new DateUtility(input, options), error: null };
    } catch (err) {
      return {
        success: false,
        value: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Returns the latest (maximum) DateUtility from a list of DateInput values.
   *
   * @example
   * DateUtility.max(['2026-01-01', '2026-06-01', '2025-12-31']).format(DATE_FORMATS.ISO_DATE);
   * // '2026-06-01'
   */
  static max(inputs: DateInput[], options?: DateUtilityOptions): DateUtility {
    const dates = inputs.map(i => new DateUtility(i, options).toDate());
    return new DateUtility(max(dates));
  }

  /**
   * Returns the earliest (minimum) DateUtility from a list of DateInput values.
   *
   * @example
   * DateUtility.min(['2026-01-01', '2026-06-01', '2025-12-31']).format(DATE_FORMATS.ISO_DATE);
   * // '2025-12-31'
   */
  static min(inputs: DateInput[], options?: DateUtilityOptions): DateUtility {
    const dates = inputs.map(i => new DateUtility(i, options).toDate());
    return new DateUtility(min(dates));
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  /** Returns the underlying JS Date object. */
  toDate(): Date {
    return this._date;
  }

  /**
   * Formats the date using a date-fns format string.
   * Use DATE_FORMATS constants for consistency.
   *
   * @example
   * du.format(DATE_FORMATS.EU_SHORT); // '28/03/2026'
   */
  format(pattern: string): string {
    return format(this._date, pattern);
  }

  /** Returns the ISO 8601 string representation. */
  toISO(): string {
    return this._date.toISOString();
  }

  /**
   * Returns the Unix timestamp in seconds.
   *
   * @example
   * DateUtility.today().toUnix(); // e.g. 1743120000
   */
  toUnix(): number {
    return getUnixTime(this._date);
  }

  /** Returns the Unix timestamp in milliseconds. */
  toMillis(): number {
    return this._date.getTime();
  }

  /** The format pattern used when this instance was parsed from a string. */
  get sourcePattern(): string | undefined {
    return this._sourcePattern;
  }

  // ── Boundary helpers ─────────────────────────────────────────────────────────

  /** Returns a new DateUtility at 00:00:00.000 of the same day. */
  startOfDay(): DateUtility {
    return this._wrap(startOfDay(this._date));
  }

  /** Returns a new DateUtility at 23:59:59.999 of the same day. */
  endOfDay(): DateUtility {
    return this._wrap(endOfDay(this._date));
  }

  /** Returns a new DateUtility at the first moment of the current month. */
  startOfMonth(): DateUtility {
    return this._wrap(startOfMonth(this._date));
  }

  /** Returns a new DateUtility at the last moment of the current month. */
  endOfMonth(): DateUtility {
    return this._wrap(endOfMonth(this._date));
  }

  /** Returns a new DateUtility at the start of the current week (Sunday by default). */
  startOfWeek(): DateUtility {
    return this._wrap(startOfWeek(this._date));
  }

  /** Returns a new DateUtility at the end of the current week (Saturday by default). */
  endOfWeek(): DateUtility {
    return this._wrap(endOfWeek(this._date));
  }

  // ── Arithmetic — addition ────────────────────────────────────────────────────

  /** Returns a new DateUtility with N days added. */
  addDays(n: number): DateUtility {
    return this._wrap(addDays(this._date, n));
  }

  /** Returns a new DateUtility with N months added. */
  addMonths(n: number): DateUtility {
    return this._wrap(addMonths(this._date, n));
  }

  /** Returns a new DateUtility with N years added. */
  addYears(n: number): DateUtility {
    return this._wrap(addYears(this._date, n));
  }

  /** Returns a new DateUtility with N hours added. */
  addHours(n: number): DateUtility {
    return this._wrap(addHours(this._date, n));
  }

  /** Returns a new DateUtility with N minutes added. */
  addMinutes(n: number): DateUtility {
    return this._wrap(addMinutes(this._date, n));
  }

  // ── Arithmetic — subtraction ─────────────────────────────────────────────────

  /** Returns a new DateUtility with N days subtracted. */
  subDays(n: number): DateUtility {
    return this._wrap(subDays(this._date, n));
  }

  /** Returns a new DateUtility with N months subtracted. */
  subMonths(n: number): DateUtility {
    return this._wrap(subMonths(this._date, n));
  }

  /** Returns a new DateUtility with N years subtracted. */
  subYears(n: number): DateUtility {
    return this._wrap(subYears(this._date, n));
  }

  // ── Differences ──────────────────────────────────────────────────────────────

  /**
   * Returns the number of full days between this date and `other`.
   * Positive if `other` is in the future, negative if in the past.
   */
  diffInDays(other: DateInput, opts?: DateUtilityOptions): number {
    return differenceInDays(this._resolve(other, opts), this._date);
  }

  /**
   * Returns the number of full hours between this date and `other`.
   */
  diffInHours(other: DateInput, opts?: DateUtilityOptions): number {
    return differenceInHours(this._resolve(other, opts), this._date);
  }

  /**
   * Returns the number of full minutes between this date and `other`.
   */
  diffInMinutes(other: DateInput, opts?: DateUtilityOptions): number {
    return differenceInMinutes(this._resolve(other, opts), this._date);
  }

  /**
   * Returns the number of full seconds between this date and `other`.
   */
  diffInSeconds(other: DateInput, opts?: DateUtilityOptions): number {
    return differenceInSeconds(this._resolve(other, opts), this._date);
  }

  // ── Comparisons ──────────────────────────────────────────────────────────────

  /** Returns true if this date is strictly before `other`. */
  isBefore(other: DateInput, opts?: DateUtilityOptions): boolean {
    return isBefore(this._date, this._resolve(other, opts));
  }

  /** Returns true if this date is strictly after `other`. */
  isAfter(other: DateInput, opts?: DateUtilityOptions): boolean {
    return isAfter(this._date, this._resolve(other, opts));
  }

  /** Returns true if this date equals `other` at the millisecond level. */
  isEqual(other: DateInput, opts?: DateUtilityOptions): boolean {
    return isEqual(this._date, this._resolve(other, opts));
  }

  /**
   * Returns true if this date falls within [start, end] inclusive.
   *
   * @example
   * du.isInRange('2026-01-01', '2026-12-31'); // true
   */
  isInRange(start: DateInput, end: DateInput, startOpts?: DateUtilityOptions, endOpts?: DateUtilityOptions): boolean {
    const s = this._resolve(start, startOpts);
    const e = this._resolve(end, endOpts);
    return (isAfter(this._date, s) || isEqual(this._date, s)) && (isBefore(this._date, e) || isEqual(this._date, e));
  }

  // ── Boolean predicates ───────────────────────────────────────────────────────

  /** Returns true if the date falls on a Saturday or Sunday. */
  isWeekend(): boolean {
    return isWeekend(this._date);
  }

  /** Returns true if the date is today (ignoring time). */
  isToday(): boolean {
    return isToday(this._date);
  }

  /** Returns true if the date is in the future. */
  isFuture(): boolean {
    return isFuture(this._date);
  }

  /** Returns true if the date is in the past. */
  isPast(): boolean {
    return isPast(this._date);
  }

  // ── Clamping ─────────────────────────────────────────────────────────────────

  /**
   * Clamps this date within [start, end].
   * Returns `start` if before it, `end` if after it, or itself if within range.
   *
   * @example
   * du.clamp('2026-01-01', '2026-06-30').format(DATE_FORMATS.ISO_DATE);
   */
  clamp(start: DateInput, end: DateInput, startOpts?: DateUtilityOptions, endOpts?: DateUtilityOptions): DateUtility {
    return this._wrap(
      clamp(this._date, {
        start: this._resolve(start, startOpts),
        end: this._resolve(end, endOpts),
      }),
    );
  }
}
