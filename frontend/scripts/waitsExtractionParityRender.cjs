#!/usr/bin/env node

// Waits parity renderer.
//
// Renders the Waits tab presentation to static HTML for a fixed set of existing
// states, so waitsExtractionParityHarness.cjs can assert BEHAVIOUR against real
// output rather than against source text.
//
// 63B-1 used this to prove the extraction was byte-identical to the
// pre-extraction baseline. 63B-2 intentionally replaced the presentation, so
// the harness now checks behaviour — real ride data, real ordering, real active
// ride, real showtime data, action wiring, browsing suppression and day-only
// scope — instead of pinning markup that the product deliberately changed.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const babel = require("@babel/core");

const frontendRoot = path.resolve(__dirname, "..");
const COMPONENTS = path.join(frontendRoot, "src", "components");
const WAITS_TAB = path.join(COMPONENTS, "WaitsTab.jsx");

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

const { WaitsTab } = require(WAITS_TAB);

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
  // Closed, but metadata still carries a schedule. The card must stay Closed.
  closedShow: {
    id: 107,
    name: "Fantasmic!",
    land: "sunset_boulevard",
    isOpen: false,
    waitTime: null,
    showProfile: { showtimes: ["8:00 PM", "10:30 PM"], verifyDailySchedule: true },
  },
  show: {
    id: 106,
    name: "Beauty and the Beast Live on Stage",
    land: "sunset_boulevard",
    isOpen: true,
    waitTime: null,
    showProfile: { showtimes: ["11:00 AM", "1:00 PM"], recommendedShowtimes: ["11:00 AM"] },
  },
};

const getParkNameById = (id) =>
  ({ hollywood: "Hollywood Studios", epcot: "EPCOT" }[id] || id || "the park");
const hasShowtimeSchedule = (ride) => Boolean(ride?.showProfile?.showtimes?.length);

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
    getParkNameById,
    hasShowtimeSchedule,
    waitListParkData: { source: "live", ageMs: 42000, fetchedAt: "2026-08-13T14:00:00.000Z" },
    renderRideActions,
    renderShowtimeInfo,
    button,
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
      browsedParkLabel: "EPCOT",
      confirmedActiveParkLabel: "Hollywood Studios",
      sortedRides: [RIDES.high, RIDES.show],
    }),
  ],
  ["closed-show-with-schedule", props({ sortedRides: [RIDES.closedShow] })],
  // The very first frame: no data, no error, and the effect has not yet set
  // loading. This must not render blank or claim the park is empty.
  ["first-render-before-effect", props({ sortedRides: [], waitListParkData: null })],
  [
    "browsed-first-render-before-effect",
    props({
      browsingAnotherPark: true,
      waitListParkId: "epcot",
      browsedParkLabel: "EPCOT",
      sortedRides: [],
      waitListParkData: null,
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

process.stdout.write(out.join("\n\n"));
