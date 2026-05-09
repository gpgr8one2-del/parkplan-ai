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

// Date-specific overrides — YYYY-MM-DD -> { open, close }
// Pulled from Disney's official 5-day calendar on May 8, 2026.
const PARK_HOURS_OVERRIDES = {
  magic_kingdom: {
    "2026-05-06": { open: "09:00", close: "22:00" },
    "2026-05-07": { open: "09:00", close: "23:00" },
    "2026-05-08": { open: "09:00", close: "23:00" },
    "2026-05-09": { open: "08:00", close: "23:00" },
    "2026-05-10": { open: "09:00", close: "23:00" }, // Sunday — test day
    "2026-05-11": { open: "09:00", close: "22:00" },
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function makeDateAtTime(date, timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const result = new Date(date);
  result.setHours(h, m, 0, 0);
  return result;
}

/**
 * Get { open, close } as Date objects for the given park on the given date.
 * Returns null if no schedule data is available.
 */
export function getParkHoursForDate(parkId, date = new Date()) {
  if (!parkId) return null;

  const dateKey = formatDateKey(date);
  let schedule = PARK_HOURS_OVERRIDES[parkId]?.[dateKey];

  if (!schedule) {
    schedule = DEFAULT_WEEKLY_SCHEDULE[parkId]?.[date.getDay()];
  }

  if (!schedule) return null;

  return {
    open: makeDateAtTime(date, schedule.open),
    close: makeDateAtTime(date, schedule.close),
  };
}

/**
 * Just the close time as a Date object, or null if unknown.
 */
export function getParkCloseTime(parkId, date = new Date()) {
  return getParkHoursForDate(parkId, date)?.close ?? null;
}

/**
 * Format the close time as a human-readable string like "11:00 PM".
 * Returns null if hours are unknown.
 */
export function formatCloseTimeLabel(parkId, date = new Date()) {
  const closeTime = getParkCloseTime(parkId, date);
  if (!closeTime) return null;

  return closeTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
