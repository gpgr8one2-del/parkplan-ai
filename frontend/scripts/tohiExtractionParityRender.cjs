#!/usr/bin/env node

// TOHI extraction parity renderer (64B-1).
//
// Renders the TOHI chat presentation to static HTML in three modes, so
// tohiExtractionParityHarness.cjs can compare them byte for byte:
//
//   PARITY_SOURCE=baseline        the pinned pre-extraction App.jsx
//   PARITY_SOURCE=current-direct  the extracted TohiTab component
//   PARITY_SOURCE=current-callsite the current App.jsx <TohiTab/> call site
//
// The baseline side is NOT a hand-copied reproduction. It is sliced mechanically
// out of the pinned commit's App.jsx with `git show`, brace-matched from
// `{activeTab === "tohi" &&` to its closing brace, and wrapped in a component
// that supplies the same names the branch closed over in App. A hand copy could
// drift from the real baseline and still compare clean; this cannot.
//
// The call-site mode exists because a direct component render proves the
// component is right but says nothing about whether App wired it up correctly.
// Slicing the CURRENT App.jsx and rendering that proves the props actually
// passed produce the same output.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const SOURCE = process.env.PARITY_SOURCE || "current-direct";

const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");
const { execFileSync } = require("child_process");
const babel = require("@babel/core");

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");

// The pinned pre-extraction baseline: origin/main at the moment 64B-1 began,
// the merge of PR #122. Pinned to an immutable full hash on purpose — a branch
// name would let the comparison point drift, so a later phase could change the
// extracted output one merge at a time and every run would still report parity.
const PINNED_BASE = "8bf834220e84b546cecc1b1e1d9130d9dc51015c";
const BASE_REF = process.env.TOHI_PARITY_BASE || PINNED_BASE;

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
for (const ext of [".jpg", ".png", ".webp", ".svg", ".gif"]) {
  Module._extensions[ext] = (module, filename) =>
    module._compile(
      `module.exports = ${JSON.stringify("/assets/" + path.basename(filename))};`,
      filename
    );
}

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { colors } = require(path.join(frontendRoot, "src", "theme.js"));

/* ------------------------------------------------------------- slicing -- */

// Brace-match from the opening `{` of `{activeTab === "tohi" &&` to its close,
// so the whole conditional expression comes out intact regardless of how the
// JSX inside is formatted.
function sliceTohiBranch(source, label) {
  const marker = '{activeTab === "tohi" &&';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`${label}: could not locate the TOHI branch`);

  let depth = 0;
  let inStr = null;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    const prev = source[i - 1];
    if (inStr) {
      if (ch === inStr && prev !== "\\") inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${label}: unbalanced braces slicing the TOHI branch`);
}

function baselineAppSource() {
  return execFileSync("git", ["show", `${BASE_REF}:frontend/src/App.jsx`], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

// Build a throwaway module that renders the sliced branch with the same names
// the branch closed over inside App.
function buildComponent(branchJsx, { importsTohiTab }) {
  const themePath = path.join(frontendRoot, "src", "theme.js");
  const tohiTabPath = path.join(frontendRoot, "src", "components", "TohiTab.jsx");

  const src = `
import React from "react";
import { MessageCircle, Send } from "lucide-react";
import { colors } from ${JSON.stringify(themePath)};
${importsTohiTab ? `import { TohiTab } from ${JSON.stringify(tohiTabPath)};` : ""}

export function Rendered({
  chat, message, chatLoading, hasPersonalizedAccess,
  setMessage, onChatSubmit, renderLockedFeatureCard, card, button,
}) {
  const activeTab = "tohi";
  const handleChatSubmit = onChatSubmit;
  return (<>${branchJsx}</>);
}
`;
  const out = babel.transformSync(src, {
    filename: path.join(frontendRoot, "src", "__parity__.jsx"),
    presets: [[require.resolve("babel-preset-react-app"), { runtime: "automatic" }]],
    babelrc: false,
    configFile: false,
  });

  // Compiled in memory with the frontend's own resolution paths. Nothing is
  // written to disk, so a parity run can never leave an artifact behind, and
  // `react` / `lucide-react` resolve exactly as they do for the real app.
  const filename = path.join(frontendRoot, "src", "__tohi_parity_rendered__.js");
  const mod = new Module(filename, null);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.join(frontendRoot, "src"));
  mod._compile(out.code, filename);
  return mod.exports.Rendered;
}

/* ------------------------------------------------------------- fixtures -- */

// App's shared style objects, reproduced exactly as App declares them. They are
// passed as props to both sides, so property order — which React preserves in
// the emitted style attribute — is identical by construction.
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
const lockedCardStyle = {
  ...card,
  border: `1px dashed ${colors.cardBorder}`,
  background: "linear-gradient(145deg, rgba(255,255,255,0.94) 0%, #FFF9F1 100%)",
  boxShadow: "0 10px 24px rgba(28, 25, 23, 0.05)",
};

const noop = () => {};

// renderLockedFeatureCard is a closure inside App and cannot be imported. Both
// sides receive THIS function as a prop, so parity is unaffected by its shape —
// what the comparison proves is that both sides call it with identical
// arguments. Its markup mirrors App's so the output stays realistic, and the
// Dev Preview branch is driven by an explicit flag rather than NODE_ENV so it
// renders deterministically.
function makeLockedRenderer(devPreview) {
  return function renderLockedFeatureCard({ title, body, actionLabel = "Finish trip setup", night = false }) {
    return React.createElement(
      "section",
      {
        style: {
          ...lockedCardStyle,
          ...(night
            ? {
                background: "#131C36",
                border: "1px solid rgba(139, 92, 246, 0.34)",
                boxShadow: "0 12px 30px rgba(2, 6, 23, 0.45)",
              }
            : {}),
        },
      },
      React.createElement(
        "div",
        { style: { fontSize: 12, fontWeight: 900, color: night ? "#C4B5FD" : colors.purple } },
        "PERSONALIZED FEATURE"
      ),
      React.createElement("h3", { style: { margin: "6px 0 6px", color: night ? "#F5F3FF" : undefined } }, title),
      React.createElement(
        "p",
        { style: { margin: 0, color: night ? "#B6C2E2" : colors.muted, fontSize: 14, lineHeight: 1.45 } },
        body
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 } },
        React.createElement(
          "button",
          { type: "button", style: { ...button, background: colors.purpleDeep, color: "white" } },
          actionLabel
        ),
        devPreview
          ? React.createElement(
              "button",
              { type: "button", style: { ...button, color: colors.purple, borderColor: colors.purpleSoft } },
              "Dev Preview"
            )
          : null
      )
    );
  };
}

const LOCKED = makeLockedRenderer(false);
const LOCKED_DEV = makeLockedRenderer(true);

const USER = (content) => ({ role: "user", content });
const TOHI = (content) => ({ role: "assistant", content });

const LONG_USER =
  "We have a 4 year old and a 9 year old, we're staying at the Contemporary, and we have a dinner reservation at 6:30. " +
  "It's hot and everyone slept badly. What's realistic for the rest of the afternoon?";
const LONG_TOHI =
  "With a 6:30 dinner and a rough night behind you, plan for one more solid thing rather than three rushed ones.\n\n" +
  "Head for something seated and indoors near you now, then take the monorail back for a proper reset.\n\n" +
  "Come back out around 5:15 if the kids bounce back.";

// The clarification intercept sets isLiveStateQuestion on the message. Today
// nothing renders differently for it; the fixture carries the flag so the
// comparison would catch it if extraction accidentally started to.
const CLARIFY = {
  role: "assistant",
  content: "How's everyone's energy right now — still going, or starting to fade?",
  isLiveStateQuestion: true,
};

const FAILURE_BUBBLE = TOHI(
  "TOHI Offline Help\n\nI’m having trouble reaching AI chat right now, so I do not want to pretend I fully understood the question.\n\nTry sending your message again in a minute once the signal improves."
);

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

const CONVO = [USER("It's 2pm and everyone is getting hot and cranky. What should we do?"), TOHI("Good time to head indoors for a bit.")];

// Every audited state from 64A-1, plus the extras the brief requires.
const SCENARIOS = [
  ["01-access-locked", props({ hasPersonalizedAccess: false })],
  ["02-personalized-empty-chat", props()],
  ["03-suggested-prompt-selected", props({ message: "Should we take a break or keep going?" })],
  ["04-typed-question", props({ message: "Is the monorail still the fastest way back?" })],
  ["05-submission-in-progress", props({ chat: [USER("What should we do next?")], chatLoading: true })],
  ["06-successful-response", props({ chat: CONVO })],
  [
    "07-multiple-messages",
    props({
      chat: [...CONVO, USER("Is the monorail still the fastest way back?"), TOHI("Yes, from where you are it still is.")],
    }),
  ],
  ["08-request-failure-bubble", props({ chat: [USER("What about the parade?"), FAILURE_BUBBLE] })],
  ["09-blank-input", props({ chat: CONVO, message: "   " })],
  // Repeated submission presents as a loading form over a retained transcript;
  // there is no separate visual state for it today, and that is what is pinned.
  ["10-rapid-repeated-submit", props({ chat: [...CONVO, USER("And after that?")], chatLoading: true, message: "" })],
  // A malformed reply reaches cleanAssistantReply as undefined and becomes "",
  // so the bubble renders its prefix and nothing else. Pinned as-is.
  ["11-missing-malformed-response", props({ chat: [USER("What about the parade?"), TOHI("")] })],
  ["12-clarification-intercept", props({ chat: [USER("What should we do next?"), CLARIFY] })],
  // Tab switching does not clear chat; the retained transcript is the state.
  ["13-conversation-retained-after-tab-switch", props({ chat: CONVO, message: "" })],
  ["14-long-user-message", props({ chat: [USER(LONG_USER)] })],
  ["15-long-tohi-response", props({ chat: [USER("What's realistic this afternoon?"), TOHI(LONG_TOHI)] })],
  ["16-dev-preview-locked-card", props({ hasPersonalizedAccess: false, renderLockedFeatureCard: LOCKED_DEV })],
  ["17-locked-while-loading", props({ hasPersonalizedAccess: false, chatLoading: true, message: "ignored" })],
  ["18-empty-chat-with-typed-message", props({ message: "What if storms hit this afternoon?" })],
];

/* ------------------------------------------------------------- validation -- */

const fixtureErrors = [];
if (SCENARIOS.length !== new Set(SCENARIOS.map(([n]) => n)).size)
  fixtureErrors.push("duplicate scenario name");
if (!SCENARIOS.some(([, p]) => p.hasPersonalizedAccess === false))
  fixtureErrors.push("no locked scenario");
if (!SCENARIOS.some(([, p]) => p.chatLoading === true)) fixtureErrors.push("no loading scenario");
if (!SCENARIOS.some(([, p]) => p.chat.length === 0)) fixtureErrors.push("no empty-chat scenario");
if (!SCENARIOS.some(([, p]) => p.chat.some((m) => m.isLiveStateQuestion)))
  fixtureErrors.push("no clarification scenario");
if (!SCENARIOS.some(([, p]) => p.chat.some((m) => m.role === "assistant" && m.content === "")))
  fixtureErrors.push("no malformed-reply scenario");
if (!SCENARIOS.some(([, p]) => p.chat.some((m) => m.content.includes("\n\n"))))
  fixtureErrors.push("no multi-paragraph content, so newline collapsing is unpinned");
if (fixtureErrors.length) {
  process.stderr.write("FIXTURE VALIDATION FAILED:\n  " + fixtureErrors.join("\n  ") + "\n");
  process.exit(2);
}

/* ---------------------------------------------------------------- render -- */

let Component;
if (SOURCE === "baseline") {
  Component = buildComponent(sliceTohiBranch(baselineAppSource(), "baseline App.jsx"), {
    importsTohiTab: false,
  });
} else if (SOURCE === "current-callsite") {
  const appSource = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");
  Component = buildComponent(sliceTohiBranch(appSource, "current App.jsx"), {
    importsTohiTab: true,
  });
} else {
  const { TohiTab } = require(path.join(frontendRoot, "src", "components", "TohiTab.jsx"));
  Component = TohiTab;
}

const out = [];
for (const [name, p] of SCENARIOS) {
  let html;
  try {
    html = renderToStaticMarkup(React.createElement(Component, p));
  } catch (err) {
    html = `RENDER_ERROR: ${err.message}`;
  }
  out.push(`===== ${name} =====\n${html}`);
}

process.stdout.write(out.join("\n\n"));
