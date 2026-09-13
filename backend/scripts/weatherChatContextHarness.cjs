#!/usr/bin/env node

/**
 * TOHI — weather chat-context harness.
 *
 * The defect: when real weather was unavailable the app still sent
 * getWeatherMode(null) — { mode: "normal", label: "Good Conditions",
 * message: "Weather looks manageable right now." } — and buildWeatherContext
 * rendered it into the model-facing context as
 *
 *   Weather: temp unavailable · … · provider storm signal: no · active storm mode: no
 *   Weather mode: Good Conditions (normal)
 *   Weather advice: Weather looks manageable right now.
 *
 * Absent weather became evidence of favorable conditions, and contradicted a
 * guest who had just said it was raining.
 *
 * The invariant pinned here: with no weather reading, the context says weather
 * is unavailable and makes no condition claim either way. Real weather, its mode
 * and its freshness are rendered exactly as before.
 *
 * WHAT THIS EXECUTES: the real routes/ai.js /ai-chat handler and the real
 * services/aiService.js getAIResponse, through to the Anthropic request. The
 * SDK is replaced by a recorder that captures the exact system prompt and
 * messages and returns a fixed placeholder reply — no network call, no paid
 * model call, and nothing about the reply is asserted. express's Router shell
 * and pino are stubbed through a require hook so backend node_modules need not
 * be installed. The API key is a placeholder and is never printed.
 *
 * Usage:
 *   node scripts/weatherChatContextHarness.cjs [sourceRoot]
 *
 * `sourceRoot` defaults to the backend directory containing this script. Pass a
 * baseline tree to show the missing-weather assertions fail there.
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
/* Stubs                                                                      */
/* -------------------------------------------------------------------------- */

const requests = [];

class AnthropicRecorder {
  constructor() {
    this.messages = {
      create: async (request) => {
        requests.push(request);
        return { content: [{ type: "text", text: "Placeholder reply for the harness." }] };
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
  return {
    routes,
    post: (routePath, handler) => {
      routes[routePath] = handler;
    },
  };
};

const STUBS = { "@anthropic-ai/sdk": AnthropicRecorder, pino: pinoStub, express: expressStub };

function loadRoute() {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(STUBS, request)) return STUBS[request];
    return originalLoad(request, parent, isMain);
  };

  try {
    return require(path.join(sourceRoot, "routes", "ai.js")).routes["/ai-chat"];
  } finally {
    Module._load = originalLoad;
  }
}

/* -------------------------------------------------------------------------- */
/* Driving the real route                                                     */
/* -------------------------------------------------------------------------- */

const savedKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "harness-placeholder-anthropic";

// The route's 13s request-timeout timer is never cleared on success. Unref it so
// the harness exits as soon as it is done; the timer itself still runs.
const realSetTimeout = global.setTimeout;
global.setTimeout = (...args) => {
  const timer = realSetTimeout(...args);
  if (timer && typeof timer.unref === "function") timer.unref();
  return timer;
};

const handler = loadRoute();

// Names a ride, so it is answered directly rather than with a clarifying question.
const QUESTION = "is the wait for haunted mansion worth it";

async function modelFacing(message, sessionData) {
  const before = requests.length;
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
  await handler({ body: { message, sessionData }, log: { error: noop } }, res);
  if (requests.length !== before + 1) {
    throw new Error(`expected one model request, got ${requests.length - before}: ${JSON.stringify(res.payload)}`);
  }
  const request = requests[requests.length - 1];
  const contents = request.messages.map((m) => m.content).join("\n\n");
  return { request, contents, context: request.messages[0].content, reply: res.payload?.reply };
}

function weatherBlock(context) {
  const lines = context.split("\n");
  const start = lines.findIndex((line) => line.startsWith("Weather"));
  if (start < 0) return "";
  const block = [];
  for (let i = start; i < lines.length && /^Weather/.test(lines[i]); i++) block.push(lines[i]);
  return block.join("\n");
}

function freshnessLine(context, label) {
  return context.split("\n").find((line) => line.startsWith(`- ${label}:`)) || "";
}

// Anything a model could read as a statement about current conditions.
const CONDITION_CLAIMS = [
  /Good Conditions/i,
  /manageable/i,
  /\(normal\)/,
  /provider storm signal: no/,
  /active storm mode: no/,
  /Weather mode:/,
  /Weather advice:/,
];

function unsupportedClaims(text) {
  return CONDITION_CLAIMS.filter((pattern) => pattern.test(text)).map(String);
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const GOOD_MODE = { mode: "normal", label: "Good Conditions", message: "Weather looks manageable right now." };
const RAIN_MODE = {
  mode: "rain",
  label: "Light Rain Active",
  message: "Light rain is falling at the park right now.",
};
const STORM_MODE = {
  mode: "storm",
  label: "Storm Active",
  message: "Active storms or lightning may pause outdoor and mixed attractions.",
};

const NO_WEATHER_FRESHNESS = {
  computedAt: "2026-05-08T17:00:00.000Z",
  weather: { source: "", ageMs: null, fetchedAt: "", clientLastUpdatedAt: "", hasData: false },
};

const REAL_WEATHER = {
  parkId: "magic_kingdom",
  source: "live",
  fetchedAt: "2026-05-08T16:58:00.000Z",
  ageMs: 120000,
  summary: "Partly cloudy",
  tempF: 81,
  feelsLikeF: 83,
  humidity: 70,
  rainRisk: 0.1,
  stormMode: false,
  currentPrecipitation: false,
};

const base = { activePark: "magic_kingdom", activeParkLabel: "Magic Kingdom" };

/** A guest confirmation layered over a real provider Rain Watch, as App builds it. */
async function modelContextWithProviderRain() {
  const { context } = await modelFacing(QUESTION, {
    ...base,
    weather: {
      ...REAL_WEATHER,
      summary: "Rain possible soon",
      rainRisk: 0.6,
      currentPrecipitation: true,
      guestConfirmedRain: true,
      forecastCurrentPrecipitation: false,
    },
    weatherMode: { mode: "rain", label: "Light Rain", message: "Light rain is falling at the park right now." },
  });
  return weatherBlock(context);
}

/* -------------------------------------------------------------------------- */
/* Scenarios                                                                  */
/* -------------------------------------------------------------------------- */

async function run() {
  console.log(`weather chat-context harness — source: ${sourceRoot}`);

  // 3. Absent weather, with the app's getWeatherMode(null) result alongside it.
  {
    const { context } = await modelFacing(QUESTION, {
      ...base,
      weatherMode: GOOD_MODE,
      dataFreshness: NO_WEATHER_FRESHNESS,
    });
    const block = weatherBlock(context);
    check(
      "3. absent weather + a normal/good mode: context says weather is unavailable",
      block === "Weather: unavailable",
      `weather block:\n${block}`
    );
    check(
      "3. absent weather + a normal/good mode: no favorable or no-storm condition claim anywhere",
      unsupportedClaims(context).length === 0,
      `found ${unsupportedClaims(context).join(", ")}`
    );
    check(
      "3. absent weather: freshness still reports weather data missing",
      /^- Weather data: data missing;/.test(freshnessLine(context, "Weather data")),
      freshnessLine(context, "Weather data")
    );
  }

  // 3b. Absent weather sent as null (the rejected legacy mock / failed load shape).
  {
    const { context } = await modelFacing(QUESTION, { ...base, weather: null, weatherMode: GOOD_MODE });
    check(
      "3b. weather null + a normal/good mode: unavailable, no condition claim",
      weatherBlock(context) === "Weather: unavailable" && unsupportedClaims(context).length === 0,
      `weather block:\n${weatherBlock(context)}`
    );
  }

  // 3c. Absent weather and no mode: unchanged.
  {
    const { context } = await modelFacing(QUESTION, { ...base, weather: null, weatherMode: null });
    check(
      "3c. no weather and no mode: unavailable",
      weatherBlock(context) === "Weather: unavailable",
      `weather block:\n${weatherBlock(context)}`
    );
  }

  // 4. Real normal weather: the legitimate context is unchanged.
  {
    const { context } = await modelFacing(QUESTION, {
      ...base,
      weather: REAL_WEATHER,
      weatherMode: GOOD_MODE,
      dataFreshness: { weather: { ...REAL_WEATHER, clientLastUpdatedAt: "", hasData: true } },
    });
    const expected = [
      "Weather: 81°F · feels like 83°F · humidity: 70% · Partly cloudy · rain risk: 0.1 · provider storm signal: no · active storm mode: no",
      "Weather mode: Good Conditions (normal)",
      "Weather advice: Weather looks manageable right now.",
    ].join("\n");
    check("4. real normal weather: context unchanged", weatherBlock(context) === expected, `weather block:\n${weatherBlock(context)}`);
  }

  // 5. Real rain and storm weather: relevant context preserved.
  {
    const rain = await modelFacing(QUESTION, {
      ...base,
      weather: { ...REAL_WEATHER, summary: "Light rain", rainRisk: 0.7, currentPrecipitation: true },
      weatherMode: RAIN_MODE,
    });
    check(
      "5. real rain weather: rain risk, rain mode and advice preserved",
      weatherBlock(rain.context) ===
        [
          "Weather: 81°F · feels like 83°F · humidity: 70% · Light rain · rain risk: 0.7 · provider storm signal: no · active storm mode: no",
          "Weather mode: Light Rain Active (rain)",
          "Weather advice: Light rain is falling at the park right now.",
        ].join("\n"),
      `weather block:\n${weatherBlock(rain.context)}`
    );

    const storm = await modelFacing(QUESTION, {
      ...base,
      weather: { ...REAL_WEATHER, summary: "Thunderstorms", rainRisk: 0.8, stormMode: true },
      weatherMode: STORM_MODE,
    });
    check(
      "5. real storm weather: storm signal, storm mode and advice preserved",
      weatherBlock(storm.context) ===
        [
          "Weather: 81°F · feels like 83°F · humidity: 70% · Thunderstorms · rain risk: 0.8 · provider storm signal: yes · active storm mode: yes",
          "Weather mode: Storm Active (storm)",
          "Weather advice: Active storms or lightning may pause outdoor and mixed attractions.",
        ].join("\n"),
      `weather block:\n${weatherBlock(storm.context)}`
    );
  }

  // 6. Retained stale real weather: values and stale provenance preserved.
  {
    const stale = {
      ...REAL_WEATHER,
      source: "stale",
      fetchedAt: "2026-05-08T16:40:00.000Z",
      ageMs: 1200000,
    };
    const { context } = await modelFacing(QUESTION, {
      ...base,
      weather: stale,
      weatherMode: GOOD_MODE,
      dataFreshness: {
        weather: {
          source: "stale",
          ageMs: 1200000,
          fetchedAt: "2026-05-08T16:40:00.000Z",
          clientLastUpdatedAt: "2026-05-08T16:41:00.000Z",
          hasData: true,
        },
      },
    });
    check(
      "6. retained stale weather: reading preserved",
      weatherBlock(context).startsWith("Weather: 81°F · feels like 83°F") &&
        weatherBlock(context).includes("Weather mode: Good Conditions (normal)"),
      `weather block:\n${weatherBlock(context)}`
    );
    check(
      "6. retained stale weather: stale source, age and original timestamps preserved",
      freshnessLine(context, "Weather data") ===
        "- Weather data: data present; source stale; 20 minutes old; fetched at 2026-05-08T16:40:00.000Z; app last refreshed at 2026-05-08T16:41:00.000Z.",
      freshnessLine(context, "Weather data")
    );
  }

  // 8. The guest reports rain while provider weather is unavailable.
  {
    const guest = "It's raining hard, is the wait for haunted mansion worth it";
    const { contents, context, request } = await modelFacing(guest, {
      ...base,
      weather: null,
      weatherMode: GOOD_MODE,
      conversationHistory: [{ role: "user", content: "It's raining hard" }],
      dataFreshness: NO_WEATHER_FRESHNESS,
    });
    const finalMessage = request.messages[request.messages.length - 1].content;
    check(
      "8. guest rain report: the guest's words reach the model intact",
      finalMessage.startsWith(`User question: ${guest}`) && contents.includes("It's raining hard"),
      finalMessage.slice(0, 120)
    );
    check(
      "8. guest rain report: no clear-weather or no-storm claim contradicts it",
      unsupportedClaims(context).length === 0 && weatherBlock(context) === "Weather: unavailable",
      `found ${unsupportedClaims(context).join(", ")}; weather block:\n${weatherBlock(context)}`
    );
  }

  // 10. A stored "Yes, it's raining" still applying while provider weather is
  //     unavailable: the decision weather carries only the guest's report.
  {
    const guestOnly = {
      currentPrecipitation: true,
      forecastCurrentPrecipitation: null,
      guestConfirmedRain: true,
      guestConfirmedRainAt: 1782590400000,
      guestConfirmedRainExpiresAt: 1782595800000,
      providerWeatherUnavailable: true,
    };
    const LIGHT_RAIN_MODE = {
      mode: "rain",
      label: "Light Rain",
      message: "Light rain is falling at the park right now.",
    };
    const { context } = await modelFacing(QUESTION, {
      ...base,
      weather: guestOnly,
      weatherMode: LIGHT_RAIN_MODE,
      dataFreshness: NO_WEATHER_FRESHNESS,
    });
    const block = weatherBlock(context);
    check(
      "10. guest-reported rain without provider weather: named as the guest's report, not a provider reading",
      block ===
        [
          "Weather: provider weather unavailable, so there is no temperature, rain-probability or storm reading. The guest reported that it is raining; this is their report, not a provider reading.",
          "Weather mode: Light Rain (rain), from the guest's rain report",
          "Weather advice: Light rain is falling at the park right now.",
        ].join("\n"),
      `weather block:\n${block}`
    );
    check(
      "10. guest-reported rain without provider weather: no provider storm, temperature or probability claim",
      !/provider storm signal|active storm mode|°F|rain risk: |temp unavailable/.test(block),
      `weather block:\n${block}`
    );
    check(
      "10. guest-reported rain without provider weather: freshness still says weather data is missing",
      /^- Weather data: data missing;/.test(freshnessLine(context, "Weather data")),
      freshnessLine(context, "Weather data")
    );

    // A confirmation over REAL provider weather keeps the existing format.
    const overProvider = await modelContextWithProviderRain();
    check(
      "10. guest-confirmed rain over real provider weather: existing format unchanged",
      overProvider.startsWith("Weather: 81°F · feels like 83°F · humidity: 70% · Rain possible soon · rain risk: 0.6 · provider storm signal: no · active storm mode: no"),
      `weather block:\n${overProvider}`
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
