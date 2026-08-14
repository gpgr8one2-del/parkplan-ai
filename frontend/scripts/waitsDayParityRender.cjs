#!/usr/bin/env node

// 63C-1 day-value proof, half one: render every meaningful Waits scenario to
// static HTML and print the result.
//
// This file is copied into a detached worktree of the pinned pre-night baseline
// and run there too. waitsDayParityHarness.cjs then compares the two outputs
// byte for byte.
//
// Reading ternaries cannot prove day values are unchanged — a mistyped hex in a
// day branch reads fine, and so does an `...(night ? x : null)` spread that
// accidentally reorders a day style object. Rendering does prove it: every
// inline style React actually emits lands in the output, so any drift in any
// day value or property order shows up as a diff.
//
// Set PARITY_NIGHT=1 to render the same fixtures with night={true}.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const NIGHT = process.env.PARITY_NIGHT === "1";

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
for (const ext of [".jpg", ".png", ".webp", ".svg", ".gif"]) {
  Module._extensions[ext] = (module, filename) =>
    module._compile(
      `module.exports = ${JSON.stringify("/assets/" + path.basename(filename))};`,
      filename
    );
}

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const { WaitsTab } = require(path.join(frontendRoot, "src/components/WaitsTab.jsx"));
const { WaitTimesList } = require(path.join(
  frontendRoot,
  "src/components/WaitTimesList.jsx"
));

/* --------------------------------------------------------------- fixtures -- */

const { colors } = require(path.join(frontendRoot, "src/theme.js"));

// The shared style objects App owns, reproduced exactly as App declares them so
// the render matches what ships.
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
const actionButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  background: "rgba(255,255,255,0.78)",
  border: `1px solid ${colors.cardBorder}`,
  color: colors.text,
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const noop = () => {};

/* ------------------------------------------------- App's real renderers --- */

// renderRideActions and renderShowtimeInfo are closures inside App and cannot be
// imported. They are reproduced here from App.jsx, minus the handler bodies, so
// the Waits action and showtime variants are covered by this proof rather than
// stubbed away. A stub would compare clean while the real renderer drifted.
//
// This copy can only drift from App in one direction that matters: a day style
// value could change in App and not here. waitsDayParityHarness.cjs closes that
// gap directly — it extracts every day-mode style literal from App's two
// renderers and requires each one to appear in this file. What it does NOT
// claim is structural equivalence; the reproduction is hand-maintained, and the
// harness says so.
function makeRenderers(activeRideId) {
  function renderRideActions(ride, options = {}) {
    if (!ride?.id) return null;

    const isActiveRide = activeRideId === String(ride.id);
    const night = options.night === true;
    const compact = options.compact === true;
    const waits = options.variant === "waits";
    const themedActionButton = night
      ? {
          ...actionButton,
          background: "rgba(15, 23, 42, 0.72)",
          border: "1px solid rgba(99, 102, 241, 0.30)",
          color: "#E2E8F0",
        }
      : actionButton;
    const sizedActionButton = compact
      ? {
          ...themedActionButton,
          padding: "6px 9px",
          fontSize: 11,
          whiteSpace: "nowrap",
          minWidth: 0,
          minHeight: 36,
        }
      : waits
      ? {
          ...themedActionButton,
          minHeight: 48,
          borderRadius: 16,
          padding: "0 12px",
          fontSize: 14,
          fontWeight: 850,
          whiteSpace: "nowrap",
          minWidth: 0,
          ...(night
            ? {
                background: "#1A2444",
                border: "1px solid rgba(129, 140, 248, 0.28)",
              }
            : null),
        }
      : themedActionButton;

    return React.createElement(
      "div",
      {
        style: waits
          ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 16 }
          : {
              display: "flex",
              gap: compact ? 6 : 8,
              justifyContent: "flex-end",
              marginTop: compact ? 8 : 10,
              flexWrap: compact ? "nowrap" : "wrap",
            },
      },
      React.createElement(
        "button",
        {
          disabled: isActiveRide,
          style: {
            ...sizedActionButton,
            color: isActiveRide
              ? night
                ? "#A8B4CC"
                : "#94a3b8"
              : night
              ? "#C4B5FD"
              : "#6d28d9",
            borderColor: isActiveRide
              ? night
                ? "rgba(148, 163, 184, 0.30)"
                : "#e2e8f0"
              : night
              ? "rgba(196, 181, 253, 0.36)"
              : "#ddd6fe",
            cursor: isActiveRide ? "not-allowed" : "pointer",
          },
        },
        isActiveRide ? "In Line Now" : "In Line"
      ),
      React.createElement(
        "button",
        { style: { ...sizedActionButton, color: night ? "#6EE7B7" : colors.success } },
        "✓ Done"
      ),
      React.createElement(
        "button",
        { style: { ...sizedActionButton, color: night ? "#B6C2E2" : colors.muted } },
        "Skip"
      ),
      React.createElement(
        "button",
        {
          style: {
            ...sizedActionButton,
            color: night ? "#FCD34D" : "#92400E",
            borderColor: night ? "rgba(252, 211, 77, 0.30)" : colors.amberSoft,
          },
        },
        compact ? "Report" : "Report Issue"
      )
    );
  }

  function renderShowtimeInfo(ride, options = {}) {
    const showProfile = ride?.showProfile;
    if (!showProfile?.showtimes?.length) return null;

    const night = options.night === true;
    const waits = options.variant === "waits";

    if (waits) {
      return React.createElement(
        "div",
        {
          style: {
            marginTop: 14,
            padding: "15px 16px",
            borderRadius: 20,
            border: night
              ? "1px solid rgba(56, 189, 248, 0.30)"
              : "1px solid rgba(56, 189, 248, 0.28)",
            background: night ? "#192D4B" : "#E0F2FE",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.3,
              textTransform: "uppercase",
              color: night ? "#7DD3FC" : "#0369A1",
            },
          },
          "Typical showtimes"
        ),
        React.createElement(
          "div",
          { style: { display: "flex", flexWrap: "wrap", gap: 7, marginTop: 11 } },
          showProfile.showtimes.map((time) =>
            React.createElement(
              "span",
              {
                key: time,
                style: {
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: night ? "#132139" : "rgba(255, 255, 255, 0.85)",
                  border: night
                    ? "1px solid rgba(56, 189, 248, 0.26)"
                    : "1px solid rgba(56, 189, 248, 0.24)",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: night ? "#CBD5F0" : colors.muted,
                },
              },
              time
            )
          )
        ),
        showProfile.verifyDailySchedule
          ? React.createElement(
              "p",
              {
                style: {
                  margin: "10px 0 0",
                  color: night ? "#CBD5F0" : colors.muted,
                  fontSize: 12,
                  lineHeight: 1.4,
                },
              },
              "Verify in My Disney Experience. Showtimes can change by day."
            )
          : null
      );
    }

    return React.createElement(
      "div",
      {
        style: {
          marginTop: 10,
          padding: 10,
          borderRadius: 14,
          border: night ? "1px solid rgba(139, 92, 246, 0.30)" : "1px solid #e9d5ff",
          background: night ? "rgba(15, 23, 42, 0.72)" : "rgba(250,245,255,.75)",
        },
      },
      React.createElement(
        "div",
        { style: { fontSize: 12, color: night ? "#C4B5FD" : colors.purple, fontWeight: 900 } },
        "SHOWTIMES"
      ),
      React.createElement(
        "p",
        {
          style: {
            margin: "5px 0 0",
            color: night ? "#F5F3FF" : colors.text,
            fontSize: 13,
            fontWeight: 700,
          },
        },
        showProfile.showtimes.join(" · ")
      ),
      showProfile.recommendedShowtimes?.length > 0
        ? React.createElement(
            "p",
            { style: { margin: "6px 0 0", color: night ? "#B6C2E2" : colors.muted, fontSize: 12 } },
            "Best target: " + showProfile.recommendedShowtimes.join(" or ")
          )
        : null,
      showProfile.arrivalBufferMinutes || showProfile.middayArrivalBufferMinutes
        ? React.createElement(
            "p",
            { style: { margin: "6px 0 0", color: night ? "#B6C2E2" : colors.muted, fontSize: 12 } },
            "Arrival buffer: " +
              (showProfile.middayArrivalBufferMinutes
                ? `${showProfile.arrivalBufferMinutes || 15}–${showProfile.middayArrivalBufferMinutes} min depending on heat/crowds`
                : `${showProfile.arrivalBufferMinutes} min`)
          )
        : null,
      showProfile.verifyDailySchedule
        ? React.createElement(
            "p",
            { style: { margin: "6px 0 0", color: night ? "#FCD34D" : "#92400E", fontSize: 12 } },
            "Verify in My Disney Experience. Showtimes can change by day."
          )
        : null
    );
  }

  return { renderRideActions, renderShowtimeInfo };
}

/* ------------------------------------------------------------------ rides -- */

// Canonical example names from the blueprint README, straight apostrophes and
// all. Muppet*Vision 3D is deliberately absent: production filters it out, so it
// can never appear in a real Waits list.
const RIDES = {
  low: {
    id: 101,
    name: "Star Tours – The Adventures Continue",
    land: "echo_lake",
    isOpen: true,
    waitTime: 20,
  },
  high: { id: 102, name: "Slinky Dog Dash", land: "toy_story_land", isOpen: true, waitTime: 65 },
  manageable: {
    id: 103,
    name: "Rock 'n' Roller Coaster Starring The Muppets",
    land: "sunset_boulevard",
    isOpen: true,
    waitTime: 35,
  },
  closed: {
    id: 104,
    name: "Mickey & Minnie's Runaway Railway",
    land: "hollywood_boulevard",
    isOpen: false,
    waitTime: null,
  },
  unavailable: {
    id: 105,
    name: "The Twilight Zone Tower of Terror",
    land: "sunset_boulevard",
    isOpen: true,
    waitTime: null,
  },
  show: {
    id: 106,
    name: "Beauty and the Beast Live on Stage",
    land: "sunset_boulevard",
    isOpen: true,
    waitTime: null,
    showProfile: {
      showtimes: ["11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "5:00 PM"],
      recommendedShowtimes: ["11:00 AM"],
      arrivalBufferMinutes: 20,
      verifyDailySchedule: true,
    },
  },
  // Closed, but metadata still carries a schedule. Closed must outrank the
  // scheduled-show treatment: the card says Closed and shows -- / wait.
  closedShow: {
    id: 107,
    name: "Fantasmic!",
    land: "sunset_boulevard",
    isOpen: false,
    waitTime: null,
    showProfile: { showtimes: ["8:00 PM", "10:30 PM"], verifyDailySchedule: true },
  },
  browsedHigh: {
    id: 201,
    name: "Test Track",
    land: "world_discovery",
    isOpen: true,
    waitTime: 70,
  },
  browsedManageable: {
    id: 202,
    name: "Soarin' Around the World",
    land: "world_nature",
    isOpen: true,
    waitTime: 35,
  },
};

const ALL_RIDES = [RIDES.high, RIDES.manageable, RIDES.low];

const getParkNameById = (id) =>
  ({ hollywood: "Hollywood Studios", epcot: "EPCOT" }[id] || id || "the park");
const formatLandLabel = (parkId, land) =>
  ({
    echo_lake: "Echo Lake",
    toy_story_land: "Toy Story Land",
    sunset_boulevard: "Sunset Boulevard",
    hollywood_boulevard: "Hollywood Boulevard",
    world_discovery: "World Discovery",
    world_nature: "World Nature",
  }[land] || land || "the park");
const hasShowtimeSchedule = (ride) => Boolean(ride?.showProfile?.showtimes?.length);

const LIVE = { source: "live", ageMs: 42000, fetchedAt: "2026-08-13T14:00:00.000Z" };
const STALE = { source: "stale", ageMs: 1800000, fetchedAt: "2026-08-13T13:30:00.000Z" };

function props(over = {}) {
  const activeRideId = over.activeRideId ?? null;
  const raw = makeRenderers(activeRideId);
  // Wrapped exactly the way App wraps them, so the Waits variant is what gets
  // rendered. The `options` argument is what WaitsTab uses to supply night; the
  // pinned baseline's WaitsTab passes none, and spreading undefined is a no-op,
  // so the same wrapper is correct in both trees.
  const renderRideActions = (ride, options) =>
    raw.renderRideActions(ride, { ...options, variant: "waits" });
  const renderShowtimeInfo = (ride, options) =>
    raw.renderShowtimeInfo(ride, { ...options, variant: "waits" });
  return {
    night: NIGHT,
    activeRideId,
    browsedParkLabel: "EPCOT",
    browsingAnotherPark: false,
    confirmedActiveParkLabel: "Hollywood Studios",
    loading: false,
    sortedRides: ALL_RIDES,
    waitListParkId: "hollywood",
    waitListParkData: LIVE,
    waitsError: "",
    loadData: noop,
    formatLandLabel,
    getParkNameById,
    hasShowtimeSchedule,
    renderRideActions,
    renderShowtimeInfo,
    button,
    ...over,
  };
}

function browsed(over = {}) {
  return props({
    browsingAnotherPark: true,
    waitListParkId: "epcot",
    browsedParkLabel: "EPCOT",
    confirmedActiveParkLabel: "Hollywood Studios",
    sortedRides: [RIDES.browsedHigh, RIDES.browsedManageable],
    ...over,
  });
}

/* -------------------------------------------------------------- scenarios -- */

// Every state named in the 63C-1 brief. The names are the contract: the harness
// requires all of them to be present, so a scenario cannot be quietly dropped.
const SCENARIOS = [
  ["healthy-active-park", props()],
  ["loading-before-first-data", props({ loading: true, waitListParkData: null, sortedRides: [] })],
  ["refreshing-with-retained-data", props({ loading: true })],
  ["stale", props({ waitListParkData: STALE })],
  [
    "active-refresh-error-with-retained-data",
    props({ waitsError: "Network request failed." }),
  ],
  [
    "error-with-no-data",
    props({ waitsError: "Network request failed.", waitListParkData: null, sortedRides: [] }),
  ],
  ["valid-empty", props({ sortedRides: [] })],
  [
    "browsed-loading",
    browsed({ loading: true, waitListParkData: null, sortedRides: [] }),
  ],
  [
    "browsed-error",
    browsed({
      waitsError: "Could not load browsed park wait times.",
      waitListParkData: null,
      sortedRides: [],
    }),
  ],
  ["browsed-healthy-viewing-only", browsed()],
  ["browsed-refresh-with-retained-data", browsed({ loading: true })],
  [
    "browsed-refresh-error-with-retained-data",
    browsed({ waitsError: "Could not load browsed park wait times." }),
  ],
  ["active-in-line", props({ activeRideId: "102" })],
  ["closed", props({ sortedRides: [RIDES.closed] })],
  ["wait-unavailable", props({ sortedRides: [RIDES.unavailable] })],
  ["scheduled-show", props({ sortedRides: [RIDES.show] })],
  ["closed-attraction-with-stored-showtimes", props({ sortedRides: [RIDES.closedShow] })],
  // Every card variant on one screen, so tone changes cannot hide in a state
  // that happens not to be rendered above.
  [
    "all-card-variants",
    props({
      activeRideId: "102",
      sortedRides: [
        RIDES.low,
        RIDES.manageable,
        RIDES.high,
        RIDES.closed,
        RIDES.unavailable,
        RIDES.show,
        RIDES.closedShow,
      ],
    }),
  ],
];

const REQUIRED = SCENARIOS.map(([name]) => name);

/* ------------------------------------------------------------- validation -- */

// Fixtures only prove something if they actually populate the branches. A ride
// missing showProfile renders no panel, which diffs clean and silently shrinks
// what this proof covers. Fail loudly instead.
const fixtureErrors = [];
if (!RIDES.show.showProfile?.showtimes?.length) fixtureErrors.push("show has no showtimes");
if (!RIDES.show.showProfile?.verifyDailySchedule)
  fixtureErrors.push("show does not exercise the verification warning");
if (!RIDES.show.showProfile?.recommendedShowtimes?.length)
  fixtureErrors.push("show cannot prove the Waits omission of Best target");
if (!RIDES.show.showProfile?.arrivalBufferMinutes)
  fixtureErrors.push("show cannot prove the Waits omission of Arrival buffer");
if (!RIDES.closedShow.showProfile?.showtimes?.length)
  fixtureErrors.push("closedShow has no stored schedule to be outranked");
if (RIDES.closedShow.isOpen !== false) fixtureErrors.push("closedShow is not closed");
if (RIDES.closed.waitTime !== null) fixtureErrors.push("closed has a wait value");
if (RIDES.unavailable.waitTime !== null) fixtureErrors.push("unavailable has a wait value");
if (RIDES.unavailable.isOpen !== true) fixtureErrors.push("unavailable is not open");
for (const [key, threshold] of [["low", 20], ["manageable", 45]]) {
  if (!(RIDES[key].waitTime <= threshold)) fixtureErrors.push(`${key} misses its tone band`);
}
if (!(RIDES.high.waitTime > 45)) fixtureErrors.push("high misses its tone band");
if (/[Mm]uppet\*?[Vv]ision/.test(JSON.stringify(RIDES)))
  fixtureErrors.push("a production-filtered attraction is used as an example");

if (fixtureErrors.length) {
  process.stderr.write("FIXTURE VALIDATION FAILED:\n  " + fixtureErrors.join("\n  ") + "\n");
  process.exit(2);
}

/* ---------------------------------------------------------------- render -- */

const out = [];
function emit(name, element) {
  let html;
  try {
    html = renderToStaticMarkup(element);
  } catch (err) {
    html = `RENDER_ERROR: ${err.message}`;
  }
  out.push(`===== ${name} =====\n${html}`);
}

for (const [name, p] of SCENARIOS) {
  emit(name, React.createElement(WaitsTab, p));
}

// WaitTimesList rendered directly as well, so its own night prop is proven
// rather than only reached through WaitsTab.
{
  const { renderRideActions, renderShowtimeInfo } = makeRenderers("102");
  emit(
    "list-direct-all-variants",
    React.createElement(WaitTimesList, {
      night: NIGHT,
      rides: [
        RIDES.low,
        RIDES.manageable,
        RIDES.high,
        RIDES.closed,
        RIDES.unavailable,
        RIDES.show,
        RIDES.closedShow,
      ],
      activeRideId: "102",
      activePark: "hollywood",
      formatLandLabel,
      hasShowtimeSchedule,
      renderShowtimeInfo: (ride) => renderShowtimeInfo(ride, { night: NIGHT, variant: "waits" }),
      renderRideActions: (ride) => renderRideActions(ride, { night: NIGHT, variant: "waits" }),
    })
  );
}

if (!REQUIRED.every((n) => out.some((chunk) => chunk.startsWith(`===== ${n} =====`)))) {
  process.stderr.write("SCENARIO SET INCOMPLETE\n");
  process.exit(2);
}

process.stdout.write(out.join("\n\n"));
