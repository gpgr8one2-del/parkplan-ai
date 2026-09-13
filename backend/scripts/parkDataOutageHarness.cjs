#!/usr/bin/env node

/**
 * TOHI — park-data outage harness.
 *
 * The defect: when Queue-Times failed and the backend had no cached data for
 * the park, getParkData filled the gap with a generated sample payload
 * ("Popular Headliner" 45 min, "Family Favorite" 25 min, "Quick Ride" 10 min)
 * and /api/park-data returned it as a normal 200. Invented waits reached the
 * app as usable park information.
 *
 * The invariant pinned here: unavailable real wait data never becomes invented
 * wait data. With no usable real data the route fails honestly; real cached
 * data may still be served, labelled stale with its original fetch time.
 *
 * WHAT THIS EXECUTES: the real routes/park.js handler, services/parkService.js,
 * fetchWithResiliency.js, cache.js and circuitBreaker.js. Only the transport
 * (node-fetch), express's Router shell and pino are stubbed through a require
 * hook, so backend node_modules need not be installed and no network call is
 * made. Date.now is controlled so cache age is deterministic.
 *
 * Usage:
 *   node scripts/parkDataOutageHarness.cjs [sourceRoot]
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
/* Controlled clock and provider                                              */
/* -------------------------------------------------------------------------- */

const realDateNow = Date.now;
let clockMs = Date.parse("2026-05-08T17:00:00.000Z");
Date.now = () => clockMs;
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [clockMs]));
  }
  static now() {
    return clockMs;
  }
};

function advance(ms) {
  clockMs += ms;
}

const QUEUE_TIMES_ID_TO_PARK = { 6: "magic_kingdom", 5: "epcot" };

// Per-park scripted provider: a function returning a fake node-fetch Response
// or throwing. Every call is recorded.
let provider = {};
let providerCalls = [];

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const PROVIDER = {
  mkReal: () =>
    jsonResponse({
      lands: [
        {
          name: "Frontierland",
          rides: [{ id: 1, name: "Big Thunder Mountain Railroad", wait_time: 20, is_open: true }],
        },
        {
          name: "Liberty Square",
          rides: [{ id: 2, name: "Haunted Mansion", wait_time: 25, is_open: true }],
        },
      ],
    }),
  mkRecovered: () =>
    jsonResponse({
      lands: [{ name: "Tomorrowland", rides: [{ id: 3, name: "Space Mountain", wait_time: 45, is_open: true }] }],
    }),
  empty: () => jsonResponse({ lands: [] }),
  http503: () => jsonResponse({ error: "down" }, 503),
  network: () => {
    throw new Error("getaddrinfo ENOTFOUND queue-times.com");
  },
};

async function fakeFetch(url) {
  const match = String(url).match(/parks\/(\d+)\/queue_times\.json/);
  const parkId = match ? QUEUE_TIMES_ID_TO_PARK[Number(match[1])] : null;
  providerCalls.push(parkId);
  const handler = provider[parkId];
  if (!handler) throw new Error(`harness provider has no handler for ${parkId}`);
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
    const router = require(path.join(sourceRoot, "routes", "park.js"));
    const parkService = require(path.join(sourceRoot, "services", "parkService.js"));
    return { handler: router.routes["/park-data"], getParkData: parkService.getParkData };
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

const SAMPLE_NAMES = ["Popular Headliner", "Family Favorite", "Quick Ride"];

function describeRides(payload) {
  return JSON.stringify((payload?.rides || []).map((r) => [r.id, r.name, r.waitTime]));
}

function hasNoSampleData(payload) {
  const text = JSON.stringify(payload || {});
  return !/mock-\d/.test(text) && SAMPLE_NAMES.every((name) => !text.includes(name)) && payload?.source !== "mock";
}

function resetScenario() {
  clockMs = Date.parse("2026-05-08T17:00:00.000Z");
  provider = {};
  providerCalls = [];
  return loadFresh();
}

const TTL_MS = 3 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Scenarios                                                                  */
/* -------------------------------------------------------------------------- */

async function run() {
  console.log(`park-data outage harness — source: ${sourceRoot}`);

  // 1. Cold cache, provider fails: no invented rides, honest failure.
  for (const [label, handlerName] of [
    ["HTTP 503", "http503"],
    ["network error", "network"],
  ]) {
    const { handler } = resetScenario();
    provider.magic_kingdom = PROVIDER[handlerName];
    const res = await callRoute(handler, { parkId: "magic_kingdom" });
    check(
      `1. cold cache + provider ${label}: route fails instead of returning sample rides`,
      res.statusCode === 502,
      `status ${res.statusCode}, source ${res.payload?.source}, rides ${describeRides(res.payload)}`
    );
    check(
      `1. cold cache + provider ${label}: response carries no sample attractions or waits`,
      hasNoSampleData(res.payload) && !Array.isArray(res.payload?.rides),
      `payload ${JSON.stringify(res.payload)}`
    );
  }

  // 1b. Forced refresh on a cold cache behaves the same.
  {
    const { handler } = resetScenario();
    provider.magic_kingdom = PROVIDER.http503;
    const res = await callRoute(handler, { parkId: "magic_kingdom", force: "true" });
    check(
      "1b. cold cache + forced refresh failure: route fails, no sample rides",
      res.statusCode === 502 && hasNoSampleData(res.payload) && !Array.isArray(res.payload?.rides),
      `status ${res.statusCode}, payload ${JSON.stringify(res.payload)}`
    );
  }

  // 1c. A cold failure is not remembered as data: the next success is live.
  {
    const { handler } = resetScenario();
    provider.magic_kingdom = PROVIDER.http503;
    await callRoute(handler, { parkId: "magic_kingdom" });
    provider.magic_kingdom = PROVIDER.mkReal;
    const res = await callRoute(handler, { parkId: "magic_kingdom" });
    check(
      "1c. cold failure then success: real live rides, nothing sample cached",
      res.statusCode === 200 &&
        res.payload.source === "live" &&
        describeRides(res.payload) === describeRides({ rides: [{ id: "1", name: "Big Thunder Mountain Railroad", waitTime: 20 }, { id: "2", name: "Haunted Mansion", waitTime: 25 }] }),
      `status ${res.statusCode}, source ${res.payload?.source}, rides ${describeRides(res.payload)}`
    );
  }

  // 2. Valid cached real data survives a provider failure, labelled stale with
  //    its original fetch time and park.
  {
    const { handler } = resetScenario();
    provider.magic_kingdom = PROVIDER.mkReal;
    const first = await callRoute(handler, { parkId: "magic_kingdom" });
    const originalFetchedAt = first.payload.fetchedAt;

    advance(TTL_MS + 60 * 1000);
    provider.magic_kingdom = PROVIDER.http503;

    const forced = await callRoute(handler, { parkId: "magic_kingdom", force: "true" });
    check(
      "2. cached real data + provider failure: real rides kept, labelled stale",
      forced.statusCode === 200 &&
        forced.payload.source === "stale" &&
        forced.payload.parkId === "magic_kingdom" &&
        describeRides(forced.payload) === describeRides(first.payload),
      `status ${forced.statusCode}, source ${forced.payload?.source}, rides ${describeRides(forced.payload)}`
    );
    check(
      "2. cached real data keeps its original fetchedAt and a real age",
      forced.payload.fetchedAt === originalFetchedAt && forced.payload.ageMs === TTL_MS + 60 * 1000,
      `fetchedAt ${forced.payload?.fetchedAt} (was ${originalFetchedAt}), ageMs ${forced.payload?.ageMs}`
    );
    check("2. cached real data carries no sample content", hasNoSampleData(forced.payload));
  }

  // 3. Recovery: real waits replace the unavailable state.
  {
    const { handler } = resetScenario();
    provider.magic_kingdom = PROVIDER.network;
    const down = await callRoute(handler, { parkId: "magic_kingdom" });
    provider.magic_kingdom = PROVIDER.mkRecovered;
    const up = await callRoute(handler, { parkId: "magic_kingdom", force: "true" });
    check(
      "3. recovery: unavailable, then real live waits",
      down.statusCode === 502 &&
        up.statusCode === 200 &&
        up.payload.source === "live" &&
        describeRides(up.payload) === JSON.stringify([["3", "Space Mountain", 45]]),
      `down ${down.statusCode}/${down.payload?.source}, up ${up.statusCode}/${up.payload?.source} ${describeRides(up.payload)}`
    );
  }

  // 4. A genuine successful empty response stays a success, not an outage.
  {
    const { handler } = resetScenario();
    provider.magic_kingdom = PROVIDER.empty;
    const res = await callRoute(handler, { parkId: "magic_kingdom" });
    check(
      "4. successful empty response: 200, live, zero rides",
      res.statusCode === 200 &&
        res.payload.source === "live" &&
        Array.isArray(res.payload.rides) &&
        res.payload.rides.length === 0 &&
        !res.payload.error,
      `status ${res.statusCode}, payload ${JSON.stringify(res.payload)}`
    );
  }

  // 9. Park isolation: one park's cache is never another park's data.
  {
    const { handler } = resetScenario();
    provider.magic_kingdom = PROVIDER.mkReal;
    provider.epcot = PROVIDER.http503;
    await callRoute(handler, { parkId: "magic_kingdom" });
    const epcot = await callRoute(handler, { parkId: "epcot" });
    const epcotForced = await callRoute(handler, { parkId: "epcot", force: "true" });
    check(
      "9. cached Magic Kingdom data is not served for a failing EPCOT",
      epcot.statusCode === 502 &&
        epcotForced.statusCode === 502 &&
        !JSON.stringify(epcot.payload).includes("Big Thunder") &&
        !JSON.stringify(epcotForced.payload).includes("Big Thunder") &&
        hasNoSampleData(epcot.payload) &&
        hasNoSampleData(epcotForced.payload),
      `epcot ${epcot.statusCode} ${JSON.stringify(epcot.payload)}, forced ${epcotForced.statusCode}`
    );
  }

  // Circuit open on a cold cache is still an honest failure.
  {
    const { handler } = resetScenario();
    provider.magic_kingdom = PROVIDER.http503;
    for (let i = 0; i < 3; i++) await callRoute(handler, { parkId: "magic_kingdom" });
    const callsBefore = providerCalls.length;
    const res = await callRoute(handler, { parkId: "magic_kingdom" });
    check(
      "circuit open on a cold cache: route fails without sample rides",
      res.statusCode === 502 && hasNoSampleData(res.payload) && providerCalls.length === callsBefore,
      `status ${res.statusCode}, payload ${JSON.stringify(res.payload)}, provider calls ${providerCalls.length - callsBefore}`
    );
  }

  Date.now = realDateNow;
  global.Date = RealDate;

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
