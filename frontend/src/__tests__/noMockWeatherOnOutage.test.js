/**
 * Regression: synthetic weather never stands in for real weather.
 *
 * The defect: when the weather provider failed and the backend had nothing
 * real cached for the park, /api/weather answered 200 with buildMockWeather —
 * source "mock", summary "Weather unavailable", no storm, no current
 * precipitation, zero rainfall. fetchWeather passed it through, so the app
 * treated it as a successful weather load: Home and Plan showed it as the
 * park's conditions with an "Estimates" badge, a failed refresh replaced real
 * weather with it, weather freshness advanced, and TOHI chat was told weather
 * data existed.
 *
 * The invariant pinned here: missing real weather never becomes synthetic
 * weather. With no usable real weather the guest sees the existing unavailable
 * state; real weather already on screen stays, honestly labelled; waits keep
 * loading on their own.
 *
 * These render the REAL App with the REAL fetchParkData / fetchWeather. Only the
 * network (global.fetch) is scripted, so the api.js boundary is exercised. Both
 * backend outage shapes are covered: the legacy 200 synthetic payload, and the
 * honest 502 the backend now returns. No promise or rejection is suppressed.
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../api", () => ({
  ...jest.requireActual("../api"),
  sendChatMessage: jest.fn(() => Promise.resolve({ reply: "Here to help." })),
  sendTohiPickReview: jest.fn(() => Promise.resolve(null)),
  trackEvent: jest.fn(),
}));

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { sendChatMessage } from "../api";
// eslint-disable-next-line import/first
import { WAITS_COPY } from "../utils/waitsViewState";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const AUTO_REFRESH_MS = 3 * 60 * 1000;
const START = "2026-05-08T17:00:00.000Z"; // 1:00 PM Orlando

const COPY = {
  WEATHER_RETAINED:
    "We couldn’t refresh the weather right now. You’re seeing the last weather we loaded. Please try again in a moment.",
  WEATHER_NO_DATA: "We couldn’t load the weather right now. Please try again in a moment.",
  WAITS_NO_DATA: "We couldn’t load wait times right now. Please try again in a moment.",
  BOTH_NO_DATA: "We couldn’t load park information right now. Please try again in a moment.",
};

const WEATHER_UNAVAILABLE = "Weather isn’t available right now.";
const LOADING_WEATHER = "Loading weather...";

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

const MK_WAITS = () => ({
  parkId: "magic_kingdom",
  parkName: "Magic Kingdom",
  source: "live",
  fetchedAt: "2026-05-08T16:59:00.000Z",
  ageMs: 60000,
  rides: [
    { id: "mk-1", name: "Big Thunder Mountain Railroad", land: "Frontierland", waitTime: 20, isOpen: true },
    { id: "mk-2", name: "Haunted Mansion", land: "Liberty Square", waitTime: 25, isOpen: true },
  ],
});

const MK_WAITS_V2 = () => ({
  ...MK_WAITS(),
  fetchedAt: "2026-05-08T17:02:30.000Z",
  rides: [{ id: "mk-4", name: "Space Mountain", land: "Tomorrowland", waitTime: 45, isOpen: true }],
});

const EPCOT_WAITS = () => ({
  parkId: "epcot",
  parkName: "EPCOT",
  source: "live",
  fetchedAt: "2026-05-08T17:06:00.000Z",
  ageMs: 15000,
  rides: [{ id: "ep-1", name: "Spaceship Earth", land: "World Celebration", waitTime: 10, isOpen: true }],
});

const MK_WEATHER = () => ({
  parkId: "magic_kingdom",
  location: "Magic Kingdom",
  source: "live",
  fetchedAt: "2026-05-08T16:58:00.000Z",
  ageMs: 120000,
  summary: "Partly cloudy",
  rawSummary: "scattered clouds",
  tempF: 81,
  feelsLikeF: 81,
  humidity: 70,
  rainRisk: 0.1,
  stormMode: false,
  currentPrecipitation: false,
});

const MK_WEATHER_RECOVERED = () => ({
  ...MK_WEATHER(),
  fetchedAt: "2026-05-08T17:04:00.000Z",
  ageMs: 60000,
  summary: "Sunny and humid",
  rawSummary: "clear sky",
  tempF: 84,
  feelsLikeF: 84,
});

// The backend's own cache fallback: real weather, older than its TTL.
const MK_WEATHER_BACKEND_STALE = () => ({
  ...MK_WEATHER(),
  source: "stale",
  fetchedAt: "2026-05-08T16:40:00.000Z",
  ageMs: 1200000,
});

const EPCOT_WEATHER = () => ({
  parkId: "epcot",
  location: "EPCOT",
  source: "live",
  fetchedAt: "2026-05-08T17:06:00.000Z",
  ageMs: 15000,
  summary: "Breezy by the lagoon",
  rawSummary: "few clouds",
  tempF: 79,
  feelsLikeF: 79,
  humidity: 65,
  rainRisk: 0.1,
  stormMode: false,
  currentPrecipitation: false,
});

// Exactly what the backend's buildMockWeather fallback produced.
const SYNTHETIC_WEATHER = (parkId, label) => ({
  provider: "openweather",
  providerLabel: "OpenWeather",
  coordinateSource: "park_center",
  weatherTarget: { parkId, label, lat: 28.4, lon: -81.5 },
  parkId,
  location: label,
  summary: "Weather unavailable",
  rawSummary: "Weather unavailable",
  tempF: null,
  feelsLikeF: null,
  humidity: null,
  rainRisk: null,
  stormMode: false,
  currentPrecipitation: false,
  precipitationLastHourIn: 0,
  source: "mock",
  ageMs: 0,
  fetchedAt: "2026-05-08T17:00:00.000Z",
});

/* -------------------------------------------------------------------------- */
/* A scripted HTTP backend behind the real api.js                             */
/* -------------------------------------------------------------------------- */

const routes = { waits: {}, weather: {} };

const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

const respond = {
  ok: (payload) => () => Promise.resolve(json(200, payload())),
  // Legacy backend: cold-cache weather outage answered 200 with synthetic weather.
  synthetic: (parkId, label) => () => Promise.resolve(json(200, SYNTHETIC_WEATHER(parkId, label))),
  // Current backend: a provider failure, timeout, open circuit or missing
  // credentials with nothing real cached.
  outage: (detail = "OpenWeather 503") => () =>
    Promise.resolve(json(502, { error: "Could not fetch weather", detail })),
  waitsOutage: () => () =>
    Promise.resolve(json(502, { error: "Could not fetch park data", detail: "Queue-Times 503" })),
};

/** A response the test settles by hand, to observe the pending state. */
function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { handler: () => promise, resolve: (status, body) => resolve(json(status, body)) };
}

function serve(kind, parkId, handler) {
  routes[kind][parkId] = handler;
}

function installNetwork() {
  global.fetch = jest.fn((url) => {
    const parsed = new URL(url);
    const parkId = parsed.searchParams.get("parkId");
    const kind =
      parsed.pathname === "/api/park-data" ? "waits" : parsed.pathname === "/api/weather" ? "weather" : null;
    const handler = kind && routes[kind][parkId];
    if (!handler) return Promise.reject(new Error(`test network has no route for ${url}`));
    return handler();
  });
}

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

let container = null;
let root = null;

/** Lets api.js's retry back-off (300ms, 600ms) run to completion. */
async function flush() {
  for (let i = 0; i < 8; i++) {
    await act(async () => {
      jest.advanceTimersByTime(400);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  }
}

async function renderApp() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(App));
  });
  await flush();
}

async function click(el) {
  expect(el).toBeTruthy();
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

async function goToTab(label) {
  const button = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === label
  );
  await click(button);
}

async function tapRefresh() {
  const button = Array.from(container.querySelectorAll("button")).find((node) =>
    /^(Refresh|Loading)$/.test((node.textContent || "").trim())
  );
  expect(button).toBeTruthy();
  expect(button.disabled).toBe(false);
  await click(button);
}

async function autoRefresh() {
  await act(async () => {
    jest.advanceTimersByTime(AUTO_REFRESH_MS);
  });
  await flush();
}

function guestText() {
  const clone = container.cloneNode(true);
  clone.querySelectorAll("details").forEach((node) => node.remove());
  return clone.textContent || "";
}

function debugValue(label) {
  const labels = Array.from(container.querySelectorAll("details span")).filter(
    (node) => node.textContent === label
  );
  expect(labels).toHaveLength(1);
  return labels[0].nextElementSibling.textContent;
}

/** Home's Park Conditions card, required to exist exactly once. */
function homeWeatherCardText() {
  const titles = Array.from(container.querySelectorAll("h3")).filter(
    (node) => (node.textContent || "").trim() === "Weather + comfort"
  );
  expect(titles).toHaveLength(1);
  const card = titles[0].parentElement.parentElement.parentElement;
  expect(card.textContent).toContain("PARK CONDITIONS");
  return card.textContent || "";
}

/** The Plan screen's Weather + comfort card, required to exist exactly once. */
function planWeatherCardText() {
  const eyebrows = Array.from(container.querySelectorAll("div")).filter(
    (node) => (node.textContent || "").trim() === "☀️ WEATHER + COMFORT"
  );
  expect(eyebrows).toHaveLength(1);
  const card = eyebrows[0].parentElement;
  expect(card.closest("details")).toBeNull();
  return card.textContent || "";
}

/** No synthetic reading, estimate badge, or claimed condition. */
function expectNoSyntheticWeather(text) {
  expect(text).not.toContain("Weather unavailable");
  expect(text).not.toMatch(/Estimates \(live data unavailable\)|Showing best estimates/);
  expect(text).not.toMatch(/\d+°F|% humidity|🟢 Live/);
  // Raw request errors, including the synthetic-payload rejection, stay off screen.
  expect(text).not.toMatch(/API \/api\/|synthetic|-> 502/);
}

async function sentSessionData() {
  await goToTab("TOHI");
  const input = container.querySelector("#tohi-question");
  expect(input).toBeTruthy();

  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, "is the wait for haunted mansion worth it");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  const before = sendChatMessage.mock.calls.length;
  const send = Array.from(container.querySelectorAll('button[type="submit"]')).find((b) =>
    (b.textContent || "").includes("Send")
  );
  await click(send);

  expect(sendChatMessage.mock.calls.length).toBe(before + 1);
  return sendChatMessage.mock.calls[sendChatMessage.mock.calls.length - 1][1];
}

function expectNoSyntheticWeatherInAiContext(sessionData) {
  const serialized = JSON.stringify(sessionData);
  expect(serialized).not.toContain("Weather unavailable");
  expect(serialized).not.toContain('"mock"');
  expect(serialized).not.toContain("precipitationLastHourIn");
}

const NO_WEATHER_FRESHNESS = {
  source: "",
  ageMs: null,
  fetchedAt: "",
  clientLastUpdatedAt: "",
  hasData: false,
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(PROFILE));
  window.localStorage.setItem("parkplan.debugSnapshot", "true");
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(START));

  routes.waits = {};
  routes.weather = {};
  serve("waits", "magic_kingdom", respond.ok(MK_WAITS));
  serve("weather", "magic_kingdom", respond.ok(MK_WEATHER));
  serve("waits", "epcot", respond.ok(EPCOT_WAITS));
  serve("weather", "epcot", respond.ok(EPCOT_WEATHER));
  installNetwork();

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
  delete global.fetch;
});

// [label, route handler, the same response as [status, body] for a deferred request]
const OUTAGE_SHAPES = [
  [
    "the legacy 200 synthetic payload",
    (parkId, label) => respond.synthetic(parkId, label),
    (parkId, label) => [200, SYNTHETIC_WEATHER(parkId, label)],
  ],
  [
    "an honest 502",
    () => respond.outage(),
    () => [502, { error: "Could not fetch weather", detail: "OpenWeather 503" }],
  ],
];

/* -------------------------------------------------------------------------- */
/* 1 + 6. Cold-cache outage on the active park                                */
/* -------------------------------------------------------------------------- */

describe.each(OUTAGE_SHAPES)("cold-cache weather outage answered with %s", (_label, outage) => {
  beforeEach(async () => {
    serve("weather", "magic_kingdom", outage("magic_kingdom", "Magic Kingdom"));
    await renderApp();
  });

  test("Home and Plan show the unavailable state, with no synthetic reading or condition", async () => {
    expect(guestText()).toContain(COPY.WEATHER_NO_DATA);
    expect(guestText()).not.toContain(COPY.BOTH_NO_DATA);
    expect(homeWeatherCardText()).toContain(WEATHER_UNAVAILABLE);
    expect(homeWeatherCardText()).not.toContain(LOADING_WEATHER);
    expectNoSyntheticWeather(homeWeatherCardText());
    expect(debugValue("weather.loadFailed")).toBe("true");
    expect(debugValue("weather.source")).toBe("—");

    await goToTab("Plan");
    expect(planWeatherCardText()).toContain(WEATHER_UNAVAILABLE);
    expectNoSyntheticWeather(planWeatherCardText());
  });

  test("waits still load and show while weather is unavailable", async () => {
    expect(guestText()).not.toContain(COPY.WAITS_NO_DATA);
    await goToTab("Waits");
    expect(guestText()).toContain("Big Thunder Mountain Railroad");
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_ERROR_BODY);
  });

  test("TOHI chat receives no weather and is told none is available", async () => {
    const sessionData = await sentSessionData();
    expect(sessionData.weather).toBeNull();
    expect(sessionData.dataFreshness.weather).toEqual(NO_WEATHER_FRESHNESS);
    expect(sessionData.dataFreshness.waits.hasData).toBe(true);
    expectNoSyntheticWeatherInAiContext(sessionData);
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Missing provider credentials                                            */
/* -------------------------------------------------------------------------- */

describe("missing weather provider credentials", () => {
  test("the backend's honest failure shows as unavailable, not as live weather", async () => {
    serve("weather", "magic_kingdom", respond.outage("Weather provider is not configured"));
    await renderApp();

    expect(guestText()).toContain(COPY.WEATHER_NO_DATA);
    expect(homeWeatherCardText()).toContain(WEATHER_UNAVAILABLE);
    expectNoSyntheticWeather(homeWeatherCardText());
    expect(guestText()).not.toContain("not configured");

    const sessionData = await sentSessionData();
    expect(sessionData.weather).toBeNull();
    expect(sessionData.dataFreshness.weather).toEqual(NO_WEATHER_FRESHNESS);
  });
});

/* -------------------------------------------------------------------------- */
/* 3 + 5 + 9. Outage over real weather already on screen                      */
/* -------------------------------------------------------------------------- */

describe.each(OUTAGE_SHAPES)("weather outage over loaded real weather, answered with %s", (_label, outage) => {
  test("the real weather stays with its own provenance, and weather freshness does not advance", async () => {
    await renderApp();
    await autoRefresh();
    const lastWeatherUpdate = debugValue("weather.lastAutoUpdateAt");
    expect(lastWeatherUpdate).not.toBe("");
    expect(homeWeatherCardText()).toContain("81°F");

    serve("weather", "magic_kingdom", outage("magic_kingdom", "Magic Kingdom"));
    serve("waits", "magic_kingdom", respond.ok(MK_WAITS_V2));
    await autoRefresh();

    // Weather: the earlier real reading, unchanged and not re-stamped.
    expect(guestText()).toContain(COPY.WEATHER_RETAINED);
    expect(homeWeatherCardText()).toContain("81°F");
    expect(homeWeatherCardText()).toContain("Partly cloudy");
    expect(homeWeatherCardText()).not.toContain(WEATHER_UNAVAILABLE);
    expect(homeWeatherCardText()).not.toContain("Weather unavailable");
    expect(homeWeatherCardText()).not.toMatch(/Estimates \(live data unavailable\)/);
    expect(debugValue("weather.fetchedAt")).toBe("2026-05-08T16:58:00.000Z");
    expect(debugValue("weather.lastAutoUpdateAt")).toBe(lastWeatherUpdate);
    expect(debugValue("weather.loadFailed")).toBe("true");

    // Waits refreshed in the same cycle.
    expect(debugValue("waits.lastAutoUpdateAt")).not.toBe(lastWeatherUpdate);

    await goToTab("Plan");
    expect(planWeatherCardText()).toContain("81°F");
    expect(planWeatherCardText()).not.toContain(WEATHER_UNAVAILABLE);

    await goToTab("Waits");
    expect(guestText()).toContain("Space Mountain");

    const sessionData = await sentSessionData();
    expect(sessionData.dataFreshness.weather).toEqual({
      source: "live",
      ageMs: 120000,
      fetchedAt: "2026-05-08T16:58:00.000Z",
      clientLastUpdatedAt: lastWeatherUpdate,
      hasData: true,
    });
    expect(sessionData.weather.tempF).toBe(81);
    expectNoSyntheticWeatherInAiContext(sessionData);
  });
});

describe("backend-retained real weather", () => {
  test("a stale real response from the backend cache keeps its stale provenance", async () => {
    serve("weather", "magic_kingdom", respond.ok(MK_WEATHER_BACKEND_STALE));
    await renderApp();

    expect(homeWeatherCardText()).toContain("81°F");
    expect(homeWeatherCardText()).toContain("Using older data");
    expect(homeWeatherCardText()).not.toContain("🟢 Live");

    const sessionData = await sentSessionData();
    expect(sessionData.dataFreshness.weather).toMatchObject({
      source: "stale",
      ageMs: 1200000,
      fetchedAt: "2026-05-08T16:40:00.000Z",
      hasData: true,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 4 + 10. Pending, unavailable, retry, recovery                              */
/* -------------------------------------------------------------------------- */

describe.each(OUTAGE_SHAPES)("recovery after a weather outage answered with %s", (_label, outage, outageResponse) => {
  test("Home and Plan move from pending to unavailable to loading to the real weather", async () => {
    const first = deferred();
    serve("weather", "magic_kingdom", first.handler);
    await renderApp();

    // Pending.
    expect(homeWeatherCardText()).toContain(LOADING_WEATHER);
    expect(homeWeatherCardText()).not.toContain(WEATHER_UNAVAILABLE);

    // Unavailable.
    serve("weather", "magic_kingdom", outage("magic_kingdom", "Magic Kingdom"));
    await act(async () => {
      first.resolve(...outageResponse("magic_kingdom", "Magic Kingdom"));
    });
    await flush();
    expect(homeWeatherCardText()).toContain(WEATHER_UNAVAILABLE);
    expect(homeWeatherCardText()).not.toContain(LOADING_WEATHER);
    expectNoSyntheticWeather(homeWeatherCardText());
    await goToTab("Plan");
    expect(planWeatherCardText()).toContain(WEATHER_UNAVAILABLE);
    expectNoSyntheticWeather(planWeatherCardText());
    expect(debugValue("weather.lastAutoUpdateAt")).toBe("");

    // An automatic retry in flight: loading again, on Plan.
    const retry = deferred();
    serve("weather", "magic_kingdom", retry.handler);
    await autoRefresh();
    expect(planWeatherCardText()).toContain(LOADING_WEATHER);
    expect(planWeatherCardText()).not.toContain(WEATHER_UNAVAILABLE);

    // Recovered.
    await act(async () => {
      retry.resolve(200, MK_WEATHER_RECOVERED());
    });
    await flush();
    expect(planWeatherCardText()).toContain("84°F");
    expect(planWeatherCardText()).not.toContain(WEATHER_UNAVAILABLE);
    expect(planWeatherCardText()).not.toContain(LOADING_WEATHER);

    await goToTab("Home");
    expect(homeWeatherCardText()).toContain("84°F");
    expect(homeWeatherCardText()).toContain("Sunny and humid");
    expect(homeWeatherCardText()).not.toContain(WEATHER_UNAVAILABLE);
    expect(guestText()).not.toContain(COPY.WEATHER_NO_DATA);
    expect(debugValue("weather.loadFailed")).toBe("false");

    const sessionData = await sentSessionData();
    expect(sessionData.dataFreshness.weather).toMatchObject({
      source: "live",
      fetchedAt: "2026-05-08T17:04:00.000Z",
      hasData: true,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 7. Waits fail while weather succeeds                                       */
/* -------------------------------------------------------------------------- */

describe("waits outage while weather succeeds", () => {
  test("real weather still loads and refreshes", async () => {
    serve("waits", "magic_kingdom", respond.waitsOutage());
    await renderApp();

    expect(guestText()).toContain(COPY.WAITS_NO_DATA);
    expect(guestText()).not.toContain(COPY.WEATHER_NO_DATA);
    expect(homeWeatherCardText()).toContain("81°F");

    serve("weather", "magic_kingdom", respond.ok(MK_WEATHER_RECOVERED));
    await tapRefresh();
    expect(homeWeatherCardText()).toContain("84°F");
    expect(homeWeatherCardText()).toContain("Sunny and humid");
    expect(debugValue("weather.loadFailed")).toBe("false");
    expect(debugValue("waits.loadFailed")).toBe("true");
  });
});

/* -------------------------------------------------------------------------- */
/* 8. Active-park switching                                                   */
/* -------------------------------------------------------------------------- */

describe.each(OUTAGE_SHAPES)("switching parks into a weather outage answered with %s", (_label, outage) => {
  test("the new park never shows the previous park's weather or a synthetic reading", async () => {
    serve("weather", "epcot", outage("epcot", "EPCOT"));
    await renderApp();
    expect(homeWeatherCardText()).toContain("81°F");

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
    expect(guestText()).toContain(COPY.WEATHER_NO_DATA);
    expect(guestText()).not.toContain(COPY.WEATHER_RETAINED);
    expect(homeWeatherCardText()).toContain(WEATHER_UNAVAILABLE);
    expect(homeWeatherCardText()).not.toContain("Partly cloudy");
    expectNoSyntheticWeather(homeWeatherCardText());

    await goToTab("Plan");
    expect(planWeatherCardText()).toContain(WEATHER_UNAVAILABLE);
    expectNoSyntheticWeather(planWeatherCardText());

    await goToTab("Waits");
    expect(guestText()).toContain("Spaceship Earth");

    const sessionData = await sentSessionData();
    expect(sessionData.activePark).toBe("epcot");
    expect(sessionData.weather).toBeNull();
    expect(sessionData.dataFreshness.weather).toEqual(NO_WEATHER_FRESHNESS);
    expect(JSON.stringify(sessionData)).not.toContain("scattered clouds");
    expectNoSyntheticWeatherInAiContext(sessionData);
  });
});
