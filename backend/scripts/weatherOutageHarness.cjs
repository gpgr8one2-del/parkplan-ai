#!/usr/bin/env node

/**
 * TOHI — weather outage harness.
 *
 * The defect: when the weather provider failed and nothing real was cached for
 * the park, getWeather filled the gap with buildMockWeather — a payload that
 * asserts no storm, no current precipitation and zero rainfall — and
 * /api/weather returned it as a normal 200 with source "mock". With no provider
 * API key the same synthetic payload came back from the provider fetch itself,
 * so it was cached and served as source "live".
 *
 * The invariant pinned here: missing real weather never becomes synthetic
 * weather. With no usable real weather the route fails honestly; real cached
 * weather may still be served, labelled stale with its original fetch time and
 * its own park.
 *
 * WHAT THIS EXECUTES: the real routes/weather.js handler,
 * services/weatherService.js, fetchWithResiliency.js, cache.js and
 * circuitBreaker.js. Only the transport (node-fetch), express's Router shell and
 * pino are stubbed through a require hook, so backend node_modules need not be
 * installed and no network call is made. Provider keys are placeholder strings,
 * never real credentials, and request URLs are never printed. Date.now is
 * controlled so cache age is deterministic.
 *
 * Usage:
 *   node scripts/weatherOutageHarness.cjs [sourceRoot]
 *
 * `sourceRoot` defaults to the backend directory containing this script. Pass a
 * baseline tree to show the outage assertions fail there.
 */

const path = require("path");
const Module = require("module");

const sourceRoot = path.resolve(process.argv[2] || path.join(__dirname, ".."));

let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  const passed = ok === true;
  console.log(`  ${passed ? "PASS" : "FAIL"} ${name}${passed || !detail ? "" : ` — ${detail}`}`);
  passed ? pass++ : fail++;
}

/* -------------------------------------------------------------------------- */
/* Controlled clock, environment and provider                                 */
/* -------------------------------------------------------------------------- */

const START_MS = Date.parse("2026-05-08T17:00:00.000Z");
let clockMs = START_MS;
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [clockMs]));
  }
  static now() {
    return clockMs;
  }
};

const advance = (ms) => {
  clockMs += ms;
};

const PLACEHOLDER_KEYS = {
  OPENWEATHER_API_KEY: "harness-placeholder-openweather",
  TOMORROW_API_KEY: "harness-placeholder-tomorrow",
};
const ENV_NAMES = ["WEATHER_PROVIDER", "OPENWEATHER_API_KEY", "TOMORROW_API_KEY"];
const savedEnv = Object.fromEntries(ENV_NAMES.map((name) => [name, process.env[name]]));

function setEnv({ provider = "openweather", keys = true } = {}) {
  process.env.WEATHER_PROVIDER = provider;
  for (const name of Object.keys(PLACEHOLDER_KEYS)) {
    if (keys) process.env[name] = PLACEHOLDER_KEYS[name];
    else delete process.env[name];
  }
}

// Coordinates identify the park a provider request is for.
const LAT_TO_PARK = { "28.4177": "magic_kingdom", "28.3747": "epcot" };

let provider = {};
let providerCalls = [];

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const PROVIDER = {
  openweatherMk: () =>
    jsonResponse({
      weather: [{ description: "scattered clouds" }],
      main: { temp: 81.4, feels_like: 84.2, humidity: 70 },
    }),
  openweatherMkRecovered: () =>
    jsonResponse({
      weather: [{ description: "few clouds" }],
      main: { temp: 86.2, feels_like: 90.1, humidity: 64 },
    }),
  tomorrowMk: () =>
    jsonResponse({
      timelines: {
        hourly: [
          {
            time: "2026-05-08T17:00:00Z",
            values: { temperature: 82, temperatureApparent: 85, humidity: 68, weatherCode: 1101 },
          },
        ],
      },
    }),
  http503: () => jsonResponse({ message: "down" }, 503),
  network: () => {
    throw new Error("getaddrinfo ENOTFOUND weather provider");
  },
  hang: () => new Promise(() => {}),
};

async function fakeFetch(url) {
  const text = String(url);
  const kind = text.includes("api.tomorrow.io") ? "tomorrow" : text.includes("openweathermap.org") ? "openweather" : "unknown";
  const lat = (text.match(/lat=(-?[\d.]+)/) || text.match(/location=(-?[\d.]+)/) || [])[1];
  const parkId = LAT_TO_PARK[lat] || "unknown";
  providerCalls.push({ kind, parkId });
  const handler = provider[`${kind}:${parkId}`];
  if (!handler) throw new Error(`harness provider has no handler for ${kind}:${parkId}`);
  return handler();
}

/* -------------------------------------------------------------------------- */
/* Stubs and a fresh module graph per scenario                                */
/* -------------------------------------------------------------------------- */

const noop = () => {};
function pinoStub() {
  return { info: noop, warn: noop, error: noop, debug: noop };
}
pinoStub.stdTimeFunctions = { isoTime: noop };

function expressStub() {
  return {};
}
expressStub.Router = () => {
  const routes = {};
  return {
    routes,
    get: (routePath, handler) => {
      routes[routePath] = handler;
    },
  };
};

const STUBS = { "node-fetch": fakeFetch, pino: pinoStub, express: expressStub };

function loadFresh() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(sourceRoot + path.sep)) delete require.cache[key];
  }

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(STUBS, request)) return STUBS[request];
    return originalLoad(request, parent, isMain);
  };

  try {
    const router = require(path.join(sourceRoot, "routes", "weather.js"));
    return router.routes["/weather"];
  } finally {
    Module._load = originalLoad;
  }
}

async function callRoute(handler, query) {
  const res = {
    statusCode: 200,
    payload: undefined,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(value) {
      res.payload = value;
      return res;
    },
  };
  await handler({ query, log: { error: noop } }, res);
  return res;
}

function resetScenario(env) {
  clockMs = START_MS;
  provider = {};
  providerCalls = [];
  setEnv(env);
  return loadFresh();
}

// Any field a guest or decision could read as a weather observation.
const OBSERVATION_FIELDS = [
  "summary",
  "rawSummary",
  "tempF",
  "feelsLikeF",
  "humidity",
  "rainRisk",
  "stormMode",
  "currentPrecipitation",
  "precipitationLastHourIn",
];

function isHonestFailure(res) {
  const payload = res.payload || {};
  return (
    res.statusCode === 502 &&
    payload.source === undefined &&
    OBSERVATION_FIELDS.every((field) => !(field in payload)) &&
    !JSON.stringify(payload).includes("Weather unavailable")
  );
}

function describe(res) {
  return `status ${res.statusCode}, payload ${JSON.stringify(res.payload)}`;
}

const TTL_MS = 5 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Scenarios                                                                  */
/* -------------------------------------------------------------------------- */

async function run() {
  console.log(`weather outage harness — source: ${sourceRoot}`);

  // 1. Cold cache, provider fails: no synthetic weather, honest failure.
  for (const [label, handlerName] of [
    ["HTTP 503", "http503"],
    ["network error", "network"],
  ]) {
    for (const force of [false, true]) {
      const handler = resetScenario();
      provider["openweather:magic_kingdom"] = PROVIDER[handlerName];
      const res = await callRoute(handler, { parkId: "magic_kingdom", ...(force ? { force: "true" } : {}) });
      check(
        `1. cold cache + provider ${label}${force ? " (forced)" : ""}: honest 502, no synthetic weather`,
        isHonestFailure(res),
        describe(res)
      );
    }
  }

  // 1b. Tomorrow.io cold failure behaves the same.
  {
    const handler = resetScenario({ provider: "tomorrow" });
    provider["tomorrow:magic_kingdom"] = PROVIDER.http503;
    const res = await callRoute(handler, { parkId: "magic_kingdom" });
    check("1b. Tomorrow.io cold cache + provider failure: honest 502", isHonestFailure(res), describe(res));
  }

  // 1c. Provider timeout on a cold cache. The resiliency timeout is 8s; timers
  //     at or above that fire immediately here so the real timeout path runs.
  {
    const handler = resetScenario();
    provider["openweather:magic_kingdom"] = PROVIDER.hang;
    const realSetTimeout = global.setTimeout;
    global.setTimeout = (fn, ms, ...args) => realSetTimeout(fn, ms >= 8000 ? 0 : ms, ...args);
    let res;
    try {
      res = await callRoute(handler, { parkId: "magic_kingdom" });
    } finally {
      global.setTimeout = realSetTimeout;
    }
    check(
      "1c. cold cache + provider timeout: honest 502",
      isHonestFailure(res) && /Timed out/.test(res.payload?.detail || ""),
      describe(res)
    );
  }

  // 1d. Circuit open on a cold cache: still honest, provider not called.
  {
    const handler = resetScenario();
    provider["openweather:magic_kingdom"] = PROVIDER.http503;
    for (let i = 0; i < 3; i++) await callRoute(handler, { parkId: "magic_kingdom" });
    const before = providerCalls.length;
    const res = await callRoute(handler, { parkId: "magic_kingdom" });
    check(
      "1d. circuit open on a cold cache: honest 502 without calling the provider",
      isHonestFailure(res) && providerCalls.length === before,
      `${describe(res)}, provider calls ${providerCalls.length - before}`
    );
  }

  // 2. Missing provider credentials: honest failure, never cached as live.
  for (const providerId of ["openweather", "tomorrow"]) {
    const handler = resetScenario({ provider: providerId, keys: false });
    const normal = await callRoute(handler, { parkId: "magic_kingdom" });
    const forced = await callRoute(handler, { parkId: "magic_kingdom", force: "true" });
    check(
      `2. ${providerId} with no API key: honest 502 on normal and forced requests`,
      isHonestFailure(normal) && isHonestFailure(forced) && providerCalls.length === 0,
      `normal ${describe(normal)}; forced ${describe(forced)}; provider calls ${providerCalls.length}`
    );
    check(
      `2. ${providerId} with no API key: the failure detail names no credential value`,
      !Object.values(PLACEHOLDER_KEYS).some((value) => JSON.stringify([normal.payload, forced.payload]).includes(value))
    );

    // Configuring the key afterwards yields real weather: nothing synthetic was cached.
    setEnv({ provider: providerId, keys: true });
    provider[`${providerId}:magic_kingdom`] = providerId === "tomorrow" ? PROVIDER.tomorrowMk : PROVIDER.openweatherMk;
    const configured = await callRoute(handler, { parkId: "magic_kingdom" });
    check(
      `2. ${providerId}: once configured, real live weather is served (nothing synthetic cached)`,
      configured.statusCode === 200 &&
        configured.payload.source === "live" &&
        configured.payload.tempF === (providerId === "tomorrow" ? 82 : 81),
      describe(configured)
    );
  }

  // 3. Valid cached real weather survives a provider failure, labelled stale.
  for (const force of [false, true]) {
    const handler = resetScenario();
    provider["openweather:magic_kingdom"] = PROVIDER.openweatherMk;
    const first = await callRoute(handler, { parkId: "magic_kingdom" });

    advance(TTL_MS + 60 * 1000);
    provider["openweather:magic_kingdom"] = PROVIDER.http503;
    const retained = await callRoute(handler, { parkId: "magic_kingdom", ...(force ? { force: "true" } : {}) });
    const p = retained.payload || {};
    check(
      `3. cached real weather + provider failure${force ? " (forced)" : ""}: real values kept, labelled stale`,
      retained.statusCode === 200 &&
        p.source === "stale" &&
        p.parkId === "magic_kingdom" &&
        p.tempF === 81 &&
        p.feelsLikeF === 84 &&
        p.humidity === 70 &&
        p.rawSummary === "scattered clouds",
      describe(retained)
    );
    check(
      `3. cached real weather${force ? " (forced)" : ""} keeps its original fetchedAt and a real age`,
      p.fetchedAt === first.payload.fetchedAt && p.ageMs === TTL_MS + 60 * 1000,
      `fetchedAt ${p.fetchedAt} (was ${first.payload.fetchedAt}), ageMs ${p.ageMs}`
    );
  }

  // 4. Recovery: real weather replaces the unavailable state.
  {
    const handler = resetScenario();
    provider["openweather:magic_kingdom"] = PROVIDER.network;
    const down = await callRoute(handler, { parkId: "magic_kingdom" });
    provider["openweather:magic_kingdom"] = PROVIDER.openweatherMkRecovered;
    const up = await callRoute(handler, { parkId: "magic_kingdom", force: "true" });
    check(
      "4. recovery: unavailable, then real live weather",
      isHonestFailure(down) &&
        up.statusCode === 200 &&
        up.payload.source === "live" &&
        up.payload.tempF === 86 &&
        up.payload.rawSummary === "few clouds",
      `down ${describe(down)}; up ${describe(up)}`
    );
  }

  // 8. Park isolation: one park's cached weather is never another park's.
  {
    const handler = resetScenario();
    provider["openweather:magic_kingdom"] = PROVIDER.openweatherMk;
    provider["openweather:epcot"] = PROVIDER.http503;
    await callRoute(handler, { parkId: "magic_kingdom" });
    const epcot = await callRoute(handler, { parkId: "epcot" });
    const epcotForced = await callRoute(handler, { parkId: "epcot", force: "true" });
    check(
      "8. cached Magic Kingdom weather is not served for a failing EPCOT",
      isHonestFailure(epcot) && isHonestFailure(epcotForced),
      `epcot ${describe(epcot)}; forced ${describe(epcotForced)}`
    );
  }

  global.Date = RealDate;
  for (const name of ENV_NAMES) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
