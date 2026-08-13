#!/usr/bin/env node

// 63B-1 parity renderer.
//
// Renders the Waits tab presentation to static HTML for a fixed set of existing
// states. waitsExtractionParityHarness.cjs runs this file in BOTH the pinned
// pre-extraction baseline worktree and the extracted tree, then compares the
// output byte for byte.
//
// The extraction is only safe if the screen is unchanged. Reading the diff
// cannot prove that — a moved brace or a dropped conditional still reads fine.
// Rendering proves it: every attribute React actually emits is in the output.
//
// In the baseline tree there is no WaitsTab component: the markup lives inside
// App.jsx. So when WaitsTab.jsx is absent this file lifts the exact
// `activeTab === "waits"` JSX block out of App.jsx, wraps it in a component with
// the same prop names, and renders that. Same markup, same inputs, same
// comparison — no hand-copied baseline.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const babel = require("@babel/core");

const frontendRoot = path.resolve(__dirname, "..");
const COMPONENTS = path.join(frontendRoot, "src", "components");
const WAITS_TAB = path.join(COMPONENTS, "WaitsTab.jsx");
const SHIM = path.join(COMPONENTS, "__waitsParityBaselineShim.jsx");

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

/* ------------------------------------------------- component under test -- */

const PROP_LIST = [
  "activeRideId",
  "browsedParkLabel",
  "browsingAnotherPark",
  "confirmedActiveParkLabel",
  "loading",
  "sortedRides",
  "waitListParkId",
  "loadData",
  "formatLandLabel",
  "renderRideActions",
  "renderShowtimeInfo",
  "button",
  "card",
];

let createdShim = false;

function loadWaitsTab() {
  if (fs.existsSync(WAITS_TAB)) {
    return require(WAITS_TAB).WaitsTab;
  }

  // Baseline tree: lift the block out of App.jsx verbatim.
  const app = fs.readFileSync(path.join(frontendRoot, "src", "App.jsx"), "utf8");
  const start = app.indexOf('{activeTab === "waits" && (');
  const end = app.indexOf('{activeTab === "plan" && (', start);
  if (start < 0 || end < 0) {
    throw new Error("could not locate the Waits block in the baseline App.jsx");
  }
  let block = app.slice(start, end);
  // strip the tab gate wrapper, keeping the JSX it guarded
  block = block.slice(block.indexOf("(") + 1);
  block = block.slice(0, block.lastIndexOf(")}"));

  const source = `import React from "react";
import { RefreshCw } from "lucide-react";
import { WaitTimesList } from "./WaitTimesList";
import { colors } from "../theme";
export function WaitsTab({ ${PROP_LIST.join(", ")} }) {
  return (
${block}
  );
}
`;
  fs.writeFileSync(SHIM, source);
  createdShim = true;
  return require(SHIM).WaitsTab;
}

const WaitsTab = loadWaitsTab();

/* --------------------------------------------------------------- fixtures -- */

const { colors } = require(path.join(frontendRoot, "src", "theme.js"));

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

// Deterministic stand-ins for App's renderers. Parity is about composition and
// suppression, so what matters is that identical inputs produce identical
// output, and that the browsing gate replaces these with () => null.
const formatLandLabel = (parkId, land) => `${parkId || "no_park"}:${land || "no_land"}`;
const renderRideActions = (ride) =>
  React.createElement("div", { "data-actions-for": String(ride.id) }, "ACTIONS");
const renderShowtimeInfo = (ride) =>
  ride.showProfile
    ? React.createElement("div", { "data-showtimes-for": String(ride.id) }, "SHOWTIMES")
    : null;

const RIDES = {
  open: { id: 101, name: "Star Tours – The Adventures Continue", land: "echo_lake", isOpen: true, waitTime: 20 },
  high: { id: 102, name: "Slinky Dog Dash", land: "toy_story_land", isOpen: true, waitTime: 65 },
  mid: { id: 103, name: "Rock 'n' Roller Coaster Starring The Muppets", land: "sunset_boulevard", isOpen: true, waitTime: 35 },
  closed: { id: 104, name: "Mickey & Minnie's Runaway Railway", land: "hollywood_boulevard", isOpen: false, waitTime: null },
  unavailable: { id: 105, name: "Tower of Terror", land: "sunset_boulevard", isOpen: true, waitTime: null },
  show: {
    id: 106,
    name: "Beauty and the Beast Live on Stage",
    land: "sunset_boulevard",
    isOpen: true,
    waitTime: null,
    showProfile: { showtimes: ["11:00 AM", "1:00 PM"], recommendedShowtimes: ["11:00 AM"] },
  },
};

function props(over = {}) {
  return {
    activeRideId: null,
    browsedParkLabel: "EPCOT",
    browsingAnotherPark: false,
    confirmedActiveParkLabel: "Hollywood Studios",
    loading: false,
    sortedRides: [RIDES.high, RIDES.mid, RIDES.open],
    waitListParkId: "hollywood",
    loadData: noop,
    formatLandLabel,
    renderRideActions,
    renderShowtimeInfo,
    button,
    card,
    ...over,
  };
}

/* ----------------------------------------------------------------- render -- */

const SCENARIOS = [
  ["healthy-active-park-rides", props()],
  ["loading-refresh-button", props({ loading: true })],
  ["active-in-line-ride", props({ activeRideId: "102" })],
  ["closed-and-unavailable-waits", props({ sortedRides: [RIDES.closed, RIDES.unavailable] })],
  ["showtime-attraction", props({ sortedRides: [RIDES.show] })],
  [
    "browsing-another-park",
    props({
      browsingAnotherPark: true,
      waitListParkId: "epcot",
      sortedRides: [RIDES.high, RIDES.show],
    }),
  ],
  ["empty-ride-array", props({ sortedRides: [] })],
];

const out = [];
for (const [name, p] of SCENARIOS) {
  let html;
  try {
    html = renderToStaticMarkup(React.createElement(WaitsTab, p));
  } catch (err) {
    html = `RENDER_ERROR: ${err.message}`;
  }
  out.push(`===== ${name} =====\n${html}`);
}

if (createdShim) {
  try {
    fs.unlinkSync(SHIM);
  } catch {}
}

process.stdout.write(out.join("\n\n"));
