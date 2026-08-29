#!/usr/bin/env node

// TOHI approved day presentation (64B-2A).
//
// The extraction harness proves the SEAM is right and the historical parity
// harness proves the extraction changed nothing. This one proves the DAY
// PRESENTATION matches the approved blueprints, and that nothing from a later
// phase arrived early.
//
// Assertions are made against RENDERED output wherever the claim is about what
// ships. Reading a style object cannot prove a surface is reachable: a branch
// can be present and never rendered, or rendered with the wrong props. Source
// assertions are used only for claims about structure that rendering cannot
// show, such as which value drives a branch.
//
// FEATURE-DISCRIMINATING assertions must fail against the pinned pre-redesign
// baseline. INVARIANT REGRESSION GUARDS protect behaviour and trust boundaries
// this phase must not touch, and pass in both trees.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const babel = require("@babel/core");

const frontendRoot = path.resolve(__dirname, "..");

/* ------------------------------------------------------ jsx compilation -- */

const origJs = Module._extensions[".js"];
function compileJsx(module, filename) {
  if (filename.includes("node_modules")) return origJs(module, filename);
  const out = babel.transformSync(fs.readFileSync(filename, "utf8"), {
    filename,
    presets: [[require.resolve("babel-preset-react-app"), { runtime: "automatic" }]],
    babelrc: false,
    configFile: false,
  });
  return module._compile(out.code, filename);
}
Module._extensions[".js"] = compileJsx;
Module._extensions[".jsx"] = compileJsx;

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { colors } = require(path.join(frontendRoot, "src", "theme.js"));

const tohiPath = path.join(frontendRoot, "src", "components", "TohiTab.jsx");
const tohiSource = fs.existsSync(tohiPath) ? fs.readFileSync(tohiPath, "utf8") : "";
const appSource = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");

const strip = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const tohiCode = strip(tohiSource);
const appCode = strip(appSource);

/* ------------------------------------------------------------- fixtures -- */

const card = {
  background: "rgba(255,255,255,0.94)",
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: 24,
  padding: 16,
  boxShadow: "0 14px 34px rgba(28, 25, 23, 0.08)",
  marginBottom: 14,
};
const button = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: `1px solid ${colors.cardBorder}`,
  background: colors.card,
  color: colors.text,
  borderRadius: 999,
  padding: "9px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const noop = () => {};
const LOCKED = () =>
  React.createElement("section", { "data-locked-card": "true" }, "LOCKED CARD FROM APP");

const USER = (content) => ({ role: "user", content });
const TOHI = (content) => ({ role: "assistant", content });
const CLARIFY = {
  role: "assistant",
  content: "How's everyone's energy right now — still going, or starting to fade?",
  isLiveStateQuestion: true,
};
const MULTI_PARA = "First paragraph about the heat.\n\nSecond paragraph about the resort break.";

// 64B-2B: a connection notice is stored assistant-role but carries explicit
// metadata. The presentation must key off the flag, never off this copy.
const FAILURE_COPY =
  "TOHI couldn’t connect right now. Your plan and recommendations haven’t changed. You can try sending your question again.";
const FAILURE = { role: "assistant", content: FAILURE_COPY, isConnectionFailure: true };

function props(over = {}) {
  return {
    chat: [],
    message: "",
    chatLoading: false,
    hasPersonalizedAccess: true,
    setMessage: noop,
    onChatSubmit: noop,
    renderLockedFeatureCard: LOCKED,
    card,
    button,
    ...over,
  };
}

let TohiTab = null;
let importError = "";
try {
  ({ TohiTab } = require(tohiPath));
} catch (err) {
  importError = err.message;
}

function render(over) {
  if (!TohiTab) return `RENDER_ERROR: ${importError}`;
  try {
    return renderToStaticMarkup(React.createElement(TohiTab, props(over)));
  } catch (err) {
    return `RENDER_ERROR: ${err.message}`;
  }
}

const R = {
  empty: render({}),
  picked: render({ message: "Should we take a break or keep going?" }),
  typed: render({ message: "Is the monorail still the fastest way back?" }),
  blank: render({ chat: [USER("hi"), TOHI("hello")], message: "   " }),
  convo: render({ chat: [USER("It is 2pm and everyone is hot."), TOHI(MULTI_PARA)] }),
  loading: render({ chat: [USER("What should we do next?")], chatLoading: true }),
  clarify: render({ chat: [USER("What should we do next?"), CLARIFY] }),
  locked: render({ hasPersonalizedAccess: false }),
  // Approved state 4: after a failure the submitted question is restored to the
  // composer with Send enabled, and it also remains in the transcript. The
  // message prop here models what App now actually sets.
  failure: render({
    chat: [USER("It is 2pm and everyone is hot."), TOHI(MULTI_PARA), USER("Is the monorail fastest?"), FAILURE],
    message: "Is the monorail fastest?",
  }),
};

// Draft-preservation case: a failure arrived while the user was already typing
// something else, so the composer holds the newer draft, not the failed question.
R.failureWithNewDraft = render({
  chat: [USER("It is 2pm and everyone is hot."), USER("Is the monorail fastest?"), FAILURE],
  message: "Actually, what about the parade?",
});

const ALL = Object.values(R).join("\n");

let passCount = 0;
let failCount = 0;
let featurePass = 0;
let featureFail = 0;
let invariantPass = 0;
let invariantFail = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    passCount += 1;
    console.log(`  PASS ${label}`);
  } else {
    failCount += 1;
    console.log(
      `  FAIL ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}
function featureCheck(l, a, e) {
  const b = failCount;
  check(l, a, e);
  if (failCount > b) featureFail += 1;
  else featurePass += 1;
}
function invariantCheck(l, a, e) {
  const b = failCount;
  check(l, a, e);
  if (failCount > b) invariantFail += 1;
  else invariantPass += 1;
}

console.log("TOHI approved day presentation (64B-2A) — FEATURE-DISCRIMINATING");

// A precondition, not a feature claim: it is true at the baseline too, so it is
// counted outside the discriminating set.
check(
  "every scenario renders without error",
  !ALL.includes("RENDER_ERROR") && R.empty.length > 500,
  true
);

/* ------------------------------------------------------ the branded header -- */

featureCheck(
  "the official logo is used at the approved path, width and ratio",
  R.empty.includes('src="/tohi-logo.png"') &&
    /width:80px/.test(R.empty) &&
    /height:auto/.test(R.empty),
  true
);

featureCheck(
  "the logo carries an empty alt",
  /<img[^>]*src="\/tohi-logo\.png"[^>]*alt=""/.test(R.empty) ||
    /<img[^>]*alt=""[^>]*src="\/tohi-logo\.png"/.test(R.empty),
  true
);

featureCheck(
  "the logo sits on the approved brand plate",
  R.empty.includes(`background:${colors.purpleSoft}`) &&
    R.empty.includes("border:1px solid rgba(124, 58, 237, 0.16)") &&
    /border-radius:999px/.test(R.empty),
  true
);

featureCheck(
  "the Ask TOHI heading sits directly beneath the plate",
  (() => {
    const logo = R.empty.indexOf("/tohi-logo.png");
    const head = R.empty.indexOf("Ask TOHI</h2>");
    return logo >= 0 && head > logo;
  })(),
  true
);

featureCheck(
  "no generic chat icon, text badge or emoji survives",
  !/MessageCircle/.test(ALL) &&
    !/TOHI COMPANION/.test(ALL) &&
    !/✨/.test(ALL) &&
    !/✨/.test(tohiCode),
  true
);

/* ---------------------------------------------------------- legacy removal -- */

featureCheck(
  "no decorative corner circle survives",
  !/width:112px/.test(ALL) && !/width:96px/.test(ALL),
  true
);

featureCheck(
  "no radial glow or loud gradient survives",
  !/radial-gradient/.test(ALL) &&
    !/linear-gradient\(155deg/.test(ALL) &&
    !/linear-gradient\(145deg, #7C3AED/.test(ALL),
  true
);

featureCheck(
  "the user message is a quiet lavender surface, not a purple gradient",
  R.convo.includes("background:#F6F1FF") && !/background:linear-gradient/.test(R.convo),
  true
);

/* ------------------------------------------------------------- messages -- */

featureCheck(
  "separate uppercase YOU and TOHI labels render, with no inline prefixes",
  R.convo.includes(">YOU</span>") &&
    R.convo.includes(">TOHI</span>") &&
    !/<strong>/.test(ALL) &&
    !/You: /.test(ALL) &&
    !/TOHI: /.test(ALL),
  true
);

featureCheck(
  "user and TOHI messages use the approved max widths",
  R.convo.includes("max-width:85%") && R.convo.includes("max-width:92%"),
  true
);

featureCheck(
  "user messages are right aligned and TOHI messages left aligned",
  R.convo.includes("align-items:flex-end") && R.convo.includes("align-items:flex-start"),
  true
);

featureCheck(
  "paragraph breaks are preserved without parsing or injecting HTML",
  R.convo.includes("white-space:pre-wrap") &&
    R.convo.includes("First paragraph about the heat.\n\nSecond paragraph") &&
    !/dangerouslySetInnerHTML/.test(tohiCode),
  true
);

/* --------------------------------------------------------- QUICK CHECK -- */

featureCheck(
  "QUICK CHECK renders on a clarification turn",
  R.clarify.includes("QUICK CHECK"),
  true
);

featureCheck(
  "QUICK CHECK is driven only by isLiveStateQuestion, never by copy",
  /msg\.isLiveStateQuestion === true/.test(tohiCode) &&
    // an ordinary assistant reply must not get it
    !R.convo.includes("QUICK CHECK") &&
    // and nothing matches on message text to infer a state
    !/content\s*\.\s*(includes|match|indexOf)/.test(tohiCode),
  true
);

featureCheck(
  "a clarification is still an ordinary TOHI message",
  R.clarify.includes(">TOHI</span>") && R.clarify.includes("max-width:92%"),
  true
);

/* ------------------------------------------------------ empty and prompts -- */

// Preserved, not new — the prompts and their order predate the redesign.
invariantCheck(
  "the three approved prompts render exactly and in order",
  (() => {
    const want = [
      "What should we do next without wearing everyone out?",
      "Should we take a break or keep going?",
      "What if storms hit this afternoon?",
    ];
    const idx = want.map((p) => R.empty.indexOf(p));
    return idx.every((i) => i >= 0) && idx[0] < idx[1] && idx[1] < idx[2];
  })(),
  true
);

// Preserved, not new — the explanation copy is unchanged.
invariantCheck(
  "the trip-context explanation still renders on the empty state",
  R.empty.includes("TOHI uses your park, weather, family setup, current activity,"),
  true
);

featureCheck(
  "a selected prompt gets the approved selected treatment, by exact match only",
  R.picked.includes("background:#F6F1FF") &&
    /const picked = message === prompt;/.test(tohiCode) &&
    // an unselected list has no selected surface
    !R.empty.includes("background:#F6F1FF"),
  true
);

// Preserved, not new — the chat.length === 0 gate is pre-existing.
invariantCheck(
  "prompts and explanation disappear once the conversation starts",
  !R.convo.includes("What if storms hit this afternoon?") &&
    !R.convo.includes("TOHI uses your park, weather"),
  true
);

/* ------------------------------------------------------------- sending -- */

featureCheck(
  "the loading surface renders with the approved copy",
  R.loading.includes("TOHI is checking your park-day context…"),
  true
);

featureCheck(
  "the submitted message is retained while loading and no reply is invented",
  // The user's message stays, and there is exactly ONE 92%-wide left surface —
  // the loading one. A fabricated assistant bubble would add a second.
  R.loading.includes("What should we do next?") &&
    R.loading.includes("max-width:85%") &&
    (R.loading.match(/max-width:92%/g) || []).length === 1 &&
    (R.loading.match(/>TOHI<\/span>/g) || []).length === 1,
  true
);

featureCheck(
  "the loading indicator honours reduced motion",
  R.loading.includes("prefers-reduced-motion") && R.loading.includes("data-tohi-loading"),
  true
);

/* ------------------------------------------------------------ composer -- */

featureCheck(
  "the composer carries a real visible label bound to the field",
  /<label[^>]*for="tohi-question"[^>]*>Your question<\/label>/.test(R.empty) &&
    R.empty.includes('id="tohi-question"'),
  true
);

featureCheck(
  "Send is disabled when the message is blank or whitespace only",
  /disabled=""/.test(R.empty) && /disabled=""/.test(R.blank),
  true
);

// Preserved, not new — Send has always been usable with real input.
invariantCheck(
  "Send is enabled once there is something to send",
  !/disabled=""/.test(R.typed),
  true
);

// Preserved, not new — disabling during a request predates the redesign.
invariantCheck(
  "Send is disabled while a request is in flight",
  /disabled=""/.test(R.loading),
  true
);

featureCheck(
  "the composer keeps a 48px touch target",
  (R.empty.match(/min-height:48px/g) || []).length >= 2,
  true
);

featureCheck(
  "a visible focus treatment replaces the removed outline:none",
  R.empty.includes("focus-visible") &&
    R.empty.includes("outline: 2px solid") &&
    !/outline:none/.test(ALL),
  true
);

// A must-not-appear guard, true in both trees.
invariantCheck(
  "no persistent decorative scrollbar was introduced",
  !/scrollbar|overflow-y:scroll|::-webkit-scrollbar/.test(ALL) && !/data-tohi-rail/.test(ALL),
  true
);

/* ------------------------------------------- 64B-2B deliberate states -- */

featureCheck(
  "a marked failure renders the distinct connection status, not a TOHI answer",
  R.failure.includes("data-tohi-connection") &&
    R.failure.includes(">CONNECTION</span>") &&
    R.failure.includes(`background:${"#FFF1F3"}`) &&
    // it must NOT be dressed as a speaker turn
    (() => {
      const seg = R.failure.slice(R.failure.indexOf("data-tohi-connection"));
      return !seg.includes(">TOHI</span>") && !seg.includes("QUICK CHECK");
    })(),
  true
);

featureCheck(
  "the exact approved copy renders inside the connection surface",
  // Scoped to the surface: at the pre-feature baseline the copy still appeared,
  // just inside an ordinary assistant bubble, so an unscoped check would not
  // discriminate.
  (() => {
    const start = R.failure.indexOf("data-tohi-connection");
    if (start < 0) return false;
    const seg = R.failure.slice(start, R.failure.indexOf("</div>", start) + 6);
    return seg.includes(FAILURE_COPY);
  })(),
  true
);

featureCheck(
  "the conversation and the submitted user message survive alongside the status",
  // The retention half alone is true at the baseline too, so it is paired with
  // the presence of the status surface — the combination is what is new.
  R.failure.includes("data-tohi-connection") &&
    R.failure.includes("It is 2pm and everyone is hot.") &&
    R.failure.includes("First paragraph about the heat.") &&
    // Satisfied by the TRANSCRIPT user message, independently of the composer.
    R.failure.includes("Is the monorail fastest?") &&
    R.failure.includes('id="tohi-question"'),
  true
);

featureCheck(
  "no Retry or dismiss control is added to the failure surface",
  (() => {
    const start = R.failure.indexOf("data-tohi-connection");
    if (start < 0) return false;
    const seg = R.failure.slice(start, R.failure.indexOf("</div>", start) + 6);
    // Scoped to the failure surface. A whole-render scan would false-positive on
    // React's own <link rel="preload"> for the logo.
    return (
      !seg.includes("<button") &&
      !seg.includes("<a ") &&
      !/Retry|Try again|Dismiss/i.test(seg)
    );
  })(),
  true
);

featureCheck(
  "the failure surface is driven by explicit metadata, never by copy matching",
  /msg\.isConnectionFailure === true/.test(tohiCode) &&
    !tohiCode.includes("couldn’t connect") &&
    !/content\s*\.\s*(includes|startsWith|match|indexOf)/.test(tohiCode),
  true
);

featureCheck(
  "only a marked entry gets the status surface — ordinary replies do not",
  // Stated as a contrast so it discriminates: the flagged scenario must have the
  // surface and the unflagged one must not. Half of this is trivially true
  // before the feature exists.
  R.failure.includes("data-tohi-connection") &&
    !R.convo.includes("data-tohi-connection") &&
    !R.convo.includes(">CONNECTION</span>"),
  true
);

/* -------------------------------- 64B-2B failure finalization + restore -- */

featureCheck(
  "one shared finalization path appends the marked entry AND restores the question",
  /const finalizeChatFailure = \(\) => \{/.test(appCode) &&
    /setChat\(\[\.\.\.nextChat, buildChatConnectionFailureEntry\(\)\]\);/.test(appCode) &&
    /setMessage\(\(current\) =>/.test(appCode),
  true
);

featureCheck(
  "both the rejection and the malformed-reply branch call that one path",
  // Exactly two call sites, and neither branch rebuilds the entry inline.
  (appCode.match(/finalizeChatFailure\(\);/g) || []).length === 2 &&
    /\} catch \{\s*\n\s*finalizeChatFailure\(\);/.test(appCode) &&
    /\} else \{\s*\n\s*finalizeChatFailure\(\);/.test(appCode) &&
    // The success branch must NOT finalize as a failure. 64C-A3 routes it
    // through the one commitAssistantReply seam instead of an inline setChat;
    // the protection is unchanged — success and failure remain distinct paths,
    // and the failure path is still the only one that builds a marked entry.
    /if \(replyText\) \{\s*\n\s*commitAssistantReply\(\{ role: "assistant", content: replyText \}\);/.test(
      appCode
    ) &&
    // and the failure builder is never routed through the commit seam
    !/commitAssistantReply\(buildChatConnectionFailureEntry/.test(appCode),
  true
);

featureCheck(
  "restoration uses a functional state update, not the captured value",
  // A plain setMessage(trimmed) would read the value captured at submission and
  // clobber anything typed since. The updater reads the latest value.
  /setMessage\(\(current\) =>\s*\n?\s*typeof current === "string" && current\.trim\(\) \? current : trimmed\s*\n?\s*\);/.test(
    appCode
  ) && !/setMessage\(trimmed\)/.test(appCode),
  true
);

featureCheck(
  "a newer non-blank draft is preserved; a blank composer receives the question",
  // Both arms of the updater are asserted: current wins when it has content,
  // trimmed wins when it does not.
  (() => {
    const m = appCode.match(
      /setMessage\(\(current\) =>\s*\n?\s*typeof current === "string" && (current\.trim\(\)) \? (current) : (trimmed)\s*\n?\s*\);/
    );
    return Boolean(m) && m[2] === "current" && m[3] === "trimmed";
  })(),
  true
);

featureCheck(
  "the failure scenario renders the restored question in the composer",
  // Paired with the status surface: the composer value alone is supplied by the
  // fixture and is therefore true before the feature exists. What is new is the
  // combination — a failure state whose composer holds the question.
  R.failure.includes("data-tohi-connection") &&
    (/<input[^>]*id="tohi-question"[^>]*value="Is the monorail fastest\?"/.test(R.failure) ||
      /<input[^>]*value="Is the monorail fastest\?"[^>]*id="tohi-question"/.test(R.failure)),
  true
);

featureCheck(
  "Send is enabled once the question has been restored",
  R.failure.includes("data-tohi-connection") &&
    (() => {
      const start = R.failure.indexOf('type="submit"');
      if (start < 0) return false;
      const seg = R.failure.slice(start, start + 400);
      return !seg.includes('disabled=""');
    })(),
  true
);

featureCheck(
  "the restored question also remains visible in the transcript",
  // Both places, not one instead of the other: the transcript user bubble and
  // the composer value.
  R.failure.includes("data-tohi-connection") &&
    (R.failure.match(/Is the monorail fastest\?/g) || []).length >= 2 &&
    R.failure.includes("max-width:85%"),
  true
);

featureCheck(
  "a newer draft is shown instead of the failed question when one exists",
  R.failureWithNewDraft.includes('value="Actually, what about the parade?"') &&
    // the failed question is still in the transcript, just not in the composer
    R.failureWithNewDraft.includes("data-tohi-connection") &&
    !/<input[^>]*value="Is the monorail fastest\?"/.test(R.failureWithNewDraft),
  true
);

/* ---------------------------------------------- App-level state handling -- */

featureCheck(
  "App appends an explicitly marked connection entry with the approved copy",
  /const TOHI_CHAT_CONNECTION_FAILURE_COPY =/.test(appCode) &&
    appCode.includes(FAILURE_COPY) &&
    /function buildChatConnectionFailureEntry\(\)/.test(appCode) &&
    /isConnectionFailure: true,/.test(appCode),
  true
);

featureCheck(
  "the marked entry is constructed in exactly one place",
  // Stronger than before: the builder is now invoked from a single site inside
  // finalizeChatFailure, so neither failure branch can construct an entry of
  // its own and let the copy or the marker drift.
  (() => {
    const calls = appCode.match(/buildChatConnectionFailureEntry\(\)/g) || [];
    // one definition + one call site
    return (
      calls.length === 2 &&
      /function buildChatConnectionFailureEntry\(\)/.test(appCode) &&
      /const finalizeChatFailure = \(\) => \{\s*\n\s*setChat\(\[\.\.\.nextChat, buildChatConnectionFailureEntry\(\)\]\);/.test(
        appCode
      )
    );
  })(),
  true
);

featureCheck(
  "a reply is only accepted when it survives cleaning as a non-empty string",
  /function resolveAssistantReplyText\(res, userMessage\)/.test(appCode) &&
    /typeof res\.reply === "string"/.test(appCode) &&
    /if \(!raw\.trim\(\)\) return "";/.test(appCode) &&
    /typeof cleaned === "string" && cleaned\.trim\(\) \? cleaned : ""/.test(appCode) &&
    // The accept/reject fork still routes the reject arm through the shared
    // finalizer rather than building an entry inline. 64C-A3 only changed how
    // the ACCEPT arm commits: through the one commitAssistantReply seam.
    /if \(replyText\) \{\s*\n\s*commitAssistantReply\(\{ role: "assistant", content: replyText \}\);\s*\n\s*\} else \{\s*\n\s*finalizeChatFailure\(\);/.test(
      appCode
    ),
  true
);

featureCheck(
  "connection entries are excluded from the AI conversation history",
  /conversationHistory: nextChat\s*\n?\s*\.filter\(\(msg\) => msg\.isConnectionFailure !== true\)\s*\n?\s*\.slice\(-6\)/.test(
    appCode
  ),
  true
);

featureCheck(
  "a synchronous ref latch guards against duplicate submission",
  /const chatInFlightRef = useRef\(false\);/.test(appCode) &&
    /if \(chatInFlightRef\.current\) return;/.test(appCode) &&
    /chatInFlightRef\.current = true;/.test(appCode) &&
    /chatInFlightRef\.current = false;/.test(appCode),
  true
);

featureCheck(
  "the latch is acquired before the message, tracking and request",
  (() => {
    const acquire = appCode.indexOf("chatInFlightRef.current = true;");
    const track = appCode.indexOf('trackAppEvent("ai_chat_sent"');
    const userMsg = appCode.indexOf('const nextChat = [...chat, { role: "user", content: trimmed }];');
    const req = appCode.indexOf("await sendChatMessage(trimmed");
    return acquire > 0 && acquire < track && acquire < userMsg && acquire < req;
  })(),
  true
);

featureCheck(
  "the latch releases on every path, including the clarification early return",
  // The release sits in a finally that wraps everything after acquisition, so a
  // throw while preparing context cannot leave the composer locked.
  /\} finally \{\s*\n\s*chatInFlightRef\.current = false;\s*\n\s*\}/.test(appCode) &&
    (() => {
      const acquire = appCode.indexOf("chatInFlightRef.current = true;");
      const clarifyReturn = appCode.indexOf("interceptedBeforeAi: true", acquire);
      const release = appCode.indexOf("chatInFlightRef.current = false;", acquire);
      return clarifyReturn > acquire && release > clarifyReturn;
    })(),
  true
);

featureCheck(
  "the blank-input guard still runs before the latch is taken",
  (() => {
    const guard = appCode.indexOf("if (!trimmed) return;");
    const acquire = appCode.indexOf("chatInFlightRef.current = true;");
    return guard > 0 && guard < acquire;
  })(),
  true
);

featureCheck(
  "the approved locked variant is opt-in and leaves other callers untouched",
  /variant = "default",/.test(appCode) &&
    /const tohi = variant === "tohi";/.test(appCode) &&
    /variant: "tohi",/.test(tohiCode) &&
    // the Plan caller must NOT pass a variant
    (() => {
      const planCall = appCode.slice(
        appCode.indexOf("Personalized Best Move is locked until setup is finished") - 200,
        appCode.indexOf("Personalized Best Move is locked until setup is finished") + 400
      );
      return !planCall.includes("variant");
    })(),
  true
);

console.log("Behaviour, trust and scope preserved — INVARIANT REGRESSION GUARDS");

/* ------------------------------------------------------------- invariants -- */

invariantCheck(
  "TohiTab is presentation only — it owns no business state",
  // 64B-2C narrowed this instead of dropping it. Effects and refs are now
  // authorised for scrolling, focused-composer detection, viewport observation
  // and accessibility. Component state, networking, storage and clocks stay
  // forbidden, and matchMedia is allowed for prefers-reduced-motion ONLY.
  !/useState|useReducer|useMemo|useCallback/.test(tohiSource) &&
    !/fetch\(|axios|sendChatMessage|trackAppEvent|trackEvent/.test(tohiCode) &&
    !/localStorage|sessionStorage|new Date|Date\.now|getHours/.test(tohiCode) &&
    (tohiCode.match(/matchMedia\(/g) || []).length ===
      (tohiCode.match(/matchMedia\("\(prefers-reduced-motion: reduce\)"\)/g) || []).length,
  true
);

invariantCheck(
  "TohiTab mutates no app state and derives no access",
  !/setChat\(|setChatLoading\(|setActivePark|setParkData|setTripPlanState|setRecommendations/.test(
    tohiCode
  ) && !/canUseRecommendations|buildAccessState|profileCompletion/.test(tohiCode),
  true
);

invariantCheck(
  "the locked card and its real actions remain delegated to App",
  // 64B-2B restyled this card through an opt-in variant, so the renderer is no
  // longer "unchanged" — but WHO OWNS IT is unchanged, and that is what this
  // guards. TohiTab asks for the card; it never renders the card's chrome and
  // never holds the navigation or Dev Preview handlers.
  /renderLockedFeatureCard\(\{/.test(tohiCode) &&
    R.locked.includes("LOCKED CARD FROM APP") &&
    // the card's own chrome stays an App-renderer responsibility
    !/PERSONALIZED FEATURE/.test(tohiCode) &&
    !/Dev Preview/.test(tohiCode) &&
    // and its real actions never move into the presentation
    !/setActiveScreen|setDevPreviewFullApp|lockedCardStyle/.test(tohiCode) &&
    !/DEV_ALLOW_FULL_APP_WITHOUT_PROFILE/.test(tohiCode) &&
    /function renderLockedFeatureCard\(\{/.test(appCode) &&
    /setActiveScreen\("family_profile"\)/.test(appCode) &&
    /DEV_ALLOW_FULL_APP_WITHOUT_PROFILE && \(/.test(appCode) &&
    /setDevPreviewFullApp\(true\)/.test(appCode),
  true
);

// 64B-2B REPLACES this. It previously required the locked state to show NO
// branded header, because 64B-2A deliberately left the locked card generic. The
// approved locked blueprint (state 6) integrates the branded header ABOVE the
// card, so the rule inverts for the header and keeps its real purpose for the
// chat surface: no composer, prompts or transcript may leak into a gated tab.
featureCheck(
  "the locked state shows the branded TOHI header above the approved locked card",
  R.locked.includes('src="/tohi-logo.png"') &&
    R.locked.includes("Ask TOHI</h2>") &&
    R.locked.includes("LOCKED CARD FROM APP") &&
    (() => {
      const logo = R.locked.indexOf("/tohi-logo.png");
      const cardAt = R.locked.indexOf("LOCKED CARD FROM APP");
      return logo >= 0 && cardAt > logo;
    })(),
  true
);

invariantCheck(
  "no chat surface leaks into the locked state",
  !R.locked.includes("Your question") &&
    !R.locked.includes('id="tohi-question"') &&
    !R.locked.includes("What if storms hit this afternoon?") &&
    !R.locked.includes("TOHI is checking your park-day context…"),
  true
);

invariantCheck(
  "the exact locked-card arguments are unchanged",
  /title: "TOHI guidance needs your trip setup",/.test(tohiCode) &&
    /"TOHI needs your trip setup so it can answer with your family, resort, height, and park context\."/.test(
      tohiCode
    ) &&
    /actionLabel: "Finish trip setup",/.test(tohiCode),
  true
);

invariantCheck(
  "the submit callback and setter still come from App",
  /onSubmit=\{onChatSubmit\}/.test(tohiCode) &&
    /onClick=\{\(\) => setMessage\(prompt\)\}/.test(tohiCode) &&
    /onChange=\{\(e\) => setMessage\(e\.target\.value\)\}/.test(tohiCode) &&
    !/handleChatSubmit/.test(tohiCode),
  true
);

invariantCheck(
  "message ordering, index keys and transcript retention are unchanged",
  /\{chat\.map\(\(msg, idx\) => \{/.test(tohiCode) &&
    /key=\{idx\}/.test(tohiCode) &&
    R.convo.indexOf("It is 2pm and everyone is hot.") >= 0 &&
    R.convo.indexOf("It is 2pm and everyone is hot.") <
      R.convo.indexOf("First paragraph about the heat."),
  true
);

invariantCheck(
  "TOHI night is prop-driven only, and App owns the single decision",
  // 64B-2E-1 narrowed this instead of dropping it; 64B-2E-2 updates the two
  // clauses that described the inactive gate. What must stay impossible is
  // unchanged and is the whole point: TohiTab may never DERIVE the mode. The
  // shared shell flags, the theme runtime and the colour-scheme query are all
  // still forbidden inside it — only the parent decides.
  /night = false,/.test(tohiCode) &&
    /const t = night \? TOHI_NIGHT : DAY;/.test(tohiCode) &&
    !new RegExp("shellNight|planNight|shellTokens|getTohiAppShellTheme|isTohiNightMode|TOHI_NIGHT_SHELL|prefers-color-scheme").test(tohiCode) &&
    // 64B-2E-2: activated through the shared flag, and through nothing else.
    /<TohiTab[\s\S]*?night=\{shellNight\}[\s\S]*?\/>/.test(appCode) &&
    !/night=\{false\}/.test(appCode) &&
    (() => {
      const m = appCode.match(
        /const shellNight\s*=\s*\n?\s*\(([\s\S]*?)\)\s*&&\s*\n?\s*planNight;/
      );
      if (!m) return false;
      const tabs = [...m[1].matchAll(/activeTab === "(\w+)"/g)].map((x) => x[1]).sort();
      // Profile joined the membership in the Profile night phase. TOHI's own
      // guarantee — that it never derives the mode itself — is unaffected by who
      // else is in the set; what this clause pins is that TOHI is still in it,
      // and that the set is still exact.
      return tabs.join(",") === "home,plan,profile,tohi,waits";
    })(),
  true
);

invariantCheck(
  "no later-phase behaviour arrived early",
  // 64B-2C delivered autoscroll, the live region and TOHI keyboard suppression,
  // so those three prohibitions are superseded. They are REPLACED by narrower
  // guards rather than dropped: the approved behaviour is permitted, its
  // forbidden expansions are not. Everything still deferred is kept verbatim.
  !/Start Over|Retry|Try again/i.test(tohiCode) &&       // retry / start over
    !/localStorage|sessionStorage/.test(tohiCode) &&     // persistence
    // 64B-2E-1 delivered the night presentation, so the blanket night ban is
    // superseded. Replaced, not dropped: night may exist, but only as an
    // explicit prop that App currently holds shut.
    !new RegExp("shellNight|planNight|shellTokens|getTohiAppShellTheme|isTohiNightMode|TOHI_NIGHT_SHELL|prefers-color-scheme").test(tohiCode) &&
    /night = false,/.test(tohiCode) &&
    !/timestamp|reaction|onEdit|contentEditable/i.test(tohiCode) &&
    // autoscroll is approved, but it may never focus the field for the user
    !/autoFocus/.test(tohiCode) &&
    // the viewport is observed, never written to, and no global layout lock is
    // installed on the document
    !/document\.body\.style|position:\s*"fixed"/.test(tohiCode) &&
    // the live region must stay polite — assertive would interrupt the user
    !/aria-live="assertive"/.test(tohiCode),
  true
);

invariantCheck(
  "no failure state is inferred from reply copy",
  // This phase has no honest failure metadata, so nothing may pattern-match a
  // message to decide a state. isLiveStateQuestion is real data App sets.
  !/Offline Help|having trouble reaching/i.test(tohiCode) &&
    !/content\s*\.\s*(includes|startsWith|match|indexOf)/.test(tohiCode),
  true
);

invariantCheck(
  "no TOHI Pick, Plan, recommendation or While You Wait content is present",
  !/TohiPick|tohiPick|RecommendationCard|PlanRecommendations|PlanTab|WhileYouWait|mustDo|bestMove/i.test(
    tohiCode
  ) && tohiCode.includes("and recommendations to answer with real trip context."),
  true
);

invariantCheck(
  "no studio-sheet chrome leaked in from the blueprints",
  !/statusbar|BottomTabs|9:41|SHEET|STATE \d/.test(tohiCode) &&
    !/data-tohi-nav|<nav/.test(tohiCode),
  true
);

invariantCheck(
  "no production file references the blueprint assets",
  (() => {
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(full);
        return /\.(jsx?|cjs|mjs|ts|tsx|css)$/.test(e.name) ? [full] : [];
      });
    return walk(path.join(frontendRoot, "src")).every((f) => {
      const src = strip(fs.readFileSync(f, "utf8"));
      return !/docs\/design\/tohi/.test(src) && !/tohi-approved-/.test(src);
    });
  })(),
  true
);

console.log("");
console.log(`  64B-2A feature-discriminating: ${featurePass} passed, ${featureFail} failed`);
console.log(`  64B-2A invariant regression guards: ${invariantPass} passed, ${invariantFail} failed`);
console.log("");
console.log(`${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}
