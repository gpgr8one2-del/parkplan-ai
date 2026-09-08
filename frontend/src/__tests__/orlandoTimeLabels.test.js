/**
 * Regression: park time labels display in Orlando time, on any device.
 *
 * Three display formatters rendered a true instant with no explicit timeZone,
 * so each fell back to whatever zone the device was in:
 *
 *   formatPlanTimeLabel   (App.jsx)            park open / close labels
 *   formatAutoUpdateTime  (App.jsx)            "Waits/weather updated ..."
 *   formatFreshnessTime   (utils/freshness.js) the freshness badge tooltip
 *
 * Invisible to a guest standing in the park, and wrong for everyone else: the
 * pre-trip Plan screen told a Pacific-coast family that Magic Kingdom opens at
 * 6:00 AM. parkHours.js already did this correctly via formatCloseTimeLabel;
 * these three were simply never swept.
 *
 * HOW THIS FILE PROVES THE FIX
 *
 * Every assertion below is timezone-agnostic: it names the Orlando time the
 * label must show, whatever zone the process is running in. The suite therefore
 * means something under any TZ — including this repo's own machine, which
 * happens to sit in America/New_York and so cannot tell a bug from a fix on its
 * own.
 *
 * The "device timezone" describe at the end re-runs THIS FILE in child
 * processes with TZ=UTC and TZ=America/Los_Angeles. Node fixes its zone at
 * process start, so a fresh process is the only honest way to change it; setting
 * process.env.TZ inside a running Jest worker is not reliable. A sentinel env
 * var keeps the children from spawning children.
 *
 * The App-private formatters are exercised through their rendered output — the
 * real App, the real Plan screen — not by re-implementing the formatting.
 */

import { spawnSync } from "child_process";
import path from "path";

import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { formatFreshnessTime, getFreshnessLabel } from "../utils/freshness";

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

/* -------------------------------------------------------------------------- */
/* Instants                                                                   */
/* -------------------------------------------------------------------------- */

// Same wall-clock time in UTC, six months apart. Orlando is UTC-5 in January
// and UTC-4 in July, so a correct implementation renders these ONE HOUR APART.
// A fixed offset, or the device's zone, cannot produce both.
const WINTER_UTC = "2026-01-15T18:00:00.000Z"; // 1:00 PM Orlando (EST)
const SUMMER_UTC = "2026-07-15T18:00:00.000Z"; // 2:00 PM Orlando (EDT)

// 2:30 AM UTC on the 16th is still 9:30 PM Orlando on the 15th. The UTC date
// and the Orlando date disagree, which is where a naive conversion slips a day.
const DATE_BOUNDARY_UTC = "2026-01-16T02:30:00.000Z"; // 9:30 PM Orlando, Jan 15

// Morning of a trip day: 7:33 AM Orlando in January (EST).
const APP_NOW_UTC = "2026-01-15T12:33:00.000Z";
const APP_REFRESH_UTC = "2026-01-15T12:36:00.000Z"; // 7:36 AM Orlando
const AUTO_REFRESH_MS = 3 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* 1. formatFreshnessTime — exported, exercised directly                      */
/* -------------------------------------------------------------------------- */

describe("formatFreshnessTime renders Orlando time", () => {
  test("a winter instant renders in Eastern Standard Time", () => {
    expect(formatFreshnessTime(WINTER_UTC)).toBe("Updated 1:00 PM");
  });

  test("a summer instant renders in Eastern Daylight Time", () => {
    expect(formatFreshnessTime(SUMMER_UTC)).toBe("Updated 2:00 PM");
  });

  test("the same UTC clock time is an hour apart across daylight saving", () => {
    // The DST proof, stated as a relationship rather than two constants: a
    // fixed -5 offset would render these identically.
    expect(formatFreshnessTime(WINTER_UTC)).not.toBe(formatFreshnessTime(SUMMER_UTC));
  });

  test("an instant whose UTC date differs from its Orlando date shows the Orlando time", () => {
    expect(formatFreshnessTime(DATE_BOUNDARY_UTC)).toBe("Updated 9:30 PM");
  });

  test("the caller's prefix is preserved", () => {
    expect(formatFreshnessTime(WINTER_UTC, "Last update:")).toBe("Last update: 1:00 PM");
  });

  test("empty and invalid input behave exactly as before", () => {
    expect(formatFreshnessTime(null)).toBeNull();
    expect(formatFreshnessTime(undefined)).toBeNull();
    expect(formatFreshnessTime("")).toBeNull();
    expect(formatFreshnessTime("not-a-date")).toBeNull();
  });

  test("the freshness badge tooltip carries the Orlando time through", () => {
    // getFreshnessLabel is the real caller; its wording must be untouched.
    const live = getFreshnessLabel("live", 0, WINTER_UTC);
    expect(live.label).toBe("🟢 Live");
    expect(live.tooltip).toBe("Updated 1:00 PM");

    const stale = getFreshnessLabel("stale", 0, SUMMER_UTC);
    expect(stale.label).toBe("🟠 Using older data • refreshing");
    expect(stale.tooltip).toBe("Last update: 2:00 PM");

    // Unchanged: no fetchedAt means no tooltip.
    expect(getFreshnessLabel("live", 0, null).tooltip).toBeNull();
    expect(getFreshnessLabel("mock", 0, WINTER_UTC).tooltip).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* 2. The App-private formatters, through their rendered output                */
/* -------------------------------------------------------------------------- */

const ON_PROPERTY_PROFILE = {
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
    tripStartDate: "2026-01-15",
    tripEndDate: "2026-01-17",
    parkDays: 3,
    parkSelectionIds: ["magic_kingdom"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "magic_kingdom",
    parkHopper: "no",
  },
  resortContext: {
    stayingOnProperty: "yes",
    resortId: "contemporary",
    resortName: "Disney's Contemporary Resort",
    offPropertyHotelName: "",
    transportationMode: "monorail",
  },
};

let container = null;
let root = null;

async function renderPlanScreen() {
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
}

function screenText() {
  return container?.textContent || "";
}

describe("the Plan screen's time labels render Orlando time", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date(APP_NOW_UTC));

    fetchParkData.mockImplementation(() =>
      Promise.resolve({
        parkId: "magic_kingdom",
        source: "live",
        fetchedAt: APP_NOW_UTC,
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
        fetchedAt: APP_NOW_UTC,
        summary: "Partly cloudy",
        tempF: 70,
        feelsLikeF: 70,
        rainRisk: 0.1,
      })
    );

    container = document.createElement("div");
    document.body.appendChild(container);
    window.localStorage.setItem(
      "parkplan.familyProfile",
      JSON.stringify(ON_PROPERTY_PROFILE)
    );
    // Surfaces planTabState.parkOpenLabel / parkCloseLabel, which are computed
    // before any Plan mode branch and so render under every device timezone.
    window.localStorage.setItem("parkplan.debugSnapshot", "true");
  });

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

  test("the park opening label is an Orlando time", async () => {
    // formatPlanTimeLabel, via planTabState.parkOpenLabel.
    //
    // Read from the debug snapshot rather than the transportation briefing,
    // deliberately: this label is built in buildPlanTabState's `base`, before
    // any mode branch, so the surface holds under every device zone.
    //
    // Magic Kingdom opens 9:00 AM Orlando, so that is what must be shown no
    // matter where the family is planning from.
    await renderPlanScreen();

    expect(screenText()).toContain("parkOpen");
    expect(screenText()).toMatch(/parkOpen\s*9:00 AM/);

    // This date carries no verified closing time — only the weekly estimate —
    // so no closing time is stated at all, and the assertion that used to
    // expect "10:00 PM" here was asserting the bug. Positive closing-label
    // coverage, including its own timezone matrix, moved to
    // verifiedCloseLabel.test.js, which runs it against genuinely verified
    // dates rather than an estimate.
    expect(screenText()).toMatch(/parkClose\s*—/);
    expect(screenText()).not.toContain("10:00 PM");
  });

  test("the refresh label is the Orlando refresh time", async () => {
    // formatAutoUpdateTime, via "Waits/weather updated ...".
    await renderPlanScreen();

    // Nothing claimed before the first successful auto-refresh.
    expect(screenText()).not.toMatch(/Waits\/weather updated/);

    // The interval fires a full AUTO_REFRESH_MS of fake time later, so the
    // clock is wound back by that much to land the tick exactly on the target.
    await act(async () => {
      jest.setSystemTime(new Date(new Date(APP_REFRESH_UTC).getTime() - AUTO_REFRESH_MS));
      jest.advanceTimersByTime(AUTO_REFRESH_MS);
    });

    // 12:36 UTC is 7:36 AM in Orlando in January.
    expect(screenText()).toContain("Waits/weather updated 7:36 AM");
  });

  test("an absent timestamp still renders no refresh label at all", async () => {
    // The empty-input path through formatAutoUpdateTime is unchanged: no claim
    // is made, rather than a claim about a missing time.
    await renderPlanScreen();

    expect(screenText()).not.toMatch(/Waits\/weather updated/);
    expect(screenText()).not.toMatch(/Waits\/weather updated\s*$/);
  });
});

/* -------------------------------------------------------------------------- */
/* 3. The same file, re-run under other device timezones                      */
/* -------------------------------------------------------------------------- */

const IS_TZ_MATRIX_CHILD = process.env.TOHI_TZ_MATRIX_CHILD === "1";

// Skipped inside the children so they cannot spawn children of their own.
const describeMatrix = IS_TZ_MATRIX_CHILD ? describe.skip : describe;

describeMatrix("the device timezone cannot change what the labels say", () => {
  // Node resolves its timezone once, at process start. Re-running this file in a
  // fresh process with TZ set is the only way to genuinely change the device
  // zone — mutating process.env.TZ inside this worker would not reliably move
  // Intl, which is exactly what these labels depend on.
  const frontendDir = path.join(__dirname, "..", "..");

  function runSuiteUnderTimezone(timeZone) {
    // spawnSync rather than execFileSync: Jest writes its run summary to
    // stderr, so both streams are needed to report a failure usefully. The
    // exit status is the real signal.
    return spawnSync(
      "npx",
      [
        "react-scripts",
        "test",
        "--watchAll=false",
        "--ci",
        "--testPathPattern=orlandoTimeLabels",
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

  test.each([
    ["UTC"],
    ["America/Los_Angeles"],
  ])(
    "every Orlando label above still holds with the device in %s",
    (timeZone) => {
      // A zero exit means every timezone-agnostic test in this file passed in a
      // process whose zone really was `timeZone`. Before the fix, the park
      // opening label read 2:00 PM under UTC and 6:00 AM under Los Angeles.
      const result = runSuiteUnderTimezone(timeZone);
      const output = `${result.stdout || ""}\n${result.stderr || ""}`;

      if (result.status !== 0) {
        throw new Error(
          `Orlando time labels failed with the device in ${timeZone}:\n${output}`
        );
      }

      // The child really ran this file's assertions rather than matching nothing:
      // all ten timezone-agnostic tests ran, and the two matrix tests were the
      // only ones skipped.
      expect(output).toMatch(/the park opening label is an Orlando time/);
      expect(output).toMatch(/Tests:\s+2 skipped, 10 passed, 12 total/);
    },
    180000
  );
});
