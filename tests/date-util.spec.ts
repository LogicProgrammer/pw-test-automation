import { expect, test } from '@playwright/test';
import { DATE_FORMATS, DateUtils, TIMEZONES } from 'src/utilities/date-utils';

// ─────────────────────────────────────────────────────────────────────────────
// 1. PARSING — constructing a DateUtils from different input types
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Parsing', () => {
  test('from a JS Date object', () => {
    const du = new DateUtils(new Date('2026-03-28T14:30:00.000Z'));
    expect(du.format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28');
  });

  test('from a Unix timestamp', () => {
    const du = new DateUtils(1743170400); // seconds
    expect(du.format(DATE_FORMATS.ISO_DATE)).toContain('2025-03-28');
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

  test('from a dot-separated European string', () => {
    const du = new DateUtils('28.03.2026', { format: DATE_FORMATS.EU_DOT });
    expect(du.format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28');
  });

  test('from a long-form string', () => {
    const du = new DateUtils('March 28, 2026', { format: DATE_FORMATS.LONG });
    expect(du.format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28');
  });

  test('from a datetime string with 24h time', () => {
    const du = new DateUtils('2026-03-28 14:30:00', { format: DATE_FORMATS.DATETIME_24H });
    expect(du.format(DATE_FORMATS.TIME_24H)).toBe('14:30:00');
  });

  test('from a 12h datetime string', () => {
    const du = new DateUtils('03/28/2026 02:30 PM', { format: DATE_FORMATS.US_DATETIME });
    expect(du.format(DATE_FORMATS.TIME_12H)).toBe('02:30 PM');
  });

  test('safeParse returns success for valid input', () => {
    const result = DateUtils.safeParse('2026-03-28', { format: DATE_FORMATS.ISO_DATE });
    expect(result.success).toBe(true);
    expect(result.value).not.toBeNull();
    expect(result.error).toBeNull();
  });

  test('safeParse returns failure for invalid input', () => {
    const result = DateUtils.safeParse('not-a-date', { format: DATE_FORMATS.ISO_DATE });
    expect(result.success).toBe(false);
    expect(result.value).toBeNull();
    expect(result.error).toContain('Failed to parse');
  });

  test('throws when string format is missing and input is not ISO', () => {
    expect(() => new DateUtils('28/03/2026')).toThrow('could not be parsed as ISO 8601');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. FORMATTING — converting to different output string formats
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Formatting', () => {
  const du = new DateUtils('2026-03-28T14:30:00.000Z');

  test('ISO date only', () => {
    expect(du.format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28');
  });

  test('US short', () => {
    expect(du.format(DATE_FORMATS.US_SHORT)).toBe('03/28/2026');
  });

  test('EU short', () => {
    expect(du.format(DATE_FORMATS.EU_SHORT)).toBe('28/03/2026');
  });

  test('long form', () => {
    expect(du.format(DATE_FORMATS.LONG)).toBe('March 28, 2026');
  });

  test('full with day name', () => {
    expect(du.format(DATE_FORMATS.FULL_WITH_DAY)).toBe('Saturday, March 28, 2026');
  });

  test('year and month only', () => {
    expect(du.format(DATE_FORMATS.YEAR_MONTH)).toBe('2026-03');
  });

  test('toISO returns full ISO string', () => {
    expect(du.toISO()).toBe('2026-03-28T14:30:00.000Z');
  });

  test('toUnix returns seconds', () => {
    expect(typeof du.toUnix()).toBe('number');
    expect(du.toUnix()).toBeGreaterThan(0);
  });

  test('toMillis returns milliseconds', () => {
    expect(du.toMillis()).toBe(new Date('2026-03-28T14:30:00.000Z').getTime());
  });

  test('toDate returns a native JS Date', () => {
    const date = du.toDate();
    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe('2026-03-28T14:30:00.000Z');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TIMEZONE — parsing with a zone, converting between zones
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Timezone', () => {
  test('parse Pacific time string → convert to Eastern', () => {
    // 14:30 Pacific = 17:30 Eastern (PST is UTC-8, EST is UTC-5)
    const pacific = new DateUtils('2026-03-28 14:30:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.US.PACIFIC,
    });

    const eastern = pacific.toTimezone(TIMEZONES.US.EASTERN);
    expect(eastern.format(DATE_FORMATS.TIME_24H)).toBe('17:30:00');
  });

  test('parse Pacific time string → convert to UTC', () => {
    // 14:30 PST = 22:30 UTC
    const pacific = new DateUtils('2026-03-28 14:30:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.US.PACIFIC,
    });

    const utc = pacific.toTimezone(TIMEZONES.UTC);
    expect(utc.format(DATE_FORMATS.TIME_24H)).toBe('22:30:00');
  });

  test('parse Eastern time string → convert to Pacific', () => {
    // 17:30 Eastern = 14:30 Pacific
    const eastern = new DateUtils('2026-03-28 17:30:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.US.EASTERN,
    });

    const pacific = eastern.toTimezone(TIMEZONES.US.PACIFIC);
    expect(pacific.format(DATE_FORMATS.TIME_24H)).toBe('14:30:00');
  });

  test('convert London time to Tokyo time', () => {
    // 09:00 London GMT = 18:00 Tokyo JST (UTC+9)
    const london = new DateUtils('2026-03-28 09:00:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.EUROPE.LONDON,
    });

    const tokyo = london.toTimezone(TIMEZONES.ASIA.TOKYO);
    expect(tokyo.format(DATE_FORMATS.TIME_24H)).toBe('18:00:00');
  });

  test('formatInTimezone — display only, no new instance', () => {
    const du = new DateUtils('2026-03-28T22:30:00.000Z');

    // Same UTC moment rendered in Pacific wall-clock time
    expect(du.formatInTimezone(DATE_FORMATS.TIME_24H, TIMEZONES.US.PACIFIC)).toBe('14:30:00');
  });

  test('toDateInTimezone returns a native Date in target zone', () => {
    const du = new DateUtils('2026-03-28T22:30:00.000Z');
    const date = du.toDateInTimezone(TIMEZONES.US.PACIFIC);

    expect(date).toBeInstanceOf(Date);
    // The zoned Date's local hours reflect Pacific wall-clock time
    expect(date.getHours()).toBe(14);
  });

  test('timezone getter reflects the zone used at construction', () => {
    const du = new DateUtils('2026-03-28 14:30:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.US.PACIFIC,
    });

    expect(du.timezone).toBe(TIMEZONES.US.PACIFIC);
  });

  test('chaining toTimezone preserves the correct UTC moment', () => {
    // Pacific → Eastern → UTC should all represent the same instant
    const pacific = new DateUtils('2026-03-28 14:30:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.US.PACIFIC,
    });

    const viaEastern = pacific.toTimezone(TIMEZONES.US.EASTERN).toTimezone(TIMEZONES.UTC);
    const directUTC = pacific.toTimezone(TIMEZONES.UTC);

    expect(viaEastern.format(DATE_FORMATS.TIME_24H)).toBe(directUTC.format(DATE_FORMATS.TIME_24H));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ARITHMETIC — add and subtract units
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Arithmetic', () => {
  const base = new DateUtils('2026-03-28T10:00:00.000Z');

  test('addDays', () => {
    expect(base.addDays(7).format(DATE_FORMATS.ISO_DATE)).toBe('2026-04-04');
  });

  test('subDays', () => {
    expect(base.subDays(7).format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-21');
  });

  test('addMonths', () => {
    expect(base.addMonths(2).format(DATE_FORMATS.ISO_DATE)).toBe('2026-05-28');
  });

  test('subMonths', () => {
    expect(base.subMonths(2).format(DATE_FORMATS.ISO_DATE)).toBe('2026-01-28');
  });

  test('addYears', () => {
    expect(base.addYears(1).format(DATE_FORMATS.ISO_DATE)).toBe('2027-03-28');
  });

  test('subYears', () => {
    expect(base.subYears(1).format(DATE_FORMATS.ISO_DATE)).toBe('2025-03-28');
  });

  test('addHours', () => {
    expect(base.addHours(5).format(DATE_FORMATS.TIME_24H)).toBe('15:00:00');
  });

  test('subHours', () => {
    expect(base.subHours(4).format(DATE_FORMATS.TIME_24H)).toBe('06:00:00');
  });

  test('addMinutes', () => {
    expect(base.addMinutes(90).format(DATE_FORMATS.TIME_24H)).toBe('11:30:00');
  });

  test('subMinutes', () => {
    expect(base.subMinutes(30).format(DATE_FORMATS.TIME_24H)).toBe('09:30:00');
  });

  test('chaining multiple arithmetic operations', () => {
    const result = base.addDays(3).addMonths(1).subHours(2).addMinutes(15);

    expect(result.format(DATE_FORMATS.DATETIME_24H)).toBe('2026-04-30 08:15:00');
  });

  test('immutability — original is unchanged after arithmetic', () => {
    const original = base.format(DATE_FORMATS.ISO_DATE);
    base.addDays(100);
    expect(base.format(DATE_FORMATS.ISO_DATE)).toBe(original);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DIFFERENCES — measuring gaps between dates
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Differences', () => {
  const start = new DateUtils('2026-03-28T10:00:00.000Z');
  const end = new DateUtils('2026-04-04T12:30:45.000Z');

  test('diffInDays', () => {
    expect(start.diffInDays(end.toISO())).toBe(7);
  });

  test('diffInHours', () => {
    expect(start.diffInHours(end.toISO())).toBe(170); // 7d + 2.5h = 170 full hours
  });

  test('diffInMinutes', () => {
    expect(start.diffInMinutes(end.toISO())).toBe(10230); // 170h * 60 + 30
  });

  test('diffInSeconds', () => {
    expect(start.diffInSeconds(end.toISO())).toBe(613845); // 10230m * 60 + 45
  });

  test('negative diff when other is in the past', () => {
    expect(start.diffInDays('2026-03-21')).toBe(-7);
  });

  test('diff between two string-parsed dates with format', () => {
    const a = new DateUtils('28/03/2026', { format: DATE_FORMATS.EU_SHORT });
    const b = new DateUtils('04/04/2026', { format: DATE_FORMATS.EU_SHORT });
    expect(a.diffInDays(b.toDate())).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. COMPARISONS — isBefore, isAfter, isEqual, isInRange
// ─────────────────────────────────────────────────────────────────────────────

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

  test('isEqual', () => {
    const a = new DateUtils('2026-03-28T10:00:00.000Z');
    const b = new DateUtils('2026-03-28T10:00:00.000Z');
    expect(a.isEqual(b.toISO())).toBe(true);
  });

  test('isEqual returns false for different times on same day', () => {
    const a = new DateUtils('2026-03-28T10:00:00.000Z');
    const b = new DateUtils('2026-03-28T10:00:01.000Z');
    expect(a.isEqual(b.toISO())).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. RANGES — isInRange, clamp, max, min
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Ranges', () => {
  const rangeStart = '2026-01-01';
  const rangeEnd = '2026-12-31';

  test('isInRange — date within range', () => {
    const du = new DateUtils('2026-06-15');
    expect(du.isInRange(rangeStart, rangeEnd)).toBe(true);
  });

  test('isInRange — date on range boundary (inclusive)', () => {
    const start = new DateUtils(rangeStart);
    const end = new DateUtils(rangeEnd);
    expect(start.isInRange(rangeStart, rangeEnd)).toBe(true);
    expect(end.isInRange(rangeStart, rangeEnd)).toBe(true);
  });

  test('isInRange — date outside range', () => {
    const du = new DateUtils('2025-12-31');
    expect(du.isInRange(rangeStart, rangeEnd)).toBe(false);
  });

  test('clamp — returns itself when within range', () => {
    const du = new DateUtils('2026-06-15');
    expect(du.clamp(rangeStart, rangeEnd).format(DATE_FORMATS.ISO_DATE)).toBe('2026-06-15');
  });

  test('clamp — returns start when before range', () => {
    const du = new DateUtils('2025-06-15');
    expect(du.clamp(rangeStart, rangeEnd).format(DATE_FORMATS.ISO_DATE)).toBe('2026-01-01');
  });

  test('clamp — returns end when after range', () => {
    const du = new DateUtils('2027-06-15');
    expect(du.clamp(rangeStart, rangeEnd).format(DATE_FORMATS.ISO_DATE)).toBe('2026-12-31');
  });

  test('max — returns the latest date', () => {
    const result = DateUtils.max(['2026-01-01', '2026-06-01', '2025-12-31']);
    expect(result.format(DATE_FORMATS.ISO_DATE)).toBe('2026-06-01');
  });

  test('min — returns the earliest date', () => {
    const result = DateUtils.min(['2026-01-01', '2026-06-01', '2025-12-31']);
    expect(result.format(DATE_FORMATS.ISO_DATE)).toBe('2025-12-31');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. PREDICATES — boolean checks
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Predicates', () => {
  test('isToday', () => {
    expect(DateUtils.today().isToday()).toBe(true);
    expect(new DateUtils('2025-01-01').isToday()).toBe(false);
  });

  test('isFuture', () => {
    expect(new DateUtils('2099-01-01').isFuture()).toBe(true);
    expect(new DateUtils('2020-01-01').isFuture()).toBe(false);
  });

  test('isPast', () => {
    expect(new DateUtils('2020-01-01').isPast()).toBe(true);
    expect(new DateUtils('2099-01-01').isPast()).toBe(false);
  });

  test('isWeekend — Saturday', () => {
    expect(new DateUtils('2026-03-28').isWeekend()).toBe(true); // Saturday
  });

  test('isWeekend — Monday', () => {
    expect(new DateUtils('2026-03-30').isWeekend()).toBe(false); // Monday
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. BOUNDARIES — startOf / endOf helpers
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Boundaries', () => {
  const du = new DateUtils('2026-03-28T14:30:00.000Z');

  test('startOfDay', () => {
    expect(du.startOfDay().format(DATE_FORMATS.DATETIME_24H)).toBe('2026-03-28 00:00:00');
  });

  test('endOfDay', () => {
    expect(du.endOfDay().format(DATE_FORMATS.DATETIME_24H)).toBe('2026-03-28 23:59:59');
  });

  test('startOfMonth', () => {
    expect(du.startOfMonth().format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-01');
  });

  test('endOfMonth', () => {
    expect(du.endOfMonth().format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-31');
  });

  test('startOfWeek', () => {
    // 2026-03-28 is Saturday; startOfWeek defaults to Sunday
    expect(du.startOfWeek().format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-22');
  });

  test('endOfWeek', () => {
    expect(du.endOfWeek().format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-28');
  });

  test('chaining — startOfMonth then addDays to get mid-month', () => {
    const midMonth = du.startOfMonth().addDays(14);
    expect(midMonth.format(DATE_FORMATS.ISO_DATE)).toBe('2026-03-15');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. STATIC FACTORIES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Static factories', () => {
  test('today() returns start of current day', () => {
    const today = DateUtils.today();
    expect(today.isToday()).toBe(true);
    expect(today.format(DATE_FORMATS.TIME_24H)).toBe('00:00:00');
  });

  test('now() returns current date and time', () => {
    const now = DateUtils.now();
    expect(now.isToday()).toBe(true);
    expect(now.isPast()).toBe(false);
  });

  test('fromUnix() parses seconds timestamp', () => {
    const du = DateUtils.fromUnix(1743170400);
    expect(du.toUnix()).toBe(1743170400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. REAL-WORLD — end-to-end scenarios typical in test automation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Real-world scenarios', () => {
  test('generate check-in / check-out dates for a booking form', () => {
    const checkIn = DateUtils.today().addDays(7);
    const checkOut = checkIn.addDays(3);

    // Values to fill into a date picker using US format
    const checkInValue = checkIn.format(DATE_FORMATS.US_SHORT);
    const checkOutValue = checkOut.format(DATE_FORMATS.US_SHORT);

    expect(checkIn.diffInDays(checkOut.toDate())).toBe(3);
    expect(checkIn.isBefore(checkOut.toISO())).toBe(true);

    // Simulate asserting the displayed confirmation text
    const displayedCheckIn = checkIn.format(DATE_FORMATS.LONG);
    const parsed = new DateUtils(displayedCheckIn, { format: DATE_FORMATS.LONG });
    expect(parsed.format(DATE_FORMATS.ISO_DATE)).toBe(checkIn.format(DATE_FORMATS.ISO_DATE));
  });

  test('assert an API response timestamp falls within the expected window', () => {
    const apiTimestamp = '2026-03-28T14:30:00.000Z'; // from API response
    const windowStart = DateUtils.now().subHours(1);
    const windowEnd = DateUtils.now().addHours(1);

    const responseDate = new DateUtils(apiTimestamp);
    expect(responseDate.isInRange(windowStart.toDate(), windowEnd.toDate())).toBe(true);
  });

  test('convert API UTC timestamp to user-facing Pacific time display', () => {
    const apiUtc = new DateUtils('2026-03-28T22:30:00.000Z');

    // User is in Pacific — display the time in their zone
    const display = apiUtc.formatInTimezone(DATE_FORMATS.US_DATETIME, TIMEZONES.US.PACIFIC);
    expect(display).toBe('03/28/2026 02:30 PM');
  });

  test('session expiry is within the next 30 minutes', () => {
    const expiresAt = DateUtils.now().addMinutes(25); // simulated expiry from server
    const in30Mins = DateUtils.now().addMinutes(30);

    expect(expiresAt.isBefore(in30Mins.toISO())).toBe(true);
    expect(expiresAt.isFuture()).toBe(true);
  });

  test('assert scheduled job ran within the last 24 hours', () => {
    const lastRun = DateUtils.now().subHours(6); // simulated last run from DB
    const cutoff = DateUtils.now().subHours(24);

    expect(lastRun.isAfter(cutoff.toISO())).toBe(true);
  });

  test('filter a list of dates to only those within Q2 2026', () => {
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
    expect(inQ2[0]!.format(DATE_FORMATS.ISO_DATE)).toBe('2026-04-10');
    expect(inQ2[1]!.format(DATE_FORMATS.ISO_DATE)).toBe('2026-05-20');
  });

  test('multi-timezone meeting scheduler — find overlapping business hours', () => {
    // Meeting proposed at 09:00 New York
    const meetingEastern = new DateUtils('2026-03-28 09:00:00', {
      format: DATE_FORMATS.DATETIME_24H,
      timezone: TIMEZONES.US.EASTERN,
    });

    const londonTime = meetingEastern.toTimezone(TIMEZONES.EUROPE.LONDON);
    const tokyoTime = meetingEastern.toTimezone(TIMEZONES.ASIA.TOKYO);
    const pacificTime = meetingEastern.toTimezone(TIMEZONES.US.PACIFIC);

    // 09:00 EST = 14:00 London, 22:00 Tokyo, 06:00 Pacific
    expect(londonTime.format(DATE_FORMATS.TIME_24H)).toBe('14:00:00');
    expect(tokyoTime.format(DATE_FORMATS.TIME_24H)).toBe('22:00:00');
    expect(pacificTime.format(DATE_FORMATS.TIME_24H)).toBe('06:00:00');

    // Assert London and Pacific are within business hours (09:00–18:00)
    const businessStart = 9;
    const businessEnd = 18;

    const londonHour = parseInt(londonTime.format('H'));
    const pacificHour = parseInt(pacificTime.format('H'));

    expect(londonHour).toBeGreaterThanOrEqual(businessStart);
    expect(londonHour).toBeLessThan(businessEnd);
    expect(pacificHour).toBeLessThan(businessStart); // 06:00 — too early
  });
});
