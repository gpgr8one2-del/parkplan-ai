/**
 * Regression: TOHI Pick's AI review is never told unknown weather is normal.
 *
 * The defect: sanitizeTohiPickReviewRequest turned a missing weather mode into
 * "normal", and the request carried no weather availability, so the review
 * model could be told "weatherMode: normal" with no reading behind it — and an
 * unknown-weather verdict could be reused for known normal weather.
 *
 * These render the REAL App with the REAL fetchParkData, fetchWeather and
 * sendTohiPickReview. Only the network (global.fetch) is scripted, and the
 * assertions read the JSON body actually posted to /api/tohi-pick-review. The
 * backend side of the same contract — what the review model receives — is
 * covered by frontend/scripts/tohiPickReviewWeatherHarness.cjs.
 *
 * In the real App, a weather outage makes TOHI Pick ineligible
 * (weather_data_unusable), so no review is requested at all. That gate is
 * pinned here too: it is why production never sent a review without weather,
 * and it must not quietly stop holding.
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../api", () => ({
  ...jest.requireActual("../api"),
  sendChatMessage: jest.fn(() => Promise.resolve({ reply: "Here to help." })),
  trackEvent: jest.fn(),
}));

// eslint-disable-next-line import/first
import App from "../App";

/* -------------------------------------------------------------------------- */
/* Fixtures — 1:00 PM Orlando on the trip's first day, Magic Kingdom open      */
/* -------------------------------------------------------------------------- */

const START = "2026-06-27T13:00:00-04:00";
const AUTO_REFRESH_MS = 3 * 60 * 1000;
const REVIEW_DEBOUNCE_MS = 600;

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
    offPropertyHotelName: "Nearby hotel",
    transportationMode: "car",
  },
};

const WAITS = () => ({
  parkId: "magic_kingdom",
  parkName: "Magic Kingdom",
  source: "live",
  fetchedAt: "2026-06-27T16:59:00.000Z",
  ageMs: 60000,
  rides: [
    { id: "mk-buzz", name: "Buzz Lightyear's Space Ranger Spin", land: "Tomorrowland", waitTime: 10, isOpen: true },
    { id: "mk-pm", name: "Tomorrowland Transit Authority PeopleMover", land: "Tomorrowland", waitTime: 5, isOpen: true },
    { id: "mk-cop", name: "Walt Disney's Carousel of Progress", land: "Tomorrowland", waitTime: 5, isOpen: true },
    { id: "mk-space", name: "Space Mountain", land: "Tomorrowland", waitTime: 60, isOpen: true },
    { id: "mk-hm", name: "Haunted Mansion", land: "Liberty Square", waitTime: 35, isOpen: true },
  ],
});

const CLEAR_WEATHER = () => ({
  parkId: "magic_kingdom",
  source: "live",
  fetchedAt: "2026-06-27T16:58:00.000Z",
  ageMs: 120000,
  summary: "Partly cloudy",
  rawSummary: "scattered clouds",
  tempF: 84,
  feelsLikeF: 86,
  humidity: 60,
  rainRisk: 0.1,
  stormMode: false,
  currentPrecipitation: false,
});

/* -------------------------------------------------------------------------- */
/* Scripted network behind the real api.js                                    */
/* -------------------------------------------------------------------------- */

let weatherResponse;
let reviewBodies;

const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

const WEATHER = {
  ok: (payload) => () => json(200, payload()),
  outage: () => json(502, { error: "Could not fetch weather", detail: "OpenWeather 503" }),
};

function installNetwork() {
  global.fetch = jest.fn((url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/api/park-data") return Promise.resolve(json(200, WAITS()));
    if (parsed.pathname === "/api/weather") return Promise.resolve(weatherResponse());
    if (parsed.pathname === "/api/tohi-pick-review") {
      const body = JSON.parse(options.body);
      reviewBodies.push(body);
      return Promise.resolve(
        json(200, {
          reviewText: JSON.stringify({
            verdict: "approve",
            candidateId: body.topCandidate?.rideId,
            reasonCode: "strong_fit",
            reason: "Short nearby wait.",
          }),
        })
      );
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

async function chooseLand(value) {
  const select = container.querySelector("#current-land");
  expect(select).toBeTruthy();
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
    setter.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flush();
}

async function autoRefresh() {
  await act(async () => {
    jest.advanceTimersByTime(AUTO_REFRESH_MS);
  });
  await flush();
}

function debugValue(label) {
  const labels = Array.from(container.querySelectorAll("details span")).filter(
    (node) => node.textContent === label
  );
  expect(labels).toHaveLength(1);
  return labels[0].nextElementSibling.textContent;
}

/** Plan tab, manual Tomorrowland, review debounce elapsed. */
async function openPlanInTomorrowland() {
  await goToTab("Plan");
  await chooseLand("tomorrowland");
  await act(async () => {
    jest.advanceTimersByTime(REVIEW_DEBOUNCE_MS + 50);
  });
  await flush();
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(PROFILE));
  window.localStorage.setItem("parkplan.debugSnapshot", "true");
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(START));

  reviewBodies = [];
  weatherResponse = WEATHER.ok(CLEAR_WEATHER);
  installNetwork();
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
  weatherCode: 8000,
});

// The backend's own cache fallback: a real reading older than its TTL.
const STALE_CLEAR_WEATHER = () => ({
  ...CLEAR_WEATHER(),
  source: "stale",
  fetchedAt: "2026-06-27T16:30:00.000Z",
  ageMs: 1800000,
});

const lastReview = () => reviewBodies[reviewBodies.length - 1];

/* -------------------------------------------------------------------------- */

describe("TOHI Pick review request weather context", () => {
  test("real normal weather: the posted review carries its mode, availability and source", async () => {
    await renderApp();
    await openPlanInTomorrowland();

    expect(debugValue("eligible")).toBe("yes");
    expect(reviewBodies.length).toBeGreaterThan(0);

    const { context, topCandidate } = lastReview();
    expect(topCandidate.rideId).toBeTruthy();
    expect(context.weatherMode).toBe("normal");
    expect(context.weatherAvailable).toBe(true);
    expect(context.weatherSource).toBe("live");
  });

  test.each([
    ["rain", RAIN_WEATHER],
    ["storm", STORM_WEATHER],
  ])("real %s weather: the posted review carries that mode", async (mode, payload) => {
    weatherResponse = WEATHER.ok(payload);
    await renderApp();
    await openPlanInTomorrowland();

    expect(debugValue("eligible")).toBe("yes");
    expect(reviewBodies.length).toBeGreaterThan(0);
    expect(lastReview().context).toMatchObject({
      weatherMode: mode,
      weatherAvailable: true,
      weatherSource: "live",
    });
  });

  test("stale real weather from the backend: stale provenance is posted with the real mode", async () => {
    weatherResponse = WEATHER.ok(STALE_CLEAR_WEATHER);
    await renderApp();
    await openPlanInTomorrowland();

    expect(reviewBodies.length).toBeGreaterThan(0);
    expect(lastReview().context).toMatchObject({
      weatherMode: "normal",
      weatherAvailable: true,
      weatherSource: "stale",
    });
  });

  test("weather outage: TOHI Pick is ineligible and no review is requested", async () => {
    weatherResponse = WEATHER.outage;
    await renderApp();
    await openPlanInTomorrowland();

    expect(debugValue("eligible")).toBe("no");
    expect(debugValue("reasons")).toContain("weather_data_unusable");
    expect(debugValue("reasons")).not.toContain("wait_data_unusable");
    expect(debugValue("reasons")).not.toContain("location_unclear");
    expect(reviewBodies).toHaveLength(0);
  });

  test("recovery: after an outage, the first review carries the recovered weather", async () => {
    weatherResponse = WEATHER.outage;
    await renderApp();
    await openPlanInTomorrowland();
    expect(reviewBodies).toHaveLength(0);

    weatherResponse = WEATHER.ok(RAIN_WEATHER);
    await autoRefresh();
    await act(async () => {
      jest.advanceTimersByTime(REVIEW_DEBOUNCE_MS + 50);
    });
    await flush();

    expect(debugValue("eligible")).toBe("yes");
    expect(reviewBodies.length).toBeGreaterThan(0);
    expect(reviewBodies[0].context).toMatchObject({
      weatherMode: "rain",
      weatherAvailable: true,
      weatherSource: "live",
    });
  });

  test("stale and current weather never reuse each other's review, but a routine refresh does", async () => {
    await renderApp();
    await openPlanInTomorrowland();
    expect(reviewBodies.length).toBeGreaterThan(0);
    const afterLive = reviewBodies.length;
    expect(lastReview().context.weatherSource).toBe("live");

    // Same reading served from the backend cache: an equivalent review, reused.
    weatherResponse = WEATHER.ok(() => ({ ...CLEAR_WEATHER(), source: "cached", ageMs: 30000 }));
    await autoRefresh();
    await act(async () => {
      jest.advanceTimersByTime(REVIEW_DEBOUNCE_MS + 50);
    });
    await flush();
    expect(reviewBodies).toHaveLength(afterLive);

    // The same conditions, now stale: a different review situation, so a new request.
    weatherResponse = WEATHER.ok(STALE_CLEAR_WEATHER);
    await autoRefresh();
    await act(async () => {
      jest.advanceTimersByTime(REVIEW_DEBOUNCE_MS + 50);
    });
    await flush();
    expect(reviewBodies).toHaveLength(afterLive + 1);
    expect(lastReview().context).toMatchObject({ weatherMode: "normal", weatherSource: "stale" });
  });

  test("a failed weather refresh keeps the retained reading's review, without re-requesting", async () => {
    await renderApp();
    await openPlanInTomorrowland();
    const afterLive = reviewBodies.length;
    expect(afterLive).toBeGreaterThan(0);

    weatherResponse = WEATHER.outage;
    await autoRefresh();
    await act(async () => {
      jest.advanceTimersByTime(REVIEW_DEBOUNCE_MS + 50);
    });
    await flush();

    // The retained reading is still real weather with its original provenance.
    expect(debugValue("weather.loadFailed")).toBe("true");
    expect(debugValue("weather.source")).toBe("live");
    expect(debugValue("eligible")).toBe("yes");
    expect(reviewBodies).toHaveLength(afterLive);
    expect(debugValue("aiReviewStatus")).toBe("pick_confirmed_ai");
  });
});
