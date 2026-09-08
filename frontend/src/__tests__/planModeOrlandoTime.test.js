/**
 * Regression: the Plan screen picks its mode from Orlando time, not the phone's.
 *
 * buildPlanTabState compares two minutes-of-day values:
 *
 *   nowMinutes   = timeContext.orlandoTotalMinutes   -> Orlando
 *   openMinutes  = getMinutesFromDateValue(open)     -> was the DEVICE's zone
 *   closeMinutes = getMinutesFromDateValue(close)    -> was the DEVICE's zone
 *
 * getMinutesFromDateValue read date.getHours(), so the comparison mixed two
 * different clocks. On a device in Orlando they agreed and the bug was
 * invisible; anywhere else the Plan screen chose the wrong mode. Measured
 * before the fix, with Magic Kingdom open 09:00-22:00 Orlando:
 *
 *   Orlando time   America/New_York    UTC                 America/Los_Angeles
 *   07:33 (closed) Morning of          Morning of          In park            <-
 *   09:30 (open)   In park             Morning of      <-  In park
 *   14:00 (open)   In park             Park day wrap-up <- In park
 *   22:30 (closed) Park day wrap-up    Park day wrap-up    In park            <-
 *
 * The 07:33 Los Angeles row is the failure that surfaced while fixing the
 * display formatters: a family was handed the in-park reference screen for a
 * park that had not opened yet.
 *
 * HOW THIS FILE PROVES THE FIX
 *
 * Assertions name the mode that Orlando time implies, whatever zone the process
 * runs in, and read it from planTabState.mode / planTabState.label — the actual
 * decision, not a formatted time. The matrix at the end re-runs this file in
 * fresh processes with TZ set before startup, the same pattern
 * orlandoTimeLabels.test.js uses, because Node fixes its zone at process start.
 * This repo's own machine sits in America/New_York, where an ambient run cannot
 * tell the bug from the fix.
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

// A pass-through spy on the park-hours dependency boundary. Every scenario
// except the missing-hours one below runs the real schedule; that one replaces
// the response at this seam, which is the only honest way to produce missing
// hours — clearing the family's park selections does not, because
// normalizeFamilyProfile falls back to Magic Kingdom.
jest.mock("../parkHours", () => {
  const actual = jest.requireActual("../parkHours");

  return {
    __esModule: true,
    ...actual,
    getParkHoursForDate: jest.fn((...args) => actual.getParkHoursForDate(...args)),
  };
});

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { fetchParkData, fetchWeather } from "../api";
// eslint-disable-next-line import/first
import { getParkHoursForDate } from "../parkHours";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

// Magic Kingdom's weekly schedule: 09:00 to 22:00 Orlando.
const OPEN_LABEL = "9:00 AM";
const CLOSE_LABEL = "10:00 PM";

function profile(tripStartDate, tripEndDate) {
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
      parkSelectionIds: ["magic_kingdom"],
      firstParkId: "magic_kingdom",
      mostImportantParkId: "magic_kingdom",
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

const WINTER_TRIP = profile("2026-01-14", "2026-01-17");
const SUMMER_TRIP = profile("2026-07-14", "2026-07-17");

let container = null;
let root = null;

/**
 * Render the real App at an instant and read the Plan screen's decision.
 *
 * planTabState.mode and .label come straight from buildPlanTabState, so this is
 * the mode itself rather than any formatted time.
 */
async function planStateAt(instantIso, familyProfile = WINTER_TRIP) {
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(instantIso));

  fetchParkData.mockImplementation(() =>
    Promise.resolve({
      parkId: "magic_kingdom",
      source: "live",
      fetchedAt: instantIso,
      ageMs: 0,
      rides: [
        { id: "mk-1", name: "Pirates of the Caribbean", land: "adventureland", waitTime: 15, isOpen: true },
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
      tempF: 72,
      feelsLikeF: 72,
      rainRisk: 0.1,
    })
  );

  // CRA's jest config sets resetMocks, so the pass-through is re-established on
  // every render unless a test has already installed its own implementation.
  if (!getParkHoursForDate.getMockImplementation()) {
    const actualParkHours = jest.requireActual("../parkHours");
    getParkHoursForDate.mockImplementation((...args) =>
      actualParkHours.getParkHoursForDate(...args)
    );
  }

  window.localStorage.clear();
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(familyProfile));
  // Surfaces planTabState.mode and .label, the decision under test.
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

  const planTab = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === "Plan"
  );
  expect(planTab).toBeTruthy();
  await act(async () => {
    planTab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  const text = container.textContent || "";

  return {
    // The debug rows render with no separator, so each capture is bounded by
    // the label of the row that follows it.
    mode: (text.match(/planTabState\.mode\s*(.+?)planTabState\.label/) || [])[1] || null,
    label: (text.match(/planTabState\.label\s*(.+?)parkOpen/) || [])[1] || null,
    openLabel: (text.match(/parkOpen(.+?)parkClose/) || [])[1] || null,
    text,
  };
}

afterEach(async () => {
  if (root) {
    await act(async () => {
      root.unmount();
    });
    root = null;
  }
  if (container?.parentNode) container.parentNode.removeChild(container);
  container = null;
  jest.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/* 1. The failure that started this                                           */
/* -------------------------------------------------------------------------- */

describe("the morning-of scenario that broke under Los Angeles time", () => {
  test("7:33 AM Orlando, before a 9:00 AM open, is morning-of", async () => {
    // 12:33Z in January is 7:33 AM Orlando (EST). Under the old conversion a
    // Los Angeles device read the opening as 6:00 AM and answered "In park".
    const plan = await planStateAt("2026-01-15T12:33:00.000Z");

    expect(plan.mode).toBe("morning_of");
    expect(plan.label).toBe("Morning of");
    // The schedule the decision was made against, for the record.
    expect(plan.openLabel).toBe(OPEN_LABEL);
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Both boundaries: before, at, after                                      */
/* -------------------------------------------------------------------------- */

describe("the opening boundary", () => {
  test("one minute before open is still morning-of", async () => {
    const plan = await planStateAt("2026-01-15T13:59:00.000Z"); // 8:59 AM Orlando
    expect(plan.mode).toBe("morning_of");
    expect(plan.label).toBe("Morning of");
  });

  test("exactly at open is in park", async () => {
    // nowMinutes < openMinutes is false at equality, so 9:00 is already in park.
    const plan = await planStateAt("2026-01-15T14:00:00.000Z"); // 9:00 AM Orlando
    expect(plan.mode).toBe("in_park");
    expect(plan.label).toBe("In park");
  });

  test("after open is in park", async () => {
    const plan = await planStateAt("2026-01-15T14:30:00.000Z"); // 9:30 AM Orlando
    expect(plan.mode).toBe("in_park");
    expect(plan.label).toBe("In park");
  });
});

describe("the closing boundary", () => {
  test("one minute before close is still the ordinary in-park view", async () => {
    const plan = await planStateAt("2026-01-16T02:59:00.000Z"); // 9:59 PM Orlando
    expect(plan.mode).toBe("in_park");
    expect(plan.label).toBe("In park");
  });

  test("exactly at close is the wrap-up view", async () => {
    // nowMinutes >= closeMinutes, so 10:00 PM is already wrap-up.
    const plan = await planStateAt("2026-01-16T03:00:00.000Z"); // 10:00 PM Orlando
    expect(plan.mode).toBe("in_park");
    expect(plan.label).toBe("Park day wrap-up");
  });

  test("after close is the wrap-up view", async () => {
    const plan = await planStateAt("2026-01-16T03:30:00.000Z"); // 10:30 PM Orlando
    expect(plan.mode).toBe("in_park");
    expect(plan.label).toBe("Park day wrap-up");
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Daylight saving, and the UTC/Orlando date boundary                      */
/* -------------------------------------------------------------------------- */

describe("daylight saving and date boundaries", () => {
  test("a summer morning is morning-of at the same Orlando clock time", async () => {
    // 11:33Z in July is 7:33 AM Orlando (EDT) — an hour's different offset from
    // the January case, and the same answer.
    const plan = await planStateAt("2026-07-15T11:33:00.000Z", SUMMER_TRIP);

    expect(plan.mode).toBe("morning_of");
    expect(plan.label).toBe("Morning of");
  });

  test("a summer evening is in park at the same Orlando clock time", async () => {
    const plan = await planStateAt("2026-07-15T18:00:00.000Z", SUMMER_TRIP); // 2:00 PM Orlando
    expect(plan.mode).toBe("in_park");
    expect(plan.label).toBe("In park");
  });

  test("an instant whose UTC date is already tomorrow reads as tonight in Orlando", async () => {
    // 2:30 AM UTC on the 16th is 9:30 PM Orlando on the 15th: still inside the
    // 09:00-22:00 window, on the previous Orlando calendar day.
    const plan = await planStateAt("2026-01-16T02:30:00.000Z");

    expect(plan.mode).toBe("in_park");
    expect(plan.label).toBe("In park");
    // The closing time the decision was made against, read from the screen.
    expect(plan.text).toContain(CLOSE_LABEL);
  });

  test("just after Orlando midnight is before the same day's open", async () => {
    // 05:30Z is 12:30 AM Orlando on the 15th — a new Orlando day, hours before
    // opening, and on a UTC date that has not turned over yet.
    const plan = await planStateAt("2026-01-15T05:30:00.000Z");

    expect(plan.mode).toBe("morning_of");
    expect(plan.label).toBe("Morning of");
  });
});

/* -------------------------------------------------------------------------- */
/* 4. Missing hours behave as before                                          */
/* -------------------------------------------------------------------------- */

describe("missing park hours", () => {
  /**
   * 10:30 PM Orlando is the one time the two paths disagree, which is what
   * makes this test able to prove which one ran:
   *
   *   real schedule (09:00-22:00)  -> nowMinutes >= closeMinutes -> "Park day wrap-up"
   *   no schedule at all           -> dayPhase late_evening      -> "In park"
   *
   * At every other hour the fallback happens to agree with the real answer, so
   * a passing assertion there would prove nothing.
   */
  const AFTER_CLOSE_UTC = "2026-01-16T03:30:00.000Z"; // 10:30 PM Orlando

  test("the real schedule produces the wrap-up view at this hour", async () => {
    // The control. Without it, the missing-hours assertion below could pass
    // simply because "In park" is a common answer.
    const plan = await planStateAt(AFTER_CLOSE_UTC);

    expect(plan.mode).toBe("in_park");
    expect(plan.label).toBe("Park day wrap-up");
    expect(plan.text).toContain(OPEN_LABEL);
    expect(plan.text).toContain(CLOSE_LABEL);
  });

  test("no schedule falls back to the day-phase branch, with no times shown", async () => {
    const actualParkHours = jest.requireActual("../parkHours");

    // Missing hours are injected at the dependency boundary, and only for the
    // park under test — every other lookup keeps the real schedule.
    getParkHoursForDate.mockImplementation((parkId, date) =>
      parkId === "magic_kingdom" ? null : actualParkHours.getParkHoursForDate(parkId, date)
    );

    const plan = await planStateAt(AFTER_CLOSE_UTC);

    // The intended lookup really received the missing-hours response.
    const magicKingdomLookups = getParkHoursForDate.mock.calls
      .map((call, index) => ({ parkId: call[0], result: getParkHoursForDate.mock.results[index] }))
      .filter((entry) => entry.parkId === "magic_kingdom");

    expect(magicKingdomLookups.length).toBeGreaterThan(0);
    for (const lookup of magicKingdomLookups) {
      expect(lookup.result.type).toBe("return");
      expect(lookup.result.value).toBeNull();
    }

    // With no hours there is nothing to state, so neither label is rendered.
    // Asserted structurally: the two debug rows sit directly against their
    // neighbours with no value between them.
    expect(plan.openLabel).toBeNull();
    expect(plan.text).toContain("parkOpenparkClose");
    expect(plan.text).toContain("parkCloseisBeforeParkOpen");
    expect(plan.text).not.toContain(OPEN_LABEL);
    expect(plan.text).not.toContain(CLOSE_LABEL);

    // And the exact fallback the day-phase branch chooses at this hour —
    // NOT the wrap-up view the real schedule produced in the control above.
    expect(plan.mode).toBe("in_park");
    expect(plan.label).toBe("In park");
  });
});

/* -------------------------------------------------------------------------- */
/* 5. The same file, re-run under other device timezones                      */
/* -------------------------------------------------------------------------- */

const IS_TZ_MATRIX_CHILD = process.env.TOHI_TZ_MATRIX_CHILD === "1";
const describeMatrix = IS_TZ_MATRIX_CHILD ? describe.skip : describe;

describeMatrix("the device timezone cannot change the Plan mode", () => {
  const frontendDir = path.join(__dirname, "..", "..");

  function runSuiteUnderTimezone(timeZone) {
    return spawnSync(
      "npx",
      [
        "react-scripts",
        "test",
        "--watchAll=false",
        "--ci",
        "--testPathPattern=planModeOrlandoTime",
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
    "every mode above is identical with the device in %s",
    (timeZone) => {
      const result = runSuiteUnderTimezone(timeZone);
      const output = `${result.stdout || ""}\n${result.stderr || ""}`;

      if (result.status !== 0) {
        throw new Error(
          `Plan mode selection differed with the device in ${timeZone}:\n${output}`
        );
      }

      // The child really ran this file's scenarios rather than matching nothing.
      expect(output).toMatch(/7:33 AM Orlando, before a 9:00 AM open, is morning-of/);
      expect(output).toMatch(/Tests:\s+3 skipped, 13 passed, 16 total/);
    },
    180000
  );
});
