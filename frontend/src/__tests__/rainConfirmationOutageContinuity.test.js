/**
 * Regression: a guest's "Yes, it's raining" survives a provider weather outage.
 *
 * The defect: a rain confirmation belongs to a forecast "episode", and an
 * episode only exists while provider weather shows a Rain or Storm Watch. With
 * no provider weather there is no episode, so App's obsolete-record cleanup
 * deleted the stored answer, and applyRainConfirmationToWeather(null) dropped
 * its effect. A reload always starts with weather pending, so the answer was
 * erased on every reload — for good if the weather request then failed, and
 * with a duplicate prompt if it succeeded.
 *
 * The invariant pinned here: missing provider data is not evidence the rain
 * stopped. A valid confirmation keeps applying for exactly its existing park,
 * trip date and effect window. Nothing about provider weather is invented, the
 * guest's report stays labelled as the guest's, and "not yet" or a dismissal is
 * never turned into rain.
 *
 * These render the REAL App with the REAL fetchParkData / fetchWeather /
 * sendChatMessage and the REAL recommendation engine (observed through a
 * pass-through spy, never replaced). Only the network is scripted. The clock is
 * explicit: 4:00 PM Orlando on 2026-06-27, Magic Kingdom open 9 AM–10 PM, a
 * forecast rain window at 6:00 PM.
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../api", () => ({
  ...jest.requireActual("../api"),
  sendTohiPickReview: jest.fn(() => Promise.resolve(null)),
  trackEvent: jest.fn(),
}));

// The REAL engine, observed rather than replaced: every call runs the actual
// getNextBestRides, so assertions read its real input weather and real output.
// CRA's Jest preset sets resetMocks, so the pass-through implementation is
// installed again in beforeEach.
jest.mock("../rideRecommendations", () => {
  const actual = jest.requireActual("../rideRecommendations");
  return { ...actual, getNextBestRides: jest.fn() };
});

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { getNextBestRides } from "../rideRecommendations";
// eslint-disable-next-line import/first
import {
  RAIN_CONFIRMATION_RESPONSES,
  RAIN_CONFIRMATION_STORAGE_KEY,
  buildRainConfirmationRecord,
} from "../utils/rainConfirmation";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const START = "2026-06-27T16:00:00-04:00";
const MINUTE = 60 * 1000;
const AUTO_REFRESH_MS = 3 * MINUTE;

const PROMPT = "raining where you are?";
const CONFIRM_LABEL = "Yes — switch to Rain Mode";
const NOT_YET_LABEL = "Not yet";
const NOTE = "You told us it is raining, so TOHI is favoring indoor and covered moves for now.";
const NOTE_WITH_FORECAST = "The forecast above is unchanged.";
const NOTE_WITHOUT_PROVIDER =
  "Live weather isn’t available right now, so this is based on what you told us.";
const WEATHER_UNAVAILABLE = "Weather isn’t available right now.";
const EPISODE_ID = "magic_kingdom|2026-06-27|rain|2026-06-27T22:00:00.000Z";
const BIG_THUNDER = "Big Thunder Mountain Railroad";

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
    tripStartDate: "2026-06-27",
    tripEndDate: "2026-06-29",
    parkDays: 3,
    parkSelectionIds: ["magic_kingdom"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "magic_kingdom",
  },
  resortContext: {
    stayingOnProperty: "no",
    resortId: "",
    resortName: "",
    offPropertyHotelName: "",
    transportationMode: "car",
  },
};

// A generated plan, so the rain question is allowed at all.
const TRIP_PLAN = { version: 1, system: "disney_wdw", lastGeneratedAt: "2026-06-27T12:00:00.000Z" };

const WAITS = () => ({
  parkId: "magic_kingdom",
  source: "live",
  fetchedAt: "2026-06-27T19:59:00.000Z",
  ageMs: 60000,
  rides: [
    { id: "mk-bt", name: BIG_THUNDER, land: "Frontierland", waitTime: 10, isOpen: true },
    { id: "mk-cb", name: "Country Bear Musical Jamboree", land: "Frontierland", waitTime: 20, isOpen: true },
    { id: "mk-hm", name: "Haunted Mansion", land: "Liberty Square", waitTime: 30, isOpen: true },
    { id: "mk-pirates", name: "Pirates of the Caribbean", land: "Adventureland", waitTime: 25, isOpen: true },
  ],
});

// Forecast-only Rain Watch: nothing falling, rain expected at 6:00 PM.
const RAIN_WATCH = () => ({
  parkId: "magic_kingdom",
  source: "live",
  fetchedAt: "2026-06-27T19:58:00.000Z",
  ageMs: 120000,
  summary: "Rain possible soon",
  rawSummary: "Rain possible soon",
  tempF: 84,
  feelsLikeF: 88,
  humidity: 75,
  rainRisk: 0.6,
  stormMode: false,
  currentPrecipitation: false,
  upcomingPrecipitation: true,
  nextPrecipitationWindow: {
    time: "2026-06-27T18:00:00-04:00",
    summary: "Light rain",
    rainRisk: 0.6,
    precipitationProbability: 60,
    weatherCode: 4000,
  },
});

const CLEAR = () => ({
  ...RAIN_WATCH(),
  summary: "Partly cloudy",
  rawSummary: "scattered clouds",
  rainRisk: 0.1,
  upcomingPrecipitation: false,
  nextPrecipitationWindow: null,
});

/* -------------------------------------------------------------------------- */
/* Scripted network behind the real api.js                                    */
/* -------------------------------------------------------------------------- */

let weatherResponse;
let chatBodies;

const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

const OUTAGE_BODY = { error: "Could not fetch weather", detail: "OpenWeather 503" };

const WEATHER = {
  ok: (payload) => () => Promise.resolve(json(200, payload())),
  outage: () => Promise.resolve(json(502, OUTAGE_BODY)),
};

const openDeferreds = [];

/**
 * A weather response the test settles by hand, to observe the pending state.
 * Anything left open is settled in afterEach: api.js de-duplicates in-flight
 * GETs across the module, so an unsettled request would otherwise be shared
 * with the next test's weather load.
 */
function deferredWeather() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  const entry = { handler: () => promise, settle: (status, body) => resolve(json(status, body)) };
  openDeferreds.push(entry);
  return entry;
}

function installNetwork() {
  global.fetch = jest.fn((url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/api/park-data") return Promise.resolve(json(200, WAITS()));
    if (parsed.pathname === "/api/weather") return weatherResponse();
    if (parsed.pathname === "/api/ai-chat") {
      chatBodies.push(JSON.parse(options.body));
      return Promise.resolve(json(200, { reply: "Here is a calm next move." }));
    }
    return Promise.reject(new Error(`test network has no route for ${url}`));
  });
}

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

let container = null;
let root = null;

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

async function unmount() {
  if (root) {
    await act(async () => {
      root.unmount();
    });
    root = null;
  }
  if (container?.parentNode) container.parentNode.removeChild(container);
  container = null;
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

/** Same browser tab: sessionStorage and localStorage survive, App state does not. */
async function reload() {
  await unmount();
  await renderApp();
}

async function click(el) {
  expect(el).toBeTruthy();
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

async function advance(ms) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await flush();
}

async function goToTab(label) {
  const button = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === label
  );
  await click(button);
}

async function chooseLand(value) {
  await goToTab("Plan");
  const select = container.querySelector("#current-land");
  expect(select).toBeTruthy();
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
    setter.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flush();
}

function guestText() {
  const clone = container.cloneNode(true);
  clone.querySelectorAll("details").forEach((node) => node.remove());
  return (clone.textContent || "").replace(/\s+/g, " ");
}

function debugValue(label) {
  const labels = Array.from(container.querySelectorAll("details span")).filter(
    (node) => node.textContent === label
  );
  expect(labels).toHaveLength(1);
  return labels[0].nextElementSibling.textContent;
}

function storedRecord() {
  const raw = window.sessionStorage.getItem(RAIN_CONFIRMATION_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

const promptShown = () => guestText().includes(PROMPT);

/** Home's Park Conditions card only — the page also carries the waits badge. */
function homeWeatherCardText() {
  const titles = Array.from(container.querySelectorAll("h3")).filter(
    (node) => (node.textContent || "").trim() === "Weather + comfort"
  );
  expect(titles).toHaveLength(1);
  const card = titles[0].parentElement.parentElement.parentElement;
  expect(card.textContent).toContain("PARK CONDITIONS");
  return (card.textContent || "").replace(/\s+/g, " ");
}

async function answerPrompt(label) {
  await goToTab("Home");
  expect(promptShown()).toBe(true);
  const button = Array.from(container.querySelectorAll("button")).find(
    (node) => (node.textContent || "").trim() === label
  );
  await click(button);
}

async function confirmRain() {
  await answerPrompt(CONFIRM_LABEL);
  expect(storedRecord()).toMatchObject({
    response: "confirmed",
    episodeId: EPISODE_ID,
    parkId: "magic_kingdom",
    tripDate: "2026-06-27",
  });
  expect(debugValue("weatherMode.mode")).toBe("rain");
}

/** A stored answer exactly as the prompt writes one, for scoped cases. */
function storeRecord(response, episodeOverrides = {}) {
  const record = buildRainConfirmationRecord({
    episode: {
      episodeId: EPISODE_ID,
      parkId: "magic_kingdom",
      tripDate: "2026-06-27",
      watchKind: "rain",
      ...episodeOverrides,
    },
    response,
    now: new Date(START).getTime(),
  });
  window.sessionStorage.setItem(RAIN_CONFIRMATION_STORAGE_KEY, JSON.stringify(record));
  return record;
}

/** The latest REAL engine pass for Frontierland: its input weather and output. */
function latestEnginePass() {
  const { calls, results } = getNextBestRides.mock;
  for (let i = calls.length - 1; i >= 0; i--) {
    const location = calls[i][0]?.locationContext;
    if (location?.landKey === "frontierland" || location?.land === "frontierland") {
      return { input: calls[i][0], output: results[i].value };
    }
  }
  return null;
}

const goNowNames = (output) => [output.bestMove, output.backup].filter(Boolean).map((ride) => ride.name);

async function sentChat(text = "is the wait for haunted mansion worth it") {
  await goToTab("TOHI");
  const input = container.querySelector("#tohi-question");
  expect(input).toBeTruthy();
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const before = chatBodies.length;
  const send = Array.from(container.querySelectorAll('button[type="submit"]')).find((b) =>
    (b.textContent || "").includes("Send")
  );
  await click(send);
  expect(chatBodies.length).toBe(before + 1);
  return chatBodies[chatBodies.length - 1].sessionData;
}

/** The only decision-weather keys a guest report may carry — no provider measurement. */
const GUEST_ONLY_KEYS = [
  "currentPrecipitation",
  "forecastCurrentPrecipitation",
  "guestConfirmedRain",
  "guestConfirmedRainAt",
  "guestConfirmedRainExpiresAt",
  "providerWeatherUnavailable",
].sort();

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(PROFILE));
  window.localStorage.setItem("parkplan.tripPlan", JSON.stringify(TRIP_PLAN));
  window.localStorage.setItem("parkplan.debugSnapshot", "true");
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(START));

  weatherResponse = WEATHER.ok(RAIN_WATCH);
  chatBodies = [];
  installNetwork();
  getNextBestRides.mockImplementation(jest.requireActual("../rideRecommendations").getNextBestRides);
});

afterEach(async () => {
  await act(async () => {
    // A success, not a failure: a failure schedules api.js retries on this
    // test's fake timers, which are discarded, leaving the request open.
    openDeferreds.splice(0).forEach((entry) => entry.settle(200, RAIN_WATCH()));
  });
  await unmount();
  jest.useRealTimers();
  delete global.fetch;
});

/* -------------------------------------------------------------------------- */
/* 1 + 9 + 10 + 11. Confirmed rain, then provider weather unavailable          */
/* -------------------------------------------------------------------------- */

describe("a valid confirmation survives a reload into a weather outage", () => {
  beforeEach(async () => {
    await renderApp();
    await confirmRain();
    weatherResponse = WEATHER.outage;
    await reload();
    expect(debugValue("weather.loadFailed")).toBe("true");
  });

  test("the answer is kept and rain behaviour stays active", async () => {
    expect(storedRecord()).toMatchObject({ response: "confirmed", episodeId: EPISODE_ID });
    expect(debugValue("weatherMode.mode")).toBe("rain");
    expect(debugValue("weatherMode.label")).toBe("Light Rain");
  });

  test("no provider measurement, live badge, forecast or storm is invented", async () => {
    expect(debugValue("weather.source")).toBe("—");
    expect(debugValue("weather.fetchedAt")).toBe("—");
    expect(debugValue("tempF")).toBe("—");
    expect(debugValue("rainRisk")).toBe("—");
    expect(debugValue("weatherMode.mode")).not.toBe("storm");

    const card = homeWeatherCardText();
    expect(card).toContain(WEATHER_UNAVAILABLE);
    expect(card).not.toMatch(/🟢 Live|\d+°F|% humidity|Storm Active|Storm Watch|Rain possible soon/);
    // Light rain from the guest's report, never a storm.
    expect(card).toContain("Light Rain");
    // No prompt while there is no provider episode to ask about.
    expect(promptShown()).toBe(false);
  });

  test("Home says the rain comes from the guest, not from a forecast", async () => {
    const text = guestText();
    expect(text).toContain(NOTE);
    expect(text).toContain(NOTE_WITHOUT_PROVIDER);
    expect(text).not.toContain(NOTE_WITH_FORECAST);
  });

  test("the real engine receives the guest report alone and applies rain rules", async () => {
    await chooseLand("frontierland");
    const pass = latestEnginePass();
    expect(pass).toBeTruthy();

    expect(Object.keys(pass.input.weather).sort()).toEqual(GUEST_ONLY_KEYS);
    expect(pass.input.weather).toMatchObject({
      currentPrecipitation: true,
      guestConfirmedRain: true,
      providerWeatherUnavailable: true,
    });

    // Go-now slots are filled, and rain-sensitive Big Thunder is not in them —
    // rain behaviour, not an empty result. The paired control below shows Big
    // Thunder in a go-now slot under the same outage without the answer.
    expect(goNowNames(pass.output).length).toBeGreaterThan(0);
    expect(goNowNames(pass.output)).not.toContain(BIG_THUNDER);
  });

  test("Plan shows the rain strategy and still no provider weather", async () => {
    await goToTab("Plan");
    const text = guestText();
    expect(text).toContain("WEATHER STRATEGY");
    expect(text).toContain("Light rain is falling at the park right now.");
    expect(text).toContain(WEATHER_UNAVAILABLE);
    expect(text).not.toMatch(/\d+°F|Storm Active|Storm Watch|Rain possible soon/);
  });

  test("chat gets the guest report, marked as such, and no provider data", async () => {
    const sessionData = await sentChat();
    expect(Object.keys(sessionData.weather).sort()).toEqual(GUEST_ONLY_KEYS);
    expect(sessionData.weather.providerWeatherUnavailable).toBe(true);
    expect(sessionData.weatherMode.mode).toBe("rain");
    expect(sessionData.dataFreshness.weather).toEqual({
      source: "",
      ageMs: null,
      fetchedAt: "",
      clientLastUpdatedAt: "",
      hasData: false,
    });
  });

  test("TOHI Pick still sees no usable provider weather", async () => {
    expect(debugValue("eligible")).toBe("no");
    expect(debugValue("reasons")).toContain("weather_data_unusable");
  });
});

describe("control: the same outage without a confirmation", () => {
  test("no rain behaviour, and Big Thunder takes a go-now slot", async () => {
    weatherResponse = WEATHER.outage;
    await renderApp();
    await chooseLand("frontierland");

    expect(debugValue("weatherMode.mode")).toBe("normal");
    expect(guestText()).not.toContain(NOTE);
    const pass = latestEnginePass();
    expect(pass.input.weather).toBeNull();
    expect(goNowNames(pass.output)).toContain(BIG_THUNDER);
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Reload with weather still pending                                       */
/* -------------------------------------------------------------------------- */

describe("reload while provider weather is still loading", () => {
  test.each([
    ["then fails", 502, OUTAGE_BODY],
    ["then succeeds", 200, RAIN_WATCH()],
  ])("the answer is not erased during startup, and the load %s", async (_label, status, body) => {
    await renderApp();
    await confirmRain();

    const pending = deferredWeather();
    weatherResponse = pending.handler;
    await reload();

    // Still loading: the answer and its rain behaviour are intact.
    expect(debugValue("weather.source")).toBe("—");
    expect(debugValue("weather.loadFailed")).toBe("false");
    expect(storedRecord()).toMatchObject({ response: "confirmed" });
    expect(debugValue("weatherMode.mode")).toBe("rain");

    await act(async () => {
      pending.settle(status, body);
    });
    await flush();

    expect(storedRecord()).toMatchObject({ response: "confirmed", episodeId: EPISODE_ID });
    expect(debugValue("weatherMode.mode")).toBe("rain");
    // Settled for this episode: never asked again.
    expect(promptShown()).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* 3. A failed refresh that retains real weather                              */
/* -------------------------------------------------------------------------- */

describe("a failed refresh that retains real provider weather", () => {
  test("keeps the existing behaviour: the forecast stays and the note says so", async () => {
    await renderApp();
    await confirmRain();

    weatherResponse = WEATHER.outage;
    await advance(AUTO_REFRESH_MS);

    expect(debugValue("weather.loadFailed")).toBe("true");
    expect(debugValue("weather.source")).toBe("live");
    expect(storedRecord()).toMatchObject({ response: "confirmed" });
    expect(debugValue("weatherMode.mode")).toBe("rain");
    expect(guestText()).toContain(NOTE_WITH_FORECAST);
    expect(guestText()).not.toContain(NOTE_WITHOUT_PROVIDER);
    expect(guestText()).not.toContain(WEATHER_UNAVAILABLE);
  });
});

/* -------------------------------------------------------------------------- */
/* 4. Expiry during an outage                                                 */
/* -------------------------------------------------------------------------- */

describe("expiry during an outage", () => {
  test("rain behaviour stops at the existing 90-minute effect expiry, and recovery does not revive it", async () => {
    await renderApp();
    await confirmRain();
    const { respondedAt, effectExpiresAt } = storedRecord();
    expect(effectExpiresAt).toBe(respondedAt + 90 * MINUTE);

    weatherResponse = WEATHER.outage;
    await reload();
    expect(debugValue("weatherMode.mode")).toBe("rain");

    // Shortly before expiry: still applying.
    await advance(87 * MINUTE);
    expect(Date.now()).toBeLessThan(effectExpiresAt);
    expect(debugValue("weatherMode.mode")).toBe("rain");

    // Past expiry: no longer applying, with no provider weather changing.
    await advance(3 * MINUTE);
    expect(Date.now()).toBeGreaterThanOrEqual(effectExpiresAt);
    expect(debugValue("weatherMode.mode")).toBe("normal");
    expect(guestText()).not.toContain(NOTE);

    // Recovery with the same watch: the settled answer is remembered, not revived.
    weatherResponse = WEATHER.ok(RAIN_WATCH);
    await advance(AUTO_REFRESH_MS);
    expect(debugValue("weather.source")).toBe("live");
    // The provider's own forecast-only Rain Watch — not the guest's active rain.
    expect(debugValue("weatherMode.label")).toBe("Rain Watch");
    expect(guestText()).not.toContain(NOTE);
    expect(promptShown()).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* 5. Scope                                                                   */
/* -------------------------------------------------------------------------- */

describe("scope during an outage", () => {
  test.each([
    ["another park", { parkId: "epcot", episodeId: "epcot|2026-06-27|rain|2026-06-27T22:00:00.000Z" }],
    [
      "another trip date",
      { tripDate: "2026-06-26", episodeId: "magic_kingdom|2026-06-26|rain|2026-06-26T22:00:00.000Z" },
    ],
  ])("a confirmation given for %s never applies, and is cleared", async (_label, overrides) => {
    storeRecord(RAIN_CONFIRMATION_RESPONSES.CONFIRMED, overrides);
    weatherResponse = WEATHER.outage;
    await renderApp();

    expect(debugValue("weatherMode.mode")).toBe("normal");
    expect(guestText()).not.toContain(NOTE);
    expect(storedRecord()).toBeNull();
  });

  test("a confirmation for this park and date applies from a cold start into an outage", async () => {
    storeRecord(RAIN_CONFIRMATION_RESPONSES.CONFIRMED);
    weatherResponse = WEATHER.outage;
    await renderApp();

    expect(debugValue("weatherMode.mode")).toBe("rain");
    expect(guestText()).toContain(NOTE_WITHOUT_PROVIDER);
  });
});

/* -------------------------------------------------------------------------- */
/* 6. "Not yet" and dismissals                                                */
/* -------------------------------------------------------------------------- */

describe("answers that are not rain, during an outage", () => {
  test.each([
    ["Not yet", RAIN_CONFIRMATION_RESPONSES.NOT_YET],
    ["a dismissal", RAIN_CONFIRMATION_RESPONSES.DISMISSED],
  ])("%s never becomes active rain", async (_label, response) => {
    storeRecord(response);
    weatherResponse = WEATHER.outage;
    await renderApp();
    await chooseLand("frontierland");

    expect(debugValue("weatherMode.mode")).toBe("normal");
    expect(guestText()).not.toContain(NOTE);
    expect(latestEnginePass().input.weather).toBeNull();
    // Kept, so a recovered episode is not asked about again early.
    expect(storedRecord()).toMatchObject({ response });
  });

  test("a Not yet answered through the prompt stays inert through a reload outage", async () => {
    await renderApp();
    await answerPrompt(NOT_YET_LABEL);
    expect(storedRecord()).toMatchObject({ response: "not_yet" });

    weatherResponse = WEATHER.outage;
    await reload();
    expect(debugValue("weatherMode.mode")).toBe("normal");
    expect(guestText()).not.toContain(NOTE);
    expect(storedRecord()).toMatchObject({ response: "not_yet" });
  });
});

/* -------------------------------------------------------------------------- */
/* 7 + 8. Recovery and existing reconciliation                                */
/* -------------------------------------------------------------------------- */

describe("provider recovery after an outage", () => {
  async function confirmedThenOutage() {
    await renderApp();
    await confirmRain();
    weatherResponse = WEATHER.outage;
    await reload();
    expect(debugValue("weatherMode.mode")).toBe("rain");
  }

  test("the same watch returns: the answer carries on over the forecast, with no duplicate prompt", async () => {
    await confirmedThenOutage();

    weatherResponse = WEATHER.ok(RAIN_WATCH);
    await advance(AUTO_REFRESH_MS);

    expect(debugValue("weather.source")).toBe("live");
    expect(storedRecord()).toMatchObject({ response: "confirmed", episodeId: EPISODE_ID });
    expect(debugValue("weatherMode.mode")).toBe("rain");
    expect(guestText()).toContain(NOTE_WITH_FORECAST);
    expect(guestText()).not.toContain(NOTE_WITHOUT_PROVIDER);
    expect(promptShown()).toBe(false);
  });

  test("the provider now reports clear skies: existing reconciliation ends the answer", async () => {
    await confirmedThenOutage();

    weatherResponse = WEATHER.ok(CLEAR);
    await advance(AUTO_REFRESH_MS);

    expect(debugValue("weather.source")).toBe("live");
    expect(storedRecord()).toBeNull();
    // The provider's own reading governs again: 88°F feels-like, not rain.
    expect(debugValue("weatherMode.mode")).not.toBe("rain");
    expect(guestText()).not.toContain(NOTE);
  });
});
