/**
 * Regression: a failed "Use My Location" tap explains itself.
 *
 * updateUserLocation already writes a specific message for every browser
 * failure — denied permission, timeout (code 3), position unavailable (code 2),
 * and an unsupported browser. The Plan screen's SETUP state renders that
 * message. Its normal state, the one a guest sees once they have a location and
 * recommendations, never did:
 *
 *   PlanRecommendations.jsx, ternary at planShowsSetupState
 *     setup branch   -> "Use My Location" AND the locationError paragraph
 *     normal branch  -> "Use My Location" only
 *
 * So a guest who already had a location, tapped the button and hit a timeout
 * watched it say "Finding you..." and then go quiet. No explanation, and no
 * hint that the area picker sitting right above it was the way forward. That is
 * the audited symptom; the cause was a missing render site rather than a
 * missing error branch.
 *
 * These drive the real button through the real handler with a stubbed
 * navigator.geolocation, and read the visible result. Nothing is conditional:
 * every test requires the control to exist and asserts what the guest sees.
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

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { fetchParkData, fetchWeather } from "../api";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const NOW = "2026-05-10T18:00:00.000Z"; // 2:00 PM Orlando

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

// A manual area, so Plan renders its NORMAL state rather than the setup state —
// the branch where the message was missing.
const SAVED_MANUAL_AREA = {
  magic_kingdom: { currentLand: "adventureland", currentLandSource: "manual" },
};

// Adventureland, close enough to Pirates to be accepted by the stability gate.
const GOOD_FIX = {
  coords: { latitude: 28.4189, longitude: -81.5843, accuracy: 12 },
  timestamp: Date.parse(NOW),
};

const GEO_ERRORS = {
  denied: { code: 1, message: "User denied Geolocation" },
  unavailable: { code: 2, message: "Position unavailable" },
  timeout: { code: 3, message: "Timeout expired" },
};

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

let container = null;
let root = null;
let geo = null;

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

/** Install a controllable navigator.geolocation. */
function installGeolocation({ supported = true } = {}) {
  if (!supported) {
    Object.defineProperty(global.navigator, "geolocation", {
      value: undefined,
      configurable: true,
    });
    geo = null;
    return;
  }

  geo = {
    // Default: never settles. Individual tests install the outcome they want.
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(() => 1),
    clearWatch: jest.fn(),
    // The most recent watch error callback, so a background failure can be
    // driven the same way a foreground one is.
    watchErrorCallback: null,
  };

  geo.watchPosition = jest.fn((_onSuccess, onError) => {
    geo.watchErrorCallback = onError;
    return 1;
  });

  Object.defineProperty(global.navigator, "geolocation", {
    value: geo,
    configurable: true,
  });
}

/** The next user-triggered request fails with this GeolocationPositionError. */
function failNextRequest(error) {
  geo.getCurrentPosition.mockImplementation((_onSuccess, onError) => onError(error));
}

/** The next user-triggered request succeeds with this fix. */
function succeedNextRequest(position = GOOD_FIX) {
  geo.getCurrentPosition.mockImplementation((onSuccess) => onSuccess(position));
}

async function renderPlanScreen() {
  await cleanupMountedApp();

  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(NOW));

  fetchParkData.mockImplementation((parkId) =>
    Promise.resolve({ parkId, source: "live", fetchedAt: NOW, ageMs: 0, rides: RIDES, lands: [] })
  );
  fetchWeather.mockImplementation(() =>
    Promise.resolve({
      parkId: "magic_kingdom",
      source: "live",
      fetchedAt: NOW,
      summary: "Clear",
      tempF: 74,
      feelsLikeF: 74,
      rainRisk: 0.1,
    })
  );

  window.localStorage.clear();
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(PROFILE));
  window.localStorage.setItem("parkplan.state", JSON.stringify(SAVED_MANUAL_AREA));
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

  // Every test below depends on being in the NORMAL branch, not the setup one.
  expect(screenText()).not.toContain("Pick where you are first");
}

function screenText() {
  return container?.textContent || "";
}

/**
 * What the GUEST can read, with the debug snapshot removed.
 *
 * The snapshot renders a locationError row of its own, so asserting against the
 * raw container would be satisfied by a developer-only surface and would pass
 * with the bug still present. Every message assertion below uses this instead.
 */
function guestText() {
  if (!container) return "";

  const clone = container.cloneNode(true);
  clone.querySelectorAll("details").forEach((node) => node.remove());
  return clone.textContent || "";
}

/** The Plan screen's location button. Required, never optional. */
function useMyLocationButton() {
  const button = Array.from(container.querySelectorAll("button")).find((node) =>
    /Use My Location|Finding you/.test(node.textContent || "")
  );
  expect(button).toBeTruthy();
  return button;
}

/** The manual area picker that every failure message points at. */
function areaSelect() {
  const select = Array.from(container.querySelectorAll("select")).find((node) =>
    (node.textContent || "").includes("Pick your current area")
  );
  expect(select).toBeTruthy();
  return select;
}

async function tapUseMyLocation() {
  const button = useMyLocationButton();
  expect(button.disabled).toBe(false);

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/** A debug-snapshot row value, or null when the row is absent. */
function debugRow(label, nextLabel) {
  const match = screenText().match(new RegExp(`${label}(.*?)${nextLabel}`));
  return match ? match[1] : null;
}

const lastLocationUpdateAt = () => debugRow("lastLocationUpdateAt", "lastAutoUpdateAt");
const currentLand = () => debugRow("currentLand", "locationSource");

beforeEach(() => {
  installGeolocation();
});

afterEach(async () => {
  await cleanupMountedApp();
  jest.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/* 1-3. The two silent failures now explain themselves                        */
/* -------------------------------------------------------------------------- */

describe("a user-triggered failure explains itself", () => {
  test("position unavailable (code 2) shows an actionable message", async () => {
    await renderPlanScreen();
    failNextRequest(GEO_ERRORS.unavailable);

    // Nothing claimed before the tap.
    expect(guestText()).not.toMatch(/not available right now/);

    await tapUseMyLocation();

    // The real request ran...
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    // ...and the guest is told what happened and what to do.
    expect(guestText()).toMatch(/Your location is not available right now/);
    expect(guestText()).toMatch(/pick the closest area manually/i);
  });

  test("timeout (code 3) shows an actionable message", async () => {
    await renderPlanScreen();
    failNextRequest(GEO_ERRORS.timeout);

    await tapUseMyLocation();

    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(guestText()).toMatch(/Finding your location is taking longer than usual/);
    expect(guestText()).toMatch(/pick the closest area manually/i);
  });

  test("loading ends after either failure", async () => {
    for (const error of [GEO_ERRORS.unavailable, GEO_ERRORS.timeout]) {
      await renderPlanScreen();
      failNextRequest(error);

      await tapUseMyLocation();

      // The button is back to its resting label and usable again.
      expect(guestText()).not.toMatch(/Finding you\.\.\./);
      expect(useMyLocationButton().textContent).toMatch(/Use My Location/);
      expect(useMyLocationButton().disabled).toBe(false);
    }
  });

  test("the message names the manual fallback that is actually on screen", async () => {
    // The copy says "pick the closest area manually" with no direction, and the
    // picker sits ABOVE the button in this branch — so no wording here claims a
    // control is "below" when it is not.
    await renderPlanScreen();
    failNextRequest(GEO_ERRORS.timeout);

    await tapUseMyLocation();

    // Scoped to the message itself: other Plan copy legitimately uses the word
    // "below" about its own layout.
    const errorParagraph = Array.from(container.querySelectorAll("p")).find((node) =>
      /taking longer than usual/.test(node.textContent || "")
    );
    expect(errorParagraph).toBeTruthy();
    expect(errorParagraph.textContent).not.toMatch(/below/i);

    // And the control it does point at is present.
    expect(areaSelect()).toBeTruthy();
  });
});

/* -------------------------------------------------------------------------- */
/* 4. Denied and unsupported keep their existing behaviour                    */
/* -------------------------------------------------------------------------- */

describe("existing failure handling is preserved", () => {
  test("permission denied keeps its own message and turns auto-location off", async () => {
    await renderPlanScreen();
    failNextRequest(GEO_ERRORS.denied);

    await tapUseMyLocation();

    expect(guestText()).toMatch(/Location permission was denied/);
    // Unchanged: a denial is the one failure that stops the watch.
    expect(debugRow("locationAutoEnabled", "confidence")).toBe("false");
  });

  test("an unsupported browser keeps its generic message", async () => {
    installGeolocation({ supported: false });
    await renderPlanScreen();

    await tapUseMyLocation();

    expect(guestText()).toMatch(/I could not get your location right now/);
    expect(guestText()).toMatch(/pick the closest area manually/i);
  });
});

/* -------------------------------------------------------------------------- */
/* 5-6. Recovery paths stay open                                              */
/* -------------------------------------------------------------------------- */

describe("the guest can still get where they were going", () => {
  test("a successful retry clears the obsolete failure message", async () => {
    await renderPlanScreen();
    failNextRequest(GEO_ERRORS.timeout);
    await tapUseMyLocation();
    expect(guestText()).toMatch(/taking longer than usual/);

    succeedNextRequest();
    await tapUseMyLocation();

    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
    // The stale explanation is gone rather than lingering beside a good fix.
    expect(guestText()).not.toMatch(/taking longer than usual/);
  });

  test("the manual area picker still works after a failure", async () => {
    await renderPlanScreen();
    failNextRequest(GEO_ERRORS.unavailable);
    await tapUseMyLocation();
    expect(guestText()).toMatch(/not available right now/);

    const select = areaSelect();
    expect(select.disabled).toBe(false);

    await act(async () => {
      select.value = "frontierland";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(currentLand()).toBe("frontierland");
  });
});

/* -------------------------------------------------------------------------- */
/* 7. A failure changes nothing it should not                                 */
/* -------------------------------------------------------------------------- */

describe("a failure does not disturb what the guest already had", () => {
  test("the saved manual area and its freshness survive the failure", async () => {
    await renderPlanScreen();

    const landBefore = currentLand();
    const freshnessBefore = lastLocationUpdateAt();
    expect(landBefore).toBe("adventureland");

    failNextRequest(GEO_ERRORS.unavailable);
    await tapUseMyLocation();

    // The failure explained itself and touched nothing else: the manual area is
    // intact and no timestamp was refreshed to make an old reading look new.
    expect(guestText()).toMatch(/not available right now/);
    expect(currentLand()).toBe(landBefore);
    expect(lastLocationUpdateAt()).toBe(freshnessBefore);
  });

  test("a timeout does not invent a location", async () => {
    await renderPlanScreen();
    failNextRequest(GEO_ERRORS.timeout);

    await tapUseMyLocation();

    // No detected context was created out of a failed request.
    expect(debugRow("nearestAnchor", "distanceMeters")).toBe("—");
    expect(debugRow("confidence", "nearestAnchor")).toBe("—");
  });
});

/* -------------------------------------------------------------------------- */
/* 8. Background failures stay quiet                                          */
/* -------------------------------------------------------------------------- */

describe("silent background failures stay silent", () => {
  test("a watch timeout does not interrupt the guest", async () => {
    await renderPlanScreen();

    // The background watch only runs once auto-location is on, which a
    // successful request is what turns on.
    succeedNextRequest();
    await tapUseMyLocation();
    expect(debugRow("locationAutoEnabled", "confidence")).toBe("true");

    // The watch is running and handed us its error callback.
    expect(geo.watchPosition).toHaveBeenCalled();
    expect(typeof geo.watchErrorCallback).toBe("function");

    await act(async () => {
      geo.watchErrorCallback(GEO_ERRORS.timeout);
    });

    // Nothing is said. A background reading that did not arrive is not news.
    expect(guestText()).not.toMatch(/taking longer than usual/);
    expect(guestText()).not.toMatch(/not available right now/);
    expect(guestText()).not.toMatch(/could not get your location/);
  });

  test("a background failure does not overwrite a user-triggered message", async () => {
    await renderPlanScreen();

    // Turn the watch on with a good fix, then fail a user-triggered request so
    // there is a message on screen for a background failure to threaten.
    succeedNextRequest();
    await tapUseMyLocation();
    expect(typeof geo.watchErrorCallback).toBe("function");

    failNextRequest(GEO_ERRORS.unavailable);
    await tapUseMyLocation();
    expect(guestText()).toMatch(/not available right now/);

    await act(async () => {
      geo.watchErrorCallback(GEO_ERRORS.timeout);
    });

    // The explanation the guest asked for is still the one on screen.
    expect(guestText()).toMatch(/not available right now/);
    expect(guestText()).not.toMatch(/taking longer than usual/);
  });
});
