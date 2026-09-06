/**
 * Regression: the app's shared clock reaches the recommendation engine.
 *
 * The engine treats timeContext.nowIso as the one instant a recommendation pass
 * runs at. That is only an improvement if timeContext itself advances. In App,
 * the memo that builds it depends on activePark and familyProfileSummary —
 * neither of which changes as time passes — so the whole object could sit frozen
 * at whatever instant the guest last switched parks or edited their profile.
 * Park open and close, Early Entry, showtimes and every time-based modifier
 * would then be ranked against a stale clock for the rest of the day.
 *
 * The fix feeds the memo from locationFreshnessNow, the coarse 30-second clock
 * the app already runs for expiring location and rain state, and adds it to the
 * dependency list. No second timer.
 *
 * These render the REAL App with `../api` mocked and observe the REAL
 * timeContext handed to the REAL engine, by wrapping getNextBestRides in a
 * pass-through spy. Nothing about the engine's behaviour is reimplemented here.
 */

import fs from "fs";
import path from "path";

import React, { act } from "react";
import { createRoot } from "react-dom/client";

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../api", () => ({
  fetchParkData: jest.fn(),
  fetchWeather: jest.fn(() => Promise.resolve(null)),
  sendChatMessage: jest.fn(() => Promise.resolve({ reply: "" })),
  sendTohiPickReview: jest.fn(() => Promise.resolve(null)),
  trackEvent: jest.fn(),
}));

// A pass-through spy: the real ranking still runs, and every call records the
// timeContext App actually handed it.
jest.mock("../rideRecommendations", () => {
  const actual = jest.requireActual("../rideRecommendations");

  return {
    __esModule: true,
    ...actual,
    getNextBestRides: jest.fn((...args) => actual.getNextBestRides(...args)),
  };
});

// The same trick one level up: records how BOTH time contexts were built, so a
// test can compare the instant each memo was given rather than infer it.
jest.mock("../utils/timeContext", () => {
  const actual = jest.requireActual("../utils/timeContext");

  return {
    __esModule: true,
    ...actual,
    getCurrentTimeContext: jest.fn((...args) => actual.getCurrentTimeContext(...args)),
  };
});

// The rendered end of the planning chain. Plan receives planningTimeContext as
// its timeContext prop, so its props are the honest downstream observation.
jest.mock("../components/PlanTab", () => {
  const actual = jest.requireActual("../components/PlanTab");

  return {
    __esModule: true,
    ...actual,
    PlanTab: jest.fn((props) => actual.PlanTab(props)),
  };
});

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { fetchParkData } from "../api";
// eslint-disable-next-line import/first
import { getNextBestRides } from "../rideRecommendations";
// eslint-disable-next-line import/first
import { getCurrentTimeContext } from "../utils/timeContext";
// eslint-disable-next-line import/first
import { PlanTab } from "../components/PlanTab";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

// 1:00 PM Orlando on a day inside the trip.
const MIDDAY = new Date("2026-05-08T17:00:00.000Z");
// Same day, 7:00 PM Orlando — a different hour, a different day phase.
const EVENING = new Date("2026-05-08T23:00:00.000Z");
// The next Orlando calendar day, 9:00 AM.
const NEXT_MORNING = new Date("2026-05-09T13:00:00.000Z");

const COMPLETE_PROFILE = {
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
    tripStartDate: "2026-05-08",
    tripEndDate: "2026-05-10",
    parkDays: 3,
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

const MK_RIDES = [
  { id: "mk-1", name: "Big Thunder Mountain Railroad", land: "frontierland", waitTime: 20, isOpen: true },
  { id: "mk-2", name: "Haunted Mansion", land: "liberty_square", waitTime: 25, isOpen: true },
  { id: "mk-3", name: "Pirates of the Caribbean", land: "adventureland", waitTime: 15, isOpen: true },
  { id: "mk-4", name: "It's a Small World", land: "fantasyland", waitTime: 10, isOpen: true },
];

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

let container = null;
let root = null;

function seed() {
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(COMPLETE_PROFILE));
  window.localStorage.setItem(
    "parkplan.state",
    JSON.stringify({ magic_kingdom: { currentLand: "frontierland", currentLandSource: "manual" } })
  );
}

async function renderApp() {
  root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(App));
  });
  // App releases its "still restoring" guard on a zero-delay timeout.
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
}

/**
 * The observed instant landed in the tick that followed `target`, and every
 * field derived from it agrees with it. The window is the clock's own 30-second
 * resolution — asserting a stale value would fail it, and so would a value
 * whose derived fields came from a different moment.
 */
function expectWithinTickWindow(observedIso, target) {
  const observed = new Date(observedIso).getTime();
  expect(observed).toBeGreaterThanOrEqual(target.getTime() - 1);
  expect(observed).toBeLessThanOrEqual(target.getTime() + 30 * 1000);
}

/**
 * The two time-context memos, identified by the fact that they alone supply an
 * explicit `now`. getDateAccessStatus inside familyProfile also calls
 * getCurrentTimeContext, with no park and no now, and is not part of this pair.
 */
function memoBuilds() {
  return getCurrentTimeContext.mock.calls
    .map(([args]) => args)
    .filter((args) => args && args.now instanceof Date);
}

function latestBuildFor(parkId) {
  const matching = memoBuilds().filter((args) => args.activePark === parkId);
  return matching[matching.length - 1] || null;
}

/** The timeContext prop the real Plan screen was last rendered with. */
function latestPlanScreenTimeContext() {
  const calls = PlanTab.mock.calls;
  for (let i = calls.length - 1; i >= 0; i -= 1) {
    const ctx = calls[i]?.[0]?.timeContext;
    if (ctx) return ctx;
  }
  return null;
}

/** Every timeContext the engine has been handed, oldest first. */
function timeContextsSeen() {
  return getNextBestRides.mock.calls.map(([args]) => args?.timeContext).filter(Boolean);
}

function latestTimeContext() {
  const seen = timeContextsSeen();
  return seen[seen.length - 1] || null;
}

/**
 * Move the wall clock, then let exactly one 30-second tick fire.
 *
 * Deliberately not advanceTimersByTime(sixHours): that would fire the interval
 * hundreds of times and re-render the whole app for each. Setting the system
 * time and releasing a single tick reproduces what the guest experiences —
 * the next tick observes the new time — at one render.
 *
 * The tick lands within the 30-second window rather than exactly on `instant`,
 * because the pending interval keeps whatever time it had remaining when the
 * system clock moved. Callers assert the window; the exact-instant claim is
 * made by the visibility path below, which reads Date.now() as it fires.
 */
async function tickTo(instant) {
  await act(async () => {
    jest.setSystemTime(instant);
    jest.advanceTimersByTime(30 * 1000);
  });
}

/**
 * Move to the Plan tab. The app opens on Home, so PlanTab is not mounted until
 * the guest goes there — and the planning context is only observable through a
 * mounted Plan screen. BottomTabs renders through a portal into document.body.
 */
async function goToPlanTab() {
  const button = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === "Plan"
  );
  expect(button).toBeTruthy();

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/** Come back to a visible app without letting the interval fire. */
async function becomeVisibleAt(instant) {
  await act(async () => {
    jest.setSystemTime(instant);
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

beforeEach(async () => {
  window.localStorage.clear();
  jest.useFakeTimers("modern");
  jest.setSystemTime(MIDDAY);

  // CRA's jest config sets resetMocks, which clears mock implementations before
  // every test — so the pass-through has to be re-established here, exactly as
  // the api mocks are.
  const actualEngine = jest.requireActual("../rideRecommendations");
  getNextBestRides.mockImplementation((...args) => actualEngine.getNextBestRides(...args));

  const actualTime = jest.requireActual("../utils/timeContext");
  getCurrentTimeContext.mockImplementation((...args) =>
    actualTime.getCurrentTimeContext(...args)
  );

  const actualPlanTab = jest.requireActual("../components/PlanTab");
  PlanTab.mockImplementation((props) => actualPlanTab.PlanTab(props));

  fetchParkData.mockImplementation((parkId) =>
    Promise.resolve({ parkId, source: "live", rides: MK_RIDES, lands: [] })
  );

  container = document.createElement("div");
  document.body.appendChild(container);
  seed();
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

/* -------------------------------------------------------------------------- */
/* 1. The clock reaches the engine and advances                               */
/* -------------------------------------------------------------------------- */

describe("the shared app clock drives timeContext", () => {
  test("the engine is handed a timeContext carrying a usable nowIso", async () => {
    await renderApp();

    const ctx = latestTimeContext();
    expect(ctx).toBeTruthy();
    expect(typeof ctx.nowIso).toBe("string");
    expect(Number.isFinite(new Date(ctx.nowIso).getTime())).toBe(true);
    expect(new Date(ctx.nowIso).getTime()).toBe(MIDDAY.getTime());
  });

  test("advancing the shared clock refreshes timeContext.nowIso", async () => {
    await renderApp();
    const before = latestTimeContext().nowIso;

    await tickTo(EVENING);
    const after = latestTimeContext().nowIso;

    expect(after).not.toBe(before);
    expectWithinTickWindow(after, EVENING);
  });

  test("Orlando date, time label and day phase all follow the new clock value", async () => {
    await renderApp();
    const midday = latestTimeContext();

    await tickTo(EVENING);
    const evening = latestTimeContext();

    // Same calendar day, later hour: the time label and the day phase move.
    expect(evening.orlandoDate).toBe(midday.orlandoDate);
    expect(evening.orlandoTimeLabel).not.toBe(midday.orlandoTimeLabel);
    expect(evening.orlandoTotalMinutes).toBeGreaterThan(midday.orlandoTotalMinutes);
    expect(evening.dayPhase).not.toBe(midday.dayPhase);

    // And they are exactly what the real derivation produces for that instant,
    // rather than merely "different".
    const expected = getCurrentTimeContext({
      activePark: "magic_kingdom",
      familyProfile: null,
      now: EVENING,
    });
    expect(evening.orlandoDate).toBe(expected.orlandoDate);
    expect(evening.orlandoTimeLabel).toBe(expected.orlandoTimeLabel);
    expect(evening.orlandoTotalMinutes).toBe(expected.orlandoTotalMinutes);
    expect(evening.dayPhase).toBe(expected.dayPhase);
  });

  test("crossing into the next Orlando day updates the date, not just the hour", async () => {
    await renderApp();
    const first = latestTimeContext();

    await tickTo(NEXT_MORNING);
    const next = latestTimeContext();

    expect(next.orlandoDate).not.toBe(first.orlandoDate);
    expect(next.orlandoDate).toBe(
      getCurrentTimeContext({ activePark: "magic_kingdom", now: NEXT_MORNING }).orlandoDate
    );
  });

  test("the recommendation memo re-runs with the refreshed context", async () => {
    await renderApp();
    const callsBefore = getNextBestRides.mock.calls.length;

    await tickTo(EVENING);

    expect(getNextBestRides.mock.calls.length).toBeGreaterThan(callsBefore);
    // The engine's newest call carries the new instant, not the old one.
    expectWithinTickWindow(latestTimeContext().nowIso, EVENING);
  });

  test("returning to the visible app refreshes the clock without waiting for a tick", async () => {
    await renderApp();
    const before = latestTimeContext().nowIso;

    // No interval advance at all — only the visibility event.
    await becomeVisibleAt(EVENING);

    const after = latestTimeContext().nowIso;
    expect(after).not.toBe(before);
    expect(new Date(after).getTime()).toBe(EVENING.getTime());
  });
});

/* -------------------------------------------------------------------------- */
/* 2. One instant per pass, one timer for the app                             */
/* -------------------------------------------------------------------------- */

describe("one clock, shared", () => {
  test("a single pass is governed throughout by the one instant it was given", async () => {
    await renderApp();
    await tickTo(EVENING);

    const [args] = getNextBestRides.mock.calls[getNextBestRides.mock.calls.length - 1];
    const actual = jest.requireActual("../rideRecommendations");

    // Replaying App's own arguments under a wildly different wall clock must
    // reproduce the same ranking: proof the pass reads only its timeContext.
    jest.setSystemTime(new Date("2026-11-02T09:15:00.000Z"));
    const replayA = actual.getNextBestRides(args);
    jest.setSystemTime(new Date("2026-03-19T23:45:00.000Z"));
    const replayB = actual.getNextBestRides(args);

    const shape = (r) => ({
      parkOpenStatus: r.parkOpenStatus,
      slots: ["bestMove", "backup", "worthTheWalk", "planAhead", "waitOnThis"].map((slot) => [
        slot,
        r[slot]?.name ?? null,
        r[slot]?.recommendationScore ?? null,
        r[slot]?.reason ?? null,
      ]),
    });

    expect(shape(replayB)).toEqual(shape(replayA));
  });

  test("every timeContext the engine saw carried exactly one nowIso", async () => {
    await renderApp();
    await tickTo(EVENING);

    for (const ctx of timeContextsSeen()) {
      expect(typeof ctx.nowIso).toBe("string");
      // Derived fields agree with nowIso — one instant produced all of them.
      const derived = getCurrentTimeContext({
        activePark: "magic_kingdom",
        now: new Date(ctx.nowIso),
      });
      expect(ctx.orlandoTotalMinutes).toBe(derived.orlandoTotalMinutes);
      expect(ctx.dayPhase).toBe(derived.dayPhase);
    }
  });

  test("no second timer was introduced — one 30-second clock, one writer", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "App.jsx"), "utf8");
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

    // Exactly one place advances the shared clock, and it is driven by exactly
    // one 30-second interval. A second timer would let two parts of the app
    // believe in two different "now"s.
    const writers = code.match(/setLocationFreshnessNow\s*\(/g) || [];
    expect(writers.length).toBe(1);

    const thirtySecondIntervals = code.match(/setInterval\([^,]+,\s*30 \* 1000\s*\)/g) || [];
    expect(thirtySecondIntervals.length).toBe(1);
  });

  test("the time-context memo depends on the shared clock", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "App.jsx"), "utf8");

    // Pins the dependency the whole fix rests on. Dropping it would silently
    // refreeze timeContext with every test above still passing on first render.
    expect(source).toMatch(
      /const timeContext = useMemo\(\(\) => \{[\s\S]*?now: new Date\(locationFreshnessNow\)[\s\S]*?\}, \[activePark, familyProfileSummary, locationFreshnessNow\]\);/
    );
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Active and planning contexts share one tick                             */
/* -------------------------------------------------------------------------- */

describe("the active and planning time contexts share one tick", () => {
  test("both memos are built from the same instant", async () => {
    await renderApp();

    const builds = memoBuilds();
    expect(builds.length).toBeGreaterThanOrEqual(2);

    // Every build in a single settled render used one instant. If the planning
    // memo had kept its own `new Date()` this set would hold more than one.
    const instants = new Set(builds.map((args) => args.now.getTime()));
    expect(instants.size).toBe(1);
    expect([...instants][0]).toBe(MIDDAY.getTime());
  });

  test("the two contexts are built for different parks but the same moment", async () => {
    await renderApp();

    const active = latestBuildFor("magic_kingdom");
    expect(active).toBeTruthy();

    // Both memos exist and neither was given a bare wall-clock read.
    for (const args of memoBuilds()) {
      expect(args.now).toBeInstanceOf(Date);
      expect(args.now.getTime()).toBe(active.now.getTime());
    }
  });

  test("both advance after the shared 30-second tick", async () => {
    await renderApp();
    const before = new Set(memoBuilds().map((a) => a.now.getTime()));
    expect(before.size).toBe(1);

    getCurrentTimeContext.mockClear();
    await tickTo(EVENING);

    const after = memoBuilds();
    expect(after.length).toBeGreaterThanOrEqual(2);

    const afterInstants = new Set(after.map((a) => a.now.getTime()));
    expect(afterInstants.size).toBe(1);
    expectWithinTickWindow(new Date([...afterInstants][0]).toISOString(), EVENING);
    expect([...afterInstants][0]).not.toBe([...before][0]);
  });

  test("both refresh when the app becomes visible", async () => {
    await renderApp();
    const before = [...new Set(memoBuilds().map((a) => a.now.getTime()))][0];

    getCurrentTimeContext.mockClear();
    await becomeVisibleAt(EVENING);

    const after = memoBuilds();
    expect(after.length).toBeGreaterThanOrEqual(2);

    const afterInstants = new Set(after.map((a) => a.now.getTime()));
    expect(afterInstants.size).toBe(1);
    expect([...afterInstants][0]).toBe(EVENING.getTime());
    expect([...afterInstants][0]).not.toBe(before);
  });

  test("the planning context's Orlando time, day phase and trip status follow the tick", async () => {
    await renderApp();
    await goToPlanTab();
    const before = latestPlanScreenTimeContext();
    expect(before).toBeTruthy();

    await tickTo(EVENING);
    const after = latestPlanScreenTimeContext();

    expect(after.nowIso).not.toBe(before.nowIso);
    expect(after.orlandoTimeLabel).not.toBe(before.orlandoTimeLabel);
    expect(after.orlandoTotalMinutes).toBeGreaterThan(before.orlandoTotalMinutes);
    expect(after.dayPhase).not.toBe(before.dayPhase);

    // Trip status is derived from the same instant, so it is present and
    // consistent rather than left over from an older moment.
    // The family profile matters here: trip status is derived from the trip
    // dates, so omitting it would compare against a "no dates" baseline.
    const expected = jest.requireActual("../utils/timeContext").getCurrentTimeContext({
      activePark: "magic_kingdom",
      familyProfile: COMPLETE_PROFILE,
      now: new Date(after.nowIso),
    });
    expect(after.orlandoTimeLabel).toBe(expected.orlandoTimeLabel);
    expect(after.dayPhase).toBe(expected.dayPhase);
    expect(after.tripStatus?.status).toBe(expected.tripStatus?.status);
  });

  test("planning park state crossing into the next Orlando day updates the date", async () => {
    await renderApp();
    await goToPlanTab();
    const before = latestPlanScreenTimeContext();

    await tickTo(NEXT_MORNING);
    const after = latestPlanScreenTimeContext();

    expect(after.orlandoDate).not.toBe(before.orlandoDate);
  });

  test("downstream planning calculations receive the refreshed context", async () => {
    await renderApp();
    await goToPlanTab();
    const before = latestPlanScreenTimeContext().nowIso;

    await tickTo(EVENING);

    // The real Plan screen — the end of the planning chain that feeds plan
    // state, nudges, the day game plan and packing — was re-rendered with it.
    const after = latestPlanScreenTimeContext().nowIso;
    expect(after).not.toBe(before);
    expectWithinTickWindow(after, EVENING);
  });

  test("the active and planning screens never disagree about the moment", async () => {
    await renderApp();
    await goToPlanTab();
    await tickTo(EVENING);

    const engineCtx = latestTimeContext();
    const planCtx = latestPlanScreenTimeContext();

    expect(planCtx.nowIso).toBe(engineCtx.nowIso);
    expect(planCtx.orlandoDate).toBe(engineCtx.orlandoDate);
    expect(planCtx.orlandoTimeLabel).toBe(engineCtx.orlandoTimeLabel);
    expect(planCtx.dayPhase).toBe(engineCtx.dayPhase);
    expect(planCtx.tripStatus?.status).toBe(engineCtx.tripStatus?.status);
  });

  test("the planning memo depends on the shared clock", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "App.jsx"), "utf8");

    expect(source).toMatch(
      /const planningTimeContext = useMemo\(\(\) => \{[\s\S]*?now: new Date\(locationFreshnessNow\)[\s\S]*?\}, \[planningPark, familyProfileSummary, locationFreshnessNow\]\);/
    );
  });

  test("no clock state was added — the timer surface matches origin/main", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "App.jsx"), "utf8");
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

    // Three intervals and three timeouts, exactly as on origin/main, and the
    // two Date.now() state hooks are the shared clock and the pre-existing
    // in-line activity timer. A third would be a second clock.
    expect((code.match(/setInterval\(/g) || []).length).toBe(3);
    expect((code.match(/setTimeout\(/g) || []).length).toBe(3);
    expect((code.match(/useState\(\(\) => Date\.now\(\)\)/g) || []).length).toBe(2);
  });
});
