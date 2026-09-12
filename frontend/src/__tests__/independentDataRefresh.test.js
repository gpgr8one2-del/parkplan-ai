/**
 * Regression: waits and weather refresh independently.
 *
 * The defect: the active-park loader awaited
 *
 *   Promise.all([fetchParkData(activePark), fetchWeather({ parkId: activePark })])
 *
 * and applied both results only when both resolved. A weather outage threw away
 * wait times that had loaded perfectly well (and vice versa), the guest was told
 * the whole refresh failed, and the automatic refresh withheld freshness for the
 * source that had actually refreshed. The loader was also untagged by park, so a
 * response that arrived after the family moved parks could land under the new
 * park's heading.
 *
 * The invariants pinned here:
 *   - each source applies its own success and records its own failure;
 *   - a failed source keeps its last usable data for the SAME park, or stays
 *     honestly unavailable when it has none;
 *   - freshness moves per source, and provider provenance is never rewritten;
 *   - obsolete requests cannot write data, errors or freshness.
 *
 * These render the REAL App with `../api` mocked and drive the real controls:
 * Home Refresh, Waits Refresh, the automatic refresh interval, park cards and
 * the park check prompt. Guest-facing claims are read with the debug panel
 * stripped; developer rows are read separately and required to exist.
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../api", () => ({
  fetchParkData: jest.fn(),
  fetchWeather: jest.fn(),
  sendChatMessage: jest.fn(() => Promise.resolve({ reply: "Here to help." })),
  sendTohiPickReview: jest.fn(() => Promise.resolve(null)),
  trackEvent: jest.fn(),
}));

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { fetchParkData, fetchWeather, sendChatMessage } from "../api";
// eslint-disable-next-line import/first
import { WAITS_COPY } from "../utils/waitsViewState";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

// Must match AUTO_REFRESH_MS in App.jsx.
const AUTO_REFRESH_MS = 3 * 60 * 1000;

const START = "2026-05-08T17:00:00.000Z"; // 1:00 PM Orlando

const RAW_WAITS_ERROR =
  'API /api/park-data?parkId=magic_kingdom -> 502: {"error":"Could not fetch park data","detail":"Queue-Times 503"}';
const RAW_WEATHER_ERROR =
  'API /api/weather?parkId=magic_kingdom -> 504: {"error":"Weather provider timeout"}';

const COPY = {
  BOTH_RETAINED:
    "We couldn’t refresh right now. You’re seeing the last information we loaded. Please try again.",
  BOTH_NO_DATA: "We couldn’t load park information right now. Please try again in a moment.",
  WAITS_RETAINED:
    "We couldn’t refresh wait times right now. You’re seeing the last wait times we loaded. Please try again in a moment.",
  WAITS_NO_DATA: "We couldn’t load wait times right now. Please try again in a moment.",
  WEATHER_RETAINED:
    "We couldn’t refresh the weather right now. You’re seeing the last weather we loaded. Please try again in a moment.",
  WEATHER_NO_DATA: "We couldn’t load the weather right now. Please try again in a moment.",
};

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
    tripEndDate: "2026-05-10",
    parkDays: 3,
    parkSelectionIds: ["magic_kingdom", "epcot"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "magic_kingdom",
    parkHopper: "yes",
    // A second planned park today, so EPCOT can become the confirmed active
    // park through the real park check prompt.
    parkDaySchedule: [
      { dayNumber: 1, date: "2026-05-08", primaryParkId: "magic_kingdom", secondaryParkId: "epcot" },
    ],
  },
  resortContext: {
    stayingOnProperty: "no",
    resortId: "",
    resortName: "",
    offPropertyHotelName: "",
    transportationMode: "car",
  },
};

const MK_WAITS_V1 = () => ({
  parkId: "magic_kingdom",
  source: "live",
  fetchedAt: "2026-05-08T16:59:00.000Z",
  ageMs: 60000,
  lands: [],
  rides: [
    { id: "mk-1", name: "Big Thunder Mountain Railroad", land: "frontierland", waitTime: 20, isOpen: true },
    { id: "mk-2", name: "Haunted Mansion", land: "liberty_square", waitTime: 25, isOpen: true },
  ],
});

// Different rides and a different provider timestamp, so a test can prove the
// newer response really was applied rather than the old one surviving.
const MK_WAITS_V2 = () => ({
  parkId: "magic_kingdom",
  source: "live",
  fetchedAt: "2026-05-08T17:04:30.000Z",
  ageMs: 30000,
  lands: [],
  rides: [
    { id: "mk-3", name: "Pirates of the Caribbean", land: "adventureland", waitTime: 15, isOpen: true },
    { id: "mk-4", name: "Space Mountain", land: "tomorrowland", waitTime: 45, isOpen: true },
  ],
});

// The provider's own cache fallback: the request succeeds, the data is old.
const MK_WAITS_PROVIDER_STALE = () => ({
  parkId: "magic_kingdom",
  source: "stale",
  fetchedAt: "2026-05-08T16:20:00.000Z",
  ageMs: 2700000,
  lands: [],
  rides: [
    { id: "mk-5", name: "Jungle Cruise", land: "adventureland", waitTime: 35, isOpen: true },
  ],
});

const MK_WEATHER_V1 = () => ({
  parkId: "magic_kingdom",
  source: "live",
  fetchedAt: "2026-05-08T16:58:00.000Z",
  ageMs: 120000,
  summary: "Partly cloudy",
  tempF: 81,
  feelsLikeF: 81,
  rainRisk: 0.1,
  stormMode: false,
  currentPrecipitation: false,
});

const MK_WEATHER_V2 = () => ({
  parkId: "magic_kingdom",
  source: "live",
  fetchedAt: "2026-05-08T17:04:00.000Z",
  ageMs: 60000,
  summary: "Sunny and humid",
  tempF: 84,
  feelsLikeF: 84,
  rainRisk: 0.05,
  stormMode: false,
  currentPrecipitation: false,
});

const EPCOT_WAITS = () => ({
  parkId: "epcot",
  source: "live",
  fetchedAt: "2026-05-08T17:06:00.000Z",
  ageMs: 15000,
  lands: [],
  rides: [
    { id: "ep-1", name: "Spaceship Earth", land: "world_celebration", waitTime: 10, isOpen: true },
    { id: "ep-2", name: "Test Track", land: "world_discovery", waitTime: 50, isOpen: true },
  ],
});

const EPCOT_WEATHER = () => ({
  parkId: "epcot",
  source: "live",
  fetchedAt: "2026-05-08T17:06:00.000Z",
  ageMs: 15000,
  summary: "Breezy by the lagoon",
  tempF: 79,
  feelsLikeF: 79,
  rainRisk: 0.1,
  stormMode: false,
  currentPrecipitation: false,
});

/* -------------------------------------------------------------------------- */
/* A scriptable backend                                                       */
/* -------------------------------------------------------------------------- */

const backend = { waits: {}, weather: {} };

const ok = (payload) => () => Promise.resolve(payload());
const fail = (message) => () => Promise.reject(new Error(message));

/** A response the test settles by hand, to control completion order. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { handler: () => promise, resolve, reject };
}

function serve(source, parkId, handler) {
  backend[source][parkId] = handler;
}

function installBackend() {
  fetchParkData.mockImplementation((parkId) => {
    const handler = backend.waits[parkId];
    if (!handler) throw new Error(`test backend has no waits handler for ${parkId}`);
    return handler();
  });
  fetchWeather.mockImplementation(({ parkId } = {}) => {
    const handler = backend.weather[parkId];
    if (!handler) throw new Error(`test backend has no weather handler for ${parkId}`);
    return handler();
  });
}

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

let container = null;
let root = null;

async function renderApp() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(App));
  });
  await flush();
}

async function flush() {
  await act(async () => {
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function click(el) {
  expect(el).toBeTruthy();
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

/** BottomTabs renders through a portal into document.body. */
async function goToTab(label) {
  const button = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === label
  );
  await click(button);
}

/** One automatic refresh cycle whose requests are issued at `at`. */
async function autoRefreshAt(at) {
  await act(async () => {
    jest.setSystemTime(new Date(new Date(at).getTime() - AUTO_REFRESH_MS));
    jest.advanceTimersByTime(AUTO_REFRESH_MS);
  });
  await flush();
}

function refreshButton() {
  const button = Array.from(container.querySelectorAll("button")).find((node) =>
    /^(Refresh|Loading)$/.test((node.textContent || "").trim())
  );
  expect(button).toBeTruthy();
  return button;
}

async function tapRefreshAt(at) {
  const button = refreshButton();
  expect(button.disabled).toBe(false);
  await act(async () => {
    jest.setSystemTime(new Date(at));
  });
  await click(button);
}

function guestText() {
  const clone = container.cloneNode(true);
  clone.querySelectorAll("details").forEach((node) => node.remove());
  return clone.textContent || "";
}

/** One debug row's value, read exactly. The row must exist exactly once. */
function debugValue(label) {
  const labels = Array.from(container.querySelectorAll("details span")).filter(
    (node) => node.textContent === label
  );
  expect(labels).toHaveLength(1);
  const value = labels[0].nextElementSibling;
  expect(value).toBeTruthy();
  return value.textContent;
}

/** The Plan screen's data freshness line, or null when it makes no claim. */
function planDataUpdateLabel() {
  const match = guestText().match(
    /(Waits\/weather updated \d{1,2}:\d{2} [AP]M|Waits updated \d{1,2}:\d{2} [AP]M( · Weather updated \d{1,2}:\d{2} [AP]M)?|Weather updated \d{1,2}:\d{2} [AP]M)/
  );
  return match ? match[0] : null;
}

/** Ask TOHI something and return the dataFreshness actually sent with it. */
async function sentDataFreshness() {
  await goToTab("TOHI");
  const input = container.querySelector("#tohi-question");
  expect(input).toBeTruthy();

  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    // Names a ride, so it goes straight to chat instead of a quick check first.
    setter.call(input, "is the wait for haunted mansion worth it");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  const before = sendChatMessage.mock.calls.length;
  const send = Array.from(container.querySelectorAll('button[type="submit"]')).find((b) =>
    (b.textContent || "").includes("Send")
  );
  await click(send);

  expect(sendChatMessage.mock.calls.length).toBe(before + 1);
  const sessionData = sendChatMessage.mock.calls[sendChatMessage.mock.calls.length - 1][1];
  expect(sessionData).toBeTruthy();
  expect(sessionData.dataFreshness).toBeTruthy();
  return sessionData;
}

function expectNoRawInternals(text) {
  for (const fragment of ["API /api/", "-> 502", "-> 504", "Queue-Times", "Weather provider timeout"]) {
    expect(text).not.toContain(fragment);
  }
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(PROFILE));
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(START));

  backend.waits = {};
  backend.weather = {};
  serve("waits", "magic_kingdom", ok(MK_WAITS_V1));
  serve("weather", "magic_kingdom", ok(MK_WEATHER_V1));
  serve("waits", "epcot", ok(EPCOT_WAITS));
  serve("weather", "epcot", ok(EPCOT_WEATHER));
  installBackend();

  sendChatMessage.mockImplementation(() => Promise.resolve({ reply: "Here to help." }));
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

/** Initial load, then one successful automatic cycle at 1:05 PM for both. */
async function renderWithSuccessfulAutoRefresh({ debug = true } = {}) {
  if (debug) window.localStorage.setItem("parkplan.debugSnapshot", "true");
  await renderApp();
  await autoRefreshAt("2026-05-08T17:05:00.000Z");

  expect(debugValue("waits.lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");
  expect(debugValue("weather.lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");
}

/* -------------------------------------------------------------------------- */
/* 1. Both succeed                                                            */
/* -------------------------------------------------------------------------- */

describe("both sources succeed", () => {
  test("both responses are applied and both freshness stamps advance together", async () => {
    await renderWithSuccessfulAutoRefresh();

    serve("waits", "magic_kingdom", ok(MK_WAITS_V2));
    serve("weather", "magic_kingdom", ok(MK_WEATHER_V2));
    await autoRefreshAt("2026-05-08T17:10:00.000Z");

    expect(guestText()).toContain("Sunny and humid");
    expect(debugValue("weather.fetchedAt")).toBe("2026-05-08T17:04:00.000Z");
    expect(debugValue("waits.lastAutoUpdateAt")).toBe("2026-05-08T17:10:00.000Z");
    expect(debugValue("weather.lastAutoUpdateAt")).toBe("2026-05-08T17:10:00.000Z");
    expect(debugValue("lastAutoUpdateAt")).toBe("2026-05-08T17:10:00.000Z");
    expect(debugValue("waits.loadFailed")).toBe("false");
    expect(debugValue("weather.loadFailed")).toBe("false");
    for (const copy of Object.values(COPY)) expect(guestText()).not.toContain(copy);

    await goToTab("Waits");
    expect(guestText()).toContain("Space Mountain");
    expect(guestText()).not.toContain("Big Thunder Mountain Railroad");

    await goToTab("Plan");
    expect(planDataUpdateLabel()).toBe("Waits/weather updated 1:10 PM");

    const { dataFreshness } = await sentDataFreshness();
    expect(dataFreshness.waits).toEqual({
      source: "live",
      ageMs: 30000,
      fetchedAt: "2026-05-08T17:04:30.000Z",
      clientLastUpdatedAt: "2026-05-08T17:10:00.000Z",
      hasData: true,
    });
    expect(dataFreshness.weather).toEqual({
      source: "live",
      ageMs: 60000,
      fetchedAt: "2026-05-08T17:04:00.000Z",
      clientLastUpdatedAt: "2026-05-08T17:10:00.000Z",
      hasData: true,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Waits succeed, weather fails, with previous data                        */
/* -------------------------------------------------------------------------- */

describe("waits succeed while weather fails, over previous data", () => {
  beforeEach(async () => {
    await renderWithSuccessfulAutoRefresh();
    serve("waits", "magic_kingdom", ok(MK_WAITS_V2));
    serve("weather", "magic_kingdom", fail(RAW_WEATHER_ERROR));
    await autoRefreshAt("2026-05-08T17:10:00.000Z");
  });

  test("the new waits are applied and the old weather stays, unchanged", async () => {
    // Weather: the 1:05 response, exactly.
    expect(guestText()).toContain("Partly cloudy");
    expect(guestText()).not.toContain("Sunny and humid");
    expect(debugValue("weather.fetchedAt")).toBe("2026-05-08T16:58:00.000Z");
    expect(debugValue("tempF")).toBe("81");

    await goToTab("Waits");
    expect(guestText()).toContain("Space Mountain");
    expect(guestText()).toContain("Pirates of the Caribbean");
    expect(guestText()).not.toContain("Big Thunder Mountain Railroad");
    // Waits refreshed, so Waits must not claim a failed refresh.
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
  });

  test("Home names the weather, and only the weather, as not refreshed", async () => {
    expect(guestText()).toContain(COPY.WEATHER_RETAINED);
    expect(guestText()).not.toContain(COPY.BOTH_RETAINED);
    expect(guestText()).not.toContain(COPY.WAITS_RETAINED);
    expectNoRawInternals(guestText());
    expectNoRawInternals(container.textContent);
    expect(debugValue("waits.loadFailed")).toBe("false");
    expect(debugValue("weather.loadFailed")).toBe("true");
  });

  test("only the waits freshness advances, in the label and in the AI context", async () => {
    expect(debugValue("waits.lastAutoUpdateAt")).toBe("2026-05-08T17:10:00.000Z");
    expect(debugValue("weather.lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");
    // The combined stamp means "both refreshed at or after this", so it stays.
    expect(debugValue("lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");

    await goToTab("Plan");
    expect(planDataUpdateLabel()).toBe("Waits updated 1:10 PM · Weather updated 1:05 PM");
    expect(guestText()).not.toContain("Waits/weather updated 1:10 PM");

    const { dataFreshness } = await sentDataFreshness();
    expect(dataFreshness.waits.clientLastUpdatedAt).toBe("2026-05-08T17:10:00.000Z");
    expect(dataFreshness.waits.fetchedAt).toBe("2026-05-08T17:04:30.000Z");
    expect(dataFreshness.waits.hasData).toBe(true);
    expect(dataFreshness.weather).toEqual({
      source: "live",
      ageMs: 120000,
      fetchedAt: "2026-05-08T16:58:00.000Z",
      clientLastUpdatedAt: "2026-05-08T17:05:00.000Z",
      hasData: true,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Weather succeeds, waits fail, with previous data                        */
/* -------------------------------------------------------------------------- */

describe("weather succeeds while waits fail, over previous data", () => {
  beforeEach(async () => {
    await renderWithSuccessfulAutoRefresh();
    serve("waits", "magic_kingdom", fail(RAW_WAITS_ERROR));
    serve("weather", "magic_kingdom", ok(MK_WEATHER_V2));
    await autoRefreshAt("2026-05-08T17:10:00.000Z");
  });

  test("the new weather is applied and the old waits stay, unchanged", async () => {
    expect(guestText()).toContain("Sunny and humid");
    expect(guestText()).not.toContain("Partly cloudy");
    expect(debugValue("weather.fetchedAt")).toBe("2026-05-08T17:04:00.000Z");
    expect(debugValue("tempF")).toBe("84");

    await goToTab("Waits");
    expect(guestText()).toContain("Big Thunder Mountain Railroad");
    expect(guestText()).toContain("Haunted Mansion");
    expect(guestText()).not.toContain("Space Mountain");
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
    expectNoRawInternals(guestText());
  });

  test("Home names the waits, and only the waits, as not refreshed", async () => {
    expect(guestText()).toContain(COPY.WAITS_RETAINED);
    expect(guestText()).not.toContain(COPY.BOTH_RETAINED);
    expect(guestText()).not.toContain(COPY.WEATHER_RETAINED);
    expectNoRawInternals(container.textContent);
    expect(debugValue("waits.loadFailed")).toBe("true");
    expect(debugValue("weather.loadFailed")).toBe("false");
  });

  test("only the weather freshness advances, in the label and in the AI context", async () => {
    expect(debugValue("waits.lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");
    expect(debugValue("weather.lastAutoUpdateAt")).toBe("2026-05-08T17:10:00.000Z");
    expect(debugValue("lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");

    await goToTab("Plan");
    expect(planDataUpdateLabel()).toBe("Waits updated 1:05 PM · Weather updated 1:10 PM");

    const { dataFreshness } = await sentDataFreshness();
    expect(dataFreshness.waits).toEqual({
      source: "live",
      ageMs: 60000,
      fetchedAt: "2026-05-08T16:59:00.000Z",
      clientLastUpdatedAt: "2026-05-08T17:05:00.000Z",
      hasData: true,
    });
    expect(dataFreshness.weather.clientLastUpdatedAt).toBe("2026-05-08T17:10:00.000Z");
    expect(dataFreshness.weather.fetchedAt).toBe("2026-05-08T17:04:00.000Z");
  });
});

/* -------------------------------------------------------------------------- */
/* 4. Both fail after a previous success                                      */
/* -------------------------------------------------------------------------- */

describe("both sources fail after a previous success", () => {
  test("everything is retained, nothing advances, and the combined copy is used", async () => {
    await renderWithSuccessfulAutoRefresh();
    serve("waits", "magic_kingdom", fail(RAW_WAITS_ERROR));
    serve("weather", "magic_kingdom", fail(RAW_WEATHER_ERROR));
    await autoRefreshAt("2026-05-08T17:10:00.000Z");

    expect(guestText()).toContain(COPY.BOTH_RETAINED);
    expect(guestText()).toContain("Partly cloudy");
    expect(debugValue("weather.fetchedAt")).toBe("2026-05-08T16:58:00.000Z");
    expect(debugValue("waits.lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");
    expect(debugValue("weather.lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");
    expect(debugValue("lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");
    expectNoRawInternals(container.textContent);

    // Loading has settled even though nothing succeeded.
    expect(refreshButton().textContent.trim()).toBe("Refresh");

    await goToTab("Waits");
    expect(guestText()).toContain("Big Thunder Mountain Railroad");
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);

    await goToTab("Plan");
    expect(planDataUpdateLabel()).toBe("Waits/weather updated 1:05 PM");
  });
});

/* -------------------------------------------------------------------------- */
/* 5. Partial success on an initial load, with nothing retained               */
/* -------------------------------------------------------------------------- */

describe("a partial first load", () => {
  test("waits load, weather does not: the waits are used and no weather is invented", async () => {
    serve("weather", "magic_kingdom", fail(RAW_WEATHER_ERROR));
    window.localStorage.setItem("parkplan.debugSnapshot", "true");
    await renderApp();

    expect(guestText()).toContain(COPY.WEATHER_NO_DATA);
    expect(guestText()).not.toMatch(/last weather we loaded|last information we loaded/);
    expect(guestText()).not.toContain(COPY.BOTH_NO_DATA);
    expectNoRawInternals(container.textContent);
    expect(debugValue("tempF")).toBe("—");
    expect(debugValue("weather.fetchedAt")).toBe("—");
    // No weather is not the same as good weather: no condition is claimed.
    expect(guestText()).not.toMatch(/Partly cloudy|Sunny|Clear/);

    await goToTab("Waits");
    expect(guestText()).toContain("Big Thunder Mountain Railroad");
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_ERROR_BODY);

    const { dataFreshness } = await sentDataFreshness();
    expect(dataFreshness.waits.hasData).toBe(true);
    expect(dataFreshness.waits.fetchedAt).toBe("2026-05-08T16:59:00.000Z");
    expect(dataFreshness.weather).toEqual({
      source: "",
      ageMs: null,
      fetchedAt: "",
      clientLastUpdatedAt: "",
      hasData: false,
    });
  });

  test("weather loads, waits do not: the weather is used and no waits are claimed", async () => {
    serve("waits", "magic_kingdom", fail(RAW_WAITS_ERROR));
    window.localStorage.setItem("parkplan.debugSnapshot", "true");
    await renderApp();

    expect(guestText()).toContain("Partly cloudy");
    expect(guestText()).toContain(COPY.WAITS_NO_DATA);
    expect(guestText()).not.toMatch(/last wait times we loaded|last information we loaded/);
    expect(debugValue("weather.fetchedAt")).toBe("2026-05-08T16:58:00.000Z");
    expectNoRawInternals(container.textContent);

    await goToTab("Waits");
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_ERROR_BODY);
    expect(guestText()).not.toContain("Big Thunder Mountain Railroad");

    const { dataFreshness } = await sentDataFreshness();
    expect(dataFreshness.waits).toEqual({
      source: "",
      ageMs: null,
      fetchedAt: "",
      clientLastUpdatedAt: "",
      hasData: false,
    });
    expect(dataFreshness.weather.hasData).toBe(true);
    expect(dataFreshness.weather.fetchedAt).toBe("2026-05-08T16:58:00.000Z");
  });
});

/* -------------------------------------------------------------------------- */
/* 6. Recovery clears only the recovered source                               */
/* -------------------------------------------------------------------------- */

describe("recovery", () => {
  test("a source's error clears when that source succeeds, and only then", async () => {
    await renderWithSuccessfulAutoRefresh();

    serve("waits", "magic_kingdom", fail(RAW_WAITS_ERROR));
    serve("weather", "magic_kingdom", fail(RAW_WEATHER_ERROR));
    await tapRefreshAt("2026-05-08T17:07:00.000Z");
    expect(guestText()).toContain(COPY.BOTH_RETAINED);

    // Waits recover; weather is still down.
    serve("waits", "magic_kingdom", ok(MK_WAITS_V2));
    await tapRefreshAt("2026-05-08T17:08:00.000Z");
    expect(guestText()).toContain(COPY.WEATHER_RETAINED);
    expect(guestText()).not.toContain(COPY.BOTH_RETAINED);
    expect(debugValue("waits.loadFailed")).toBe("false");
    expect(debugValue("weather.loadFailed")).toBe("true");

    // Waits succeeding again must not erase weather's outstanding failure.
    await tapRefreshAt("2026-05-08T17:09:00.000Z");
    expect(guestText()).toContain(COPY.WEATHER_RETAINED);
    expect(debugValue("weather.loadFailed")).toBe("true");

    // Weather recovers.
    serve("weather", "magic_kingdom", ok(MK_WEATHER_V2));
    await tapRefreshAt("2026-05-08T17:11:00.000Z");
    for (const copy of Object.values(COPY)) expect(guestText()).not.toContain(copy);
    expect(guestText()).toContain("Sunny and humid");
    expect(debugValue("weather.loadFailed")).toBe("false");
  });

  test("a weather recovery does not clear an outstanding waits failure", async () => {
    await renderWithSuccessfulAutoRefresh();

    serve("waits", "magic_kingdom", fail(RAW_WAITS_ERROR));
    serve("weather", "magic_kingdom", fail(RAW_WEATHER_ERROR));
    await tapRefreshAt("2026-05-08T17:07:00.000Z");

    serve("weather", "magic_kingdom", ok(MK_WEATHER_V2));
    await tapRefreshAt("2026-05-08T17:08:00.000Z");
    expect(guestText()).toContain(COPY.WAITS_RETAINED);
    expect(debugValue("waits.loadFailed")).toBe("true");
    expect(debugValue("weather.loadFailed")).toBe("false");

    await goToTab("Waits");
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
  });
});

/* -------------------------------------------------------------------------- */
/* 10. Provider provenance survives a successful request                      */
/* -------------------------------------------------------------------------- */

describe("provider provenance", () => {
  test("a fulfilled provider-stale response stays stale, with its own age and time", async () => {
    await renderWithSuccessfulAutoRefresh();

    serve("waits", "magic_kingdom", ok(MK_WAITS_PROVIDER_STALE));
    serve("weather", "magic_kingdom", fail(RAW_WEATHER_ERROR));
    await autoRefreshAt("2026-05-08T17:10:00.000Z");

    // The client stamp records when the app received it...
    expect(debugValue("waits.lastAutoUpdateAt")).toBe("2026-05-08T17:10:00.000Z");

    await goToTab("Waits");
    expect(guestText()).toContain("Jungle Cruise");
    expect(guestText()).toContain(WAITS_COPY.STALE_BANNER);

    // ...but the provider's own verdict is passed on untouched.
    const { dataFreshness } = await sentDataFreshness();
    expect(dataFreshness.waits).toEqual({
      source: "stale",
      ageMs: 2700000,
      fetchedAt: "2026-05-08T16:20:00.000Z",
      clientLastUpdatedAt: "2026-05-08T17:10:00.000Z",
      hasData: true,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 11. Every refresh path                                                     */
/* -------------------------------------------------------------------------- */

describe("the manual refresh paths", () => {
  test("Home Refresh applies a partial success without claiming automatic freshness", async () => {
    await renderWithSuccessfulAutoRefresh();

    serve("waits", "magic_kingdom", ok(MK_WAITS_V2));
    serve("weather", "magic_kingdom", fail(RAW_WEATHER_ERROR));
    const before = fetchParkData.mock.calls.length;
    await tapRefreshAt("2026-05-08T17:12:00.000Z");
    expect(fetchParkData.mock.calls.length).toBe(before + 1);
    expect(fetchParkData.mock.calls[before]).toEqual(["magic_kingdom", { force: true }]);

    expect(guestText()).toContain(COPY.WEATHER_RETAINED);
    expect(guestText()).toContain("Partly cloudy");
    // Manual refresh has never written the automatic stamps.
    expect(debugValue("waits.lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");
    expect(debugValue("weather.lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");

    await goToTab("Waits");
    expect(guestText()).toContain("Space Mountain");
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
  });

  test("Waits Refresh applies a partial success in the other direction", async () => {
    await renderWithSuccessfulAutoRefresh();
    await goToTab("Waits");

    serve("waits", "magic_kingdom", fail(RAW_WAITS_ERROR));
    serve("weather", "magic_kingdom", ok(MK_WEATHER_V2));
    const before = fetchWeather.mock.calls.length;
    await tapRefreshAt("2026-05-08T17:12:00.000Z");
    expect(fetchWeather.mock.calls.length).toBe(before + 1);

    expect(guestText()).toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
    expect(guestText()).toContain("Big Thunder Mountain Railroad");

    await goToTab("Home");
    expect(guestText()).toContain("Sunny and humid");
    expect(guestText()).toContain(COPY.WAITS_RETAINED);
    expect(debugValue("weather.lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");
  });

  test("only the automatic refresh marks a load as automatic", () => {
    const source = require("fs").readFileSync(
      require("path").join(__dirname, "..", "App.jsx"),
      "utf8"
    );
    expect(source).not.toMatch(/Promise\.all\(\[\s*fetchParkData/);
    expect(source.match(/automatic: true/g) || []).toHaveLength(1);
    expect(source).toMatch(/await loadData\(true, \{ automatic: true \}\)/);
  });
});

/* -------------------------------------------------------------------------- */
/* 12. Park switching and late responses                                      */
/* -------------------------------------------------------------------------- */

describe("park identity", () => {
  /** Tap EPCOT on Home, then confirm the park check prompt. */
  async function switchActiveParkToEpcot() {
    await goToTab("Home");
    const card = Array.from(container.querySelectorAll("button[aria-pressed]")).find((node) =>
      (node.textContent || "").includes("EPCOT")
    );
    await click(card);

    const confirm = Array.from(container.querySelectorAll("button")).find(
      (node) => (node.textContent || "").trim() === "I’m here now"
    );
    await click(confirm);

    await goToTab("Home");
    expect(debugValue("activePark")).toBe("epcot");
  }

  test("a late Magic Kingdom success cannot write over EPCOT, and MK data never shows as EPCOT's", async () => {
    await renderWithSuccessfulAutoRefresh();

    const mkWaits = deferred();
    const mkWeather = deferred();
    serve("waits", "magic_kingdom", mkWaits.handler);
    serve("weather", "magic_kingdom", mkWeather.handler);
    await tapRefreshAt("2026-05-08T17:06:00.000Z");
    expect(refreshButton().textContent.trim()).toBe("Loading");

    // EPCOT's own weather is down, so nothing of EPCOT's may be borrowed from MK.
    serve("weather", "epcot", fail(RAW_WEATHER_ERROR));
    await switchActiveParkToEpcot();

    await act(async () => {
      mkWaits.resolve(MK_WAITS_V2());
      mkWeather.resolve(MK_WEATHER_V2());
    });
    await flush();

    expect(guestText()).not.toMatch(/Partly cloudy|Sunny and humid/);
    expect(guestText()).toContain(COPY.WEATHER_NO_DATA);
    expect(guestText()).not.toContain(COPY.WEATHER_RETAINED);
    expect(debugValue("weather.fetchedAt")).toBe("—");
    expect(debugValue("waits.lastAutoUpdateAt")).toBe("");
    expect(debugValue("weather.lastAutoUpdateAt")).toBe("");
    expect(debugValue("lastAutoUpdateAt")).toBe("");
    expect(refreshButton().textContent.trim()).toBe("Refresh");

    await goToTab("Waits");
    expect(guestText()).toContain("Spaceship Earth");
    expect(guestText()).not.toMatch(/Space Mountain|Big Thunder Mountain Railroad|Pirates of the Caribbean/);

    await goToTab("Plan");
    expect(planDataUpdateLabel()).toBeNull();

    const sessionData = await sentDataFreshness();
    expect(sessionData.activePark).toBe("epcot");
    expect(sessionData.dataFreshness.waits).toEqual({
      source: "live",
      ageMs: 15000,
      fetchedAt: "2026-05-08T17:06:00.000Z",
      clientLastUpdatedAt: "",
      hasData: true,
    });
    expect(sessionData.dataFreshness.weather).toEqual({
      source: "",
      ageMs: null,
      fetchedAt: "",
      clientLastUpdatedAt: "",
      hasData: false,
    });
  });

  test("a late Magic Kingdom failure cannot put an error on EPCOT", async () => {
    await renderWithSuccessfulAutoRefresh();

    const mkWaits = deferred();
    const mkWeather = deferred();
    serve("waits", "magic_kingdom", mkWaits.handler);
    serve("weather", "magic_kingdom", mkWeather.handler);
    await tapRefreshAt("2026-05-08T17:06:00.000Z");

    await switchActiveParkToEpcot();
    expect(guestText()).toContain("Breezy by the lagoon");

    await act(async () => {
      mkWaits.reject(new Error(RAW_WAITS_ERROR));
      mkWeather.reject(new Error(RAW_WEATHER_ERROR));
    });
    await flush();

    for (const copy of Object.values(COPY)) expect(guestText()).not.toContain(copy);
    expect(debugValue("waits.loadFailed")).toBe("false");
    expect(debugValue("weather.loadFailed")).toBe("false");
    expect(guestText()).toContain("Breezy by the lagoon");

    await goToTab("Waits");
    expect(guestText()).toContain("Test Track");
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
  });

  test("an older same-park request that finishes last cannot overwrite a newer one", async () => {
    await renderWithSuccessfulAutoRefresh();

    const olderWaits = deferred();
    const olderWeather = deferred();
    serve("waits", "magic_kingdom", olderWaits.handler);
    serve("weather", "magic_kingdom", olderWeather.handler);
    await tapRefreshAt("2026-05-08T17:06:00.000Z");

    // A newer automatic cycle lands first.
    serve("waits", "magic_kingdom", ok(MK_WAITS_V2));
    serve("weather", "magic_kingdom", ok(MK_WEATHER_V2));
    await autoRefreshAt("2026-05-08T17:10:00.000Z");
    expect(guestText()).toContain("Sunny and humid");

    // Then the older request settles: one stale success, one failure.
    await act(async () => {
      olderWaits.resolve(MK_WAITS_V1());
      olderWeather.reject(new Error(RAW_WEATHER_ERROR));
    });
    await flush();

    expect(guestText()).toContain("Sunny and humid");
    for (const copy of Object.values(COPY)) expect(guestText()).not.toContain(copy);
    expect(debugValue("weather.fetchedAt")).toBe("2026-05-08T17:04:00.000Z");
    expect(debugValue("waits.lastAutoUpdateAt")).toBe("2026-05-08T17:10:00.000Z");

    await goToTab("Waits");
    expect(guestText()).toContain("Space Mountain");
    expect(guestText()).not.toContain("Big Thunder Mountain Railroad");
  });
});

/* -------------------------------------------------------------------------- */
/* 13. Browsed-park waits                                                     */
/* -------------------------------------------------------------------------- */

describe("browsing another park", () => {
  test("browsed waits still load and refresh on their own, apart from the active park's failures", async () => {
    await renderWithSuccessfulAutoRefresh();

    serve("weather", "magic_kingdom", fail(RAW_WEATHER_ERROR));
    await autoRefreshAt("2026-05-08T17:10:00.000Z");
    expect(guestText()).toContain(COPY.WEATHER_RETAINED);

    const card = Array.from(container.querySelectorAll("button[aria-pressed]")).find((node) =>
      (node.textContent || "").includes("EPCOT")
    );
    await click(card);

    // Waits now shows EPCOT, browsed; the active park is still Magic Kingdom.
    expect(guestText()).toContain("Spaceship Earth");
    expect(guestText()).not.toContain("Big Thunder Mountain Railroad");
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);

    const mkCalls = () => fetchParkData.mock.calls.filter(([parkId]) => parkId === "magic_kingdom").length;
    const epcotCalls = () => fetchParkData.mock.calls.filter(([parkId]) => parkId === "epcot").length;
    const mkBefore = mkCalls();
    const epcotBefore = epcotCalls();

    await tapRefreshAt("2026-05-08T17:12:00.000Z");
    expect(epcotCalls()).toBe(epcotBefore + 1);
    expect(mkCalls()).toBe(mkBefore);
    expect(fetchParkData.mock.calls[fetchParkData.mock.calls.length - 1]).toEqual([
      "epcot",
      { force: true },
    ]);

    await goToTab("Home");
    expect(debugValue("activePark")).toBe("magic_kingdom");
  });
});

/* -------------------------------------------------------------------------- */
/* 14. In-flight retries: outstanding failures and per-source pending state   */
/* -------------------------------------------------------------------------- */

const WEATHER_UNAVAILABLE = "Weather isn’t available right now.";
const LOADING_WEATHER = "Loading weather...";

/** The current screen's Refresh control label, required to exist. */
function refreshLabel() {
  return refreshButton().textContent.trim();
}

/** Start a Home refresh whose requests stay open until the test settles them. */
async function startDeferredHomeRefresh(at) {
  const waits = deferred();
  const weather = deferred();
  serve("waits", "magic_kingdom", waits.handler);
  serve("weather", "magic_kingdom", weather.handler);
  await goToTab("Home");
  await tapRefreshAt(at);
  return { waits, weather };
}

/** Settle deferred responses, optionally with the clock pinned to `at`. */
async function settle(fn, at) {
  await act(async () => {
    if (at) jest.setSystemTime(new Date(at));
    fn();
  });
  await flush();
}

/** Successful 1:05 data, then a completed refresh in which both sources failed. */
async function renderWithBothFailed() {
  await renderWithSuccessfulAutoRefresh();
  serve("waits", "magic_kingdom", fail(RAW_WAITS_ERROR));
  serve("weather", "magic_kingdom", fail(RAW_WEATHER_ERROR));
  await tapRefreshAt("2026-05-08T17:07:00.000Z");
  expect(guestText()).toContain(COPY.BOTH_RETAINED);
  expect(refreshLabel()).toBe("Refresh");
}

describe("a retry in flight keeps each outstanding failure until that source succeeds", () => {
  test("waits recover first: weather's failure stays while weather is still pending", async () => {
    await renderWithBothFailed();
    const retry = await startDeferredHomeRefresh("2026-05-08T17:08:00.000Z");

    // Nothing has settled: both failures are still true and still said.
    expect(refreshLabel()).toBe("Loading");
    expect(guestText()).toContain(COPY.BOTH_RETAINED);
    expect(debugValue("waits.loadFailed")).toBe("true");
    expect(debugValue("weather.loadFailed")).toBe("true");
    await goToTab("Waits");
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
    expect(guestText()).toContain("Big Thunder Mountain Railroad");
    expect(refreshLabel()).toBe("Loading");

    // Waits settle successfully; weather is still in flight.
    await settle(() => retry.waits.resolve(MK_WAITS_V2()));

    expect(guestText()).toContain("Space Mountain");
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
    expect(refreshLabel()).toBe("Refresh");
    expect(refreshButton().disabled).toBe(false);

    await goToTab("Home");
    expect(guestText()).toContain(COPY.WEATHER_RETAINED);
    expect(guestText()).not.toContain(COPY.BOTH_RETAINED);
    expect(guestText()).toContain("Partly cloudy");
    expect(debugValue("waits.loadFailed")).toBe("false");
    expect(debugValue("weather.loadFailed")).toBe("true");
    // Home's combined refresh is still busy with weather.
    expect(refreshLabel()).toBe("Loading");
    // Manual refresh never moves the automatic stamps.
    expect(debugValue("waits.lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");
    expect(debugValue("weather.lastAutoUpdateAt")).toBe("2026-05-08T17:05:00.000Z");

    // Weather recovers too.
    await settle(() => retry.weather.resolve(MK_WEATHER_V2()));
    for (const copy of Object.values(COPY)) expect(guestText()).not.toContain(copy);
    expect(guestText()).toContain("Sunny and humid");
    expect(refreshLabel()).toBe("Refresh");
  });

  test("weather recovers first: the waits failure stays visible on Waits while waits are pending", async () => {
    await renderWithBothFailed();
    const retry = await startDeferredHomeRefresh("2026-05-08T17:08:00.000Z");
    expect(guestText()).toContain(COPY.BOTH_RETAINED);

    await settle(() => retry.weather.resolve(MK_WEATHER_V2()));

    expect(guestText()).toContain("Sunny and humid");
    expect(guestText()).toContain(COPY.WAITS_RETAINED);
    expect(debugValue("waits.loadFailed")).toBe("true");
    expect(debugValue("weather.loadFailed")).toBe("false");
    expect(refreshLabel()).toBe("Loading");

    await goToTab("Waits");
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
    expect(guestText()).toContain("Big Thunder Mountain Railroad");
    expect(refreshLabel()).toBe("Loading");
    expect(refreshButton().disabled).toBe(true);

    // Waits fail again: the failure is still true, and loading has ended.
    await settle(() => retry.waits.reject(new Error(RAW_WAITS_ERROR)));
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
    expect(refreshLabel()).toBe("Refresh");

    await goToTab("Home");
    expect(guestText()).toContain(COPY.WAITS_RETAINED);
    expect(refreshLabel()).toBe("Refresh");
    expectNoRawInternals(container.textContent);
  });
});

describe("Waits loading follows the waits request, not weather", () => {
  test("waits settle while weather is still pending", async () => {
    await renderWithSuccessfulAutoRefresh();
    const weather = deferred();
    serve("waits", "magic_kingdom", ok(MK_WAITS_V2));
    serve("weather", "magic_kingdom", weather.handler);
    await tapRefreshAt("2026-05-08T17:08:00.000Z");

    expect(refreshLabel()).toBe("Loading");

    await goToTab("Waits");
    expect(guestText()).toContain("Space Mountain");
    expect(refreshLabel()).toBe("Refresh");
    expect(refreshButton().disabled).toBe(false);

    await settle(() => weather.resolve(MK_WEATHER_V2()));
    await goToTab("Home");
    expect(refreshLabel()).toBe("Refresh");
    expect(guestText()).toContain("Sunny and humid");
  });

  test("weather settles while waits are still pending", async () => {
    await renderWithSuccessfulAutoRefresh();
    const waits = deferred();
    serve("waits", "magic_kingdom", waits.handler);
    serve("weather", "magic_kingdom", ok(MK_WEATHER_V2));
    await tapRefreshAt("2026-05-08T17:08:00.000Z");

    expect(guestText()).toContain("Sunny and humid");
    expect(refreshLabel()).toBe("Loading");

    await goToTab("Waits");
    expect(refreshLabel()).toBe("Loading");
    expect(refreshButton().disabled).toBe(true);
    // Retained waits stay on screen during the refresh.
    expect(guestText()).toContain("Big Thunder Mountain Railroad");

    await settle(() => waits.resolve(MK_WAITS_V2()));
    expect(refreshLabel()).toBe("Refresh");
    expect(guestText()).toContain("Space Mountain");
  });

  test("an obsolete request cannot clear the latest request's pending state or write its outcome", async () => {
    await renderWithSuccessfulAutoRefresh();
    const older = await startDeferredHomeRefresh("2026-05-08T17:06:00.000Z");

    // A newer automatic cycle starts before the older one settles.
    const newerWaits = deferred();
    const newerWeather = deferred();
    serve("waits", "magic_kingdom", newerWaits.handler);
    serve("weather", "magic_kingdom", newerWeather.handler);
    await autoRefreshAt("2026-05-08T17:10:00.000Z");

    await settle(() => {
      older.waits.resolve(MK_WAITS_PROVIDER_STALE());
      older.weather.reject(new Error(RAW_WEATHER_ERROR));
    });

    expect(refreshLabel()).toBe("Loading");
    for (const copy of Object.values(COPY)) expect(guestText()).not.toContain(copy);
    await goToTab("Waits");
    expect(refreshLabel()).toBe("Loading");
    expect(guestText()).not.toContain("Jungle Cruise");
    expect(guestText()).toContain("Big Thunder Mountain Railroad");

    await settle(() => newerWaits.resolve(MK_WAITS_V2()), "2026-05-08T17:10:20.000Z");
    expect(refreshLabel()).toBe("Refresh");
    expect(guestText()).toContain("Space Mountain");

    await goToTab("Home");
    expect(refreshLabel()).toBe("Loading");
    await settle(() => newerWeather.resolve(MK_WEATHER_V2()), "2026-05-08T17:10:40.000Z");
    expect(refreshLabel()).toBe("Refresh");
    expect(guestText()).toContain("Sunny and humid");
    // Each stamp is that source's own receipt time from the newer cycle.
    expect(debugValue("waits.lastAutoUpdateAt")).toBe("2026-05-08T17:10:20.000Z");
    expect(debugValue("weather.lastAutoUpdateAt")).toBe("2026-05-08T17:10:40.000Z");
  });

  test("a pending request from the previous park cannot end the new park's loading", async () => {
    await renderWithSuccessfulAutoRefresh();
    const mk = await startDeferredHomeRefresh("2026-05-08T17:06:00.000Z");

    const epcotWaits = deferred();
    const epcotWeather = deferred();
    serve("waits", "epcot", epcotWaits.handler);
    serve("weather", "epcot", epcotWeather.handler);

    const card = Array.from(container.querySelectorAll("button[aria-pressed]")).find((node) =>
      (node.textContent || "").includes("EPCOT")
    );
    await click(card);
    // Browsing EPCOT issues its own browsed waits request; settle it so only
    // active-park requests remain open.
    await settle(() => epcotWaits.resolve(EPCOT_WAITS()));

    // A separate open request for EPCOT's active-park waits.
    const activeEpcotWaits = deferred();
    serve("waits", "epcot", activeEpcotWaits.handler);
    const confirm = Array.from(container.querySelectorAll("button")).find(
      (node) => (node.textContent || "").trim() === "I’m here now"
    );
    await click(confirm);

    await goToTab("Home");
    expect(debugValue("activePark")).toBe("epcot");
    expect(refreshLabel()).toBe("Loading");

    // Magic Kingdom's older requests settle: neither EPCOT source may finish.
    await settle(() => {
      mk.waits.resolve(MK_WAITS_V2());
      mk.weather.resolve(MK_WEATHER_V2());
    });
    expect(refreshLabel()).toBe("Loading");
    expect(guestText()).not.toMatch(/Sunny and humid|Partly cloudy/);
    expect(guestText()).toContain(LOADING_WEATHER);
    await goToTab("Waits");
    expect(refreshLabel()).toBe("Loading");
    expect(guestText()).not.toMatch(/Space Mountain|Big Thunder Mountain Railroad/);

    await settle(() => activeEpcotWaits.resolve(EPCOT_WAITS()));
    expect(refreshLabel()).toBe("Refresh");
    expect(guestText()).toContain("Test Track");

    await goToTab("Home");
    expect(refreshLabel()).toBe("Loading"); // EPCOT weather still pending
    await settle(() => epcotWeather.resolve(EPCOT_WEATHER()));
    expect(refreshLabel()).toBe("Refresh");
    expect(guestText()).toContain("Breezy by the lagoon");
  });
});

/* -------------------------------------------------------------------------- */
/* 15. Home's weather line after a completed weather failure                  */
/* -------------------------------------------------------------------------- */

describe("Home's weather line tells loading apart from unavailable", () => {
  test("loading while in flight, unavailable after failure, loading on retry, weather on recovery", async () => {
    const first = deferred();
    serve("weather", "magic_kingdom", first.handler);
    await renderApp();

    // Genuinely in flight.
    expect(guestText()).toContain(LOADING_WEATHER);
    expect(guestText()).not.toContain(WEATHER_UNAVAILABLE);

    // A completed failure with nothing usable: no loading, no invented reading.
    await settle(() => first.reject(new Error(RAW_WEATHER_ERROR)));
    expect(guestText()).not.toContain(LOADING_WEATHER);
    expect(guestText()).toContain(WEATHER_UNAVAILABLE);
    expect(guestText()).toContain(COPY.WEATHER_NO_DATA);
    expect(guestText()).not.toMatch(/\d+°F|Partly cloudy|Sunny|Clear|Good Conditions/);
    expectNoRawInternals(guestText());

    // A retry in flight is loading again, and the failure copy stays honest.
    const retry = deferred();
    serve("weather", "magic_kingdom", retry.handler);
    await tapRefreshAt("2026-05-08T17:02:00.000Z");
    expect(guestText()).toContain(LOADING_WEATHER);
    expect(guestText()).not.toContain(WEATHER_UNAVAILABLE);
    expect(guestText()).toContain(COPY.WEATHER_NO_DATA);

    // Recovery shows the real weather and nothing else.
    await settle(() => retry.resolve(MK_WEATHER_V1()));
    expect(guestText()).toContain("Partly cloudy");
    expect(guestText()).toContain("81°F");
    expect(guestText()).not.toContain(LOADING_WEATHER);
    expect(guestText()).not.toContain(WEATHER_UNAVAILABLE);
    for (const copy of Object.values(COPY)) expect(guestText()).not.toContain(copy);
  });

  test("retained weather after a failed refresh stays on screen, not replaced by unavailable", async () => {
    await renderWithSuccessfulAutoRefresh();
    serve("weather", "magic_kingdom", fail(RAW_WEATHER_ERROR));
    await tapRefreshAt("2026-05-08T17:08:00.000Z");

    expect(guestText()).toContain("Partly cloudy");
    expect(guestText()).toContain("81°F");
    expect(guestText()).toContain(COPY.WEATHER_RETAINED);
    expect(guestText()).not.toContain(WEATHER_UNAVAILABLE);
    expect(guestText()).not.toContain(LOADING_WEATHER);
  });
});
