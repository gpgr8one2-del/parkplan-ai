#!/usr/bin/env node

// TOHI day/night render surface for the 64B-2E-1 parity proof.
//
// Renders every meaningful TOHI scenario to static HTML and prints it. The
// harness runs this file in BOTH this tree and a detached worktree of the pinned
// pre-night baseline, then compares the two day outputs byte for byte.
//
// PARITY_NIGHT=1 renders with night={true}. That is only meaningful in a tree
// that has the night presentation; the pinned baseline ignores the unknown prop,
// which is exactly why the harness only ever compares the DAY outputs.
//
// The locked-card stub here deliberately ignores `night`. App's real renderer
// owns the locked card and already has its own night branch; reproducing that
// here would compare this file against itself. That the explicit night value
// reaches the locked renderer at all is proved separately, by the night harness,
// which uses a stub that records what it was handed.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const babel = require("@babel/core");

const frontendRoot = path.resolve(__dirname, "..");

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
const { TohiTab } = require(path.join(frontendRoot, "src", "components", "TohiTab.jsx"));

const NIGHT = process.env.PARITY_NIGHT === "1";

// The same shared style objects App passes, copied as literals so this renderer
// does not depend on App's module-level internals.
const card = {
  background: "rgba(255,255,255,0.94)",
  border: "1px solid #EADCC8",
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
  border: "1px solid #EADCC8",
  background: "#FFFFFF",
  color: "#241C15",
  borderRadius: 999,
  padding: "9px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

function renderLockedFeatureCard({ title, body, actionLabel }) {
  return React.createElement(
    "section",
    { "data-locked": "true" },
    React.createElement("div", null, title),
    React.createElement("div", null, body),
    React.createElement("button", { type: "button" }, actionLabel)
  );
}

const LONG_REPLY =
  "With a 4:30 dinner and a 9 year old, we're staying at the Contemporary, and we " +
  "have a dinner reservation at 6:30. It's hot and everyone slept badly. What's " +
  "realistic for the rest of the afternoon?\n\n" +
  "Head for something seated and indoors near you now, then take the monorail back " +
  "to the Contemporary for a proper reset. You're close enough that the break costs " +
  "you very little.";

const FAILURE_COPY =
  "TOHI couldn't connect right now. Your plan and recommendations haven't changed. " +
  "You can try sending your question again.";

const USER_Q = "It's 2pm and everyone is getting hot and cranky. What should we do?";
const REPLY =
  "Good time to head indoors for a bit. Carousel of Progress and the PeopleMover are " +
  "both close to you, seated, and air conditioned.\n\nIf the crew is still fading " +
  "after that, a resort break is realistic today.";

// Every state the 64B-2E-1 brief requires parity for, named so a dropped
// scenario fails the harness instead of quietly shrinking the proof.
const SCENARIOS = [
  ["empty-with-suggested-prompts", { chat: [], message: "", chatLoading: false }],
  [
    "suggested-prompt-selected",
    { chat: [], message: "Should we take a break or keep going?", chatLoading: false },
  ],
  [
    "sending-with-user-message-retained",
    { chat: [{ role: "user", content: USER_Q }], message: "", chatLoading: true },
  ],
  [
    "healthy-active-conversation",
    {
      chat: [
        { role: "user", content: USER_Q },
        { role: "assistant", content: REPLY },
      ],
      message: "",
      chatLoading: false,
    },
  ],
  [
    "connection-failure-conversation-retained",
    {
      chat: [
        { role: "user", content: USER_Q },
        { role: "assistant", content: REPLY },
        { role: "user", content: "Is the monorail still the fastest way back?" },
        { role: "assistant", content: FAILURE_COPY, isConnectionFailure: true },
      ],
      message: "Is the monorail still the fastest way back?",
      chatLoading: false,
    },
  ],
  [
    "quick-check-clarification",
    {
      chat: [
        { role: "user", content: "What should we do next?" },
        {
          role: "assistant",
          content: "How's everyone's energy right now — still going, or starting to fade?",
          isLiveStateQuestion: true,
        },
      ],
      message: "",
      chatLoading: false,
    },
  ],
  ["locked-trip-setup-required", { chat: [], message: "", chatLoading: false, locked: true }],
  [
    "long-question-and-long-reply",
    {
      chat: [
        { role: "user", content: LONG_REPLY },
        { role: "assistant", content: LONG_REPLY },
      ],
      message: "",
      chatLoading: false,
    },
  ],
  [
    "blank-input-send-disabled",
    { chat: [{ role: "user", content: USER_Q }], message: "   ", chatLoading: false },
  ],
  [
    "malformed-reply-resolved-as-failure",
    {
      chat: [
        { role: "user", content: "What about the afternoon parade?" },
        { role: "assistant", content: FAILURE_COPY, isConnectionFailure: true },
      ],
      message: "What about the afternoon parade?",
      chatLoading: false,
    },
  ],
];

for (const [name, s] of SCENARIOS) {
  console.log(`===== ${name} =====`);
  let html;
  try {
    html = renderToStaticMarkup(
      React.createElement(TohiTab, {
        chat: s.chat,
        message: s.message,
        chatLoading: s.chatLoading,
        hasPersonalizedAccess: !s.locked,
        setMessage: () => {},
        onChatSubmit: () => {},
        renderLockedFeatureCard,
        onComposerKeyboardChange: () => {},
        // Deliberately only passed when rendering night. Day exercises the safe
        // default, which is what the pinned baseline also renders.
        ...(NIGHT ? { night: true } : {}),
        card,
        button,
      })
    );
  } catch (err) {
    html = `RENDER_ERROR: ${err.message}`;
  }
  console.log(html);
}
