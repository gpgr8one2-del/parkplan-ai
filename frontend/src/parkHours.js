/**
 * ParkPlan AI — Park Hours
 *
 * Per-day operating hours for theme parks. Hours change frequently for
 * special events, holidays, parties, and seasonal demand — so this file
 * is structured with two layers:
 *
 *   1. PARK_HOURS_OVERRIDES — date-specific exact hours pulled from
 *      Disney's / Universal's official calendars. Authoritative when
 *      present.
 *
 *   2. DEFAULT_WEEKLY_SCHEDULE — fallback by day of week. Used when no
 *      override exists for the target date. Reasonable averages, NOT
 *      guaranteed accurate.
 *
 * VERIFY hours on the official site before relying on this for any
 * specific date. Disney has been known to extend or shorten same-week.
 *
 * Times are 24-hour local park time ("HH:MM").
 * Day-of-week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */

// Date-specific overrides — YYYY-MM-DD -> { open?, close? }
// Verified against an official source for that exact Orlando calendar date.
//
// An entry may carry only the field that was actually verified. A missing field
// is not a claim of "unknown hours" — it simply means that half was never
// confirmed, and it falls back to the weekly estimate below while staying marked
// unverified. Never add a time here that has not been checked for that date.
const PARK_HOURS_OVERRIDES = {
  magic_kingdom: {
    "2026-05-06": { open: "09:00", close: "22:00" },
    "2026-05-07": { open: "09:00", close: "23:00" },
    "2026-05-08": { open: "09:00", close: "23:00" },
    "2026-05-09": { open: "08:00", close: "23:00" },
    "2026-05-10": { open: "09:00", close: "23:00" }, // Sunday — test day
    "2026-05-11": { open: "09:00", close: "22:00" },
  },
  hollywood: {
    // Field test, August 18, 2026: the park was open until 10:00 PM while TOHI
    // displayed "Closes 9:00 PM" from the weekly estimate below. Only the
    // closing time was observed, so only the closing time is recorded.
    "2026-08-18": { close: "22:00" },
  },
};

// Weekly fallback — used when no date override exists.
// Conservative defaults; verify before relying.
const DEFAULT_WEEKLY_SCHEDULE = {
  magic_kingdom: {
    0: { open: "09:00", close: "22:00" },
    1: { open: "09:00", close: "22:00" },
    2: { open: "09:00", close: "22:00" },
    3: { open: "09:00", close: "22:00" },
    4: { open: "09:00", close: "22:00" },
    5: { open: "09:00", close: "22:00" },
    6: { open: "09:00", close: "22:00" },
  },
  epcot: {
    0: { open: "09:00", close: "21:00" },
    1: { open: "09:00", close: "21:00" },
    2: { open: "09:00", close: "21:00" },
    3: { open: "09:00", close: "21:00" },
    4: { open: "09:00", close: "21:00" },
    5: { open: "09:00", close: "21:00" },
    6: { open: "09:00", close: "21:00" },
  },
  hollywood: {
    0: { open: "09:00", close: "21:00" },
    1: { open: "09:00", close: "21:00" },
    2: { open: "09:00", close: "21:00" },
    3: { open: "09:00", close: "21:00" },
    4: { open: "09:00", close: "21:00" },
    5: { open: "09:00", close: "21:00" },
    6: { open: "09:00", close: "21:00" },
  },
  animal_kingdom: {
    0: { open: "08:00", close: "20:00" },
    1: { open: "08:00", close: "20:00" },
    2: { open: "08:00", close: "20:00" },
    3: { open: "08:00", close: "20:00" },
    4: { open: "08:00", close: "20:00" },
    5: { open: "08:00", close: "20:00" },
    6: { open: "08:00", close: "20:00" },
  },
  // Universal parks — placeholders. Verify before relying.
  universal_sf: {
    0: { open: "09:00", close: "22:00" },
    1: { open: "09:00", close: "22:00" },
    2: { open: "09:00", close: "22:00" },
    3: { open: "09:00", close: "22:00" },
    4: { open: "09:00", close: "22:00" },
    5: { open: "09:00", close: "22:00" },
    6: { open: "09:00", close: "22:00" },
  },
  islands: {
    0: { open: "09:00", close: "21:00" },
    1: { open: "09:00", close: "21:00" },
    2: { open: "09:00", close: "21:00" },
    3: { open: "09:00", close: "21:00" },
    4: { open: "09:00", close: "21:00" },
    5: { open: "09:00", close: "21:00" },
    6: { open: "09:00", close: "21:00" },
  },
  epic_universe: {
    0: { open: "09:00", close: "23:00" },
    1: { open: "09:00", close: "23:00" },
    2: { open: "09:00", close: "23:00" },
    3: { open: "09:00", close: "23:00" },
    4: { open: "09:00", close: "23:00" },
    5: { open: "09:00", close: "23:00" },
    6: { open: "09:00", close: "23:00" },
  },
};

// All park hours are Orlando wall-clock times. Everything below is anchored to
// that zone rather than to the device's own, because the calendar date and the
// day of week that select a schedule are properties of the park, not of the
// phone holding the app.
//
// This used to use getFullYear/getMonth/getDate/getDay/setHours, which read the
// host timezone. On a device east of Orlando the evening rolled to the next
// calendar date early — at 8:20 PM Orlando on August 18 a UTC host resolved
// August 19 — and the constructed close instant landed hours away from the real
// one. Guests in the park run on Orlando time, so the effect was invisible in
// the field, but it made the value wrong for everyone else and made the
// pre-open tests fail on any non-Orlando machine.
const ORLANDO_TIME_ZONE = "America/New_York";

const ORLANDO_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: ORLANDO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function pad2(n) {
  return String(n).padStart(2, "0");
}

function readOrlandoParts(date) {
  const parts = {};
  for (const part of ORLANDO_PARTS_FORMATTER.formatToParts(date)) {
    parts[part.type] = part.value;
  }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Some engines render midnight as hour 24; normalise so arithmetic below is
    // not thrown off by it.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

// Orlando's UTC offset at a given instant, in milliseconds. Derived by
// formatting the instant in Orlando and reading the result back as if it were
// UTC, so daylight saving is handled by the platform rather than by a table.
function getOrlandoOffsetMs(date) {
  const p = readOrlandoParts(date);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - date.getTime();
}

// Turn an Orlando wall-clock time on an Orlando calendar date into the real
// instant it refers to. Two passes: the offset is first sampled at the naive
// guess, then re-sampled at the corrected instant, which settles the cases that
// sit near a daylight-saving transition.
function orlandoWallTimeToInstant(year, month, day, timeStr) {
  if (!timeStr) return null;

  const [hours, minutes] = String(timeStr).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const naiveUtc = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

  const firstOffset = getOrlandoOffsetMs(new Date(naiveUtc));
  let instant = naiveUtc - firstOffset;

  const secondOffset = getOrlandoOffsetMs(new Date(instant));
  if (secondOffset !== firstOffset) instant = naiveUtc - secondOffset;

  return new Date(instant);
}

function formatDateKey(date) {
  const { year, month, day } = readOrlandoParts(date);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

// Day of week for the ORLANDO calendar date, not the host's.
function getOrlandoWeekdayIndex(date) {
  const { year, month, day } = readOrlandoParts(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Get park hours for the Orlando calendar date containing `date`.
 *
 * Returns null when nothing at all is known for the park. Otherwise:
 *
 *   open, close            Date instants, or null when that half is unknown.
 *   openVerified,          Whether that specific time came from a date-specific
 *   closeVerified          override rather than the weekly estimate.
 *   source                 "date_override" when any part was verified for this
 *                          exact date, otherwise "weekly_estimate".
 *   dateKey                The Orlando calendar date the hours describe.
 *
 * `open` and `close` keep their previous meaning and shape, so existing callers
 * are unaffected. The verification flags are additive, and exist so that a
 * caller which states hours to a guest as fact can tell an observed time apart
 * from an average. A verified value always outranks the weekly estimate; the two
 * are merged per field, so a date where only the closing time was confirmed
 * still reports a verified close alongside an unverified open.
 */
export function getParkHoursForDate(parkId, date = new Date()) {
  if (!parkId) return null;

  const dateKey = formatDateKey(date);
  const { year, month, day } = readOrlandoParts(date);

  const override = PARK_HOURS_OVERRIDES[parkId]?.[dateKey] || null;
  const weekly = DEFAULT_WEEKLY_SCHEDULE[parkId]?.[getOrlandoWeekdayIndex(date)] || null;

  if (!override && !weekly) return null;

  const openVerified = Boolean(override?.open);
  const closeVerified = Boolean(override?.close);

  const openTime = override?.open ?? weekly?.open ?? null;
  const closeTime = override?.close ?? weekly?.close ?? null;

  return {
    open: orlandoWallTimeToInstant(year, month, day, openTime),
    close: orlandoWallTimeToInstant(year, month, day, closeTime),
    openVerified,
    closeVerified,
    source: openVerified || closeVerified ? "date_override" : "weekly_estimate",
    dateKey,
  };
}

/**
 * The closing time as a Date instant, but ONLY when it was verified for that
 * exact Orlando date. Returns null when all that exists is the weekly estimate.
 *
 * This is a decision boundary, not a display one. The recommendation engine is
 * the only production caller: it feeds this to fitsBeforeClose, which drops any
 * ride whose projected entry falls after the close. An estimate is not a safe
 * input to that decision — the August 18, 2026 field test showed a wrong 9:00 PM
 * removing a 45-minute wait at 8:20 PM that fitted comfortably before the real
 * 10:00 PM close, and then emptying the pool entirely after 9:00 PM.
 *
 * fitsBeforeClose already fails open on a null close, so an unverified date
 * simply stops applying the filter rather than applying it against a guess.
 * Losing a real closing-soon exclusion on those dates is the better trade:
 * over-filtering removes rides a family could still ride, while under-filtering
 * leaves a ride visible that they may not reach — and the wait time on the card
 * is right there either way.
 *
 * getParkHoursForDate still returns the estimate, so planning surfaces and the
 * pre-open / Early Entry checks that read `open` are unchanged.
 */
export function getParkCloseTime(parkId, date = new Date()) {
  const hours = getParkHoursForDate(parkId, date);
  if (!hours?.close || !hours.closeVerified) return null;

  return hours.close;
}

/**
 * Format the close time as a human-readable string like "11:00 PM", in Orlando
 * time.
 *
 * Returns null unless the closing time was verified for this exact Orlando date.
 * A weekly average is a planning aid, not a fact about tonight, and this label
 * is rendered to guests as "Closes X" with no hedging — so an unverified value
 * is withheld rather than stated. That is what keeps an unknown future date from
 * confidently showing a time TOHI has not actually checked: the data file grows
 * one verified date at a time, and every date it does not cover simply shows
 * nothing here instead of guessing.
 */
export function formatCloseTimeLabel(parkId, date = new Date()) {
  const hours = getParkHoursForDate(parkId, date);
  if (!hours?.close || !hours.closeVerified) return null;

  return hours.close.toLocaleTimeString("en-US", {
    timeZone: ORLANDO_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}
