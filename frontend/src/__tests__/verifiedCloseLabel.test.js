/**
 * Regression: a closing time is stated only when it is verified.
 *
 * buildPlanTabState built parkCloseLabel with formatPlanTimeLabel(parkHours.close),
 * which formats whatever the schedule lookup returned — including the weekly
 * ESTIMATE. parkHours.js deliberately withholds an unverified close:
 * formatCloseTimeLabel returns null unless closeVerified is true for that exact
 * Orlando date, because "Closes 10:00 PM" is rendered with no hedging and a
 * weekly average is a planning aid, not a fact about tonight. The Plan label
 * bypassed that rule entirely.
 *
 * Measured before the fix, from the Plan screen's own parkClose value:
 *
 *   Magic Kingdom, 2026-01-15  (no override, weekly estimate) -> "10:00 PM"  <-
 *   Magic Kingdom, 2026-05-10  (verified close 23:00)         -> "11:00 PM"
 *   Hollywood,     2026-08-18  (verified close 22:00)         -> "10:00 PM"
 *
 * The first row is the defect: an unchecked weekly average presented as tonight's
 * closing time. It is also the exact shape of the August 2026 field report that
 * put the verification rule in parkHours.js to begin with.
 *
 * These use the schedule that ships in parkHours.js — no fabricated overrides.
 * Magic Kingdom on 2026-05-10 is verified to 23:00 while its weekly estimate is
 * 22:00, so "11:00 PM" also proves the verified value won rather than the
 * estimate merely agreeing.
 */

import { spawnSync } from "child_process";
import path from "path";

import React, { act } from "react";
import { createRoot } from "react-dom/client";

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../api", () => ({
  fetchParkData: jest.fn(),
  fetchWeather: jest.fn(),
  sendChatMessage: jest.fn(() => Promise.resolve({ reply: "" })),
  sendTohiPickReview: jest.fn(() => Promise.resolve(null)),
  trackEvent: jest.fn(),
}));

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { fetchParkData, fetchWeather } from "../api";
// The real schedule and the real verification rule, unmocked throughout. A
// jest mock of the getParkHoursForDate EXPORT would not reach the lookup
// formatCloseTimeLabel makes internally, so the missing-hours case is proved
// against the real function with a park that genuinely has no schedule.
// eslint-disable-next-line import/first
import { formatCloseTimeLabel, getParkHoursForDate } from "../parkHours";

/* -------------------------------------------------------------------------- */
/* Instants, from the shipped schedule                                        */
/* -------------------------------------------------------------------------- */

// Magic Kingdom 2026-05-10: verified open 09:00, verified close 23:00 (EDT).
// 18:00Z is 2:00 PM Orlando, mid-window.
const MK_VERIFIED_UTC = "2026-05-10T18:00:00.000Z";
const MK_VERIFIED_CLOSE = "11:00 PM";

// Magic Kingdom's weekly estimate closes at 22:00. If the estimate ever leaked
// back into the label this is the string that would appear.
const MK_WEEKLY_ESTIMATE_CLOSE = "10:00 PM";

// Magic Kingdom 2026-01-15: no override at all, so both halves are estimates.
const MK_UNVERIFIED_UTC = "2026-01-15T19:00:00.000Z"; // 2:00 PM Orlando

// Hollywood 2026-08-18: close verified to 22:00, open deliberately NOT recorded.
const HS_VERIFIED_UTC = "2026-08-18T23:00:00.000Z"; // 7:00 PM Orlando
const HS_VERIFIED_CLOSE = "10:00 PM";

const OPEN_ESTIMATE = "9:00 AM";

function profileFor(parkId, tripStartDate, tripEndDate) {
  return {
    system: "disney_wdw",
    isSetupComplete: true,
    preferredName: "Gabe",
    adultCount: 2,
    childCount: 0,
    children: [],
    thrillTolerance: "mixed",
    pace: "balanced",
    heatSensitivity: "medium",
    waterRidePreference: "depends",
    stormTolerance: "brief_outdoor_ok",
    walkingTolerance: "medium",
    priorities: ["low_stress"],
    tripContext: {
      tripStartDate,
      tripEndDate,
      parkDays: 4,
      parkSelectionIds: [parkId],
      firstParkId: parkId,
      mostImportantParkId: parkId,
      parkHopper: "no",
    },
    resortContext: {
      stayingOnProperty: "no",
      resortId: "",
      resortName: "",
      offPropertyHotelName: "",
      transportationMode: "car",
    },
  };
}

const MK_MAY_TRIP = profileFor("magic_kingdom", "2026-05-08", "2026-05-12");
const MK_JAN_TRIP = profileFor("magic_kingdom", "2026-01-14", "2026-01-17");
const HS_AUG_TRIP = profileFor("hollywood", "2026-08-17", "2026-08-20");

/**
 * Hollywood plans 2026-08-18 with Magic Kingdom as a planned secondary.
 *
 * That is what makes Magic Kingdom confirmable through the Park Check prompt —
 * confirmActivePark only accepts a park in today's plannedParkIds — so the
 * guest can move the ACTIVE park while the PLANNING park stays Hollywood.
 * The date is chosen because the two parks disagree on it: Hollywood's close
 * is verified, Magic Kingdom's is not.
 */
const HS_PLANS_MK_HOP = {
  ...HS_AUG_TRIP,
  tripContext: {
    ...HS_AUG_TRIP.tripContext,
    // Day 1 must BE 2026-08-18: normalizeParkDayScheduleItem discards an item's
    // own date and derives it from the trip start plus its index.
    tripStartDate: "2026-08-18",
    tripEndDate: "2026-08-21",
    parkSelectionIds: ["hollywood", "magic_kingdom"],
    parkHopper: "yes",
    parkDaySchedule: [
      {
        dayNumber: 1,
        date: "2026-08-18",
        primaryParkId: "hollywood",
        secondaryParkId: "magic_kingdom",
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

let container = null;
let root = null;

/**
 * Tear down whatever App is currently mounted.
 *
 * planStateAt can be called more than once in a test, and without this the
 * helper would overwrite root/container and leave the earlier instance mounted —
 * its effects, its 30-second clock interval and its portal content all still
 * live, with afterEach only ever cleaning up the last one.
 */
async function cleanupMountedApp() {
  if (root) {
    await act(async () => {
      root.unmount();
    });
    root = null;
  }
  if (container?.parentNode) container.parentNode.removeChild(container);
  container = null;
}

async function planStateAt(
  instantIso,
  familyProfile,
  { parkPresence = null, beforePlan = null } = {}
) {
  await cleanupMountedApp();

  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(instantIso));

  fetchParkData.mockImplementation((parkId) =>
    Promise.resolve({
      parkId,
      source: "live",
      fetchedAt: instantIso,
      ageMs: 0,
      rides: [
        { id: "r-1", name: "Pirates of the Caribbean", land: "adventureland", waitTime: 15, isOpen: true },
      ],
      lands: [],
    })
  );
  fetchWeather.mockImplementation(() =>
    Promise.resolve({
      parkId: "magic_kingdom",
      source: "live",
      fetchedAt: instantIso,
      summary: "Clear",
      tempF: 74,
      feelsLikeF: 74,
      rainRisk: 0.1,
    })
  );

  window.localStorage.clear();
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(familyProfile));
  if (parkPresence) {
    window.localStorage.setItem("parkplan.parkPresence", JSON.stringify(parkPresence));
  }
  // Surfaces parkOpen / parkClose / activePark / planningPark / mode.
  window.localStorage.setItem("parkplan.debugSnapshot", "true");

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(App));
  });
  await act(async () => {
    jest.advanceTimersByTime(1);
  });

  if (beforePlan) await beforePlan();

  const planTab = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === "Plan"
  );
  expect(planTab).toBeTruthy();
  await act(async () => {
    planTab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  const text = container.textContent || "";

  // The debug rows render with no separator, so each capture is bounded by the
  // label of the row that follows it. dbFmt renders a null value as an em dash.
  const closeSegment = (text.match(/parkClose(.*?)isBeforeParkOpen/) || [])[1] ?? null;

  return {
    text,
    activePark: (text.match(/activePark(.*?)planningPark/) || [])[1] ?? null,
    planningPark: (text.match(/planningPark(.*?)planningParkSource/) || [])[1] ?? null,
    openLabel: (text.match(/parkOpen(.*?)parkClose/) || [])[1] ?? null,
    closeSegment,
    mode: (text.match(/planTabState\.mode(.*?)planTabState\.label/) || [])[1] ?? null,
    modeLabel: (text.match(/planTabState\.label(.*?)parkOpen/) || [])[1] ?? null,
  };
}

async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => {
    node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/** BottomTabs renders through a portal into document.body. */
async function goToTab(label) {
  const button = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === label
  );
  expect(button).toBeTruthy();
  await click(button);
}

/** A Home park-selector card, which carries the park name as its label. */
function parkCardNamed(name) {
  return Array.from(container.querySelectorAll("button")).find(
    (node) => node.textContent.trim() === name
  );
}

/** The Park Check prompt's confirm control. */
function confirmParkButton() {
  return Array.from(container.querySelectorAll("button")).find((node) =>
    node.textContent.trim().startsWith("I\u2019m here now")
  );
}

/** No definite closing time is being claimed anywhere on screen. */
function expectNoCloseClaim(plan) {
  // The row renders the "no value" placeholder, not a time.
  expect(plan.closeSegment).toBe("—");
  // And no fabricated or leaked time appears in its place.
  expect(plan.closeSegment).not.toMatch(/\d/);
  expect(plan.closeSegment).not.toMatch(/null|undefined|NaN|Invalid/i);
}

afterEach(async () => {
  await cleanupMountedApp();
  jest.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/* 1. Verified hours produce the label                                        */
/* -------------------------------------------------------------------------- */

describe("a verified closing time is stated", () => {
  test("Magic Kingdom on a verified date shows the verified Orlando closing time", async () => {
    const plan = await planStateAt(MK_VERIFIED_UTC, MK_MAY_TRIP);

    expect(plan.closeSegment).toBe(MK_VERIFIED_CLOSE);
    // 23:00 verified, not the 22:00 weekly estimate: the override won.
    expect(plan.closeSegment).not.toBe(MK_WEEKLY_ESTIMATE_CLOSE);
  });

  test("a park with only its CLOSE verified still states that close", async () => {
    // Hollywood 2026-08-18 records the closing time alone; the opening stays an
    // estimate. Verification is per field, and the close half qualifies.
    const plan = await planStateAt(HS_VERIFIED_UTC, HS_AUG_TRIP);

    expect(plan.closeSegment).toBe(HS_VERIFIED_CLOSE);
  });
});

/* -------------------------------------------------------------------------- */
/* 2-3. Unverified and missing hours make no claim                            */
/* -------------------------------------------------------------------------- */

describe("an unverified or missing closing time is withheld", () => {
  test("an unverified date states nothing, even though a weekly estimate exists", async () => {
    const plan = await planStateAt(MK_UNVERIFIED_UTC, MK_JAN_TRIP);

    // The estimate exists and is what the old code rendered.
    const hours = jest
      .requireActual("../parkHours")
      .getParkHoursForDate("magic_kingdom", new Date(MK_UNVERIFIED_UTC));
    expect(hours.close).toBeTruthy();
    expect(hours.closeVerified).toBe(false);

    // And it is not stated.
    expectNoCloseClaim(plan);
    expect(plan.text).not.toContain(MK_WEEKLY_ESTIMATE_CLOSE);
  });

  test("missing hours state nothing", async () => {
    // A park the schedule knows nothing about: no override and no weekly entry,
    // so getParkHoursForDate returns null outright. Asserted against the real
    // function rather than a mock, because the label now flows through
    // formatCloseTimeLabel and its lookup is module-internal — mocking the
    // export would not intercept it, and a test that mocked the function under
    // test would prove nothing.
    const instant = new Date(MK_VERIFIED_UTC);

    expect(getParkHoursForDate("a_park_with_no_schedule", instant)).toBeNull();
    expect(formatCloseTimeLabel("a_park_with_no_schedule", instant)).toBeNull();

    // The same single guard covers missing and unverified alike, which is why
    // the Plan screen makes no claim in either case.
    const unverified = getParkHoursForDate("magic_kingdom", new Date(MK_UNVERIFIED_UTC));
    expect(unverified.closeVerified).toBe(false);
    expect(formatCloseTimeLabel("magic_kingdom", new Date(MK_UNVERIFIED_UTC))).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* 4. The lookup follows the planning park                                    */
/* -------------------------------------------------------------------------- */

describe("the lookup follows the planning park", () => {
  test("after confirming a different active park, the label still follows the planning park", async () => {
    // The two park IDs are made to differ through the app's own flow: today
    // plans Hollywood with Magic Kingdom as a secondary, the guest selects the
    // Magic Kingdom card, and the Park Check prompt confirms they are there.
    // Only that confirmation moves the active park; the planning park is
    // unmoved by it.
    //
    // 2026-08-18 is the date the two parks disagree on — Hollywood's close is
    // verified, Magic Kingdom's is not — so the label names which park the
    // lookup consulted. No production behaviour is changed to construct this.
    const plan = await planStateAt(HS_VERIFIED_UTC, HS_PLANS_MK_HOP, {
      beforePlan: async () => {
        // Selecting a park card takes the guest to that park's Waits, so the
        // Park Check prompt is answered back on Home.
        await click(parkCardNamed("Magic Kingdom"));
        await goToTab("Home");
        await click(confirmParkButton());
      },
    });

    // They really are different.
    expect(plan.activePark).toBe("magic_kingdom");
    expect(plan.planningPark).toBe("hollywood");
    expect(plan.activePark).not.toBe(plan.planningPark);

    // The counterfactual, stated against the real function: the ACTIVE park has
    // no verified close on this date, so a lookup that used it would render the
    // "no value" dash instead.
    expect(formatCloseTimeLabel("magic_kingdom", new Date(HS_VERIFIED_UTC))).toBeNull();
    expect(formatCloseTimeLabel("hollywood", new Date(HS_VERIFIED_UTC))).toBe(
      HS_VERIFIED_CLOSE
    );

    // And the label is the planning park's.
    expect(plan.closeSegment).toBe(HS_VERIFIED_CLOSE);
  });

  test("the same instant gives different answers for different planning parks", async () => {
    // Park-specificity on its own: one instant, planning park varied, and the
    // label follows it.
    const hollywood = await planStateAt(HS_VERIFIED_UTC, HS_AUG_TRIP);
    expect(hollywood.planningPark).toBe("hollywood");
    expect(hollywood.closeSegment).toBe(HS_VERIFIED_CLOSE);

    const magicKingdom = await planStateAt(
      HS_VERIFIED_UTC,
      profileFor("magic_kingdom", "2026-08-17", "2026-08-20")
    );
    expect(magicKingdom.planningPark).toBe("magic_kingdom");
    expectNoCloseClaim(magicKingdom);

    // The first App really was unmounted before the second was mounted: its
    // BottomTabs portal would otherwise still be in the document alongside the
    // second one, and its effects and 30-second clock would still be running.
    expect(document.body.querySelectorAll("nav").length).toBe(1);
  });
});

/* -------------------------------------------------------------------------- */
/* 5. The Orlando date decides which day is looked up                         */
/* -------------------------------------------------------------------------- */

describe("the Orlando calendar date decides the lookup", () => {
  test("late evening, when the UTC date has already rolled over, uses the Orlando day", async () => {
    // 2026-05-11T02:30Z is 10:30 PM Orlando on 2026-05-10 — still the verified
    // 23:00 day. Reading the UTC date would land on the 11th, whose verified
    // close is 22:00, so the two days give different answers.
    const plan = await planStateAt("2026-05-11T02:30:00.000Z", MK_MAY_TRIP);

    expect(plan.closeSegment).toBe(MK_VERIFIED_CLOSE); // 11:00 PM, the 10th
    expect(plan.closeSegment).not.toBe(MK_WEEKLY_ESTIMATE_CLOSE); // 10:00 PM, the 11th
  });

  test("just after Orlando midnight uses the new Orlando day", async () => {
    // 2026-05-11T05:30Z is 1:30 AM Orlando on the 11th, whose verified close is
    // 22:00 -> 10:00 PM. Same UTC date as the case above, different answer.
    const plan = await planStateAt("2026-05-11T05:30:00.000Z", MK_MAY_TRIP);

    expect(plan.closeSegment).toBe("10:00 PM");
  });
});

/* -------------------------------------------------------------------------- */
/* 6. The absent label renders cleanly                                        */
/* -------------------------------------------------------------------------- */

describe("an absent closing label renders cleanly", () => {
  test("no blank fragment, no null or undefined, no invented time", async () => {
    const plan = await planStateAt(MK_UNVERIFIED_UTC, MK_JAN_TRIP);

    expectNoCloseClaim(plan);

    // The neighbouring rows still render normally around it.
    expect(plan.openLabel).toBe(OPEN_ESTIMATE);
    expect(plan.text).toContain("parkClose");
    expect(plan.text).toContain("isBeforeParkOpen");

    // Nothing anywhere on the Plan screen leaked a stringified empty value.
    expect(plan.text).not.toMatch(/\bnull\b/);
    expect(plan.text).not.toMatch(/\bundefined\b/);
    expect(plan.text).not.toMatch(/\bNaN\b/);
    expect(plan.text).not.toMatch(/Invalid Date/);
  });
});

/* -------------------------------------------------------------------------- */
/* 7. Opening labels and Plan mode are untouched                              */
/* -------------------------------------------------------------------------- */

describe("nothing else about the Plan screen changed", () => {
  test("the opening label still shows its estimate on an unverified date", async () => {
    // Deliberate asymmetry, unchanged by this fix: the opening half keeps its
    // existing behaviour and is hedged elsewhere in the copy.
    const plan = await planStateAt(MK_UNVERIFIED_UTC, MK_JAN_TRIP);

    expect(plan.openLabel).toBe(OPEN_ESTIMATE);
  });

  test("Plan mode still resolves from the schedule, verified or not", async () => {
    // 2:00 PM Orlando is inside the window on both dates, so both are in park.
    // Mode reads parkHours directly and is untouched by the label change.
    const unverified = await planStateAt(MK_UNVERIFIED_UTC, MK_JAN_TRIP);
    expect(unverified.mode).toBe("in_park");
    expect(unverified.modeLabel).toBe("In park");

    const verified = await planStateAt(MK_VERIFIED_UTC, MK_MAY_TRIP);
    expect(verified.mode).toBe("in_park");
    expect(verified.modeLabel).toBe("In park");
  });

  test("the after-close wrap-up view still appears on an unverified date", async () => {
    // 2026-01-16T03:30Z is 10:30 PM Orlando, past the weekly 22:00. The mode
    // boundary still uses the estimate — flagged separately, deliberately not
    // changed here — so the wrap-up view is unaffected by withholding the label.
    const plan = await planStateAt("2026-01-16T03:30:00.000Z", MK_JAN_TRIP);

    expect(plan.modeLabel).toBe("Park day wrap-up");
    expectNoCloseClaim(plan);
  });
});

/* -------------------------------------------------------------------------- */
/* 8. The same file, re-run under other device timezones                      */
/* -------------------------------------------------------------------------- */

const IS_TZ_MATRIX_CHILD = process.env.TOHI_TZ_MATRIX_CHILD === "1";
const describeMatrix = IS_TZ_MATRIX_CHILD ? describe.skip : describe;

describeMatrix("the device timezone cannot change the closing label", () => {
  // Positive closing-label timezone coverage lives here, on verified fixtures.
  // orlandoTimeLabels.test.js used to carry it on Magic Kingdom's UNVERIFIED
  // weekly estimate, which this fix withholds; that file keeps its opening
  // label coverage and now asserts the absence instead.
  const frontendDir = path.join(__dirname, "..", "..");

  function runSuiteUnderTimezone(timeZone) {
    return spawnSync(
      "npx",
      [
        "react-scripts",
        "test",
        "--watchAll=false",
        "--ci",
        "--testPathPattern=verifiedCloseLabel",
      ],
      {
        cwd: frontendDir,
        encoding: "utf8",
        env: {
          ...process.env,
          CI: "true",
          TZ: timeZone,
          TOHI_TZ_MATRIX_CHILD: "1",
        },
      }
    );
  }

  test.each([["America/New_York"], ["UTC"], ["America/Los_Angeles"]])(
    "every closing label above is identical with the device in %s",
    (timeZone) => {
      const result = runSuiteUnderTimezone(timeZone);
      const output = `${result.stdout || ""}\n${result.stderr || ""}`;

      if (result.status !== 0) {
        throw new Error(
          `Closing labels differed with the device in ${timeZone}:\n${output}`
        );
      }

      expect(output).toMatch(
        /Magic Kingdom on a verified date shows the verified Orlando closing time/
      );
      expect(output).toMatch(/Tests:\s+3 skipped, 12 passed, 15 total/);
    },
    180000
  );
});
