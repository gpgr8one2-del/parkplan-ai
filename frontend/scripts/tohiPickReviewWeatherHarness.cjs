#!/usr/bin/env node

/**
 * TOHI Pick review — weather context harness.
 *
 * The defect: sanitizeTohiPickReviewRequest turned a missing weather mode into
 * "normal" (`cleanString(weatherMode) || "normal"`), the review signature was
 * built from that value, and the backend passed it straight into the JSON the
 * review model reads. Unknown weather reached the reviewer as known normal,
 * storm-free conditions, and shared a cached verdict with genuinely normal
 * weather. The request carried no availability at all, so the backend could not
 * tell the two apart.
 *
 * The invariant pinned here: the reviewer is only told about conditions TOHI
 * has a usable reading for. Unavailable weather says "unavailable", a missing
 * mode says "unknown", real weather (normal, rain, storm, stale) is passed on
 * with its own mode and provenance, and none of these share a signature.
 *
 * WHAT THIS EXECUTES, end to end:
 *   frontend  src/utils/tohiPickAgreement.js  sanitizeTohiPickReviewRequest and
 *             buildTohiPickReviewSignature (transformed with the frontend's own
 *             Babel, as tohiPickAgreementHarness does)
 *   wire      JSON.stringify / JSON.parse, as apiFetch posts the request
 *   backend   routes/ai.js POST /tohi-pick-review -> tohiPickReviewService
 *   model     the Anthropic SDK is replaced by a recorder that captures the
 *             exact system prompt and messages and returns a fixed placeholder.
 *             No network, no paid call; the placeholder reply is not asserted.
 * express's Router shell and pino are stubbed so backend node_modules need not
 * be installed. The API key is a placeholder and is never printed.
 *
 * Usage:
 *   node scripts/tohiPickReviewWeatherHarness.cjs [repoRoot]
 *
 * `repoRoot` defaults to the repository containing this script. Pass a baseline
 * checkout to show the weather assertions fail there.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Module = require("module");
const { createRequire } = require("module");

const scriptFrontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(process.argv[2] || path.join(scriptFrontendRoot, ".."));

// Babel always comes from this checkout's frontend; the code under test comes from repoRoot.
const toolRequire = createRequire(path.join(scriptFrontendRoot, "package.json"));
const babel = toolRequire("@babel/core");
const moduleTransformPlugin = toolRequire.resolve("@babel/plugin-transform-modules-commonjs");

let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  const passed = ok === true;
  console.log(`  ${passed ? "PASS" : "FAIL"} ${name}${passed || !detail ? "" : ` — ${detail}`}`);
  passed ? pass++ : fail++;
}

/* -------------------------------------------------------------------------- */
/* Load the real frontend request builder                                     */
/* -------------------------------------------------------------------------- */

function loadAgreementModule() {
  const filename = path.join(repoRoot, "frontend", "src", "utils", "tohiPickAgreement.js");
  const { code } = babel.transformSync(fs.readFileSync(filename, "utf8"), {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: "module",
    plugins: [moduleTransformPlugin],
  });
  const moduleShim = { exports: {} };
  vm.runInNewContext(code, { module: moduleShim, exports: moduleShim.exports, require: toolRequire, console, Date }, { filename });
  return moduleShim.exports;
}

const { sanitizeTohiPickReviewRequest, buildTohiPickReviewSignature } = loadAgreementModule();

/* -------------------------------------------------------------------------- */
/* Load the real backend route with a recording model                          */
/* -------------------------------------------------------------------------- */

const modelRequests = [];

class AnthropicRecorder {
  constructor() {
    this.messages = {
      create: async (request) => {
        modelRequests.push(request);
        return { content: [{ type: "text", text: "placeholder" }] };
      },
    };
  }
}

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
  return { routes, post: (routePath, handler) => { routes[routePath] = handler; } };
};

function loadReviewRoute() {
  const stubs = { "@anthropic-ai/sdk": AnthropicRecorder, pino: pinoStub, express: expressStub };
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
    return originalLoad(request, parent, isMain);
  };
  try {
    return require(path.join(repoRoot, "backend", "routes", "ai.js")).routes["/tohi-pick-review"];
  } finally {
    Module._load = originalLoad;
  }
}

const savedKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "harness-placeholder-anthropic";

// The service's review-timeout timer is never cleared on success; unref it so
// the harness exits as soon as it is done.
const realSetTimeout = global.setTimeout;
global.setTimeout = (...args) => {
  const timer = realSetTimeout(...args);
  if (timer && typeof timer.unref === "function") timer.unref();
  return timer;
};

const reviewRoute = loadReviewRoute();

const PREFIX = "Review this TOHI Pick decision:\n";

/** Posts a body to the real route and returns the context the model received. */
async function modelContextForBody(body) {
  const before = modelRequests.length;
  const res = { payload: undefined, json(value) { res.payload = value; return res; }, status() { return res; } };
  await reviewRoute({ body, log: { error: noop } }, res);
  if (modelRequests.length !== before + 1) {
    throw new Error(`expected one model request, got ${modelRequests.length - before}: ${JSON.stringify(res.payload)}`);
  }
  const content = modelRequests[modelRequests.length - 1].messages[0].content;
  if (!content.startsWith(PREFIX)) throw new Error(`unexpected model message: ${content.slice(0, 80)}`);
  return { content, context: JSON.parse(content.slice(PREFIX.length)).context };
}

/** Frontend request -> JSON wire -> backend -> model. */
async function modelContextFor(input) {
  const request = sanitizeTohiPickReviewRequest(input);
  const wireBody = JSON.parse(JSON.stringify(request));
  return { request, ...(await modelContextForBody(wireBody)) };
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const CANDIDATE = {
  rideId: "mk-buzz",
  name: "Buzz Lightyear's Space Ranger Spin",
  sourceSlot: "bestMove",
  wait: 15,
  area: "tomorrowland",
  engineReason: "Short wait nearby.",
  mustDo: { isMustDo: false },
  confidenceHints: { sameArea: true, waitKnown: true, mustDo: false, indoorRelief: true },
  raw: { waitValueStatus: { status: "good_value" } },
};

const BASE = {
  candidate: CANDIDATE,
  candidates: [CANDIDATE],
  activePark: "magic_kingdom",
  currentLand: "tomorrowland",
  dayPhase: "midday",
  waitAgeMinutes: 2,
  currentActivity: null,
  familyContext: { partySize: 2, adultCount: 2, childCount: 0 },
};

// What App passes for weatherMode: getWeatherMode(...) result objects.
const NORMAL = { mode: "normal", label: "Good Conditions", message: "Weather looks manageable right now." };
const RAIN = { mode: "rain", label: "Light Rain Active", message: "Light rain is falling at the park right now." };
const STORM = { mode: "storm", label: "Storm Active", message: "Active storms or lightning may pause outdoor attractions." };

const FAVORABLE = /normal|Good Conditions|manageable/i;

/* -------------------------------------------------------------------------- */
/* Scenarios                                                                  */
/* -------------------------------------------------------------------------- */

async function run() {
  console.log(`TOHI Pick review weather-context harness — source: ${repoRoot}`);

  // 1. Missing weather: no mode supplied at all.
  {
    const { context, content } = await modelContextFor({ ...BASE });
    check(
      "1. missing weather mode: the model is told weather is unknown, not normal",
      context.weatherMode === "unknown" && !FAVORABLE.test(content),
      `context ${JSON.stringify({ weatherMode: context.weatherMode, weatherAvailable: context.weatherAvailable })}`
    );
  }

  // 1b. Unavailable weather with no mode.
  {
    const { context, content } = await modelContextFor({ ...BASE, weatherAvailable: false });
    check(
      "1b. unavailable weather: the model is told weather is unavailable",
      context.weatherMode === "unavailable" && context.weatherAvailable === false && !FAVORABLE.test(content),
      `context ${JSON.stringify({ weatherMode: context.weatherMode, weatherAvailable: context.weatherAvailable })}`
    );
  }

  // 2. Unavailable weather plus the normal mode App derives from absent weather.
  {
    const { context, content } = await modelContextFor({
      ...BASE,
      weatherMode: NORMAL,
      weatherAvailable: false,
      weatherSource: "live",
    });
    check(
      "2. unavailable weather + a normal mode (frontend path): no false reassurance reaches the model",
      context.weatherMode === "unavailable" &&
        context.weatherAvailable === false &&
        context.weatherSource === null &&
        !FAVORABLE.test(content),
      `context ${JSON.stringify(context)}`
    );

    // The backend guard on its own, for a client that sends the inconsistent pair directly.
    const direct = await modelContextForBody({
      topCandidate: { rideId: "mk-buzz", name: CANDIDATE.name },
      shortlist: [],
      context: { activePark: "magic_kingdom", weatherMode: "normal", weatherAvailable: false, weatherSource: "live" },
    });
    check(
      "2. unavailable weather + a normal mode (sent straight to the backend): guarded to unavailable",
      direct.context.weatherMode === "unavailable" &&
        direct.context.weatherAvailable === false &&
        direct.context.weatherSource === null &&
        !FAVORABLE.test(direct.content),
      `context ${JSON.stringify(direct.context)}`
    );

    const noMode = await modelContextForBody({
      topCandidate: { rideId: "mk-buzz", name: CANDIDATE.name },
      shortlist: [],
      context: { activePark: "magic_kingdom" },
    });
    check(
      "2. no weather mode sent straight to the backend: unknown, not normal or null",
      noMode.context.weatherMode === "unknown" && !FAVORABLE.test(noMode.content),
      `context ${JSON.stringify(noMode.context)}`
    );
  }

  // 3. Real normal weather is preserved.
  {
    const { context } = await modelContextFor({ ...BASE, weatherMode: NORMAL, weatherAvailable: true, weatherSource: "live" });
    check(
      "3. available normal weather: mode, availability and source preserved",
      context.weatherMode === "normal" && context.weatherAvailable === true && context.weatherSource === "live",
      `context ${JSON.stringify(context)}`
    );
  }

  // 4. Real rain and storm weather are preserved.
  for (const [label, mode] of [["rain", RAIN], ["storm", STORM]]) {
    const { context } = await modelContextFor({ ...BASE, weatherMode: mode, weatherAvailable: true, weatherSource: "cached" });
    check(
      `4. available ${label} weather: ${label} mode preserved`,
      context.weatherMode === label && context.weatherAvailable === true && context.weatherSource === "cached",
      `context ${JSON.stringify(context)}`
    );
  }

  // 5. Retained stale real weather stays distinct from unavailable weather.
  {
    const stale = await modelContextFor({ ...BASE, weatherMode: RAIN, weatherAvailable: true, weatherSource: "stale" });
    const unavailable = await modelContextFor({ ...BASE, weatherMode: RAIN, weatherAvailable: false, weatherSource: "stale" });
    check(
      "5. stale real weather: actual mode and stale provenance reach the model",
      stale.context.weatherMode === "rain" && stale.context.weatherAvailable === true && stale.context.weatherSource === "stale",
      `context ${JSON.stringify(stale.context)}`
    );
    check(
      "5. stale real weather is distinguishable from unavailable weather",
      JSON.stringify(stale.context) !== JSON.stringify(unavailable.context) &&
        unavailable.context.weatherMode === "unavailable",
      `stale ${JSON.stringify(stale.context)}; unavailable ${JSON.stringify(unavailable.context)}`
    );
    check(
      "5. an unrecognised weather source is dropped rather than passed on",
      (await modelContextFor({ ...BASE, weatherMode: NORMAL, weatherAvailable: true, weatherSource: "mock" })).context.weatherSource === null
    );
  }

  // 6. Recovery: the next review carries the recovered weather.
  {
    const down = await modelContextFor({ ...BASE, weatherMode: NORMAL, weatherAvailable: false });
    const up = await modelContextFor({ ...BASE, weatherMode: STORM, weatherAvailable: true, weatherSource: "live" });
    check(
      "6. recovery: unavailable, then the recovered storm context",
      down.context.weatherMode === "unavailable" && up.context.weatherMode === "storm" && up.context.weatherAvailable === true,
      `down ${down.context.weatherMode}; up ${JSON.stringify(up.context)}`
    );
  }

  // 7. Signatures: unknown/unavailable never share a cached verdict with known weather.
  {
    const sig = (over) => buildTohiPickReviewSignature({ ...BASE, ...over });
    const knownNormal = sig({ weatherMode: NORMAL, weatherAvailable: true, weatherSource: "live" });
    const knownNormalCached = sig({ weatherMode: NORMAL, weatherAvailable: true, weatherSource: "cached" });
    const unknown = sig({});
    const unavailableWithNormal = sig({ weatherMode: NORMAL, weatherAvailable: false });
    const staleNormal = sig({ weatherMode: NORMAL, weatherAvailable: true, weatherSource: "stale" });

    check("7. unknown weather does not share a signature with known normal weather", unknown !== knownNormal);
    check(
      "7. unavailable weather with a normal mode does not share a signature with known normal weather",
      unavailableWithNormal !== knownNormal
    );
    check("7. stale normal weather does not share a signature with current normal weather", staleNormal !== knownNormal);
    check(
      "7. live and cached normal weather share a signature, so a routine refresh does not re-review",
      knownNormal === knownNormalCached
    );
  }

  global.setTimeout = realSetTimeout;
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
