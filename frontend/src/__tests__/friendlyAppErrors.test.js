/**
 * Regression: app failures are explained in words a family can act on.
 *
 * Two guest-facing surfaces rendered raw internals.
 *
 * 1. loadData stores err.message, which api.js builds as
 *    `API ${path} -> ${status}: ${body}`. HomeTab rendered that string
 *    directly, so a failed load put an internal route, an HTTP status and the
 *    upstream provider's own JSON on the Home screen:
 *
 *      API /api/park-data?parkId=magic_kingdom -> 502:
 *      {"error":"Could not fetch park data","detail":"Queue-Times 503"}
 *
 * 2. ErrorBoundary rendered error.message under "Something broke.", so a render
 *    crash showed the family
 *    "Cannot read properties of undefined (reading 'landKey')".
 *
 * The fix is at the presentation boundary. `error` itself is unchanged —
 * WaitsTab reads it for truthiness only — and loadData's data-retention
 * behaviour is untouched. The raw string is no longer rendered anywhere, in the
 * guest surface or the debug panel.
 *
 * Which message is honest depends on what survived: after a successful load the
 * previous information really is still on screen, and on a first failure there
 * is nothing to fall back to. Both cases are asserted separately, because
 * promising a cache that does not exist would be a second, quieter lie.
 *
 * Guest-facing assertions read guestText(), which strips the debug panel, so
 * developer-only output can never satisfy a claim about what a family sees. The
 * panel is asserted separately, and is required to be free of the raw text too.
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

import ErrorBoundary from "../ErrorBoundary";

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
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const NOW = "2026-05-10T18:00:00.000Z"; // 2:00 PM Orlando

// Must match AUTO_REFRESH_MS in App.jsx. The automatic refresh is the only path
// that stamps lastAutoUpdateAt; tapping Refresh never touches it.
const AUTO_REFRESH_MS = 3 * 60 * 1000;

// The shape api.js actually throws, verbatim in structure: internal route,
// HTTP status, and the backend's own body echoed back.
const RAW_API_MESSAGE =
  'API /api/park-data?parkId=magic_kingdom -> 502: {"error":"Could not fetch park data","detail":"Queue-Times 503"}';

const RAW_FRAGMENTS = [
  "API /api/park-data",
  "-> 502",
  "Queue-Times",
  "Could not fetch park data",
];

const RETAINED_MESSAGE =
  "We couldn’t refresh right now. You’re seeing the last information we loaded. Please try again.";
const NO_DATA_MESSAGE =
  "We couldn’t load park information right now. Please try again in a moment.";

const PROFILE = {
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
    tripEndDate: "2026-05-12",
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

const RIDES = [
  { id: "mk-1", name: "Pirates of the Caribbean", land: "adventureland", waitTime: 15, isOpen: true },
  { id: "mk-2", name: "Haunted Mansion", land: "liberty_square", waitTime: 25, isOpen: true },
];

const parkPayload = () => ({
  parkId: "magic_kingdom",
  source: "live",
  fetchedAt: NOW,
  ageMs: 0,
  rides: RIDES,
  lands: [],
});

const weatherPayload = () => ({
  parkId: "magic_kingdom",
  source: "live",
  fetchedAt: NOW,
  summary: "Clear",
  tempF: 74,
  feelsLikeF: 74,
  rainRisk: 0.1,
});

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

let container = null;
let root = null;

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

function succeed() {
  fetchParkData.mockImplementation(() => Promise.resolve(parkPayload()));
  fetchWeather.mockImplementation(() => Promise.resolve(weatherPayload()));
}

function failWithRawApiError() {
  fetchParkData.mockImplementation(() => Promise.reject(new Error(RAW_API_MESSAGE)));
  fetchWeather.mockImplementation(() => Promise.reject(new Error(RAW_API_MESSAGE)));
}

/**
 * What the guest can read, with the debug panel removed.
 *
 * Debug output must never be able to satisfy a claim about what a family can
 * read, so it is stripped here and asserted on separately.
 */
function guestText() {
  if (!container) return "";
  const clone = container.cloneNode(true);
  clone.querySelectorAll("details").forEach((node) => node.remove());
  return clone.textContent || "";
}

function debugText() {
  if (!container) return "";
  return Array.from(container.querySelectorAll("details"))
    .map((node) => node.textContent || "")
    .join(" ");
}

async function renderHome({ debug = true } = {}) {
  await cleanupMountedApp();

  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(NOW));

  window.localStorage.clear();
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(PROFILE));
  if (debug) window.localStorage.setItem("parkplan.debugSnapshot", "true");

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(App));
  });
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  // Home is the default tab; no navigation needed.
}

/** Home's Refresh control. Required, never optional. */
function refreshButton() {
  const button = Array.from(container.querySelectorAll("button")).find((node) =>
    /^(Refresh|Loading)$/.test((node.textContent || "").trim())
  );
  expect(button).toBeTruthy();
  return button;
}

async function tapRefresh() {
  const button = refreshButton();
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/**
 * Fire exactly one automatic refresh cycle that COMPLETES at `completesAt`.
 *
 * The interval fires after a full AUTO_REFRESH_MS of fake time, so the clock is
 * wound back by that much first and the tick lands on the target instant. Same
 * pattern as refreshFreshnessTruth.test.js.
 */
async function autoRefreshAt(completesAt) {
  await act(async () => {
    jest.setSystemTime(new Date(completesAt.getTime() - AUTO_REFRESH_MS));
    jest.advanceTimersByTime(AUTO_REFRESH_MS);
  });
}

/**
 * The lastAutoUpdateAt debug row, read exactly and required to exist.
 *
 * An earlier version of this used a two-alternative regex but read only capture
 * group 1, so when the second alternative matched the assertion degenerated to
 * null === null and passed without checking anything. One anchored pattern, and
 * a hard failure if the row is missing.
 */
function lastAutoUpdateAtValue() {
  const match = debugText().match(/lastAutoUpdateAt(.*?)Time \/ Park State/);
  expect(match).toBeTruthy();
  // The section heading that bounds the capture carries a leading space.
  return match[1].trim();
}

function expectNoRawInternals(text) {
  for (const fragment of RAW_FRAGMENTS) {
    expect(text).not.toContain(fragment);
  }
  expect(text).not.toMatch(/\bat\s+\w+\s+\(/); // stack frame shape
}

afterEach(async () => {
  await cleanupMountedApp();
  jest.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/* A. Failed refresh with usable data already on screen                       */
/* -------------------------------------------------------------------------- */

describe("a failed refresh over usable data", () => {
  test("keeps the data and says the guest is seeing what was loaded before", async () => {
    succeed();
    await renderHome();

    // A real successful load first.
    expect(fetchParkData).toHaveBeenCalledTimes(1);
    expect(guestText()).not.toContain(RETAINED_MESSAGE);

    failWithRawApiError();
    await tapRefresh();

    expect(fetchParkData).toHaveBeenCalledTimes(2);
    expect(guestText()).toContain(RETAINED_MESSAGE);
    // It does not claim the retained information is current.
    expect(guestText()).not.toMatch(/up to date|just updated|current as of/i);
  });

  test("the previously loaded information is still on screen", async () => {
    succeed();
    await renderHome();

    failWithRawApiError();
    await tapRefresh();

    // Data retention is unchanged: the weather that loaded before is still
    // there beside the message that explains the failed refresh.
    expect(guestText()).toContain("74");
    expect(guestText()).toContain(RETAINED_MESSAGE);
  });
});

/* -------------------------------------------------------------------------- */
/* B. Initial failure with nothing to fall back to                            */
/* -------------------------------------------------------------------------- */

describe("a first load that fails", () => {
  test("does not claim previously loaded information exists", async () => {
    failWithRawApiError();
    await renderHome();

    expect(fetchParkData).toHaveBeenCalledTimes(1);
    expect(guestText()).toContain(NO_DATA_MESSAGE);

    // The specific lie this guards against.
    expect(guestText()).not.toContain(RETAINED_MESSAGE);
    expect(guestText()).not.toMatch(/last information we loaded/i);
    expect(guestText()).not.toMatch(/cached|saved earlier|previously loaded/i);
  });

  test("leaves the existing retry control in place", async () => {
    failWithRawApiError();
    await renderHome();

    const button = refreshButton();
    expect(button.disabled).toBe(false);
    expect(button.textContent.trim()).toBe("Refresh");
  });
});

/* -------------------------------------------------------------------------- */
/* C. No raw internals reach the guest                                        */
/* -------------------------------------------------------------------------- */

describe("raw internals never reach the guest", () => {
  test("the failure message carries no route, status or provider response", async () => {
    failWithRawApiError();
    await renderHome();

    expectNoRawInternals(guestText());
    expect(guestText()).toContain(NO_DATA_MESSAGE);
  });

  test("the same is true for a failed refresh", async () => {
    succeed();
    await renderHome();
    failWithRawApiError();
    await tapRefresh();

    expectNoRawInternals(guestText());
    expect(guestText()).toContain(RETAINED_MESSAGE);
  });

  test("the raw text is rendered nowhere, with the debug panel enabled", async () => {
    failWithRawApiError();
    await renderHome({ debug: true });

    // Not in the guest surface, and not in the debug panel either: this fix
    // removes the raw string from presentation rather than relocating it.
    expectNoRawInternals(guestText());
    expectNoRawInternals(debugText());
    expect(debugText()).not.toContain("API /api/park-data");
  });

  test("the raw text is rendered nowhere, with the debug panel disabled", async () => {
    failWithRawApiError();
    await renderHome({ debug: false });

    expect(container.querySelectorAll("details").length).toBe(0);
    expectNoRawInternals(container.textContent || "");
    expect(container.textContent).toContain(NO_DATA_MESSAGE);
  });
});

/* -------------------------------------------------------------------------- */
/* D. Recovery                                                                */
/* -------------------------------------------------------------------------- */

describe("a successful retry recovers", () => {
  test("clears the failure message and restores normal presentation", async () => {
    failWithRawApiError();
    await renderHome();
    expect(guestText()).toContain(NO_DATA_MESSAGE);

    succeed();
    await tapRefresh();

    expect(fetchParkData).toHaveBeenCalledTimes(2);
    expect(guestText()).not.toContain(NO_DATA_MESSAGE);
    expect(guestText()).not.toContain(RETAINED_MESSAGE);
  });

  test("a retry after a failed refresh clears the retained-data message", async () => {
    succeed();
    await renderHome();

    failWithRawApiError();
    await tapRefresh();
    expect(guestText()).toContain(RETAINED_MESSAGE);

    succeed();
    await tapRefresh();
    expect(guestText()).not.toContain(RETAINED_MESSAGE);
  });
});

/* -------------------------------------------------------------------------- */
/* E. The real ErrorBoundary, with a real crash                               */
/* -------------------------------------------------------------------------- */

describe("an unexpected rendering failure", () => {
  const CRASH_MESSAGE = "Cannot read properties of undefined (reading 'landKey')";

  function Boom() {
    throw new Error(CRASH_MESSAGE);
  }

  async function renderBoundary(child) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    // React logs the caught error; silence it without losing the assertion
    // that componentDidCatch still runs.
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await act(async () => {
        root.render(React.createElement(ErrorBoundary, null, child));
      });
    } finally {
      consoleError.mockRestore();
    }
  }

  test("a genuinely throwing child produces the calm fallback", async () => {
    await renderBoundary(React.createElement(Boom));

    const text = container.textContent || "";
    expect(text).toContain("Something stopped working.");
    expect(text).toContain("This screen ran into a problem.");
  });

  test("the fallback shows no exception text or stack", async () => {
    await renderBoundary(React.createElement(Boom));

    const text = container.textContent || "";
    expect(text).not.toContain(CRASH_MESSAGE);
    expect(text).not.toContain("Cannot read properties");
    expect(text).not.toMatch(/\bat\s+\w+\s+\(/);
    // And it does not blame a cause it has no evidence for.
    expect(text).not.toMatch(/offline|internet|connection|network/i);
  });

  test("the fallback promises no saved data and no guaranteed recovery", async () => {
    await renderBoundary(React.createElement(Boom));

    const text = container.textContent || "";

    // The boundary cannot know either of these. writeStoredFamilyProfile and
    // writeStoredParkState both swallow storage failures with a console.warn
    // and return no success signal, and a render crash is no evidence that a
    // reload will clear its cause.
    expect(text).not.toMatch(/saved|stored|persist|safe|kept/i);
    expect(text).not.toMatch(/usually|will (?:be )?(?:fix|clear|work)|guarantee/i);

    // What it does say is an offer, not a promise.
    expect(text).toContain("Please try reloading the app.");
  });

  test("the recovery control is present and reloads the app", async () => {
    const originalLocation = window.location;
    const reload = jest.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });

    try {
      await renderBoundary(React.createElement(Boom));

      const button = Array.from(container.querySelectorAll("button")).find(
        (node) => (node.textContent || "").trim() === "Reload app"
      );
      expect(button).toBeTruthy();

      await act(async () => {
        button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  test("a child that does not throw is rendered untouched", async () => {
    await renderBoundary(React.createElement("p", null, "Normal content"));

    expect(container.textContent).toContain("Normal content");
    expect(container.textContent).not.toContain("Something stopped working.");
  });

  test("the error is still reported to the console for diagnostics", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await act(async () => {
        root.render(React.createElement(ErrorBoundary, null, React.createElement(Boom)));
      });

      const logged = consoleError.mock.calls.some(
        (call) => call[0] === "[ErrorBoundary]"
      );
      expect(logged).toBe(true);
    } finally {
      consoleError.mockRestore();
    }
  });
});

/* -------------------------------------------------------------------------- */
/* F. Neighbouring behaviour is undisturbed                                   */
/* -------------------------------------------------------------------------- */

describe("nothing next to this changed", () => {
  test("the automatic refresh stamp still moves only on success", async () => {
    // The truthful-freshness rule lives beside this one and is easy to break
    // from here, so it is pinned end to end — and through the AUTOMATIC path,
    // which is the only one that writes lastAutoUpdateAt. Tapping Refresh never
    // touches that stamp, so a manual tap could not have tested this.
    succeed();
    await renderHome();

    // Nothing has been stamped before the first automatic cycle.
    expect(lastAutoUpdateAtValue()).toBe("");

    // 1. A successful automatic refresh writes a known, non-empty timestamp.
    const firstSuccess = new Date("2026-05-10T18:05:00.000Z");
    await autoRefreshAt(firstSuccess);

    const stampAfterSuccess = lastAutoUpdateAtValue();
    expect(stampAfterSuccess).not.toBe("");
    expect(stampAfterSuccess).toBe(firstSuccess.toISOString());

    // 2. A later automatic refresh that FAILS leaves it exactly where it was.
    failWithRawApiError();
    await autoRefreshAt(new Date("2026-05-10T18:35:00.000Z"));

    expect(lastAutoUpdateAtValue()).toBe(stampAfterSuccess);
    expect(guestText()).toContain(RETAINED_MESSAGE);

    // 3. And a later automatic success advances it normally.
    succeed();
    const secondSuccess = new Date("2026-05-10T19:05:00.000Z");
    await autoRefreshAt(secondSuccess);

    expect(lastAutoUpdateAtValue()).toBe(secondSuccess.toISOString());
    expect(lastAutoUpdateAtValue()).not.toBe(stampAfterSuccess);
  });

  test("the Waits screen keeps its own failure copy", async () => {
    // WaitsTab derives its wording from waitsViewState, not from this message,
    // and reads `error` for truthiness only. Changing what Home shows must not
    // reach it.
    succeed();
    await renderHome();

    failWithRawApiError();
    await tapRefresh();

    const waitsTab = Array.from(document.body.querySelectorAll("nav button")).find(
      (node) => node.textContent.trim() === "Waits"
    );
    expect(waitsTab).toBeTruthy();
    await act(async () => {
      waitsTab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(guestText()).toContain("Couldn’t refresh wait times. Showing the last available data.");
    expectNoRawInternals(guestText());
  });
});
