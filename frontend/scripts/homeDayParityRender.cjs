#!/usr/bin/env node

// 62B-2F-1 day-value proof, half one: render Home and its Home-only children to
// static HTML with night={false} and print the result.
//
// This file is copied into a detached worktree of the merged base and run there
// too. homeDayParityHarness.cjs then compares the two outputs byte for byte.
//
// Reading ternaries cannot prove day values are unchanged — a mistyped hex in a
// day branch reads fine. Rendering does prove it: every inline style that React
// actually emits is in the output, so any drift in any day value shows up as a
// diff.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

// Set PARITY_NIGHT=1 to render the same fixtures with night={true}.
const NIGHT = process.env.PARITY_NIGHT === "1";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const babel = require("@babel/core");

const frontendRoot = path.resolve(__dirname, "..");

// Transform JSX on require.
const origJs = Module._extensions[".js"];
function compileJsx(module, filename) {
  if (filename.includes("node_modules")) return origJs(module, filename);
  const src = fs.readFileSync(filename, "utf8");
  const out = babel.transformSync(src, {
    filename,
    presets: [[require.resolve("babel-preset-react-app"), { runtime: "automatic" }]],
    babelrc: false,
    configFile: false,
  });
  return module._compile(out.code, filename);
}
Module._extensions[".js"] = compileJsx;
Module._extensions[".jsx"] = compileJsx;

// The manifest imports real image binaries, which the bundler turns into URL
// strings. Stub them the same deterministic way in both trees: the filename.
// Artwork bytes are irrelevant to a day-value comparison and identical anyway.
for (const ext of [".jpg", ".png", ".webp", ".svg", ".gif"]) {
  Module._extensions[ext] = (module, filename) =>
    module._compile(
      `module.exports = ${JSON.stringify("/assets/" + path.basename(filename))};`,
      filename
    );
}

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const { HomeTab } = require(path.join(frontendRoot, "src/components/HomeTab.jsx"));
const { WhileYouWaitCard } = require(path.join(
  frontendRoot,
  "src/components/WhileYouWaitCard.jsx"
));
const { FreshnessBadge } = require(path.join(
  frontendRoot,
  "src/components/FreshnessBadge.jsx"
));
const { DataStatusBanner } = require(path.join(
  frontendRoot,
  "src/components/DataStatusBanner.jsx"
));

/* --------------------------------------------------------------- fixtures -- */

// The shared style objects App owns, reproduced exactly as App declares them so
// the render matches what ships.
const colorsMod = require(path.join(frontendRoot, "src/theme.js"));
const colors = colorsMod.colors;

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
const actionButton = { ...button, background: colors.purple, color: "white" };

const noop = () => {};
const getParkNameById = (id) =>
  ({
    magic_kingdom: "Magic Kingdom",
    epcot: "EPCOT",
    hollywood: "Hollywood Studios",
    animal_kingdom: "Animal Kingdom",
  }[id] || id || "the park");

// Field names taken from what each branch of WhileYouWaitCard actually reads,
// not from what a game "looks like it should have". Getting these wrong makes
// React render an empty node, which still diffs clean and so would quietly
// shrink the surface this proof covers. Every game carries `title`, which the
// shared heading above the branches renders.
const MINI_GAMES = {
  trivia: {
    type: "trivia",
    title: "Quick Trivia",
    question: "Which castle anchors Magic Kingdom?",
    choices: ["Cinderella Castle", "Sleeping Beauty Castle", "Beast's Castle"],
    answer: "Cinderella Castle",
    fact: "It is 189 feet tall.",
  },
  look_around: {
    type: "look_around",
    title: "Look Around",
    task: "First person to spot a hidden Mickey gets bragging rights.",
    hint: "Look up and around the queue, not just straight ahead.",
  },
  family_vote: {
    type: "family_vote",
    title: "Family Vote",
    prompt: "Snack first or ride first?",
    options: ["Snack", "Ride"],
  },
  would_you_rather: {
    type: "would_you_rather",
    title: "Would You Rather",
    prompt: "Teacups or Dumbo?",
  },
  conversation_starter: {
    type: "conversation_starter",
    title: "Conversation",
    prompt: "Favourite moment so far?",
  },
  queue_clues: {
    type: "queue_clues",
    title: "Queue Clues",
    prompt: "Hold the phone up and guess the word from family clues.",
    word: "Parade",
  },
  prediction_game: {
    type: "prediction_game",
    title: "Prediction",
    prompt: "How long is this wait?",
  },
  family_challenge: {
    type: "family_challenge",
    title: "Family Challenge",
    prompt: "Everyone strike a pose.",
  },
};

// The field each branch must have populated for its markup to render content.
const REQUIRED_GAME_FIELDS = {
  trivia: ["title", "question", "choices", "answer", "fact"],
  look_around: ["title", "task", "hint"],
  family_vote: ["title", "prompt", "options"],
  would_you_rather: ["title", "prompt"],
  conversation_starter: ["title", "prompt"],
  queue_clues: ["title", "prompt", "word"],
  prediction_game: ["title", "prompt"],
  family_challenge: ["title", "prompt"],
};

const whileYouWaitContent = {
  whileWaiting: [
    { title: "Look up", text: "The queue tells a story if you watch for it." },
    { title: "Hydrate", text: "Water fountains are near the exit of this queue." },
  ],
};

function homeProps(overrides = {}) {
  return {
    night: NIGHT,
    activePark: "magic_kingdom",
    browsedParkId: "magic_kingdom",
    closeTimeLabel: "10:00 PM",
    currentActivity: null,
    currentActivityContext: null,
    error: "",
    homeGreeting: "Good morning, Parr family",
    liveParkContext: null,
    loading: false,
    parkData: {
      parkName: "Magic Kingdom",
      source: "live",
      ageMs: 42000,
      fetchedAt: "2026-08-11T14:00:00.000Z",
    },
    parkHopperContext: null,
    parkPresence: null,
    parkPresencePrompt: null,
    // Base HomeTab still reads parkPresenceTheme.isNight; current ignores it.
    // Supplying it lets BOTH trees render, which is what makes the comparison
    // meaningful rather than an error-vs-output mismatch.
    parkPresenceTheme: { isNight: false },
    planningPark: "magic_kingdom",
    planningParkLabel: "Magic Kingdom",
    planningParkSource: "trip_plan",
    scheduledParkForToday: null,
    todayPlannedParkLabel: "Magic Kingdom",
    weather: {
      tempF: 84,
      feelsLikeF: 90,
      humidity: 61,
      summary: "Partly cloudy",
      rawSummary: "Partly cloudy",
      weatherCode: 1101,
      currentPrecipitation: false,
      source: "live",
      ageMs: 30000,
      fetchedAt: "2026-08-11T14:00:00.000Z",
    },
    weatherMode: { mode: "heat", label: "Heat watch" },
    whileYouWaitContent,
    activeMiniGame: MINI_GAMES.trivia,
    activeMiniGameType: "trivia",
    revealedTriviaAnswer: false,
    selectedTriviaChoice: null,
    selectedFamilyVoteOption: null,
    lookAroundFound: false,
    card,
    button,
    actionButton,
    getParkNameById,
    loadData: noop,
    handleSelectPark: noop,
    handleDone: noop,
    handleCancelCurrentActivity: noop,
    handleConfirmParkPresence: noop,
    handleDismissParkPresencePrompt: noop,
    handleFamilyVote: noop,
    handleLookAroundFound: noop,
    handleMiniGameTypeChange: noop,
    handleNextMiniGame: noop,
    handleTriviaChoice: noop,
    showTriviaAnswer: noop,
    setActivePark: noop,
    setParkPresence: noop,
    trackAppEvent: noop,
    ...overrides,
  };
}


/* ------------------------------------------------------------- validation -- */

// Fixtures are only useful if they actually populate the branches. A missing or
// misnamed field renders an empty node, which compares clean and silently
// shrinks what this proof covers. Fail loudly instead.
const fixtureErrors = [];

function requireFields(label, obj, fields) {
  for (const f of fields) {
    const v = obj ? obj[f] : undefined;
    const empty =
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "") ||
      (Array.isArray(v) && v.length === 0);
    if (empty) fixtureErrors.push(`${label}.${f} is empty`);
  }
}

for (const [key, game] of Object.entries(MINI_GAMES)) {
  if (game.type !== key) fixtureErrors.push(`MINI_GAMES.${key}.type is "${game.type}"`);
  requireFields(`MINI_GAMES.${key}`, game, REQUIRED_GAME_FIELDS[key] || []);
}

// Every branch the component can render must have a fixture.
for (const key of Object.keys(REQUIRED_GAME_FIELDS)) {
  if (!MINI_GAMES[key]) fixtureErrors.push(`MINI_GAMES.${key} is missing`);
}

whileYouWaitContent.whileWaiting.forEach((item, i) => {
  requireFields(`whileWaiting[${i}]`, item, ["title", "text"]);
});

// Every branch listed above must exist in the component, so a renamed or
// deleted branch cannot leave an unexercised fixture behind.
{
  const wyw = fs.readFileSync(
    path.join(frontendRoot, "src/components/WhileYouWaitCard.jsx"),
    "utf8"
  );
  for (const key of Object.keys(REQUIRED_GAME_FIELDS)) {
    if (!wyw.includes(`activeMiniGame.type === "${key}"`)) {
      fixtureErrors.push(`component has no branch for "${key}"`);
    }
  }
}

{
  const home = homeProps();
  requireFields("homeProps.parkData", home.parkData, ["parkName", "source"]);
  requireFields("homeProps.weather", home.weather, [
    "tempF", "feelsLikeF", "humidity", "summary", "rawSummary", "weatherCode", "source",
  ]);
  requireFields("homeProps", home, [
    "activePark", "browsedParkId", "closeTimeLabel", "homeGreeting",
    "planningPark", "planningParkLabel", "todayPlannedParkLabel",
  ]);
  requireFields("homeProps.weatherMode", home.weatherMode, ["mode", "label"]);
}

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

// Home scenarios covering the conditional surfaces.
emit("home/base", React.createElement(HomeTab, homeProps()));

emit(
  "home/stale-and-error",
  React.createElement(
    HomeTab,
    homeProps({
      error: "Live waits are unavailable right now.",
      parkData: { parkName: "EPCOT", source: "stale", ageMs: 900000 },
      weather: { ...homeProps().weather, source: "mock" },
      loading: true,
    })
  )
);

emit(
  "home/no-art",
  React.createElement(
    HomeTab,
    homeProps({
      activePark: "universal_sf",
      browsedParkId: "universal_sf",
      weather: { rawSummary: "weather unavailable", source: "mock" },
    })
  )
);

emit(
  "home/right-now-second-park",
  React.createElement(
    HomeTab,
    homeProps({
      activePark: "epcot",
      planningPark: "magic_kingdom",
      liveParkContext: {
        showNotice: true,
        status: "viewing_second_park",
        label: "Viewing EPCOT live waits",
        guidance: "Right Now moves are using EPCOT.",
      },
      parkHopperContext: {
        status: "second_park",
        secondParkMustDos: { count: 2, label: "Test Track, Soarin'" },
      },
    })
  )
);

emit(
  "home/right-now-different-park",
  React.createElement(
    HomeTab,
    homeProps({
      activePark: "animal_kingdom",
      planningPark: "magic_kingdom",
      liveParkContext: {
        showNotice: true,
        status: "viewing_different_park",
        label: "Viewing Animal Kingdom live waits",
        guidance: "The Plan tab is still anchored elsewhere.",
      },
    })
  )
);

emit(
  "home/in-line",
  React.createElement(
    HomeTab,
    homeProps({
      currentActivity: {
        type: "in_line",
        rideId: "space-mountain",
        rideName: "Space Mountain",
        startedAt: "2026-08-11T13:40:00.000Z",
        postedWaitAtStart: 45,
      },
      currentActivityContext: { elapsedMinutesInLine: 18 },
    })
  )
);

emit(
  "home/presence-prompt",
  React.createElement(
    HomeTab,
    homeProps({
      parkPresencePrompt: { type: "detected_arrival", parkId: "epcot" },
      parkPresence: { confirmedActivePark: null },
    })
  )
);

// Every mini-game type and its conditional states.
for (const [key, game] of Object.entries(MINI_GAMES)) {
  emit(
    `wyw/${key}`,
    React.createElement(WhileYouWaitCard, {
      night: NIGHT,
      whileYouWaitContent,
      activeMiniGame: game,
      activeMiniGameType: key,
      revealedTriviaAnswer: false,
      selectedTriviaChoice: null,
      selectedFamilyVoteOption: null,
      lookAroundFound: false,
      card,
      button,
      actionButton,
      handleFamilyVote: noop,
      handleLookAroundFound: noop,
      handleMiniGameTypeChange: noop,
      handleNextMiniGame: noop,
      handleTriviaChoice: noop,
      showTriviaAnswer: noop,
    })
  );
}

const wywVariants = [
  ["trivia-revealed-correct", { activeMiniGame: MINI_GAMES.trivia, activeMiniGameType: "trivia", revealedTriviaAnswer: true, selectedTriviaChoice: "Cinderella Castle" }],
  ["trivia-revealed-wrong", { activeMiniGame: MINI_GAMES.trivia, activeMiniGameType: "trivia", revealedTriviaAnswer: true, selectedTriviaChoice: "Beast's Castle" }],
  ["trivia-revealed-unanswered", { activeMiniGame: MINI_GAMES.trivia, activeMiniGameType: "trivia", revealedTriviaAnswer: true, selectedTriviaChoice: null }],
  ["look-around-found", { activeMiniGame: MINI_GAMES.look_around, activeMiniGameType: "look_around", lookAroundFound: true }],
  ["family-vote-selected", { activeMiniGame: MINI_GAMES.family_vote, activeMiniGameType: "family_vote", selectedFamilyVoteOption: "Snack" }],
];
for (const [name, over] of wywVariants) {
  emit(
    `wyw/${name}`,
    React.createElement(WhileYouWaitCard, {
      night: NIGHT,
      whileYouWaitContent,
      revealedTriviaAnswer: false,
      selectedTriviaChoice: null,
      selectedFamilyVoteOption: null,
      lookAroundFound: false,
      card,
      button,
      actionButton,
      handleFamilyVote: noop,
      handleLookAroundFound: noop,
      handleMiniGameTypeChange: noop,
      handleNextMiniGame: noop,
      handleTriviaChoice: noop,
      showTriviaAnswer: noop,
      ...over,
    })
  );
}

// Every FreshnessBadge and DataStatusBanner state.
for (const source of ["live", "cached", "stale", "mock", "unknown", undefined]) {
  emit(
    `badge/${source}`,
    React.createElement(FreshnessBadge, { source, ageMs: 120000, fetchedAt: "2026-08-11T14:00:00.000Z", night: NIGHT })
  );
  emit(`banner/${source}`, React.createElement(DataStatusBanner, { source, night: NIGHT }));
}

process.stdout.write(out.join("\n\n"));
