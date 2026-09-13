/**
 * Regression: missing weather never reaches TOHI chat as good conditions.
 *
 * The defect: with no weather reading, App still computed
 * getWeatherMode(null) — { mode: "normal", label: "Good Conditions",
 * message: "Weather looks manageable right now." } — and sent it with every
 * chat request. The backend rendered it as "Weather mode: Good Conditions
 * (normal)" and "Weather advice: Weather looks manageable right now.", so an
 * outage read to the model as favorable weather, even right after a guest said
 * it was raining.
 *
 * The invariant pinned here: with no weather reading the chat request carries
 * no weather and no weather mode. Real weather — live, stale or recovered —
 * still carries its reading, its mode and its own freshness.
 *
 * These render the REAL App with the REAL fetchParkData, fetchWeather and
 * sendChatMessage. Only the network (global.fetch) and voice transcription are
 * scripted, and assertions read the JSON body actually posted to /api/ai-chat.
 * The backend side of the same contract — the model-facing text — is covered by
 * backend/scripts/weatherChatContextHarness.cjs.
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../api", () => ({
  ...jest.requireActual("../api"),
  sendTohiPickReview: jest.fn(() => Promise.resolve(null)),
  trackEvent: jest.fn(),
  transcribeVoiceRecording: jest.fn(),
}));

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { transcribeVoiceRecording } from "../api";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const AUTO_REFRESH_MS = 3 * 60 * 1000;
const START = "2026-05-08T17:00:00.000Z"; // 1:00 PM Orlando

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
    parkSelectionIds: ["magic_kingdom"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "magic_kingdom",
  },
  resortContext: {
    stayingOnProperty: "no",
    resortId: "",
    resortName: "",
    offPropertyHotelName: "Nearby hotel",
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

const CLEAR_WEATHER = () => ({
  parkId: "magic_kingdom",
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

const RECOVERED_WEATHER = () => ({
  ...CLEAR_WEATHER(),
  fetchedAt: "2026-05-08T17:04:00.000Z",
  ageMs: 60000,
  summary: "Sunny and humid",
  rawSummary: "clear sky",
  tempF: 84,
  feelsLikeF: 84,
});

const RAIN_WEATHER = () => ({
  ...CLEAR_WEATHER(),
  summary: "Light rain",
  rawSummary: "light rain",
  rainRisk: 0.7,
  currentPrecipitation: true,
  precipitationLastHourIn: 0.05,
});

const STORM_WEATHER = () => ({
  ...CLEAR_WEATHER(),
  summary: "Thunderstorm",
  rawSummary: "thunderstorm",
  rainRisk: 0.8,
  stormMode: true,
  currentPrecipitation: true,
  precipitationLastHourIn: 0.3,
});

// What the legacy backend's buildMockWeather fallback returned.
const LEGACY_SYNTHETIC_WEATHER = () => ({
  parkId: "magic_kingdom",
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

const WEATHER = {
  ok: (payload) => () => json(200, payload()),
  outage: () => json(502, { error: "Could not fetch weather", detail: "OpenWeather 503" }),
  legacySynthetic: () => json(200, LEGACY_SYNTHETIC_WEATHER()),
};

function installNetwork() {
  global.fetch = jest.fn((url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/api/park-data") return Promise.resolve(json(200, MK_WAITS()));
    if (parsed.pathname === "/api/weather") return Promise.resolve(weatherResponse());
    if (parsed.pathname === "/api/ai-chat") {
      chatBodies.push(JSON.parse(options.body));
      return Promise.resolve(json(200, { reply: "Here is a calm next move." }));
    }
    return Promise.reject(new Error(`test network has no route for ${url}`));
  });
}

/* -------------------------------------------------------------------------- */
/* Fake microphone, for voice-originated turns                                */
/* -------------------------------------------------------------------------- */

let recorders;

class FakeMediaRecorder {
  static isTypeSupported(type) {
    return type === "audio/webm" || type === "audio/webm;codecs=opus";
  }

  constructor(stream, options = {}) {
    this.stream = stream;
    this.state = "inactive";
    this.mimeType = options.mimeType || "";
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;
    recorders.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
  }
}

function makeStream() {
  const tracks = [{ kind: "audio", stop() {} }];
  return { getTracks: () => tracks };
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
  await goToTab("Home");
  const button = Array.from(container.querySelectorAll("button")).find((node) =>
    /^(Refresh|Loading)$/.test((node.textContent || "").trim())
  );
  expect(button).toBeTruthy();
  await click(button);
}

async function autoRefresh() {
  await act(async () => {
    jest.advanceTimersByTime(AUTO_REFRESH_MS);
  });
  await flush();
}

/** Types a question on the TOHI tab and returns the /api/ai-chat body posted. */
async function askTyped(text) {
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
  return chatBodies[chatBodies.length - 1];
}

/** Speaks a question on the TOHI tab and returns the /api/ai-chat body posted. */
async function askByVoice(transcript) {
  await goToTab("TOHI");
  transcribeVoiceRecording.mockImplementation(async () => ({ transcript }));

  const mic = container.querySelector('[data-tohi-voice="true"]');
  expect(mic).toBeTruthy();
  const before = chatBodies.length;

  await click(mic);
  const recorder = recorders[recorders.length - 1];
  expect(recorder).toBeTruthy();
  await act(async () => {
    recorder.ondataavailable({ data: new Blob([new Uint8Array(4096)]) });
  });
  await click(mic); // Stop
  await act(async () => {
    recorder.onstop();
  });
  await flush();

  expect(transcribeVoiceRecording).toHaveBeenCalled();
  expect(chatBodies.length).toBe(before + 1);
  const body = chatBodies[chatBodies.length - 1];
  expect(body.message).toBe(transcript);
  return body;
}

const FAVORABLE_CLAIMS = /Good Conditions|manageable/i;

/** The request carries no weather, no mode, and no favorable condition anywhere. */
function expectTruthfulMissingWeather(body) {
  const { sessionData } = body;
  expect(sessionData.weather ?? null).toBeNull();
  expect(sessionData.weatherMode ?? null).toBeNull();
  expect(sessionData.dataFreshness.weather).toEqual({
    source: "",
    ageMs: null,
    fetchedAt: "",
    clientLastUpdatedAt: "",
    hasData: false,
  });
  expect(JSON.stringify(body)).not.toMatch(FAVORABLE_CLAIMS);
  expect(JSON.stringify(body)).not.toContain("Weather unavailable");
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(PROFILE));
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(START));

  chatBodies = [];
  weatherResponse = WEATHER.ok(CLEAR_WEATHER);
  installNetwork();

  recorders = [];
  window.MediaRecorder = FakeMediaRecorder;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: jest.fn(async () => makeStream()) },
  });
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

const QUESTION = "is the wait for haunted mansion worth it";

/* -------------------------------------------------------------------------- */
/* 1 + 2. Weather unavailable                                                 */
/* -------------------------------------------------------------------------- */

describe.each([
  ["an initial weather failure", WEATHER.outage],
  ["a rejected legacy synthetic weather response", WEATHER.legacySynthetic],
])("chat context after %s", (_label, response) => {
  test("says nothing about conditions: no weather, no mode, no Good Conditions", async () => {
    weatherResponse = response;
    await renderApp();

    const body = await askTyped(QUESTION);
    expect(body.message).toBe(QUESTION);
    expectTruthfulMissingWeather(body);
    // Waits are unaffected.
    expect(body.sessionData.dataFreshness.waits.hasData).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* 4 + 5. Real weather keeps its mode                                         */
/* -------------------------------------------------------------------------- */

describe("chat context with real weather", () => {
  test("normal real weather keeps its reading and its Good Conditions mode", async () => {
    await renderApp();

    const { sessionData } = await askTyped(QUESTION);
    expect(sessionData.weather).toMatchObject({ tempF: 81, summary: "Partly cloudy", source: "live" });
    expect(sessionData.weatherMode).toMatchObject({
      mode: "normal",
      label: "Good Conditions",
      message: "Weather looks manageable right now.",
    });
    expect(sessionData.dataFreshness.weather).toMatchObject({
      source: "live",
      fetchedAt: "2026-05-08T16:58:00.000Z",
      hasData: true,
    });
  });

  test("real rain weather keeps its rain mode", async () => {
    weatherResponse = WEATHER.ok(RAIN_WEATHER);
    await renderApp();

    const { sessionData } = await askTyped(QUESTION);
    expect(sessionData.weather).toMatchObject({ currentPrecipitation: true, rainRisk: 0.7 });
    expect(sessionData.weatherMode.mode).toBe("rain");
    expect(JSON.stringify(sessionData.weatherMode)).not.toMatch(FAVORABLE_CLAIMS);
  });

  test("real storm weather keeps its storm mode", async () => {
    weatherResponse = WEATHER.ok(STORM_WEATHER);
    await renderApp();

    const { sessionData } = await askTyped(QUESTION);
    expect(sessionData.weather).toMatchObject({ stormMode: true });
    expect(sessionData.weatherMode.mode).toBe("storm");
  });
});

/* -------------------------------------------------------------------------- */
/* 6. Retained stale real weather                                             */
/* -------------------------------------------------------------------------- */

describe.each([
  ["a failed refresh", WEATHER.outage],
  ["a rejected legacy synthetic refresh", WEATHER.legacySynthetic],
])("chat context with real weather retained after %s", (_label, response) => {
  test("keeps the original reading, its mode, and its original freshness", async () => {
    await renderApp();
    await autoRefresh();
    const before = await askTyped(QUESTION);
    const retainedStamp = before.sessionData.dataFreshness.weather.clientLastUpdatedAt;
    expect(retainedStamp).not.toBe("");

    weatherResponse = response;
    await autoRefresh();

    const { sessionData } = await askTyped(QUESTION);
    expect(sessionData.weather).toMatchObject({
      tempF: 81,
      summary: "Partly cloudy",
      source: "live",
      fetchedAt: "2026-05-08T16:58:00.000Z",
    });
    expect(sessionData.weatherMode).toMatchObject({ mode: "normal", label: "Good Conditions" });
    expect(sessionData.dataFreshness.weather).toEqual({
      source: "live",
      ageMs: 120000,
      fetchedAt: "2026-05-08T16:58:00.000Z",
      clientLastUpdatedAt: retainedStamp,
      hasData: true,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 7. Recovery                                                                */
/* -------------------------------------------------------------------------- */

describe("chat context on recovery", () => {
  test("real weather and its mode return once weather loads", async () => {
    weatherResponse = WEATHER.outage;
    await renderApp();
    expectTruthfulMissingWeather(await askTyped(QUESTION));

    weatherResponse = WEATHER.ok(RECOVERED_WEATHER);
    await tapRefresh();

    const { sessionData } = await askTyped(QUESTION);
    expect(sessionData.weather).toMatchObject({ tempF: 84, summary: "Sunny and humid" });
    expect(sessionData.weatherMode).toMatchObject({ mode: "normal", label: "Good Conditions" });
    expect(sessionData.dataFreshness.weather).toMatchObject({
      source: "live",
      fetchedAt: "2026-05-08T17:04:00.000Z",
      hasData: true,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 8. A guest report of rain while weather is unavailable                     */
/* -------------------------------------------------------------------------- */

describe("a guest says it is raining while weather is unavailable", () => {
  test("the guest's words are sent intact, with no clear-weather context against them", async () => {
    weatherResponse = WEATHER.outage;
    await renderApp();

    const said = "It's raining hard, is the wait for haunted mansion worth it";
    const body = await askTyped(said);
    expect(body.message).toBe(said);
    expectTruthfulMissingWeather(body);
    expect(body.sessionData.weather?.stormMode).toBeUndefined();
    expect(body.sessionData.weather?.currentPrecipitation).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/* 9. Typed and voice turns                                                   */
/* -------------------------------------------------------------------------- */

describe("typed and voice-originated chat use the same weather context", () => {
  function weatherContext(body) {
    const { weather = null, weatherMode = null, dataFreshness } = body.sessionData;
    return { weather, weatherMode, freshness: dataFreshness.weather };
  }

  test("while weather is unavailable", async () => {
    weatherResponse = WEATHER.outage;
    await renderApp();

    const typed = await askTyped(QUESTION);
    const spoken = await askByVoice("is the wait for big thunder worth it");

    expectTruthfulMissingWeather(typed);
    expectTruthfulMissingWeather(spoken);
    expect(weatherContext(spoken)).toEqual(weatherContext(typed));
  });

  test("while real weather is available", async () => {
    await renderApp();

    const typed = await askTyped(QUESTION);
    const spoken = await askByVoice("is the wait for big thunder worth it");

    expect(typed.sessionData.weatherMode).toMatchObject({ mode: "normal", label: "Good Conditions" });
    expect(weatherContext(spoken)).toEqual(weatherContext(typed));
  });
});
