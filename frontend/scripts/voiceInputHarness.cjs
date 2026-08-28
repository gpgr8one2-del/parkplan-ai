#!/usr/bin/env node

// TOHI Voice Phase A2 — push-to-talk input harness.
//
// HOW EACH CLAIM IS ESTABLISHED, stated plainly so no assertion reads as
// stronger than it is:
//
//   (exec)   real production code is executed. The recording helpers and the
//            transcription API helper are imported and run; `fetch` is stubbed,
//            so no microphone, no network, no Anthropic call and no OpenAI call
//            happens, and no API key is required.
//   (extract) a self-contained expression is lifted VERBATIM out of App.jsx and
//            evaluated. The value asserted is the value production computes —
//            not a restatement of it. App.jsx itself is never run: it is a large
//            React module and running it would prove nothing about routing.
//   (src)    a structural fact about the source. Used only for claims that are
//            genuinely about wiring — how many times something is called, where
//            a call site lives — where executing would add nothing.
//
// WHAT THIS HARNESS DOES NOT ESTABLISH. Source structure cannot prove React
// closure freshness, recorder event ordering, or cleanup races. Those are
// proved by src/__tests__/voiceAppIntegration.test.js, which mounts the real
// <App /> and drives real clicks and real MediaRecorder events. Where a claim
// below has a behavioural counterpart there, the label says so.
//
// FEATURE assertions must fail against the pinned pre-phase baseline
// (origin/main), so a missing voice layer can never pass vacuously. INVARIANT
// guards protect what this phase must not touch and pass on both trees.
//
// Usage: node scripts/voiceInputHarness.cjs [frontendRoot]

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Module = require("module");

const frontendRoot = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const srcRoot = path.join(frontendRoot, "src");

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

function readIfPresent(...segments) {
  const target = path.join(srcRoot, ...segments);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
}

const appSource = readIfPresent("App.jsx") || "";
const apiSource = readIfPresent("api.js") || "";
const tohiSource = readIfPresent("components", "TohiTab.jsx") || "";
const voiceUtilSource = readIfPresent("utils", "voiceRecording.js") || "";

// Comment-stripped copies, so a call counted below is a real call and not a
// mention inside a comment.
const strip = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const appCode = strip(appSource);
const apiCode = strip(apiSource);
const tohiCode = strip(tohiSource);

/* -------------------------------------------------------------------------- */
/* Loading the real modules (JSX compiled the way the other harnesses do)      */
/* -------------------------------------------------------------------------- */

let voiceModule = null;
let apiModule = null;
let loadError = "";

try {
  const babel = require("@babel/core");
  const origJs = Module._extensions[".js"];

  const compile = (module, filename) => {
    if (filename.includes("node_modules")) return origJs(module, filename);
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

  const voicePath = path.join(srcRoot, "utils", "voiceRecording.js");
  if (fs.existsSync(voicePath)) voiceModule = require(voicePath);

  const apiPath = path.join(srcRoot, "api.js");
  if (fs.existsSync(apiPath)) apiModule = require(apiPath);
} catch (err) {
  loadError = err && err.message;
}

/* -------------------------------------------------------------------------- */

async function main() {
  console.log("");
  console.log(`TOHI Voice input harness (Phase A2) — source root: ${srcRoot}`);
  console.log("");
  console.log("  tags: (exec) production code executed · (extract) App expression lifted and evaluated · (src) structural wiring");
  console.log("");
  console.log("Feature assertions — voice input layer");

  await runFeatureAssertions();

  console.log("");
  console.log("Wiring guards — chat authority, cleanup and scope");
  runWiringAssertions();

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

async function runFeatureAssertions() {
  if (!voiceModule) {
    const reason = loadError || "src/utils/voiceRecording.js not present in this tree";
    [
      "1. (exec) iPhone-style Safari selects MP4, Android-style Chrome selects WebM/Opus",
      "2. (exec) OGG is never a candidate and never selected",
      "3. (exec) zero-byte and over-8MB recordings are refused before upload",
      "4. (exec) the recording ceiling is 30 seconds",
      "5. (exec) the request sends the raw Blob once with the recorded Content-Type",
      "6. (exec) the transcription request is never retried",
      "10. (exec) a blank transcript is refused before submission",
      "12. (exec) an unsupported browser reports no voice input",
      "14. (exec) every microphone track is stopped, even when one throws",
      "17. (exec) voice-content fields are stripped from analytics metadata",
    ].forEach((n) => feature(n, false, reason));
    return;
  }

  const {
    MAX_AUDIO_BYTES,
    MAX_RECORDING_MS,
    RECORDING_MIME_CANDIDATES,
    isVoiceInputSupported,
    selectRecordingMimeType,
    stopMediaStream,
    validateRecordingBlob,
    validateTranscript,
  } = voiceModule;

  /* 1 */
  feature(
    "1. (exec) iPhone-style Safari selects MP4, Android-style Chrome selects WebM/Opus",
    selectRecordingMimeType((t) => t === "audio/mp4") === "audio/mp4" &&
      selectRecordingMimeType((t) => t.startsWith("audio/webm")) === "audio/webm;codecs=opus"
  );

  /* 2 */
  feature(
    "2. (exec) OGG is never a candidate and never selected",
    RECORDING_MIME_CANDIDATES.every((c) => !/ogg/i.test(c)) &&
      selectRecordingMimeType((t) => /ogg/.test(t)) === null &&
      !/audio\/ogg/.test(voiceUtilSource.replace(/OGG is ABSENT[\s\S]*?decode\./, ""))
  );

  /* 3 */
  const zero = validateRecordingBlob({ size: 0 }, "audio/webm");
  const huge = validateRecordingBlob({ size: MAX_AUDIO_BYTES + 1 }, "audio/webm");
  const atLimit = validateRecordingBlob({ size: MAX_AUDIO_BYTES }, "audio/webm");
  feature(
    "3. (exec) zero-byte and over-8MB recordings are refused before upload",
    MAX_AUDIO_BYTES === 8 * 1024 * 1024 &&
      zero.ok === false &&
      zero.reason === "empty_audio" &&
      huge.ok === false &&
      huge.reason === "audio_too_large" &&
      atLimit.ok === true
  );

  /* 4 */
  feature(
    "4. (exec) the recording ceiling is 30 seconds",
    MAX_RECORDING_MS === 30000 &&
      // and the ceiling is actually armed as a timer in App
      /setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]{0,600}?\}\s*,\s*MAX_RECORDING_MS\s*\)/.test(appCode)
  );

  /* 5 + 6 — the real API helper, with fetch stubbed */
  if (!apiModule || typeof apiModule.transcribeVoiceRecording !== "function") {
    feature("5. (exec) the request sends the raw Blob once with the recorded Content-Type", false, "transcribeVoiceRecording is not exported");
    feature("6. (exec) the transcription request is never retried", false, "transcribeVoiceRecording is not exported");
  } else {
    const blob = { size: 1234, type: "audio/webm;codecs=opus" };
    const calls = [];
    const originalFetch = global.fetch;

    global.fetch = async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ transcript: "  find the parade  " }) };
    };

    let sent = null;
    try {
      sent = await apiModule.transcribeVoiceRecording(blob, "audio/webm;codecs=opus");
    } catch (err) {
      sent = { error: err && err.message };
    }

    feature(
      "5. (exec) the request sends the raw Blob once with the recorded Content-Type",
      calls.length === 1 &&
        /\/api\/voice\/transcribe$/.test(calls[0].url) &&
        calls[0].options.method === "POST" &&
        // the Blob itself, not JSON and not FormData
        calls[0].options.body === blob &&
        typeof calls[0].options.body !== "string" &&
        calls[0].options.headers["Content-Type"] === "audio/webm;codecs=opus" &&
        Object.keys(calls[0].options.headers).length === 1 &&
        sent &&
        sent.transcript === "find the parade",
      `calls=${calls.length} result=${JSON.stringify(sent)}`
    );

    const retryCalls = [];
    global.fetch = async (url, options) => {
      retryCalls.push({ url, options });
      return { ok: false, status: 503 };
    };

    let category = "";
    try {
      await apiModule.transcribeVoiceRecording({ size: 10 }, "audio/webm");
    } catch (err) {
      category = err && err.category;
    }

    feature(
      "6. (exec) the transcription request is never retried",
      retryCalls.length === 1 && category === "voice_unavailable",
      `attempts=${retryCalls.length} category=${category}`
    );

    if (originalFetch === undefined) delete global.fetch;
    else global.fetch = originalFetch;
  }

  /* 10 */
  feature(
    "10. (exec) a blank transcript is refused before submission",
    validateTranscript("   \n ").ok === false &&
      validateTranscript("   \n ").reason === "blank" &&
      validateTranscript("").ok === false &&
      validateTranscript(null).ok === false &&
      validateTranscript(" real question ").transcript === "real question"
  );

  /* 12 */
  feature(
    "12. (exec) an unsupported browser reports no voice input",
    isVoiceInputSupported({}) === false &&
      isVoiceInputSupported({ mediaDevices: {}, MediaRecorderCtor: () => {} }) === false &&
      isVoiceInputSupported({
        mediaDevices: { getUserMedia: () => {} },
        MediaRecorderCtor: Object.assign(function R() {}, { isTypeSupported: () => false }),
      }) === false &&
      isVoiceInputSupported({
        mediaDevices: { getUserMedia: () => {} },
        MediaRecorderCtor: Object.assign(function R() {}, {
          isTypeSupported: (t) => t === "audio/mp4",
        }),
      }) === true
  );

  /* 14 */
  const stops = [];
  const throwingStream = {
    getTracks: () => [
      { stop: () => { throw new Error("busy"); } },
      { stop: () => stops.push("b") },
      { stop: () => stops.push("c") },
    ],
  };
  feature(
    "14. (exec) every microphone track is stopped, even when one throws",
    stopMediaStream(throwingStream) === 2 &&
      stops.join(",") === "b,c" &&
      stopMediaStream(null) === 0 &&
      stopMediaStream({}) === 0
  );

  /* 17 — the REAL sanitizer, executed through the real trackEvent. */
  if (!apiModule || typeof apiModule.trackEvent !== "function") {
    feature("17. (exec) voice-content fields are stripped from analytics metadata", false, "trackEvent is not exported");
  } else {
    const originalFetch = global.fetch;
    const posted = [];

    global.fetch = async (url, options) => {
      posted.push(options && options.body);
      return { ok: true, status: 200, json: async () => ({}) };
    };

    apiModule.trackEvent("voice_harness_probe", {
      source: "tohi_chat",
      metadata: {
        transcript: "SPOKEN_SECRET_ONE",
        transcription: "SPOKEN_SECRET_TWO",
        spokenText: "SPOKEN_SECRET_THREE",
        audio: "RAW_AUDIO_BYTES",
        audioBlob: "RAW_AUDIO_BYTES",
        recording: "RAW_AUDIO_BYTES",
        message: "TYPED_SECRET",
        durationMs: 4200,
      },
    });

    const body = posted[0] || "";
    let parsed = null;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = null;
    }

    feature(
      "17. (exec) voice-content fields are stripped from analytics metadata",
      posted.length === 1 &&
        parsed !== null &&
        !/SPOKEN_SECRET_ONE|SPOKEN_SECRET_TWO|SPOKEN_SECRET_THREE|RAW_AUDIO_BYTES|TYPED_SECRET/.test(body) &&
        parsed.metadata &&
        parsed.metadata.transcript === undefined &&
        parsed.metadata.transcription === undefined &&
        parsed.metadata.spokenText === undefined &&
        parsed.metadata.audio === undefined &&
        parsed.metadata.audioBlob === undefined &&
        parsed.metadata.recording === undefined &&
        // a content-free counter still survives
        parsed.metadata.durationMs === 4200,
      `events=${posted.length}`
    );

    if (originalFetch === undefined) delete global.fetch;
    else global.fetch = originalFetch;
  }
}

/**
 * Lifts a verbatim expression out of App.jsx and evaluates it.
 *
 * This is how the chat-authority claims are proved without running App.jsx:
 * the code under test is the production text itself, not a copy maintained here.
 */
function evaluateAppExpression(snippet, scope) {
  if (!appCode.includes(snippet)) return { found: false };

  const context = { ...scope, result: undefined };
  vm.runInNewContext(`result = (() => { ${snippet} return trimmed; })();`, context, {
    timeout: 1000,
  });

  return { found: true, value: context.result };
}

function runWiringAssertions() {
  /* 7 — exactly one user-message insertion site in the whole app. */
  const userInsertions = appCode.match(/\{\s*role:\s*["']user["']/g) || [];
  wiring(
    "7. (src) exactly one role:\"user\" insertion site exists, and voice does not add another",
    userInsertions.length === 1 &&
      /const nextChat = \[\.\.\.chat, \{ role: "user", content: trimmed \}\];/.test(appCode),
    `found ${userInsertions.length} user-insertion site(s)`
  );

  /* 7b — voice reaches chat only through handleChatSubmit, exactly once. */
  const voiceSubmitCalls =
    appCode.match(/handleChatSubmitRef\.current\?\.\(undefined,\s*validated\.transcript\)/g) || [];
  wiring(
    "7b. (src) the transcript reaches chat through exactly one submit call",
    voiceSubmitCalls.length === 1 &&
      // The handler is never invoked directly from the voice path — that is
      // what would capture a stale render. Freshness itself is proved
      // behaviourally in voiceAppIntegration.test.js.
      !/[^f]handleChatSubmit\(undefined/.test(appCode),
    `voice submit calls=${voiceSubmitCalls.length}`
  );

  /* 7c — the chat authority is read from a ref written every render. */
  wiring(
    "7c. (src) the voice path reads the CURRENT render's chat handler from a ref",
    /const handleChatSubmitRef = useRef\(null\);/.test(appCode) &&
      /handleChatSubmitRef\.current = handleChatSubmit;/.test(appCode) &&
      // and the memoized callback does not close over the handler directly
      !/\[[^\]]*\bhandleChatSubmit\b[^\]]*\]/.test(appCode)
  );

  /* 8 — typed and spoken converge on one identical `trimmed`. EXECUTED. */
  const prologue =
    'const source = typeof explicitText === "string" ? explicitText : message;\n    const trimmed = source.trim();';

  const typed = evaluateAppExpression(prologue, {
    message: "  where is the parade  ",
    explicitText: undefined,
  });
  const spoken = evaluateAppExpression(prologue, {
    message: "",
    explicitText: "  where is the parade  ",
  });
  const formStillUsesState = evaluateAppExpression(prologue, {
    message: "typed only",
    explicitText: undefined,
  });

  wiring(
    "8. (extract) typed and spoken input converge on one identical trimmed question",
    typed.found &&
      spoken.found &&
      typed.value === "where is the parade" &&
      spoken.value === "where is the parade" &&
      typed.value === spoken.value &&
      formStillUsesState.value === "typed only" &&
      // one sendChatMessage call in the whole app: voice cannot call /api/ai-chat
      (appCode.match(/sendChatMessage\(/g) || []).length === 1,
    typed.found ? `typed=${JSON.stringify(typed.value)} spoken=${JSON.stringify(spoken.value)}` : "prologue not found in App.jsx"
  );

  /* 8b — voice builds no session payload of its own. */
  wiring(
    "8b. (src) voice builds no session payload and calls no AI route",
    (appCode.match(/sendChatMessage\(/g) || []).length === 1 &&
      !/api\/ai-chat/.test(appCode) &&
      (appCode.match(/transcribeVoiceRecording\(/g) || []).length === 1 &&
      !/conversationHistory/.test(
        appCode.slice(
          appCode.indexOf("const handleVoiceRecordingFinished"),
          appCode.indexOf("const startVoiceRecording")
        )
      )
  );

  /* 9 — QUICK CHECK is reached with the same trimmed value, whatever its origin. */
  wiring(
    "9. (src) QUICK CHECK runs on the shared trimmed question, not on a voice-only branch",
    /if \(shouldAskFrontendLiveStateQuestion\(trimmed, chat\)\)/.test(appCode) &&
      (appCode.match(/shouldAskFrontendLiveStateQuestion\(trimmed, chat\)/g) || []).length === 1 &&
      (appCode.match(/isLiveStateQuestion: true/g) || []).length === 1
  );

  /* 13 — rapid taps cannot duplicate anything. */
  wiring(
    "13. (src) rapid taps are gated by a synchronous ref, not by batched state",
    /const current = voiceStateRef\.current;/.test(appCode) &&
      /if \(current === "idle"\)/.test(appCode) &&
      /if \(chatInFlightRef\.current\) return;/.test(appCode) &&
      // and the chat latch is still acquired before any user message
      appCode.indexOf("if (chatInFlightRef.current) return;\n    chatInFlightRef.current = true;") <
        appCode.indexOf('const nextChat = [...chat, { role: "user", content: trimmed }];')
  );

  /* 15 — pagehide and visibilitychange release the microphone. */
  wiring(
    "15. (src) pagehide and document-hidden stop recording and clear timers",
    /window\.addEventListener\("pagehide", releaseMicrophone\)/.test(appCode) &&
      /document\.addEventListener\("visibilitychange", onVisibilityChange\)/.test(appCode) &&
      /document\.visibilityState === "hidden"/.test(appCode) &&
      /window\.removeEventListener\("pagehide", releaseMicrophone\)/.test(appCode) &&
      /document\.removeEventListener\("visibilitychange", onVisibilityChange\)/.test(appCode) &&
      /clearTimeout\(run\.timerId\)/.test(appCode)
  );

  /* 14b — leaving TOHI and unmount both tear down. */
  wiring(
    "14b. (src) leaving the TOHI tab and unmounting both release every track",
    /if \(activeTab !== "tohi" && voiceStateRef\.current !== "idle"\)/.test(appCode) &&
      /stopMediaStream\(run\.stream\);/.test(appCode) &&
      // teardown is the cleanup return of the listener effect
      /return \(\) => \{[\s\S]{0,400}?teardownVoice\(\);\s*\};/.test(appCode)
  );

  /* 16 — a late result after cleanup cannot submit. */
  const staleChecks = appCode.match(/if \(voiceRunRef\.current !== run\) return;/g) || [];
  wiring(
    "16. (src) every async continuation and recorder callback checks its generation",
    // start (post-permission, post-start), the finish path (entry, post-upload,
    // post-transcript), all three recorder callbacks, and the auto-stop timer.
    staleChecks.length >= 8 &&
      // The generation check is the FIRST statement of the finish path — before
      // any shared state is read, cleared or stopped. Asserted on the
      // comment-stripped source, so a comment cannot satisfy it.
      /async \(run\) => \{\s*if \(voiceRunRef\.current !== run\) return;\s*if \(run\.finished\) return;/.test(
        appCode
      ) &&
      // and the submit is preceded by one
      appCode.indexOf("if (voiceRunRef.current !== run) return;\n\n      const validated") <
        appCode.indexOf("handleChatSubmitRef.current?.(undefined, validated.transcript)"),
    `${staleChecks.length} generation checks found`
  );

  /* 16b — recording state is run-local, so contamination is impossible by
     construction rather than only by a guard. */
  wiring(
    "16b. (src) chunks, stream, recorder and timer are run-local, not shared refs",
    /const voiceRunRef = useRef\(null\);/.test(appCode) &&
      /run\.chunks\.push\(event\.data\)/.test(appCode) &&
      !/voiceChunksRef/.test(appCode) &&
      !/voiceStreamRef/.test(appCode) &&
      !/voiceRecorderRef/.test(appCode) &&
      !/voiceTimerRef/.test(appCode)
  );

  /* 4b — Stop leaves the tappable state synchronously, before stop() is called. */
  wiring(
    "4b. (src) Stop moves out of the tappable state before recorder.stop()",
    appCode.indexOf('setVoiceStateBoth("transcribing");\n\n    try {') <
      appCode.indexOf("run.recorder.stop();") &&
      /if \(!run \|\| run\.stopping\) return;/.test(appCode) &&
      // the 30s ceiling goes through the same single stop path
      /stopVoiceRecording\(\);\s*\n\s*\}, MAX_RECORDING_MS\)/.test(appCode)
  );

  /* 6b — the microphone is visibly unavailable while a chat turn is running. */
  wiring(
    "6b. (src) the microphone is disabled while chat is sending, without faking busy",
    /const voiceBlockedByChat = chatLoading === true && !voiceListening;/.test(tohiCode) &&
      /const voiceDisabled = voicePending \|\| voiceBlockedByChat;/.test(tohiCode) &&
      /disabled=\{voiceDisabled\}/.test(tohiCode) &&
      // aria-busy still describes the microphone only
      /aria-busy=\{voicePending\}/.test(tohiCode)
  );

  /* 18 — no provider secret anywhere under frontend/.
     The pattern is assembled from fragments on purpose: written as a literal it
     would appear in this file's own source, and the scan — which now covers
     .cjs harness scripts too — would flag itself. */
  const secretPattern = new RegExp(
    ["OPENAI", "_API_", "KEY"].join("") +
      "|REACT_APP_" +
      "OPENAI" +
      "|sk-[A-Za-z0-9_-]{16,}"
  );
  const offenders = [];
  const scan = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "build" || entry.name === ".git") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
        continue;
      }
      if (!/\.(js|jsx|cjs|mjs|json|html|css|env|example)$/i.test(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      if (secretPattern.test(text)) {
        offenders.push(path.relative(frontendRoot, full));
      }
    }
  };
  scan(frontendRoot);

  wiring(
    "18. (src) no OPENAI key, REACT_APP OpenAI variable or secret literal exists under frontend/",
    offenders.length === 0,
    offenders.join(", ")
  );

  /* 20 — no TTS surface was introduced. */
  wiring(
    "20. (src) no spoken reply, TTS, playback or speak endpoint was added",
    !/speechSynthesis|SpeechSynthesisUtterance/i.test(appCode + apiCode + tohiCode + voiceUtilSource) &&
      !/api\/voice\/speak/.test(appCode + apiCode + tohiCode + voiceUtilSource) &&
      !/new Audio\(/.test(appCode + apiCode + tohiCode + voiceUtilSource) &&
      !/<audio/i.test(tohiCode) &&
      !/Realtime|realtime/.test(voiceUtilSource)
  );
}

function runInvariants() {
  /* 19 — reply validation and connection-failure filtering are untouched. */
  invariant(
    "19. assistant-reply validation and connection-failure filtering are unchanged",
    /const replyText = resolveAssistantReplyText\(res, trimmed\);/.test(appCode) &&
      /if \(replyText\) \{/.test(appCode) &&
      /\.filter\(\(msg\) => msg\.isConnectionFailure !== true\)/.test(appCode) &&
      /\.slice\(-6\),/.test(appCode) &&
      (appCode.match(/finalizeChatFailure\(\);/g) || []).length === 2
  );

  invariant(
    "the Anthropic chat route and its payload shape are unchanged",
    /apiFetch\(\s*"\/api\/ai-chat"/.test(apiCode) &&
      /\{ retries: 0, timeoutMs: 18000, dedupe: false \}/.test(apiCode) &&
      /body: JSON\.stringify\(\{ message: safeMessage, sessionData: safeSessionData \}\)/.test(apiCode)
  );

  invariant(
    "the generic apiFetch path still retries, dedupes and sends JSON by default",
    /const \{ retries = 2, timeoutMs = 8000, dedupe = true \} = config;/.test(apiCode) &&
      /"Content-Type": "application\/json",/.test(apiCode)
  );

  invariant(
    "the composer keeps its input, Send button and existing placeholder",
    /id="tohi-question"/.test(tohiCode) &&
      /placeholder="Ask TOHI\.\.\."/.test(tohiCode) &&
      /type="submit"/.test(tohiCode) &&
      /<Send size=\{15\} \/> Send/.test(tohiCode)
  );

  invariant(
    "the conversation log keeps exactly one explicit live region",
    (tohiCode.match(/aria-live=/g) || []).length === 1 &&
      /aria-live="polite"/.test(tohiCode) &&
      !/aria-live="assertive"/.test(tohiCode) &&
      !/sr-only|visually-hidden/.test(tohiCode)
  );

  invariant(
    "no package dependency was added for voice",
    (() => {
      const pkgPath = path.join(frontendRoot, "package.json");
      if (!fs.existsSync(pkgPath)) return false;
      const pkg = fs.readFileSync(pkgPath, "utf8");
      return !/recorder|wavesurfer|opus|hark|microphone|speech/i.test(pkg);
    })()
  );

  invariant(
    "analytics still refuses raw question text and location",
    /"conversationHistory",/.test(apiCode) &&
      /"message",/.test(apiCode) &&
      /"latitude",/.test(apiCode) &&
      /"coords",/.test(apiCode)
  );
}

main().catch((err) => {
  console.error("");
  console.error(`HARNESS ERROR: ${err && err.message}`);
  process.exitCode = 1;
});
