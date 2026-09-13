/**
 * Regression: sample wait times never stand in for real ones during an outage.
 *
 * The defect: when Queue-Times failed and the backend had nothing cached for the
 * park, /api/park-data answered 200 with a generated sample payload —
 * "Popular Headliner" 45 min, "Family Favorite" 25 min, "Quick Ride" 10 min,
 * source "mock". fetchParkData passed it through untouched, so the app treated
 * invented attractions and waits as the park's data: Waits listed them, a
 * failed refresh replaced real waits with them, and TOHI chat was told wait
 * data existed.
 *
 * The invariant pinned here: unavailable real wait data never becomes invented
 * wait data. With no usable real data the guest sees the existing unavailable
 * state; real data already on screen stays, honestly labelled; a genuine empty
 * response is still an empty response, not an outage or a closed park.
 *
 * These render the REAL App with the REAL fetchParkData / fetchWeather. Only the
 * network (global.fetch) is scripted, so the api.js boundary is exercised. Both
 * backend outage shapes are covered: the legacy 200 sample payload, and the
 * honest 502 the backend now returns.
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
import { WAITS_COPY, browsedErrorCopy } from "../utils/waitsViewState";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const AUTO_REFRESH_MS = 3 * 60 * 1000;
const START = "2026-05-08T17:00:00.000Z"; // 1:00 PM Orlando

const COPY = {
  WAITS_RETAINED:
    "We couldn’t refresh wait times right now. You’re seeing the last wait times we loaded. Please try again in a moment.",
  WAITS_NO_DATA: "We couldn’t load wait times right now. Please try again in a moment.",
  WEATHER_NO_DATA: "We couldn’t load the weather right now. Please try again in a moment.",
  BOTH_NO_DATA: "We couldn’t load park information right now. Please try again in a moment.",
};

const SAMPLE_NAMES = ["Popular Headliner", "Family Favorite", "Quick Ride"];

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

const MK_WAITS_RECOVERED = () => ({
  parkId: "magic_kingdom",
  parkName: "Magic Kingdom",
  source: "live",
  fetchedAt: "2026-05-08T17:04:30.000Z",
  ageMs: 30000,
  rides: [{ id: "mk-4", name: "Space Mountain", land: "Tomorrowland", waitTime: 45, isOpen: true }],
});

// The backend's own cache fallback: real data, older than its TTL.
const MK_WAITS_BACKEND_STALE = () => ({
  ...MK_WAITS(),
  source: "stale",
  fetchedAt: "2026-05-08T16:20:00.000Z",
  ageMs: 2400000,
});

const EPCOT_WAITS = () => ({
  parkId: "epcot",
  parkName: "EPCOT",
  source: "live",
  fetchedAt: "2026-05-08T17:06:00.000Z",
  ageMs: 15000,
  rides: [{ id: "ep-1", name: "Spaceship Earth", land: "World Celebration", waitTime: 10, isOpen: true }],
});

// Exactly what the backend's sample fallback produced on a cold-cache outage.
const SAMPLE_PAYLOAD = (parkId, parkName) => ({
  parkId,
  parkName,
  rides: [
    { id: "mock-1", name: "Popular Headliner", waitTime: 45, isOpen: true, land: "Main Area", outdoor: false },
    { id: "mock-2", name: "Family Favorite", waitTime: 25, isOpen: true, land: "Main Area", outdoor: true },
    { id: "mock-3", name: "Quick Ride", waitTime: 10, isOpen: true, land: "Main Area", outdoor: false },
  ],
  source: "mock",
  ageMs: 0,
  fetchedAt: "2026-05-08T17:00:00.000Z",
});

const WEATHER = (parkId, summary) => ({
  parkId,
  source: "live",
  fetchedAt: "2026-05-08T16:58:00.000Z",
  ageMs: 120000,
  summary,
  tempF: 81,
  feelsLikeF: 81,
  rainRisk: 0.1,
  stormMode: false,
  currentPrecipitation: false,
});

/* -------------------------------------------------------------------------- */
/* A scripted HTTP backend behind the real api.js                             */
/* -------------------------------------------------------------------------- */

const routes = { waits: {}, weather: {} };
const requests = [];

const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

const respond = {
  ok: (payload) => () => json(200, payload()),
  // Legacy backend: cold-cache outage answered 200 with sample rides.
  sample: (parkId, parkName) => () => json(200, SAMPLE_PAYLOAD(parkId, parkName)),
  // Current backend: cold-cache outage answered honestly.
  outage: () => () =>
    json(502, { error: "Could not fetch park data", detail: "Queue-Times 503" }),
  weatherOutage: () => () => json(504, { error: "Weather provider timeout" }),
};

function serve(kind, parkId, handler) {
  routes[kind][parkId] = handler;
}

function installNetwork() {
  global.fetch = jest.fn((url) => {
    const parsed = new URL(url);
    const parkId = parsed.searchParams.get("parkId");
    const kind = parsed.pathname === "/api/park-data" ? "waits" : parsed.pathname === "/api/weather" ? "weather" : null;
    requests.push({ kind, parkId, force: parsed.searchParams.get("force") === "true" });
    const handler = kind && routes[kind][parkId];
    if (!handler) return Promise.reject(new Error(`test network has no route for ${url}`));
    return Promise.resolve(handler());
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

function expectNoSampleContent(text) {
  for (const name of SAMPLE_NAMES) expect(text).not.toContain(name);
  expect(text).not.toMatch(/mock-\d/);
  expect(text).not.toMatch(/Estimates \(live data unavailable\)|Showing best estimates/);
  // Raw request errors, including the sample-payload rejection, stay off screen.
  expect(text).not.toMatch(/API \/api\/|sample park data|-> 502/);
}

/** Every guest-facing screen that reads park data, checked for sample content. */
async function expectNoSampleContentAnywhere() {
  for (const tab of ["Home", "Waits", "Plan"]) {
    await goToTab(tab);
    expectNoSampleContent(container.textContent);
  }
}

/** Ask TOHI something and return the session data actually sent. */
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

function expectNoSampleInAiContext(sessionData) {
  const serialized = JSON.stringify(sessionData);
  for (const name of SAMPLE_NAMES) expect(serialized).not.toContain(name);
  expect(serialized).not.toMatch(/mock-\d/);
  expect(serialized).not.toContain('"mock"');
}

const NO_WAITS_FRESHNESS = {
  source: "",
  ageMs: null,
  fetchedAt: "",
  clientLastUpdatedAt: "",
  hasData: false,
};

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(PROFILE));
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(START));

  routes.waits = {};
  routes.weather = {};
  requests.length = 0;
  serve("waits", "magic_kingdom", respond.ok(MK_WAITS));
  serve("weather", "magic_kingdom", respond.ok(() => WEATHER("magic_kingdom", "Partly cloudy")));
  serve("waits", "epcot", respond.ok(EPCOT_WAITS));
  serve("weather", "epcot", respond.ok(() => WEATHER("epcot", "Breezy by the lagoon")));
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

const OUTAGE_SHAPES = [
  ["the legacy 200 sample payload", (parkId, parkName) => respond.sample(parkId, parkName)],
  ["an honest 502", () => respond.outage()],
];

/* -------------------------------------------------------------------------- */
/* 1 + 6 + 8. Cold-cache outage on the active park                            */
/* -------------------------------------------------------------------------- */

describe.each(OUTAGE_SHAPES)("cold-cache waits outage answered with %s", (_label, outage) => {
  beforeEach(async () => {
    serve("waits", "magic_kingdom", outage("magic_kingdom", "Magic Kingdom"));
    await renderApp();
  });

  test("no invented attractions or waits appear, and the unavailable state shows", async () => {
    expect(guestText()).toContain(COPY.WAITS_NO_DATA);
    expect(guestText()).not.toContain(COPY.BOTH_NO_DATA);

    await goToTab("Waits");
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_ERROR_TITLE);
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_ERROR_BODY);
    // Unavailable is not empty, and not closed.
    expect(guestText()).not.toContain(WAITS_COPY.EMPTY_TITLE);
    expect(guestText()).not.toMatch(/\bclosed\b/i);

    await expectNoSampleContentAnywhere();
  });

  test("weather still loads and shows while waits are unavailable", async () => {
    await goToTab("Home");
    expect(guestText()).toContain("Partly cloudy");
    expect(guestText()).not.toContain(COPY.WEATHER_NO_DATA);
  });

  test("TOHI chat is told there is no wait data, and receives no sample rides", async () => {
    const sessionData = await sentSessionData();
    expect(sessionData.dataFreshness.waits).toEqual(NO_WAITS_FRESHNESS);
    expect(sessionData.dataFreshness.weather.hasData).toBe(true);
    expectNoSampleInAiContext(sessionData);
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Outage over real data already on screen                                 */
/* -------------------------------------------------------------------------- */

describe.each(OUTAGE_SHAPES)("waits outage over loaded real data, answered with %s", (_label, outage) => {
  test("the real waits stay, labelled as not refreshed, with their own provenance", async () => {
    await renderApp();
    serve("waits", "magic_kingdom", outage("magic_kingdom", "Magic Kingdom"));
    await tapRefresh();

    expect(guestText()).toContain(COPY.WAITS_RETAINED);

    await goToTab("Waits");
    expect(guestText()).toContain("Big Thunder Mountain Railroad");
    expect(guestText()).toContain("Haunted Mansion");
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);

    await expectNoSampleContentAnywhere();

    const sessionData = await sentSessionData();
    expect(sessionData.dataFreshness.waits).toMatchObject({
      source: "live",
      ageMs: 60000,
      fetchedAt: "2026-05-08T16:59:00.000Z",
      hasData: true,
    });
    expectNoSampleInAiContext(sessionData);
  });
});

describe("backend-retained real data", () => {
  test("a stale real response from the backend cache is shown as older data, not live", async () => {
    serve("waits", "magic_kingdom", respond.ok(MK_WAITS_BACKEND_STALE));
    await renderApp();

    await goToTab("Waits");
    expect(guestText()).toContain("Big Thunder Mountain Railroad");
    expect(guestText()).toContain(WAITS_COPY.STALE_BANNER);

    const sessionData = await sentSessionData();
    expect(sessionData.dataFreshness.waits).toMatchObject({
      source: "stale",
      ageMs: 2400000,
      fetchedAt: "2026-05-08T16:20:00.000Z",
      hasData: true,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Recovery                                                                */
/* -------------------------------------------------------------------------- */

describe.each(OUTAGE_SHAPES)("recovery after an outage answered with %s", (_label, outage) => {
  test("real waits replace the unavailable state", async () => {
    serve("waits", "magic_kingdom", outage("magic_kingdom", "Magic Kingdom"));
    await renderApp();
    await goToTab("Waits");
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_ERROR_BODY);

    serve("waits", "magic_kingdom", respond.ok(MK_WAITS_RECOVERED));
    await autoRefresh();

    expect(guestText()).toContain("Space Mountain");
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_ERROR_BODY);
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
    await expectNoSampleContentAnywhere();

    await goToTab("Home");
    expect(guestText()).not.toContain(COPY.WAITS_NO_DATA);

    const sessionData = await sentSessionData();
    expect(sessionData.dataFreshness.waits).toMatchObject({
      source: "live",
      fetchedAt: "2026-05-08T17:04:30.000Z",
      hasData: true,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 4. A genuine empty response                                                */
/* -------------------------------------------------------------------------- */

describe("a successful empty response", () => {
  test("is shown as empty — not as an outage, and not as a closed park", async () => {
    serve(
      "waits",
      "magic_kingdom",
      respond.ok(() => ({ ...MK_WAITS(), rides: [] }))
    );
    await renderApp();

    expect(guestText()).not.toContain(COPY.WAITS_NO_DATA);
    expect(guestText()).not.toContain(COPY.WAITS_RETAINED);

    await goToTab("Waits");
    expect(guestText()).toContain(WAITS_COPY.EMPTY_TITLE);
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_ERROR_TITLE);
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_ERROR_BODY);
    expect(guestText()).not.toMatch(/\bclosed\b/i);

    const sessionData = await sentSessionData();
    expect(sessionData.dataFreshness.waits).toMatchObject({
      source: "live",
      fetchedAt: "2026-05-08T16:59:00.000Z",
      hasData: false,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 5. Browsed-park outage                                                     */
/* -------------------------------------------------------------------------- */

describe.each(OUTAGE_SHAPES)("browsed-park outage answered with %s", (_label, outage) => {
  test("the browsed park shows its unavailable line, not sample rides or the active park's rides", async () => {
    serve("waits", "epcot", outage("epcot", "EPCOT"));
    await renderApp();

    const card = Array.from(container.querySelectorAll("button[aria-pressed]")).find((node) =>
      (node.textContent || "").includes("EPCOT")
    );
    await click(card);

    expect(requests.some((r) => r.kind === "waits" && r.parkId === "epcot")).toBe(true);
    expect(guestText()).toContain(browsedErrorCopy("EPCOT"));
    expect(guestText()).not.toContain("Big Thunder Mountain Railroad");
    expect(guestText()).not.toContain(WAITS_COPY.EMPTY_TITLE);
    expectNoSampleContent(container.textContent);

    // Refreshing the browsed park during the outage stays honest too.
    await tapRefresh();
    expect(guestText()).toContain(browsedErrorCopy("EPCOT"));
    expectNoSampleContent(container.textContent);
  });
});

/* -------------------------------------------------------------------------- */
/* 7. Weather fails, waits succeed                                            */
/* -------------------------------------------------------------------------- */

describe("weather outage while waits succeed", () => {
  test("real waits still load and refresh", async () => {
    serve("weather", "magic_kingdom", respond.weatherOutage());
    await renderApp();

    expect(guestText()).toContain(COPY.WEATHER_NO_DATA);
    expect(guestText()).not.toContain(COPY.WAITS_NO_DATA);

    await goToTab("Waits");
    expect(guestText()).toContain("Big Thunder Mountain Railroad");

    serve("waits", "magic_kingdom", respond.ok(MK_WAITS_RECOVERED));
    await tapRefresh();
    expect(guestText()).toContain("Space Mountain");
    expect(guestText()).not.toContain(WAITS_COPY.ACTIVE_REFRESH_ERROR);
  });
});

/* -------------------------------------------------------------------------- */
/* 9. Park switching                                                          */
/* -------------------------------------------------------------------------- */

describe.each(OUTAGE_SHAPES)("switching parks into an outage answered with %s", (_label, outage) => {
  test("the new park never reuses the previous park's waits or sample values", async () => {
    window.localStorage.setItem("parkplan.debugSnapshot", "true");
    serve("waits", "epcot", outage("epcot", "EPCOT"));
    await renderApp();

    await goToTab("Waits");
    expect(guestText()).toContain("Big Thunder Mountain Railroad");

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
    expect(guestText()).toContain("Breezy by the lagoon");
    expect(guestText()).toContain(COPY.WAITS_NO_DATA);
    expect(guestText()).not.toContain(COPY.WAITS_RETAINED);

    await goToTab("Waits");
    expect(guestText()).toContain(WAITS_COPY.ACTIVE_ERROR_BODY);
    expect(guestText()).not.toMatch(/Big Thunder Mountain Railroad|Haunted Mansion/);
    await expectNoSampleContentAnywhere();

    const sessionData = await sentSessionData();
    expect(sessionData.activePark).toBe("epcot");
    expect(sessionData.dataFreshness.waits).toEqual(NO_WAITS_FRESHNESS);
    expect(JSON.stringify(sessionData)).not.toMatch(/"mk-\d"/);
    expectNoSampleInAiContext(sessionData);
  });
});
