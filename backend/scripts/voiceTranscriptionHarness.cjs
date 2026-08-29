#!/usr/bin/env node

/**
 * TOHI Voice — backend transcription harness (Phase A1).
 *
 * WHAT THIS ESTABLISHES, stated plainly so no assertion reads as stronger than
 * it is:
 *
 *   * The FEATURE assertions EXECUTE the real production modules — the real
 *     MIME normalizer, the real multipart builder, the real request handler and
 *     the real route handler chain. Nothing is reimplemented here.
 *   * The provider transport is INJECTED. No network call is made, no API key
 *     is required, and the live OpenAI API is never contacted.
 *   * express is STUBBED through a require hook, because backend node_modules
 *     need not be installed to run this. The stub moves arguments around; it
 *     never makes a decision the route is supposed to make.
 *   * The WIRING guards cover registration and configuration. They are tagged
 *     so no line reads as stronger than it is:
 *       (src)  a source-text check over backend/server.js or routes/voice.js.
 *       (cfg)  the real options object production hands to rateLimit /
 *              express.raw, lifted out and evaluated — the actual configured
 *              values, not a restatement of them. express-rate-limit and
 *              body-parser themselves are never involved.
 *       (exec) a real production function executed directly — the limiter's
 *              429 handler, the parser wrapper, the route handler.
 *     None of these run express's own router, limiter or body parser.
 *   * The INVARIANTS are structural source checks over files this phase must
 *     not disturb. They are expected to pass both before and after.
 *
 * Usage:
 *   node scripts/voiceTranscriptionHarness.cjs [sourceRoot]
 *
 * `sourceRoot` defaults to the backend directory containing this script. Pass a
 * pinned baseline tree to prove the feature assertions genuinely fail there
 * rather than passing vacuously.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Module = require("module");

const sourceRoot = path.resolve(process.argv[2] || path.join(__dirname, ".."));

let featurePass = 0;
let featureFail = 0;
let invariantPass = 0;
let invariantFail = 0;
let wiringPass = 0;
let wiringFail = 0;
let loadPass = 0;
let loadFail = 0;

function record(kind, name, ok, detail) {
  console.log(`  ${ok ? "PASS" : "FAIL"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);

  if (kind === "feature") ok ? featurePass++ : featureFail++;
  else if (kind === "invariant") ok ? invariantPass++ : invariantFail++;
  else if (kind === "wiring") ok ? wiringPass++ : wiringFail++;
  else ok ? loadPass++ : loadFail++;
}

const feature = (name, ok, detail) => record("feature", name, ok === true, detail);
const invariant = (name, ok, detail) => record("invariant", name, ok === true, detail);
const wiring = (name, ok, detail) => record("wiring", name, ok === true, detail);
const load = (name, ok, detail) => record("load", name, ok === true, detail);

function readIfPresent(...segments) {
  const target = path.join(sourceRoot, ...segments);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
}

/* -------------------------------------------------------------------------- */
/* Dependency stubs                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Minimal express surface — only what routes/voice.js touches. The stub records
 * the registered route, records the exact options production hands to
 * express.raw, and replays the real middleware chain. It never decides a
 * status, a header or a body.
 *
 * IMPORTANT, so nothing here reads as stronger than it is: this is NOT
 * body-parser. It does not buffer a stream, enforce `limit`, or produce
 * entity.too.large itself. What it does reproduce is body-parser's documented
 * dispatch decision — the `type` predicate is consulted, and when it does not
 * match, parsing is skipped and `req.body` is left as `{}` exactly as
 * body-parser leaves it. That is what makes a removed or narrowed `type`
 * option observable here.
 */
function createExpressStub() {
  const registered = [];
  const rawCalls = [];

  const mediaTypeOf = (req) => {
    const header = (req && req.headers && req.headers["content-type"]) || "";
    return String(header).split(";")[0].trim().toLowerCase();
  };

  function rawFactory(options) {
    rawCalls.push(options);

    const middleware = (req, res, next) => {
      // A staged parser failure is surfaced to the production wrapper.
      if (req.__parserError) return next(req.__parserError);

      const matcher = options && options.type;
      let matched;

      if (typeof matcher === "function") matched = Boolean(matcher(req));
      else if (typeof matcher === "string") matched = mediaTypeOf(req) === matcher.toLowerCase();
      // body-parser's own default for express.raw.
      else matched = mediaTypeOf(req) === "application/octet-stream";

      if (!matched) {
        req.body = {};
        return next();
      }

      if (req.__rawBody !== undefined) req.body = req.__rawBody;
      return next();
    };

    middleware.__options = options;
    return middleware;
  }

  const expressStub = () => ({});
  expressStub.Router = () => ({
    post: (routePath, ...handlers) => registered.push({ routePath, handlers }),
  });
  expressStub.raw = rawFactory;

  return { expressStub, registered, rawCalls };
}

/** Installs stubs for one require, then restores the loader. */
function requireWithStubs(targetPath, stubs) {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
    return originalLoad(request, parent, isMain);
  };

  try {
    const resolved = require.resolve(targetPath);
    delete require.cache[resolved];
    return require(resolved);
  } finally {
    Module._load = originalLoad;
  }
}

/** Fake express response that captures everything the route sets. */
function createFakeRes() {
  const res = {
    statusCode: null,
    headers: {},
    payload: undefined,
    set(key, value) {
      res.headers[String(key).toLowerCase()] = value;
      return res;
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(value) {
      res.payload = value;
      return res;
    },
  };
  return res;
}

function createLogSpy() {
  const entries = [];
  return {
    entries,
    sink: {
      info: (obj, msg) => entries.push({ level: "info", obj, msg }),
      warn: (obj, msg) => entries.push({ level: "warn", obj, msg }),
      error: (obj, msg) => entries.push({ level: "error", obj, msg }),
    },
  };
}

const FEATURE_NAMES = [
  "1. supported MIME types normalize, codec parameters ignored",
  "2. unsupported MIME rejected, including OGG",
  "3. deterministic safe filename extension selection",
  "4. multipart body carries the model field",
  "5. multipart body carries exactly one correctly named file part",
  "6. multipart body preserves the exact audio bytes",
  "7. provider request uses the documented transcription endpoint",
  "8. authorization stays server-side in the outbound header only",
  "9. missing API key prevents any provider call",
  "10. provider failure is not retried",
  "11. valid transcript is trimmed",
  "12. blank transcript stays a safe blank result",
  "13. malformed provider response becomes unavailable",
  "14. timeout and network error become unavailable",
  "15. empty body maps to empty_audio",
  "16. unsupported MIME maps to unsupported_audio",
  "17. oversized input maps to audio_too_large",
  "18. route responses set Cache-Control: no-store",
  "19. no raw audio or transcript reaches logging",
  "20. oversized body-parser error is bounded to 413, not 500",
  "21. generic body-parser error is bounded to 400 empty_audio, not 500",
  "22. outbound Content-Length equals the multipart buffer length",
];

/**
 * Server wiring / structural guards.
 *
 * These exist because every FEATURE assertion above would still pass if the
 * route were never mounted, the dedicated limiter were dropped or rebudgeted,
 * or the raw parser were misconfigured. Backend node_modules are not installed,
 * so server.js is never executed; the tag on each name says exactly what the
 * evidence is.
 */
const WIRING_NAMES = [
  "W1  (src)  server.js requires ./routes/voice",
  "W2  (src)  voiceRoutes is mounted under /api exactly once",
  "W3  (src)  voiceTranscribeLimiter is mounted on /api/voice/transcribe",
  "W4  (src)  the voice limiter is its own budget, separate from general/ai/event",
  "W5  (cfg)  voice limiter is windowMs 60000, max 12, standard headers, no legacy headers",
  "W6  (exec) voice 429 handler sets Cache-Control: no-store",
  "W7  (exec) voice 429 body names no provider and carries no extra detail",
  "W8  (src)  the raw audio parser is route-scoped, never installed globally",
  "W9  (cfg)  express.raw receives limit === MAX_AUDIO_BYTES",
  "W10 (cfg)  express.raw receives a type function, not the octet-stream default",
  "W11 (exec) the type function lets an unsupported MIME reach the explicit 415",
  "W12 (exec) the voice route is parser-wrapper then request-handler, in that order",
];

async function main() {
  console.log("");
  console.log(`TOHI Voice transcription harness — source root: ${sourceRoot}`);
  console.log("");
  console.log("Load / parse checks");

  for (const segments of [["services", "voiceService.js"], ["routes", "voice.js"], ["server.js"]]) {
    const label = segments.join("/");
    const source = readIfPresent(...segments);

    if (source === null) {
      load(`${label} exists`, false, "file not present in this tree");
      continue;
    }

    try {
      // Compile only. Nothing is executed by this check.
      new vm.Script(Module.wrap(source), { filename: label });
      load(`${label} exists and parses`, true);
    } catch (err) {
      load(`${label} exists and parses`, false, err.message);
    }
  }

  let voiceService = null;
  try {
    const servicePath = path.join(sourceRoot, "services", "voiceService.js");
    if (fs.existsSync(servicePath)) {
      voiceService = requireWithStubs(servicePath, {
        // The service requires the app logger, which pulls pino. Stubbed so
        // this harness runs without installed packages.
        "../logger": { info() {}, warn() {}, error() {} },
      });
    }
    load("voiceService loads without network or installed provider packages", Boolean(voiceService));
  } catch (err) {
    load("voiceService loads without network or installed provider packages", false, err.message);
  }

  let routeRegistration = null;
  let rawCalls = [];
  let registeredCount = 0;
  let stubRegistered = [];
  try {
    const routePath = path.join(sourceRoot, "routes", "voice.js");
    if (fs.existsSync(routePath) && voiceService) {
      const stub = createExpressStub();
      requireWithStubs(routePath, { express: stub.expressStub });
      rawCalls = stub.rawCalls;
      registeredCount = stub.registered.length;
      stubRegistered = stub.registered;
      routeRegistration =
        stub.registered.find((r) => r.routePath === "/voice/transcribe") || null;
    }
    // 64C-A3 added the approved spoken-reply route to this file. The count is
    // still pinned — exactly TWO, no more — and each route is asserted
    // individually, including which middleware it carries. A third route, a
    // renamed path, or the raw audio parser leaking onto the speak route all
    // still fail here.
    const speakRegistration =
      stubRegistered.find((r) => r.routePath === "/voice/speak") || null;

    load(
      "routes/voice.js registers exactly the two intended voice routes",
      registeredCount === 2 &&
        Boolean(routeRegistration) &&
        routeRegistration.routePath === "/voice/transcribe" &&
        Boolean(speakRegistration),
      `registered ${registeredCount} route(s): ${stubRegistered
        .map((r) => r.routePath)
        .join(", ") || "none"}`
    );

    load(
      "POST /voice/transcribe keeps its parser wrapper and request handler",
      Boolean(routeRegistration) &&
        routeRegistration.handlers.length === 2 &&
        // the wrapper, not a bare express.raw middleware
        routeRegistration.handlers[0].__options === undefined &&
        routeRegistration.handlers[1].constructor.name === "AsyncFunction",
      routeRegistration
        ? `transcribe has ${routeRegistration.handlers.length} handler(s)`
        : "no transcribe route"
    );

    load(
      "POST /voice/speak is a single JSON handler with NO raw audio parser",
      Boolean(speakRegistration) &&
        speakRegistration.handlers.length === 1 &&
        speakRegistration.handlers[0].constructor.name === "AsyncFunction" &&
        // the route-scoped raw parser must never be attached here
        speakRegistration.handlers[0].__options === undefined,
      speakRegistration
        ? `speak has ${speakRegistration.handlers.length} handler(s)`
        : "no speak route"
    );
  } catch (err) {
    load("routes/voice.js registers exactly the two intended voice routes", false, err.message);
  }

  console.log("");
  console.log("Feature assertions — voice transcription backend");

  if (!voiceService) {
    // The baseline has no voice module. Every feature must fail LOUDLY — a
    // missing module must never be mistaken for satisfied behaviour.
    for (const name of FEATURE_NAMES) {
      feature(name, false, "voiceService.js not present in this tree");
    }
  } else {
    await runFeatureAssertions(voiceService, routeRegistration);
  }

  console.log("");
  console.log("Server wiring / structural guards — registration and configuration");
  console.log(
    "  tags: (src) source text · (cfg) production config lifted out and evaluated · (exec) production function executed"
  );
  await runWiringAssertions({ voiceService, routeRegistration, rawCalls });

  console.log("");
  console.log("Invariant regression guards — untouched systems");
  runInvariants();

  console.log("");
  console.log(`Feature assertions   : ${featurePass} passed, ${featureFail} failed`);
  console.log(`Server wiring guards : ${wiringPass} passed, ${wiringFail} failed`);
  console.log(`Invariant guards     : ${invariantPass} passed, ${invariantFail} failed`);
  console.log(`Load / parse checks  : ${loadPass} passed, ${loadFail} failed`);
  console.log("");

  const failed = featureFail + wiringFail + invariantFail + loadFail;
  console.log(`RESULT: ${failed === 0 ? "PASS" : "FAIL"}`);

  if (failed > 0) process.exitCode = 1;
}

async function runFeatureAssertions(voiceService, routeRegistration) {
  const {
    MAX_AUDIO_BYTES,
    TRANSCRIPTION_MODEL,
    TRANSCRIPTION_URL,
    buildAudioFilename,
    buildTranscriptionMultipartBody,
    getAudioFileExtension,
    handleTranscriptionRequest,
    normalizeAudioMime,
    transcribeAudio,
  } = voiceService;

  const AUDIO = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0xff, 0x10, 0x99]);
  const BOUNDARY = "----tohiVoiceFIXEDBOUNDARY";
  const FAKE_KEY = "test-key-not-real";

  const okProvider = (text) => async () => ({
    ok: true,
    status: 200,
    json: async () => ({ text }),
  });

  /* 1 */
  feature(
    FEATURE_NAMES[0],
    normalizeAudioMime("audio/webm") === "audio/webm" &&
      normalizeAudioMime("audio/webm;codecs=opus") === "audio/webm" &&
      normalizeAudioMime("audio/webm; codecs=opus") === "audio/webm" &&
      normalizeAudioMime("AUDIO/MP4") === "audio/mp4" &&
      normalizeAudioMime("audio/mp4;codecs=mp4a.40.2") === "audio/mp4" &&
      normalizeAudioMime("audio/mpeg") === "audio/mpeg" &&
      normalizeAudioMime("audio/wav") === "audio/wav" &&
      normalizeAudioMime("audio/x-wav") === "audio/wav"
  );

  /* 2 */
  feature(
    FEATURE_NAMES[1],
    normalizeAudioMime("audio/ogg") === null &&
      normalizeAudioMime("audio/ogg;codecs=opus") === null &&
      normalizeAudioMime("application/json") === null &&
      normalizeAudioMime("text/plain") === null &&
      normalizeAudioMime("") === null &&
      normalizeAudioMime(undefined) === null &&
      normalizeAudioMime(null) === null
  );

  /* 3 */
  feature(
    FEATURE_NAMES[2],
    getAudioFileExtension("audio/webm") === "webm" &&
      getAudioFileExtension("audio/mp4") === "mp4" &&
      getAudioFileExtension("audio/mpeg") === "mp3" &&
      getAudioFileExtension("audio/wav") === "wav" &&
      getAudioFileExtension("audio/ogg") === null &&
      buildAudioFilename("audio/webm") === "audio.webm" &&
      buildAudioFilename("audio/ogg") === null
  );

  const multipart = buildTranscriptionMultipartBody({
    audio: AUDIO,
    normalizedMime: "audio/webm",
    boundary: BOUNDARY,
  });
  const multipartText = multipart.body.toString("latin1");

  /* 4 */
  feature(
    FEATURE_NAMES[3],
    multipartText.includes('Content-Disposition: form-data; name="model"') &&
      multipartText.includes(TRANSCRIPTION_MODEL) &&
      TRANSCRIPTION_MODEL === "gpt-transcribe"
  );

  /* 5 */
  const filePartCount = (
    multipartText.match(/Content-Disposition: form-data; name="file"/g) || []
  ).length;
  feature(
    FEATURE_NAMES[4],
    filePartCount === 1 &&
      multipartText.includes('filename="audio.webm"') &&
      multipart.contentType === `multipart/form-data; boundary=${BOUNDARY}`
  );

  /* 6 — the audio sits verbatim between the header block and the closing boundary */
  const tail = Buffer.from(`\r\n--${BOUNDARY}--\r\n`, "utf8");
  const audioStart = multipart.body.length - tail.length - AUDIO.length;
  feature(
    FEATURE_NAMES[5],
    multipart.body.includes(AUDIO) &&
      multipart.body.slice(multipart.body.length - tail.length).equals(tail) &&
      multipart.body.slice(audioStart, audioStart + AUDIO.length).equals(AUDIO)
  );

  /* 7 + 8 */
  const calls = [];
  const providerResult = await transcribeAudio({
    audio: AUDIO,
    normalizedMime: "audio/webm",
    apiKey: FAKE_KEY,
    boundary: BOUNDARY,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ text: " hello there " }) };
    },
  });

  feature(
    FEATURE_NAMES[6],
    calls.length === 1 &&
      calls[0].url === "https://api.openai.com/v1/audio/transcriptions" &&
      calls[0].url === TRANSCRIPTION_URL &&
      calls[0].options.method === "POST"
  );

  feature(
    FEATURE_NAMES[7],
    calls[0]?.options?.headers?.Authorization === `Bearer ${FAKE_KEY}` &&
      // The key travels only in the outbound header — never in the body, and
      // never in anything returned to the caller.
      !multipartText.includes(FAKE_KEY) &&
      !JSON.stringify(providerResult).includes(FAKE_KEY)
  );

  /* 22 — a Content-Length that disagrees with the body truncates or stalls the
     upload at the provider, so it is asserted against the buffer actually
     handed to fetch, not against a recomputed expectation. */
  const sentHeaders = calls[0]?.options?.headers || {};
  const sentBody = calls[0]?.options?.body;
  feature(
    FEATURE_NAMES[21],
    Buffer.isBuffer(sentBody) &&
      typeof sentHeaders["Content-Length"] === "string" &&
      Number(sentHeaders["Content-Length"]) === sentBody.length &&
      sentBody.length === multipart.body.length &&
      sentBody.equals(multipart.body),
    `Content-Length ${String(sentHeaders["Content-Length"])} vs body ${
      Buffer.isBuffer(sentBody) ? sentBody.length : "not a Buffer"
    }`
  );

  /* 9 */
  const noKeyCalls = [];
  const noKeyResult = await transcribeAudio({
    audio: AUDIO,
    normalizedMime: "audio/webm",
    apiKey: "",
    fetchImpl: async (...args) => {
      noKeyCalls.push(args);
      return { ok: true, status: 200, json: async () => ({ text: "should not happen" }) };
    },
  });
  feature(
    FEATURE_NAMES[8],
    noKeyCalls.length === 0 &&
      noKeyResult.ok === false &&
      noKeyResult.outcome === "voice_unavailable"
  );

  /* 10 */
  const failCalls = [];
  const failResult = await transcribeAudio({
    audio: AUDIO,
    normalizedMime: "audio/webm",
    apiKey: FAKE_KEY,
    fetchImpl: async () => {
      failCalls.push(1);
      return { ok: false, status: 500, json: async () => ({}) };
    },
  });
  feature(
    FEATURE_NAMES[9],
    failCalls.length === 1 &&
      failResult.ok === false &&
      failResult.outcome === "voice_unavailable"
  );

  /* 11 */
  feature(
    FEATURE_NAMES[10],
    providerResult.ok === true && providerResult.transcript === "hello there"
  );

  /* 12 */
  const blank = await transcribeAudio({
    audio: AUDIO,
    normalizedMime: "audio/webm",
    apiKey: FAKE_KEY,
    fetchImpl: okProvider("   \n  "),
  });
  feature(FEATURE_NAMES[11], blank.ok === true && blank.transcript === "");

  /* 13 */
  const malformedShapes = [
    async () => ({ ok: true, status: 200, json: async () => ({}) }),
    async () => ({ ok: true, status: 200, json: async () => ({ text: 42 }) }),
    async () => ({ ok: true, status: 200, json: async () => null }),
    async () => ({ ok: true, status: 200, json: async () => [] }),
    async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      },
    }),
  ];
  let malformedOk = true;
  for (const impl of malformedShapes) {
    const r = await transcribeAudio({
      audio: AUDIO,
      normalizedMime: "audio/webm",
      apiKey: FAKE_KEY,
      fetchImpl: impl,
    });
    if (r.ok !== false || r.outcome !== "voice_unavailable") malformedOk = false;
  }
  feature(FEATURE_NAMES[12], malformedOk);

  /* 14 */
  const abortErr = new Error("aborted");
  abortErr.name = "AbortError";
  const timeoutResult = await transcribeAudio({
    audio: AUDIO,
    normalizedMime: "audio/webm",
    apiKey: FAKE_KEY,
    fetchImpl: async () => {
      throw abortErr;
    },
  });
  const networkResult = await transcribeAudio({
    audio: AUDIO,
    normalizedMime: "audio/webm",
    apiKey: FAKE_KEY,
    fetchImpl: async () => {
      throw new Error("ECONNRESET");
    },
  });
  feature(
    FEATURE_NAMES[13],
    timeoutResult.ok === false &&
      timeoutResult.outcome === "voice_unavailable" &&
      timeoutResult.category === "timeout" &&
      networkResult.ok === false &&
      networkResult.outcome === "voice_unavailable"
  );

  /* 15 / 16 / 17 — full request decisions; the provider must never be reached */
  const neverCalled = [];
  const guard = async () => {
    neverCalled.push(1);
    return { ok: true, status: 200, json: async () => ({ text: "x" }) };
  };

  const emptyRes = await handleTranscriptionRequest({
    body: Buffer.alloc(0),
    contentType: "audio/webm",
    log: createLogSpy().sink,
    fetchImpl: guard,
    apiKey: FAKE_KEY,
  });
  feature(
    FEATURE_NAMES[14],
    emptyRes.status === 400 &&
      emptyRes.body.error === "empty_audio" &&
      neverCalled.length === 0
  );

  const unsupportedRes = await handleTranscriptionRequest({
    body: AUDIO,
    contentType: "audio/ogg;codecs=opus",
    log: createLogSpy().sink,
    fetchImpl: guard,
    apiKey: FAKE_KEY,
  });
  feature(
    FEATURE_NAMES[15],
    unsupportedRes.status === 415 &&
      unsupportedRes.body.error === "unsupported_audio" &&
      neverCalled.length === 0
  );

  const oversizedRes = await handleTranscriptionRequest({
    body: Buffer.alloc(MAX_AUDIO_BYTES + 1),
    contentType: "audio/webm",
    log: createLogSpy().sink,
    fetchImpl: guard,
    apiKey: FAKE_KEY,
  });
  feature(
    FEATURE_NAMES[16],
    MAX_AUDIO_BYTES === 8 * 1024 * 1024 &&
      oversizedRes.status === 413 &&
      oversizedRes.body.error === "audio_too_large" &&
      neverCalled.length === 0
  );

  /* 18 + 20 — the real route handler chain, through the express stub */
  let routeSetsNoStore = false;
  let boundedTooLarge = false;
  let boundedGenericError = false;

  if (routeRegistration) {
    const [parseMiddleware, routeHandler] = routeRegistration.handlers;

    const okRes = createFakeRes();
    const okReq = {
      body: AUDIO,
      get: (h) => (String(h).toLowerCase() === "content-type" ? "audio/webm;codecs=opus" : undefined),
      log: createLogSpy().sink,
    };
    await new Promise((resolve) => parseMiddleware(okReq, okRes, resolve));
    await routeHandler(okReq, okRes);
    routeSetsNoStore = okRes.headers["cache-control"] === "no-store";

    // An oversized recording must be answered 413 by the route itself, never
    // left to the global handler that returns 500 "Internal server error".
    const bigRes = createFakeRes();
    const parserError = new Error("request entity too large");
    parserError.type = "entity.too.large";
    parserError.status = 413;

    let reachedHandler = false;
    const bigReq = {
      __parserError: parserError,
      body: undefined,
      get: () => "audio/webm",
      log: createLogSpy().sink,
    };
    parseMiddleware(bigReq, bigRes, () => {
      reachedHandler = true;
    });

    boundedTooLarge =
      reachedHandler === false &&
      bigRes.statusCode === 413 &&
      bigRes.payload?.error === "audio_too_large" &&
      bigRes.headers["cache-control"] === "no-store";

    // The other way this middleware is entered with an error: a non-size
    // failure — a truncated or unreadable stream. It carries no `type` and no
    // status, so it must take the generic branch: 400 empty_audio, still
    // no-store, still no continuation into the transcription handler.
    const genericRes = createFakeRes();
    let genericReachedHandler = false;
    const genericReq = {
      __parserError: new Error("unexpected end of stream"),
      body: undefined,
      get: () => "audio/webm",
      log: createLogSpy().sink,
    };
    parseMiddleware(genericReq, genericRes, () => {
      genericReachedHandler = true;
    });

    boundedGenericError =
      genericReachedHandler === false &&
      genericRes.statusCode === 400 &&
      genericRes.payload?.error === "empty_audio" &&
      genericRes.headers["cache-control"] === "no-store";
  }

  feature(FEATURE_NAMES[17], routeSetsNoStore, "route did not set Cache-Control: no-store");
  feature(FEATURE_NAMES[19], boundedTooLarge, "oversized parser error not bounded to 413");
  feature(
    FEATURE_NAMES[20],
    boundedGenericError,
    "generic parser error not bounded to 400 empty_audio with no-store"
  );

  /* 19 — logging carries operational facts only */
  const spy = createLogSpy();
  await handleTranscriptionRequest({
    body: AUDIO,
    contentType: "audio/webm",
    log: spy.sink,
    apiKey: FAKE_KEY,
    fetchImpl: okProvider(" a spoken sentence "),
  });

  const loggedText = JSON.stringify(spy.entries);
  const noBuffers = !spy.entries.some((e) =>
    Object.values(e.obj || {}).some((v) => Buffer.isBuffer(v))
  );
  feature(
    FEATURE_NAMES[18],
    spy.entries.length > 0 &&
      noBuffers &&
      !loggedText.includes("a spoken sentence") &&
      !loggedText.includes(FAKE_KEY) &&
      !loggedText.includes(AUDIO.toString("hex")) &&
      !loggedText.includes("Bearer")
  );
}

/* -------------------------------------------------------------------------- */
/* Server wiring / structural guards                                          */
/* -------------------------------------------------------------------------- */

/**
 * Returns the source text of the single argument handed to `opener`, or null.
 *
 * String literals and comments are skipped so a brace or paren inside one
 * cannot unbalance the scan. This reads text out of server.js; server.js is
 * never executed, and express-rate-limit is never loaded.
 */
function extractCallArgumentSource(source, opener) {
  const at = source.indexOf(opener);
  if (at === -1) return null;

  const start = at + opener.length;
  let i = start;
  let depth = 1;
  let quote = null;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (quote) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      i += 1;
      continue;
    }

    if (ch === "/" && next === "/") {
      const nl = source.indexOf("\n", i);
      i = nl === -1 ? source.length : nl;
      continue;
    }

    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i);
      i = end === -1 ? source.length : end + 2;
      continue;
    }

    if (ch === "(" || ch === "{" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i);
    }

    i += 1;
  }

  return null;
}

/**
 * Evaluates one options object literal lifted out of server.js in an empty
 * sandbox.
 *
 * The result is the real configuration production passes to rateLimit — the
 * actual numbers and the actual handler function, not a restatement of them.
 * express-rate-limit never sees it, so this proves what was configured, not
 * what the limiter does with it at runtime.
 */
function evaluateOptionsLiteral(argumentSource) {
  if (!argumentSource) return null;

  try {
    const value = vm.runInNewContext(`(${argumentSource})`, Object.create(null), {
      timeout: 1000,
    });
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

async function runWiringAssertions({ voiceService, routeRegistration, rawCalls }) {
  const serverSource = readIfPresent("server.js") || "";
  const routeSource = readIfPresent("routes", "voice.js") || "";
  const calls = Array.isArray(rawCalls) ? rawCalls : [];

  /* W1 — without the import nothing else can be mounted. */
  wiring(
    WIRING_NAMES[0],
    /const voiceRoutes = require\("\.\/routes\/voice"\);/.test(serverSource),
    "server.js does not require ./routes/voice"
  );

  /* W2 — the route module reaching the app at all. */
  const voiceMounts = serverSource.match(/app\.use\("\/api",\s*voiceRoutes\)/g) || [];
  wiring(
    WIRING_NAMES[1],
    voiceMounts.length === 1,
    `found ${voiceMounts.length} app.use("/api", voiceRoutes) mount(s)`
  );

  /* W3 — the limiter on the exact transcription path, not a broader prefix. */
  const limiterMounts =
    serverSource.match(/app\.use\("\/api\/voice\/transcribe",\s*voiceTranscribeLimiter\)/g) || [];
  wiring(
    WIRING_NAMES[2],
    limiterMounts.length === 1,
    `found ${limiterMounts.length} voiceTranscribeLimiter mount(s) on /api/voice/transcribe`
  );

  /* W4 — recordings must not borrow from, or lend to, the chat budget. */
  const declaresOwnLimiter = /const voiceTranscribeLimiter = rateLimit\(\{/.test(serverSource);
  const aliasesAnotherLimiter =
    /const voiceTranscribeLimiter\s*=\s*(generalApiLimiter|aiLimiter|eventLimiter)\b/.test(
      serverSource
    );
  const voicePathOnForeignLimiter =
    /app\.use\("\/api\/voice[^"]*",\s*(generalApiLimiter|aiLimiter|eventLimiter)\)/.test(
      serverSource
    );
  const othersStillTheirOwn =
    /const generalApiLimiter = rateLimit\(\{/.test(serverSource) &&
    /const aiLimiter = rateLimit\(\{/.test(serverSource) &&
    /const eventLimiter = rateLimit\(\{/.test(serverSource);
  wiring(
    WIRING_NAMES[3],
    declaresOwnLimiter && !aliasesAnotherLimiter && !voicePathOnForeignLimiter && othersStillTheirOwn,
    "the voice limiter is missing, aliased to another limiter, or the voice path is guarded by a shared budget"
  );

  /* W5 / W6 / W7 — the configuration production actually passes to rateLimit. */
  const voiceLimiterOptions = evaluateOptionsLiteral(
    extractCallArgumentSource(serverSource, "const voiceTranscribeLimiter = rateLimit(")
  );

  wiring(
    WIRING_NAMES[4],
    Boolean(voiceLimiterOptions) &&
      voiceLimiterOptions.windowMs === 60 * 1000 &&
      voiceLimiterOptions.max === 12 &&
      voiceLimiterOptions.standardHeaders === true &&
      voiceLimiterOptions.legacyHeaders === false,
    voiceLimiterOptions
      ? `windowMs=${String(voiceLimiterOptions.windowMs)} max=${String(
          voiceLimiterOptions.max
        )} standardHeaders=${String(voiceLimiterOptions.standardHeaders)} legacyHeaders=${String(
          voiceLimiterOptions.legacyHeaders
        )}`
      : "no voiceTranscribeLimiter configuration found in server.js"
  );

  let limitRes = null;
  let limitHandlerError = null;

  if (voiceLimiterOptions && typeof voiceLimiterOptions.handler === "function") {
    const staged = createFakeRes();
    try {
      voiceLimiterOptions.handler(
        { path: "/api/voice/transcribe", log: createLogSpy().sink },
        staged
      );
      limitRes = staged;
    } catch (err) {
      limitHandlerError = err && err.message;
    }
  }

  wiring(
    WIRING_NAMES[5],
    Boolean(limitRes) &&
      limitRes.statusCode === 429 &&
      limitRes.headers["cache-control"] === "no-store",
    limitHandlerError
      ? `429 handler threw: ${limitHandlerError}`
      : limitRes
        ? `status ${String(limitRes.statusCode)}, cache-control ${String(
            limitRes.headers["cache-control"]
          )}`
        : "no voice 429 handler to execute"
  );

  const limitBody = limitRes ? limitRes.payload : null;
  const limitKeys = limitBody && typeof limitBody === "object" ? Object.keys(limitBody) : [];
  // A rate-limit reply is the easiest place to leak that voice is an OpenAI
  // call. The client should learn only that it asked too often.
  const providerTerms = /openai|gpt|whisper|anthropic|bearer|api[\s_-]?key|node-fetch|upstream|provider|transcriptions/i;

  wiring(
    WIRING_NAMES[6],
    limitKeys.length === 1 &&
      limitKeys[0] === "error" &&
      typeof limitBody.error === "string" &&
      limitBody.error.length > 0 &&
      !providerTerms.test(JSON.stringify(limitBody)),
    limitBody ? `429 body was ${JSON.stringify(limitBody)}` : "voice 429 handler produced no body"
  );

  /* W8 — the raw parser belongs to the one route, and the global JSON parser
     is untouched. Requiring the parser to be PRESENT in routes/voice.js is what
     stops this passing vacuously on a tree that has no voice route at all. */
  wiring(
    WIRING_NAMES[7],
    routeSource.includes("express.raw(") &&
      !/express\.raw\s*\(/.test(serverSource) &&
      /app\.use\(express\.json\(\{ limit: "75kb" \}\)\);/.test(serverSource),
    "express.raw is absent from routes/voice.js, leaked into server.js, or the global 75kb JSON limit moved"
  );

  /* W9 / W10 — the options routes/voice.js really handed to express.raw. */
  const rawOptions = calls[0] || null;
  const expectedLimit = voiceService ? voiceService.MAX_AUDIO_BYTES : null;

  wiring(
    WIRING_NAMES[8],
    Boolean(rawOptions) &&
      calls.length === 1 &&
      expectedLimit === 8 * 1024 * 1024 &&
      rawOptions.limit === expectedLimit,
    rawOptions
      ? `express.raw limit=${String(rawOptions.limit)}, MAX_AUDIO_BYTES=${String(expectedLimit)}`
      : "express.raw was never called by routes/voice.js"
  );

  wiring(
    WIRING_NAMES[9],
    Boolean(rawOptions) &&
      typeof rawOptions.type === "function" &&
      Boolean(rawOptions.type({ headers: { "content-type": "audio/webm;codecs=opus" } })) &&
      Boolean(rawOptions.type({ headers: { "content-type": "audio/ogg;codecs=opus" } })) &&
      Boolean(rawOptions.type({ headers: {} })),
    rawOptions
      ? `express.raw type option is ${typeof rawOptions.type} and did not accept every request`
      : "express.raw was never called by routes/voice.js"
  );

  /* W11 — executed end to end through the production wrapper and handler.
     A narrowed or removed `type` shows up here as a skipped body: body-parser
     would leave req.body as {}, the recording would look absent, and an
     unsupported type would be answered 400 empty_audio instead of the explicit
     415 the client needs to tell "wrong format" from "nothing recorded". */
  let unsupportedReachesHandler = false;
  let supportedBodyIsParsed = false;
  let wiringDetail = "no registered voice route to execute";

  if (routeRegistration && voiceService) {
    const [parseMiddleware, routeHandler] = routeRegistration.handlers;
    const AUDIO = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0xff]);

    const oggReq = {
      __rawBody: AUDIO,
      headers: { "content-type": "audio/ogg;codecs=opus" },
      get: (h) =>
        String(h).toLowerCase() === "content-type" ? "audio/ogg;codecs=opus" : undefined,
      log: createLogSpy().sink,
    };
    const oggRes = createFakeRes();
    await new Promise((resolve) => parseMiddleware(oggReq, oggRes, resolve));
    await routeHandler(oggReq, oggRes);

    unsupportedReachesHandler =
      Buffer.isBuffer(oggReq.body) &&
      oggReq.body.equals(AUDIO) &&
      oggRes.statusCode === 415 &&
      oggRes.payload?.error === "unsupported_audio";

    const webmReq = {
      __rawBody: AUDIO,
      headers: { "content-type": "audio/webm;codecs=opus" },
      get: (h) =>
        String(h).toLowerCase() === "content-type" ? "audio/webm;codecs=opus" : undefined,
      log: createLogSpy().sink,
    };
    const webmRes = createFakeRes();
    await new Promise((resolve) => parseMiddleware(webmReq, webmRes, resolve));
    supportedBodyIsParsed = Buffer.isBuffer(webmReq.body) && webmReq.body.equals(AUDIO);

    wiringDetail = `unsupported reached handler: ${String(
      unsupportedReachesHandler
    )}, supported body parsed: ${String(supportedBodyIsParsed)}`;
  }

  wiring(WIRING_NAMES[10], unsupportedReachesHandler && supportedBodyIsParsed, wiringDetail);

  /* W12 — the parser must be wrapped, not mounted bare: a bare express.raw
     sends its own errors to the global handler, which answers 500. The stub
     tags the raw middleware with __options, so a bare mount is visible here. */
  const handlers = (routeRegistration && routeRegistration.handlers) || [];
  wiring(
    WIRING_NAMES[11],
    handlers.length === 2 &&
      typeof handlers[0] === "function" &&
      handlers[0].__options === undefined &&
      typeof handlers[1] === "function" &&
      handlers[1].constructor.name === "AsyncFunction" &&
      calls.length === 1,
    `route registered ${handlers.length} handler(s); express.raw called ${calls.length} time(s)`
  );
}

function runInvariants() {
  const serverSource = readIfPresent("server.js") || "";
  const aiRouteSource = readIfPresent("routes", "ai.js") || "";
  const aiServiceSource = readIfPresent("services", "aiService.js") || "";
  const packageSource = readIfPresent("package.json") || "";

  invariant(
    "global JSON body limit is still 75kb",
    /express\.json\(\{ limit: "75kb" \}\)/.test(serverSource)
  );

  invariant(
    "existing limiter budgets are unchanged (general 60, ai 10, event 120)",
    /const generalApiLimiter = rateLimit\(\{\s*windowMs: 60 \* 1000,\s*max: 60,/.test(serverSource) &&
      /const aiLimiter = rateLimit\(\{\s*windowMs: 60 \* 1000,\s*max: 10,/.test(serverSource) &&
      /const eventLimiter = rateLimit\(\{\s*windowMs: 60 \* 1000,\s*max: 120,/.test(serverSource)
  );

  invariant(
    "ai-chat and tohi-pick-review still mount on the AI limiter",
    /app\.use\("\/api\/ai-chat", aiLimiter\);/.test(serverSource) &&
      /app\.use\("\/api\/tohi-pick-review", aiLimiter\);/.test(serverSource)
  );

  invariant(
    "the chat route still answers { reply } from getAIResponse",
    /router\.post\("\/ai-chat"/.test(aiRouteSource) &&
      /const reply = await getAIResponse\(message, sessionData\);/.test(aiRouteSource) &&
      /return res\.json\(\{ reply \}\);/.test(aiRouteSource)
  );

  invariant(
    "the Anthropic reasoning provider and model are unchanged",
    /const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";/.test(aiServiceSource) &&
      /apiKey: process\.env\.ANTHROPIC_API_KEY,/.test(aiServiceSource)
  );

  invariant(
    "no new backend dependency was added",
    packageSource.length > 0 && !/multer|form-data|openai|busboy|formidable/.test(packageSource)
  );

  invariant(
    "no provider key is referenced through a REACT_APP_ variable",
    !/REACT_APP_OPENAI/.test(serverSource) &&
      !/REACT_APP_OPENAI/.test(readIfPresent("services", "voiceService.js") || "")
  );
}

main().catch((err) => {
  console.error("");
  console.error(`HARNESS ERROR: ${err && err.message}`);
  process.exitCode = 1;
});
