#!/usr/bin/env node

// TOHI Voice Phase A3 — spoken reply harness.
//
// HOW EACH CLAIM IS ESTABLISHED, stated plainly so nothing reads as stronger
// than it is:
//
//   (exec)   real production code is executed — the frontend speech helpers,
//            the frontend API helper, and the BACKEND speech service, with
//            `fetch` injected. No network, no OpenAI call, no API key.
//   (src)    a structural fact about the source: how many call sites exist,
//            where a decision lives, what was NOT introduced.
//
// WHAT THIS HARNESS DOES NOT ESTABLISH. Source structure cannot prove which
// origin speaks, playback ordering, autoplay rejection, or object-URL
// lifecycle. Those are proved by src/__tests__/voiceSpeechAppIntegration.test.js,
// which mounts the real <App /> and drives real events.
//
// FEATURE assertions must fail against the pinned pre-phase baseline, so a
// missing speech layer can never pass vacuously.
//
// Usage: node scripts/voiceSpeechHarness.cjs [repoRoot]

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const fs = require("fs");
const path = require("path");
const Module = require("module");

const repoRoot = path.resolve(process.argv[2] || path.join(__dirname, "..", ".."));
const frontendSrc = path.join(repoRoot, "frontend", "src");
const backendRoot = path.join(repoRoot, "backend");

let featurePass = 0;
let featureFail = 0;
let wiringPass = 0;
let wiringFail = 0;
let invariantPass = 0;
let invariantFail = 0;

function record(kind, name, ok, detail) {
  console.log(`  ${ok ? "PASS" : "FAIL"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
  if (kind === "feature") ok ? featurePass++ : featureFail++;
  else if (kind === "wiring") ok ? wiringPass++ : wiringFail++;
  else ok ? invariantPass++ : invariantFail++;
}

const feature = (n, ok, d) => record("feature", n, ok === true, d);
const wiring = (n, ok, d) => record("wiring", n, ok === true, d);
const invariant = (n, ok, d) => record("invariant", n, ok === true, d);

const readOr = (...segments) => {
  const target = path.join(...segments);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
};

const strip = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const appSource = readOr(frontendSrc, "App.jsx");
const apiSource = readOr(frontendSrc, "api.js");
const tohiSource = readOr(frontendSrc, "components", "TohiTab.jsx");
const speechUtilSource = readOr(frontendSrc, "utils", "voiceSpeech.js");
const serverSource = readOr(backendRoot, "server.js");
const routeSource = readOr(backendRoot, "routes", "voice.js");
const speechServiceSource = readOr(backendRoot, "services", "voiceSpeechService.js");
const transcribeServiceSource = readOr(backendRoot, "services", "voiceService.js");

const appCode = strip(appSource);
const tohiCode = strip(tohiSource);
const apiCode = strip(apiSource);
const speechUtilCode = strip(speechUtilSource);
const routeCode = strip(routeSource);
const serverCode = strip(serverSource);

/* ------------------------------------------------------------------------ */

let speechService = null;
let speechUtil = null;
let apiModule = null;
let loadError = "";

try {
  const babel = require("@babel/core");
  const origJs = Module._extensions[".js"];
  const compile = (module, filename) => {
    if (filename.includes("node_modules") || filename.includes(`${path.sep}backend${path.sep}`)) {
      return origJs(module, filename);
    }
    const out = babel.transformSync(fs.readFileSync(filename, "utf8"), {
      filename,
      presets: [[require.resolve("babel-preset-react-app"), { runtime: "automatic" }]],
      babelrc: false,
      configFile: false,
    });
    return module._compile(out.code, filename);
  };
  Module._extensions[".js"] = compile;
  Module._extensions[".jsx"] = compile;

  const svcPath = path.join(backendRoot, "services", "voiceSpeechService.js");
  if (fs.existsSync(svcPath)) {
    // The service requires the app logger, which pulls pino. Stubbed so this
    // harness runs without installed backend packages.
    const originalLoad = Module._load;
    Module._load = function patched(request, parent, isMain) {
      if (request === "../logger") return { info() {}, warn() {}, error() {} };
      return originalLoad(request, parent, isMain);
    };
    try {
      speechService = require(svcPath);
    } finally {
      Module._load = originalLoad;
    }
  }

  const utilPath = path.join(frontendSrc, "utils", "voiceSpeech.js");
  if (fs.existsSync(utilPath)) speechUtil = require(utilPath);

  const apiPath = path.join(frontendSrc, "api.js");
  if (fs.existsSync(apiPath)) apiModule = require(apiPath);
} catch (err) {
  loadError = err && err.message;
}

/* ------------------------------------------------------------------------ */

async function main() {
  console.log("");
  console.log(`TOHI Voice spoken-reply harness (Phase A3) — repo root: ${repoRoot}`);
  console.log("");
  console.log("  tags: (exec) production code executed · (src) structural wiring");
  console.log("  behavioural claims (which origin speaks, playback, autoplay, URL lifecycle)");
  console.log("  are proved in src/__tests__/voiceSpeechAppIntegration.test.js, not here.");
  console.log("");
  console.log("Feature assertions — spoken reply layer");
  await runFeatures();

  console.log("");
  console.log("Wiring guards — endpoint, limits, scope");
  runWiring();

  console.log("");
  console.log("Invariant regression guards — untouched systems");
  runInvariants();

  console.log("");
  console.log(`Feature assertions : ${featurePass} passed, ${featureFail} failed`);
  console.log(`Wiring guards      : ${wiringPass} passed, ${wiringFail} failed`);
  console.log(`Invariant guards   : ${invariantPass} passed, ${invariantFail} failed`);
  console.log("");

  const failed = featureFail + wiringFail + invariantFail;
  console.log(`RESULT: ${failed === 0 ? "PASS" : "FAIL"}`);
  if (failed > 0) process.exitCode = 1;
}

async function runFeatures() {
  const NAMES = [
    "1. (exec) backend refuses empty and over-600-character replies before any call",
    "2. (exec) backend sends tts-1 / mp3 with the key only in the Authorization header",
    "3. (exec) backend never retries and bounds every provider failure",
    "4. (exec) backend refuses an oversized or empty audio body",
    "5. (exec) frontend helper posts JSON once and returns the audio Blob",
    "6. (exec) frontend helper never retries and exposes bounded categories only",
    "7. (exec) frontend bounds match the backend bounds exactly",
    "8. (exec) frontend refuses a response that does not claim audio/mpeg",
    "9. (exec) frontend refuses an oversized Content-Length BEFORE reading the body",
    "10. (exec) frontend enforces the 2 MB ceiling and the Blob MIME on what arrives",
    "11. (exec) backend refuses an oversized Content-Length before consuming the body",
    "12. (exec) backend refuses a successful response that does not claim MP3",
  ];

  if (!speechService || !speechUtil || !apiModule) {
    const reason = loadError || "speech modules not present in this tree";
    NAMES.forEach((n) => feature(n, false, reason));
    return;
  }

  const {
    MAX_SPEECH_BYTES,
    MAX_SPEECH_CHARS,
    SPEECH_MODEL,
    SPEECH_URL,
    handleSpeechRequest,
    synthesizeSpeech,
    validateSpeechText,
  } = speechService;

  const FAKE_KEY = "test-key-not-real";

  /* 1 */
  const empty = validateSpeechText("   ");
  const long = validateSpeechText("a".repeat(MAX_SPEECH_CHARS + 1));
  const guardCalls = [];
  const guard = async (...args) => {
    guardCalls.push(args);
    return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(16) };
  };
  const emptyRes = await handleSpeechRequest({ text: "  ", fetchImpl: guard, apiKey: FAKE_KEY });
  const longRes = await handleSpeechRequest({
    text: "a".repeat(MAX_SPEECH_CHARS + 1),
    fetchImpl: guard,
    apiKey: FAKE_KEY,
  });
  feature(
    NAMES[0],
    MAX_SPEECH_CHARS === 600 &&
      empty.ok === false &&
      empty.outcome === "empty_text" &&
      long.ok === false &&
      long.outcome === "text_too_long" &&
      emptyRes.status === 400 &&
      emptyRes.body.error === "empty_text" &&
      longRes.status === 413 &&
      longRes.body.error === "text_too_long" &&
      guardCalls.length === 0,
    `provider called ${guardCalls.length} time(s)`
  );

  /* 2 */
  const calls = [];
  const okResult = await synthesizeSpeech({
    text: "Head to Frontierland now.",
    apiKey: FAKE_KEY,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(32) };
    },
  });
  const sentBody = calls[0] ? JSON.parse(calls[0].options.body) : {};
  feature(
    NAMES[1],
    calls.length === 1 &&
      calls[0].url === SPEECH_URL &&
      calls[0].url === "https://api.openai.com/v1/audio/speech" &&
      calls[0].options.method === "POST" &&
      calls[0].options.headers.Authorization === `Bearer ${FAKE_KEY}` &&
      sentBody.model === SPEECH_MODEL &&
      SPEECH_MODEL === "tts-1" &&
      sentBody.response_format === "mp3" &&
      sentBody.input === "Head to Frontierland now." &&
      okResult.ok === true &&
      okResult.contentType === "audio/mpeg" &&
      // the key never travels in the body or the result
      !calls[0].options.body.includes(FAKE_KEY) &&
      !JSON.stringify(Object.keys(okResult)).includes(FAKE_KEY)
  );

  /* 3 */
  const failCalls = [];
  const failed = await synthesizeSpeech({
    text: "a reply",
    apiKey: FAKE_KEY,
    fetchImpl: async () => {
      failCalls.push(1);
      return { ok: false, status: 500 };
    },
  });
  const abortErr = new Error("aborted");
  abortErr.name = "AbortError";
  const timedOut = await synthesizeSpeech({
    text: "a reply",
    apiKey: FAKE_KEY,
    fetchImpl: async () => {
      throw abortErr;
    },
  });
  const noKey = [];
  const unconfigured = await synthesizeSpeech({
    text: "a reply",
    apiKey: "",
    fetchImpl: async () => {
      noKey.push(1);
      return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) };
    },
  });
  const clientView = await handleSpeechRequest({
    text: "a reply",
    apiKey: FAKE_KEY,
    fetchImpl: async () => ({ ok: false, status: 500 }),
  });
  feature(
    NAMES[2],
    failCalls.length === 1 &&
      failed.outcome === "speech_unavailable" &&
      timedOut.category === "timeout" &&
      noKey.length === 0 &&
      unconfigured.category === "not_configured" &&
      clientView.status === 503 &&
      clientView.body.error === "speech_unavailable" &&
      // no upstream status or provider name reaches the client
      !/openai|tts|provider_status/i.test(JSON.stringify(clientView.body))
  );

  /* 4 */
  const oversized = await synthesizeSpeech({
    text: "a reply",
    apiKey: FAKE_KEY,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(MAX_SPEECH_BYTES + 1),
    }),
  });
  const emptyAudio = await synthesizeSpeech({
    text: "a reply",
    apiKey: FAKE_KEY,
    fetchImpl: async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(0) }),
  });
  feature(
    NAMES[3],
    MAX_SPEECH_BYTES === 2 * 1024 * 1024 &&
      oversized.ok === false &&
      oversized.category === "audio_too_large" &&
      emptyAudio.ok === false &&
      emptyAudio.category === "malformed_response"
  );

  /* 5 + 6 */
  const httpCalls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    httpCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      headers: { get: (n) => (String(n).toLowerCase() === "content-type" ? "audio/mpeg" : null) },
      blob: async () => ({ size: 4096, type: "audio/mpeg" }),
    };
  };
  let blob = null;
  try {
    blob = await apiModule.synthesizeSpeechAudio("  Head to  Frontierland.  ");
  } catch (err) {
    blob = { error: err && err.message };
  }
  feature(
    NAMES[4],
    httpCalls.length === 1 &&
      /\/api\/voice\/speak$/.test(httpCalls[0].url) &&
      httpCalls[0].options.method === "POST" &&
      httpCalls[0].options.headers["Content-Type"] === "application/json" &&
      JSON.parse(httpCalls[0].options.body).text === "Head to Frontierland." &&
      blob &&
      blob.size === 4096
  );

  const retryCalls = [];
  global.fetch = async () => {
    retryCalls.push(1);
    return { ok: false, status: 503, text: async () => "openai upstream detail" };
  };
  let category = "";
  try {
    await apiModule.synthesizeSpeechAudio("a reply");
  } catch (err) {
    category = err && err.category;
  }
  feature(
    NAMES[5],
    retryCalls.length === 1 &&
      category === "speech_unavailable" &&
      !/openai|upstream/i.test(category)
  );
  if (originalFetch === undefined) delete global.fetch;
  else global.fetch = originalFetch;

  /* 7 */
  feature(
    NAMES[6],
    speechUtil.MAX_SPEECH_CHARS === MAX_SPEECH_CHARS &&
      speechUtil.MAX_SPEECH_BYTES === MAX_SPEECH_BYTES &&
      speechUtil.SPEECH_CONTENT_TYPE === "audio/mpeg"
  );

  /* 8 / 9 / 10 — the frontend response contract, EXECUTED. */
  const headers = (map) => ({
    get: (name) => {
      const key = String(name).toLowerCase();
      const found = Object.keys(map).find((k) => k.toLowerCase() === key);
      return found === undefined ? null : map[found];
    },
  });

  const callHelper = async (response) => {
    const previous = global.fetch;
    global.fetch = async () => response;
    try {
      const value = await apiModule.synthesizeSpeechAudio("a reply");
      return { ok: true, value };
    } catch (err) {
      return { ok: false, category: err && err.category };
    } finally {
      if (previous === undefined) delete global.fetch;
      else global.fetch = previous;
    }
  };

  const goodBlob = { size: 4096, type: "audio/mpeg" };
  const accepted = await callHelper({
    ok: true,
    status: 200,
    headers: headers({ "content-type": "audio/mpeg" }),
    blob: async () => goodBlob,
  });
  const wrongType = await callHelper({
    ok: true,
    status: 200,
    headers: headers({ "content-type": "application/json" }),
    blob: async () => goodBlob,
  });
  const noType = await callHelper({
    ok: true,
    status: 200,
    headers: headers({}),
    blob: async () => goodBlob,
  });
  const casedType = await callHelper({
    ok: true,
    status: 200,
    headers: headers({ "content-type": "Audio/MPEG; charset=binary" }),
    blob: async () => goodBlob,
  });

  feature(
    NAMES[7],
    accepted.ok === true &&
      accepted.value === goodBlob &&
      wrongType.ok === false &&
      wrongType.category === "speech_unavailable" &&
      noType.ok === false &&
      // parameters and casing are tolerated deliberately
      casedType.ok === true,
    `accepted=${accepted.ok} wrongType=${wrongType.category} noType=${noType.category} cased=${casedType.ok}`
  );

  let blobReads = 0;
  const oversizedHeader = await callHelper({
    ok: true,
    status: 200,
    headers: headers({
      "content-type": "audio/mpeg",
      "content-length": String(MAX_SPEECH_BYTES + 1),
    }),
    blob: async () => {
      blobReads += 1;
      return goodBlob;
    },
  });
  let malformedReads = 0;
  const malformedHeader = await callHelper({
    ok: true,
    status: 200,
    headers: headers({ "content-type": "audio/mpeg", "content-length": "not-a-number" }),
    blob: async () => {
      malformedReads += 1;
      return goodBlob;
    },
  });

  feature(
    NAMES[8],
    oversizedHeader.ok === false &&
      oversizedHeader.category === "speech_unavailable" &&
      blobReads === 0 &&
      malformedHeader.ok === false &&
      malformedReads === 0,
    `body reads: oversized=${blobReads} malformed=${malformedReads}`
  );

  const exactCeiling = await callHelper({
    ok: true,
    status: 200,
    headers: headers({ "content-type": "audio/mpeg" }),
    blob: async () => ({ size: MAX_SPEECH_BYTES, type: "audio/mpeg" }),
  });
  const overCeiling = await callHelper({
    ok: true,
    status: 200,
    headers: headers({ "content-type": "audio/mpeg" }),
    blob: async () => ({ size: MAX_SPEECH_BYTES + 1, type: "audio/mpeg" }),
  });
  const emptyBody = await callHelper({
    ok: true,
    status: 200,
    headers: headers({ "content-type": "audio/mpeg" }),
    blob: async () => ({ size: 0, type: "audio/mpeg" }),
  });
  const contradictoryBlob = await callHelper({
    ok: true,
    status: 200,
    headers: headers({ "content-type": "audio/mpeg" }),
    blob: async () => ({ size: 2048, type: "audio/ogg" }),
  });

  feature(
    NAMES[9],
    exactCeiling.ok === true &&
      overCeiling.ok === false &&
      emptyBody.ok === false &&
      contradictoryBlob.ok === false &&
      // a blank blob type is accepted on purpose
      speechUtil.validateSpeechBlob({ size: 1024, type: "" }).ok === true &&
      speechUtil.validateSpeechBlob({ size: 1024, type: "audio/ogg" }).ok === false
  );

  /* 11 / 12 — the backend's own bounds, EXECUTED. */
  const backendHeaders = (map) => ({ get: (n) => map[String(n).toLowerCase()] ?? null });

  let backendBodyReads = 0;
  const backendOversizedHeader = await synthesizeSpeech({
    text: "a reply",
    apiKey: FAKE_KEY,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: backendHeaders({
        "content-type": "audio/mpeg",
        "content-length": String(MAX_SPEECH_BYTES + 1),
      }),
      arrayBuffer: async () => {
        backendBodyReads += 1;
        return new ArrayBuffer(16);
      },
    }),
  });

  feature(
    NAMES[10],
    backendOversizedHeader.ok === false &&
      backendOversizedHeader.category === "audio_too_large" &&
      backendBodyReads === 0,
    `provider body reads: ${backendBodyReads}`
  );

  const backendWrongType = await synthesizeSpeech({
    text: "a reply",
    apiKey: FAKE_KEY,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: backendHeaders({ "content-type": "application/json" }),
      arrayBuffer: async () => new ArrayBuffer(16),
    }),
  });
  const backendCasedType = await synthesizeSpeech({
    text: "a reply",
    apiKey: FAKE_KEY,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: backendHeaders({ "content-type": "Audio/MPEG; charset=binary" }),
      arrayBuffer: async () => new ArrayBuffer(16),
    }),
  });

  feature(
    NAMES[11],
    backendWrongType.ok === false &&
      backendWrongType.category === "malformed_response" &&
      // parameters and casing tolerated, and an absent header still works
      backendCasedType.ok === true &&
      okResult.ok === true
  );
}

function runWiring() {
  /* the endpoint, its limiter and its scope */
  wiring(
    "W1. (src) /voice/speak is registered once, separate from the transcribe route",
    (routeCode.match(/router\.post\("\/voice\/speak"/g) || []).length === 1 &&
      (routeCode.match(/router\.post\("\/voice\/transcribe"/g) || []).length === 1 &&
      // the raw audio parser stays bound to transcribe alone
      /router\.post\("\/voice\/transcribe", parseAudioBody/.test(routeCode) &&
      !/router\.post\("\/voice\/speak", parseAudioBody/.test(routeCode)
  );

  wiring(
    "W2. (src) speech decisions live in their own service, not in the merged one",
    speechServiceSource.length > 0 &&
      /require\("\.\.\/services\/voiceSpeechService"\)/.test(routeCode) &&
      // The merged transcription service gained no speech CODE. Asserted on the
      // comment-stripped source: that file legitimately describes itself as
      // handling "recorded-speech transcription", and matching prose would flag
      // its own documentation.
      !/speak|tts-1|voiceSpeechService/i.test(strip(transcribeServiceSource))
  );

  wiring(
    "W3. (src) a dedicated 10-per-minute limiter is mounted on /api/voice/speak",
    /const voiceSpeakLimiter = rateLimit\(\{\s*windowMs: 60 \* 1000,\s*max: 10,\s*standardHeaders: true,\s*legacyHeaders: false,/.test(
      serverCode
    ) &&
      (serverCode.match(/app\.use\("\/api\/voice\/speak", voiceSpeakLimiter\)/g) || []).length === 1 &&
      // separate from every other budget
      !/app\.use\("\/api\/voice\/speak",\s*(generalApiLimiter|aiLimiter|eventLimiter|voiceTranscribeLimiter)\)/.test(
        serverCode
      )
  );

  wiring(
    "W4. (src) the speak response is no-store audio, and its 429 names no provider",
    /res\.set\("Cache-Control", "no-store"\)/.test(routeCode) &&
      /res\.set\("Content-Type", result\.contentType\)/.test(routeCode) &&
      /Too many voice replies\. Try again in a minute\./.test(serverCode) &&
      !/openai|tts/i.test(
        (serverCode.match(/voiceSpeakLimiter = rateLimit\(\{[\s\S]*?\n\}\);/) || [""])[0]
      )
  );

  /* the single chat authority */
  wiring(
    "W5. (src) ONE commitAssistantReply helper is the only visible-reply commit site",
    (appCode.match(/const commitAssistantReply = \(entry\) => \{/g) || []).length === 1 &&
      (appCode.match(/commitAssistantReply\(\{/g) || []).length === 2 &&
      // still exactly one user insertion and one AI request
      (appCode.match(/\{\s*role:\s*["']user["']/g) || []).length === 1 &&
      (appCode.match(/sendChatMessage\(/g) || []).length === 1
  );

  wiring(
    "W6. (src) origin is an explicit caller flag, never inferred from explicitText",
    /async function handleChatSubmit\(e, explicitText, options\) \{/.test(appCode) &&
      /const isVoiceOrigin = options\?\.origin === "voice";/.test(appCode) &&
      /handleChatSubmitRef\.current\?\.\(undefined, validated\.transcript, \{ origin: "voice" \}\)/.test(
        appCode
      ) &&
      // speech is gated on origin AND the toggle
      /if \(!isVoiceOrigin\) return;/.test(appCode) &&
      /if \(!voiceRepliesEnabledRef\.current\) return;/.test(appCode)
  );

  wiring(
    "W7. (src) connection failures keep their separate path and never speak",
    /const finalizeChatFailure = \(\) => \{/.test(appCode) &&
      /setChat\(\[\.\.\.nextChat, buildChatConnectionFailureEntry\(\)\]\)/.test(appCode) &&
      // the failure builder is not routed through the commit helper
      !/commitAssistantReply\(buildChatConnectionFailureEntry/.test(appCode) &&
      (appCode.match(/finalizeChatFailure\(\);/g) || []).length === 2
  );

  wiring(
    "W8. (src) no chat-watching effect, entry metadata or spoken-index bookkeeping",
    !/useEffect\([^)]*\[[^\]]*\bchat\b[^\]]*\]\s*\)/.test(appCode) &&
      !/lastSpoken|spokenIndex|spokenOrigin|hasSpoken/i.test(appCode) &&
      // speech is started from the commit helper, once
      (appCode.match(/speakReply\(entry\.content\)/g) || []).length === 1
  );

  /* audio lifecycle */
  wiring(
    "W9. (src) one reusable Audio element, created lazily and never duplicated",
    (appCode.match(/new window\.Audio\(\)/g) || []).length === 1 &&
      /if \(speechAudioRef\.current\) return speechAudioRef\.current;/.test(appCode)
  );

  wiring(
    "W10. (src) every exit path stops speech and revokes the object URL",
    /const releaseSpeechUrl = useCallback/.test(appCode) &&
      /window\.URL\.revokeObjectURL\(url\)/.test(appCode) &&
      // new recording, leaving TOHI, pagehide/hidden, unmount
      (appCode.match(/stopSpeechRef\.current\?\.\(\)/g) || []).length >= 4 &&
      /stopSpeech\(\);/.test(appCode)
  );

  wiring(
    "W11. (src) stale speech runs are invalidated by generation identity",
    (appCode.match(/if \(speechRunRef\.current !== run\) return;/g) || []).length >= 3 &&
      /speechRunRef\.current = run;/.test(appCode)
  );

  /* scope */
  wiring(
    "W12. (src) no synthesis, Realtime, WebSocket or always-listening behaviour",
    !/speechSynthesis|SpeechSynthesisUtterance/i.test(
      appCode + apiCode + tohiCode + speechUtilCode
    ) &&
      !/new WebSocket|RealtimeClient|\/realtime/i.test(
        appCode + apiCode + tohiCode + speechUtilCode + strip(speechServiceSource)
      ) &&
      // one bounded request per reply; no session, stream or socket
      !/continuous|alwaysListening|wakeWord/i.test(appCode + speechUtilCode)
  );

  /* secrets */
  const offenders = [];
  const secretPattern = new RegExp(
    ["OPENAI", "_API_", "KEY"].join("") + "|REACT_APP_" + "OPENAI" + "|sk-[A-Za-z0-9_-]{16,}"
  );
  const scan = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", "build", ".git"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
        continue;
      }
      if (!/\.(js|jsx|cjs|mjs|json|html|css|env|example)$/i.test(entry.name)) continue;
      if (secretPattern.test(fs.readFileSync(full, "utf8"))) {
        offenders.push(path.relative(repoRoot, full));
      }
    }
  };
  scan(path.join(repoRoot, "frontend"));
  wiring(
    "W13. (src) no provider key or secret literal exists anywhere under frontend/",
    offenders.length === 0,
    offenders.join(", ")
  );
}

function runInvariants() {
  invariant(
    "the merged transcription endpoint and its bounds are unchanged",
    /router\.post\("\/voice\/transcribe", parseAudioBody/.test(routeCode) &&
      /limit: MAX_AUDIO_BYTES/.test(routeCode) &&
      /type: \(\) => true/.test(routeCode) &&
      /const MAX_AUDIO_BYTES = 8 \* 1024 \* 1024;/.test(transcribeServiceSource)
  );

  invariant(
    "existing limiter budgets are unchanged (general 60, ai 10, event 120, transcribe 12)",
    /const generalApiLimiter = rateLimit\(\{\s*windowMs: 60 \* 1000,\s*max: 60,/.test(serverCode) &&
      /const aiLimiter = rateLimit\(\{\s*windowMs: 60 \* 1000,\s*max: 10,/.test(serverCode) &&
      /const eventLimiter = rateLimit\(\{\s*windowMs: 60 \* 1000,\s*max: 120,/.test(serverCode) &&
      /const voiceTranscribeLimiter = rateLimit\(\{\s*windowMs: 60 \* 1000,\s*max: 12,/.test(
        serverCode
      )
  );

  invariant(
    "the global JSON limit and the Anthropic chat route are unchanged",
    /app\.use\(express\.json\(\{ limit: "75kb" \}\)\);/.test(serverCode) &&
      /apiFetch\(\s*"\/api\/ai-chat"/.test(apiCode) &&
      /\{ retries: 0, timeoutMs: 18000, dedupe: false \}/.test(apiCode)
  );

  invariant(
    "push-to-talk recording behaviour is unchanged",
    /const MAX_RECORDING_MS = 30000;/.test(readOr(frontendSrc, "utils", "voiceRecording.js")) &&
      /export function resolveRecorderMimeType/.test(
        readOr(frontendSrc, "utils", "voiceRecording.js")
      ) &&
      /data-tohi-voice="true"/.test(tohiCode)
  );

  invariant(
    "the composer keeps its input and Send button, and Send is the only submit",
    /id="tohi-question"/.test(tohiCode) &&
      /placeholder="Ask TOHI\.\.\."/.test(tohiCode) &&
      (tohiCode.match(/type="submit"/g) || []).length === 1
  );

  invariant(
    "the conversation log keeps exactly one explicit live region",
    (tohiCode.match(/aria-live=/g) || []).length === 1 &&
      /aria-live="polite"/.test(tohiCode) &&
      !/aria-live="assertive"/.test(tohiCode) &&
      !/sr-only|visually-hidden/.test(tohiCode)
  );

  invariant(
    "analytics refuses spoken-reply content as well as typed content",
    ["speech", "speechText", "spokenReply", "ttsText", "audioUrl", "objectUrl"].every((k) =>
      new RegExp(`"${k}",`).test(apiCode)
    ) && /"conversationHistory",/.test(apiCode)
  );

  invariant(
    "no package dependency was added for speech",
    (() => {
      const pkg = readOr(repoRoot, "frontend", "package.json");
      const backendPkg = readOr(repoRoot, "backend", "package.json");
      return (
        pkg.length > 0 &&
        !/tts|speech|say|polly|elevenlabs|howler/i.test(pkg) &&
        !/tts|openai|elevenlabs|polly/i.test(backendPkg)
      );
    })()
  );
}

main().catch((err) => {
  console.error("");
  console.error(`HARNESS ERROR: ${err && err.message}`);
  process.exitCode = 1;
});
