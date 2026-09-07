/**
 * Regression: the freshness stamp may only advance when a refresh succeeded.
 *
 * The defect: loadData handles its own error — which is right, the guest keeps
 * the data already on screen and sees the error state — but it returned nothing
 * either way, so its promise resolved identically on success and on failure.
 * The auto-refresh awaited it and then stamped lastAutoUpdateAt
 * unconditionally, so the Plan screen said "Waits/weather updated 3:47 PM"
 * about a refresh that never landed. A family standing in a park was told that
 * waits from twenty minutes ago were current.
 *
 * The invariant pinned here: a freshness timestamp advances only when the
 * operation it describes actually succeeded. On failure the previous successful
 * time is preserved unchanged, usable data stays on screen, and the error state
 * still appears.
 *
 * These render the REAL App with `../api` mocked, drive the REAL auto-refresh
 * interval, and read the REAL label out of the Plan screen. The wiring is what
 * is under test, so nothing about it is reimplemented here.
 */

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

// A pass-through spy: the real ranking still runs, and every call records what
// the engine actually returned. Recommendation identity is read from that
// rather than inferred from screen text.
jest.mock("../rideRecommendations", () => {
  const actual = jest.requireActual("../rideRecommendations");

  return {
    __esModule: true,
    ...actual,
    getNextBestRides: jest.fn((...args) => actual.getNextBestRides(...args)),
  };
});

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { fetchParkData, fetchWeather } from "../api";
// eslint-disable-next-line import/first
import { getNextBestRides } from "../rideRecommendations";
// The approved copy is the contract; the test reads it rather than restating it.
// eslint-disable-next-line import/first
import { WAITS_COPY } from "../utils/waitsViewState";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

// Must match AUTO_REFRESH_MS in App.jsx.
const AUTO_REFRESH_MS = 3 * 60 * 1000;

const START = new Date("2026-05-08T17:00:00.000Z"); // 1:00 PM Orlando

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

const parkPayload = () => ({
  parkId: "magic_kingdom",
  source: "live",
  rides: MK_RIDES,
  lands: [],
});

const weatherPayload = () => ({
  parkId: "magic_kingdom",
  source: "live",
  summary: "Partly cloudy",
  tempF: 86,
  feelsLikeF: 92,
  rainRisk: 0.1,
  stormMode: false,
  currentPrecipitation: false,
});

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

let container = null;
let root = null;

function succeed() {
  fetchParkData.mockImplementation(() => Promise.resolve(parkPayload()));
  fetchWeather.mockImplementation(() => Promise.resolve(weatherPayload()));
}

/** The park request fails; weather is irrelevant once Promise.all rejects. */
function failNextRefresh(message = "API /api/park-data -> 502") {
  fetchParkData.mockImplementation(() => Promise.reject(new Error(message)));
  fetchWeather.mockImplementation(() => Promise.resolve(weatherPayload()));
}

async function renderApp() {
  root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(App));
  });
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
}

/** BottomTabs renders through a portal into document.body. */
async function goToTab(label) {
  const button = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === label
  );
  expect(button).toBeTruthy();

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

const goToPlanTab = () => goToTab("Plan");

/**
 * Fire exactly one auto-refresh cycle that COMPLETES at `completesAt`.
 *
 * The interval fires after a full AUTO_REFRESH_MS of fake time, so the clock is
 * wound back by that much first and the tick lands exactly on the target
 * instant. That is what lets the assertions name a precise clock time.
 */
async function autoRefreshAt(completesAt) {
  await act(async () => {
    jest.setSystemTime(new Date(completesAt.getTime() - AUTO_REFRESH_MS));
    jest.advanceTimersByTime(AUTO_REFRESH_MS);
  });
}

function screenText() {
  return container?.textContent || "";
}

/**
 * A saved area for the active park.
 *
 * Called per-test rather than in beforeEach: with a land set the Plan screen
 * renders its recommendation branch, and WITHOUT one it renders the setup
 * branch that carries the "Waits/weather updated" line. Different tests need
 * different halves.
 */
function seedLand(land = "frontierland") {
  window.localStorage.setItem(
    "parkplan.state",
    JSON.stringify({ magic_kingdom: { currentLand: land, currentLandSource: "manual" } })
  );
}

/** The Waits screen's own Refresh control. */
function waitsRefreshButton() {
  return Array.from(container.querySelectorAll("button")).find((node) => {
    const text = (node.textContent || "").trim();
    return text === "Refresh" || text === "Loading";
  });
}

/** Which attraction the engine put in each immediate slot, from its own output. */
function recommendationSlots() {
  const calls = getNextBestRides.mock.results;
  for (let i = calls.length - 1; i >= 0; i -= 1) {
    const value = calls[i]?.value;
    if (!value) continue;

    return ["bestMove", "backup", "worthTheWalk", "planAhead", "waitOnThis"].map((slot) => [
      slot,
      value[slot]?.name ?? null,
      value[slot]?.recommendationScore ?? null,
    ]);
  }
  return null;
}

/** How many times the ACTIVE park's data was requested. */
function activeParkRequestCount() {
  return fetchParkData.mock.calls.filter(([parkId]) => parkId === "magic_kingdom").length;
}

/** The rendered "Waits/weather updated HH:MM AM/PM" claim, or null if absent. */
function freshnessLabel() {
  const match = screenText().match(/Waits\/weather updated \d{1,2}:\d{2}\s?[AP]M/);
  return match ? match[0].trim() : null;
}

beforeEach(() => {
  window.localStorage.clear();
  jest.useFakeTimers("modern");
  jest.setSystemTime(START);

  succeed();

  // CRA's jest config sets resetMocks, so the pass-through is re-established
  // here exactly as the api mocks are.
  const actualEngine = jest.requireActual("../rideRecommendations");
  getNextBestRides.mockImplementation((...args) => actualEngine.getNextBestRides(...args));

  container = document.createElement("div");
  document.body.appendChild(container);
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(COMPLETE_PROFILE));

  // Deliberately no saved area. The "Waits/weather updated" line lives in the
  // Plan screen's setup-state branch, alongside the location controls, so a
  // seeded land renders the other branch and hides the very label under test.
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
/* 1-3. The stamp tells the truth                                             */
/* -------------------------------------------------------------------------- */

describe("the freshness stamp follows the refresh, not the attempt", () => {
  test("a successful refresh advances the timestamp", async () => {
    await renderApp();
    await goToPlanTab();

    // Nothing claimed before the first auto-refresh has run.
    expect(freshnessLabel()).toBeNull();

    await autoRefreshAt(new Date("2026-05-08T17:05:00.000Z")); // 1:05 PM

    const label = freshnessLabel();
    expect(label).toBeTruthy();
    expect(label).toMatch(/Waits\/weather updated 1:05/);
  });

  test("a failed refresh does not advance the timestamp", async () => {
    await renderApp();
    await goToPlanTab();

    failNextRefresh();
    await autoRefreshAt(new Date("2026-05-08T17:05:00.000Z"));

    // Nothing succeeded yet, so there is nothing to claim. The old behaviour
    // stamped 1:05 here and told the family the waits were current.
    expect(freshnessLabel()).toBeNull();
  });

  test("a failed refresh preserves the previous successful timestamp", async () => {
    await renderApp();
    await goToPlanTab();

    await autoRefreshAt(new Date("2026-05-08T17:05:00.000Z")); // succeeds
    const afterSuccess = freshnessLabel();
    expect(afterSuccess).toMatch(/1:05/);

    failNextRefresh();
    await autoRefreshAt(new Date("2026-05-08T17:35:00.000Z")); // 1:35 PM, fails

    // Still 1:05 — the last moment TOHI genuinely had fresh waits.
    expect(freshnessLabel()).toBe(afterSuccess);
    expect(freshnessLabel()).not.toMatch(/1:35/);
  });

  test("a later success after a failure advances the timestamp normally", async () => {
    await renderApp();
    await goToPlanTab();

    await autoRefreshAt(new Date("2026-05-08T17:05:00.000Z")); // succeeds
    expect(freshnessLabel()).toMatch(/1:05/);

    failNextRefresh();
    await autoRefreshAt(new Date("2026-05-08T17:35:00.000Z")); // fails
    expect(freshnessLabel()).toMatch(/1:05/);

    succeed();
    await autoRefreshAt(new Date("2026-05-08T18:05:00.000Z")); // 2:05 PM, succeeds
    expect(freshnessLabel()).toMatch(/2:05/);
    expect(freshnessLabel()).not.toMatch(/1:05/);
  });
});

/* -------------------------------------------------------------------------- */
/* 4-5. What survives a failure                                               */
/* -------------------------------------------------------------------------- */

describe("a failed refresh leaves the family with what they had", () => {
  test("existing usable data remains on screen after a refresh failure", async () => {
    await renderApp();
    await goToTab("Waits");

    await autoRefreshAt(new Date("2026-05-08T17:05:00.000Z"));
    expect(screenText()).toContain("Big Thunder Mountain Railroad");

    failNextRefresh();
    await autoRefreshAt(new Date("2026-05-08T17:35:00.000Z"));

    // The attraction data loaded earlier is still there — a failed request
    // must never blank the screen the family is using.
    expect(screenText()).toContain("Big Thunder Mountain Railroad");
    expect(screenText()).toContain("Haunted Mansion");
  });

  test("the caller cannot mistake a swallowed failure for success", async () => {
    // The mechanism itself: loadData handles its own error, so its promise
    // resolves either way. It must therefore REPORT the outcome, or the caller
    // has no way to tell the two apart — which is exactly how the false stamp
    // happened.
    await renderApp();
    await goToPlanTab();

    await autoRefreshAt(new Date("2026-05-08T17:05:00.000Z"));
    const truthful = freshnessLabel();

    failNextRefresh();
    const rejections = [];
    const onRejection = (event) => rejections.push(event);
    window.addEventListener("unhandledrejection", onRejection);

    try {
      await autoRefreshAt(new Date("2026-05-08T17:35:00.000Z"));

      // The failure is handled, not thrown past the caller...
      expect(rejections).toHaveLength(0);
      // ...and yet the caller still learned it failed.
      expect(freshnessLabel()).toBe(truthful);
    } finally {
      window.removeEventListener("unhandledrejection", onRejection);
    }
  });

  test("the guest actually sees the failure, alongside the retained data", async () => {
    // Withholding the stamp must not also hide the failure. This asserts the
    // shipped copy on the screen that owns it — WAITS_COPY.ACTIVE_REFRESH_ERROR,
    // the retained-data error state — rather than merely that a fetch happened.
    await renderApp();
    await goToTab("Waits");

    await autoRefreshAt(new Date("2026-05-08T17:05:00.000Z"));
    expect(screenText()).not.toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
    expect(screenText()).toContain("Big Thunder Mountain Railroad");

    failNextRefresh();
    await autoRefreshAt(new Date("2026-05-08T17:08:00.000Z"));

    // The message the family reads, and the data they keep, at the same time.
    expect(screenText()).toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
    expect(screenText()).toContain("Big Thunder Mountain Railroad");
    expect(screenText()).toContain("Haunted Mansion");
  });

  test("the preserved timestamp and the visible failure coexist", async () => {
    // The Plan screen keeps the last truthful time while Waits explains the
    // failure. Neither signal suppresses the other.
    await renderApp();
    await goToPlanTab();
    await autoRefreshAt(new Date("2026-05-08T17:05:00.000Z"));
    expect(freshnessLabel()).toMatch(/1:05/);

    failNextRefresh();
    await goToTab("Waits");
    await autoRefreshAt(new Date("2026-05-08T17:08:00.000Z"));
    expect(screenText()).toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);

    await goToPlanTab();
    expect(freshnessLabel()).toMatch(/1:05/);
  });
});

/* -------------------------------------------------------------------------- */
/* 6. The manual path                                                         */
/* -------------------------------------------------------------------------- */

describe("the manual refresh path", () => {
  /** Click the Waits screen's Refresh button, requiring it to exist. */
  async function clickWaitsRefresh(at) {
    const button = waitsRefreshButton();
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(false);

    await act(async () => {
      jest.setSystemTime(at);
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  test("the Waits Refresh button requests the active park's data", async () => {
    await renderApp();
    await goToTab("Waits");

    const before = activeParkRequestCount();
    await clickWaitsRefresh(new Date("2026-05-08T17:20:00.000Z"));

    // The click really reached handleWaitsRefresh -> loadData(true).
    expect(activeParkRequestCount()).toBe(before + 1);
    const lastCall = fetchParkData.mock.calls[fetchParkData.mock.calls.length - 1];
    expect(lastCall[0]).toBe("magic_kingdom");
    expect(lastCall[1]).toEqual(expect.objectContaining({ force: true }));
  });

  test("a SUCCESSFUL manual refresh does not advance the auto-refresh timestamp", async () => {
    await renderApp();
    await goToPlanTab();

    await autoRefreshAt(new Date("2026-05-08T17:05:00.000Z"));
    const afterAuto = freshnessLabel();
    expect(afterAuto).toMatch(/1:05/);

    await goToTab("Waits");
    const before = activeParkRequestCount();
    await clickWaitsRefresh(new Date("2026-05-08T17:20:00.000Z"));
    expect(activeParkRequestCount()).toBe(before + 1);

    await goToPlanTab();
    expect(freshnessLabel()).toBe(afterAuto);
    expect(freshnessLabel()).not.toMatch(/1:20/);
  });

  test("a FAILED manual refresh does not advance the auto-refresh timestamp", async () => {
    // The same truthfulness rule from the other direction: the manual path
    // cannot claim a refresh time on success OR on failure, because it never
    // writes this stamp at all. Pinned so that wiring it in later cannot
    // reintroduce the unconditional version.
    await renderApp();
    await goToPlanTab();

    await autoRefreshAt(new Date("2026-05-08T17:05:00.000Z"));
    const afterAuto = freshnessLabel();
    expect(afterAuto).toMatch(/1:05/);

    await goToTab("Waits");
    failNextRefresh();
    const before = activeParkRequestCount();
    await clickWaitsRefresh(new Date("2026-05-08T17:20:00.000Z"));

    expect(activeParkRequestCount()).toBe(before + 1);
    expect(screenText()).toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);

    await goToPlanTab();
    expect(freshnessLabel()).toBe(afterAuto);
    expect(freshnessLabel()).not.toMatch(/1:20/);
  });

  test("only one place in App advances this timestamp", () => {
    const source = require("fs").readFileSync(
      require("path").join(__dirname, "..", "App.jsx"),
      "utf8"
    );

    const writers = source.match(/setLastAutoUpdateAt\s*\(/g) || [];
    expect(writers).toHaveLength(1);

    // And that one place is guarded by the refresh outcome.
    expect(source).toMatch(
      /const refreshed = await loadData\(true\);[\s\S]{0,600}?if \(refreshed\) \{\s*setLastAutoUpdateAt\(/
    );
  });
});

/* -------------------------------------------------------------------------- */
/* 7. Nothing about recommendations moved                                     */
/* -------------------------------------------------------------------------- */

describe("no recommendation behavior changed", () => {
  test("slot-by-slot recommendation identity is unchanged by a failed refresh", async () => {
    // A saved area, so the Plan screen renders real recommendation cards rather
    // than its setup state — otherwise there is nothing to compare.
    seedLand("frontierland");

    await renderApp();
    await goToPlanTab();

    await autoRefreshAt(new Date("2026-05-08T17:05:00.000Z"));

    // The baseline must be real: at least one immediate slot filled, and the
    // cards actually on screen.
    const before = recommendationSlots();
    expect(before).toBeTruthy();
    expect(before.some(([, name]) => name !== null)).toBe(true);
    expect(screenText()).toContain("BEST MOVE");

    const bestMoveName = before.find(([slot]) => slot === "bestMove")?.[1];
    expect(bestMoveName).toBeTruthy();
    expect(screenText()).toContain(bestMoveName);

    // Three minutes later — one interval, same hour, same day phase — so no
    // time-dependent modifier can move underneath the comparison.
    failNextRefresh();
    await autoRefreshAt(new Date("2026-05-08T17:08:00.000Z"));

    const after = recommendationSlots();
    expect(after).toEqual(before);
    expect(screenText()).toContain(bestMoveName);
  });
});
