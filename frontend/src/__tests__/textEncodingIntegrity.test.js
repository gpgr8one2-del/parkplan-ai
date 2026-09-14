/**
 * Regression: guest-facing text and source stay correctly encoded.
 *
 * The defect: commit 806a197 rewrote frontend/src/App.jsx with every non-ASCII
 * character double-encoded: its UTF-8 bytes read back as Latin-1 and saved as
 * UTF-8 again. A right single quote (E2 80 99) became U+00E2 followed by the
 * invisible C1 controls U+0080 and U+0099; em and en dashes, the ellipsis, the
 * arrow and the check mark did the same; the middle dot (C2 B7) became U+00C2
 * followed by U+00B7. Profile's trip dates, park lists, family and age summaries
 * and child rows, the Done controls, Home's second-park guidance and the
 * friendly error copy all rendered the corrupted sequences.
 *
 * These render the REAL App and read the production output, so a corrupted
 * string in App.jsx fails here rather than on a phone. The source guard below
 * is deliberately narrow: it rejects C1 control characters and the specific
 * mojibake signatures of UTF-8 read as Latin-1 or Windows-1252, in the app's
 * own JS/JSX/CJS sources only. Legitimate Unicode — accented attraction names,
 * resort apostrophes, typographic punctuation — is allowed and checked.
 */

import fs from "fs";
import path from "path";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../api", () => ({
  ...jest.requireActual("../api"),
  fetchParkData: jest.fn(),
  fetchWeather: jest.fn(),
  sendChatMessage: jest.fn(),
  sendTohiPickReview: jest.fn(),
  trackEvent: jest.fn(),
}));

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { fetchParkData, fetchWeather, sendChatMessage, sendTohiPickReview } from "../api";

/* -------------------------------------------------------------------------- */
/* Encoding signatures                                                        */
/* -------------------------------------------------------------------------- */

const ch = (...codes) => String.fromCharCode(...codes);

// Every C1 control character, U+0080 through U+009F.
const C1_CONTROL = new RegExp(`[${ch(0x80)}-${ch(0x9f)}]`);

// UTF-8 punctuation read as a single-byte encoding, then saved as UTF-8 again.
// Latin-1 leaves C1 controls (caught above); Windows-1252 leaves these pairs.
// Built from code points so this test file contains none of them.
const MOJIBAKE_SIGNATURES = [
  [ch(0xe2, 0x20ac), "UTF-8 E2 80 xx read as Windows-1252 (quotes, dashes, ellipsis)"],
  [ch(0xe2, 0x2020), "UTF-8 E2 86 xx read as Windows-1252 (arrow)"],
  [ch(0xe2, 0x0153), "UTF-8 E2 9C xx read as Windows-1252 (check mark)"],
  [ch(0xc2, 0xb7), "UTF-8 C2 B7 read as a single-byte encoding (middle dot)"],
  [ch(0xc2, 0xa0), "UTF-8 C2 A0 read as a single-byte encoding (no-break space)"],
  [ch(0xc3, 0xa9), "UTF-8 C3 A9 read as a single-byte encoding (e acute)"],
];

function encodingProblems(text) {
  const problems = [];
  const c1 = text.match(C1_CONTROL);
  if (c1) problems.push(`C1 control U+${c1[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}`);
  for (const [signature, description] of MOJIBAKE_SIGNATURES) {
    if (text.includes(signature)) problems.push(description);
  }
  return problems;
}

/* -------------------------------------------------------------------------- */
/* Source guard                                                               */
/* -------------------------------------------------------------------------- */

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SOURCE_ROOTS = [
  path.join(REPO_ROOT, "frontend", "src"),
  path.join(REPO_ROOT, "frontend", "scripts"),
  path.join(REPO_ROOT, "backend"),
];
const SOURCE_FILE = /\.(js|jsx|cjs)$/;
const SKIP_DIRECTORY = new Set(["node_modules", "build", "coverage", ".git"]);

function listSources(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return SKIP_DIRECTORY.has(entry.name) ? [] : listSources(full);
    return SOURCE_FILE.test(entry.name) ? [full] : [];
  });
}

describe("source encoding guard", () => {
  const sources = SOURCE_ROOTS.flatMap(listSources);

  test("covers the app's own sources, including App.jsx", () => {
    expect(sources).toContain(path.join(REPO_ROOT, "frontend", "src", "App.jsx"));
    expect(sources.some((file) => file.includes(`${path.sep}node_modules${path.sep}`))).toBe(false);
    expect(sources.length).toBeGreaterThan(50);
  });

  test("no source file contains C1 controls or UTF-8-read-as-single-byte mojibake", () => {
    const offenders = sources
      .map((file) => {
        const lines = fs.readFileSync(file, "utf8").split("\n");
        const bad = lines
          .map((line, index) => ({ line: index + 1, problems: encodingProblems(line) }))
          .filter((entry) => entry.problems.length);
        return bad.length ? `${path.relative(REPO_ROOT, file)}: ${bad.slice(0, 3).map((b) => `line ${b.line} (${b.problems.join("; ")})`).join(", ")}` : null;
      })
      .filter(Boolean);
    expect(offenders).toEqual([]);
  });

  test("App.jsx keeps its typographic punctuation as real Unicode", () => {
    const app = fs.readFileSync(path.join(REPO_ROOT, "frontend", "src", "App.jsx"), "utf8");
    expect(app).toContain("We couldn’t load the weather right now.");
    expect(app).toContain("Yes — planning to hop");
    expect(app).toContain("`${startLabel} – ${endLabel}`");
    expect(app).toContain("✓ Done");
    expect(app).toContain('.join(" · ")');
    expect(app).toContain("You’re viewing ${activeParkLabel} live waits. Today’s plan is");
    expect(app).toContain(".replace(/[’']/g");
  });

  test("the guard does not reject legitimate accented names or apostrophes", () => {
    const resorts = fs.readFileSync(path.join(REPO_ROOT, "frontend", "src", "resortProfiles.js"), "utf8");
    const filters = fs.readFileSync(path.join(REPO_ROOT, "frontend", "src", "attractionDisplayFilters.js"), "utf8");
    expect(resorts).toContain("Disney’s");
    expect(filters).toContain("Palais du Cinéma");
    expect(encodingProblems("Disney’s Grand Floridian · Palais du Cinéma — Rémy … ✓")).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* Rendered production text                                                   */
/* -------------------------------------------------------------------------- */

const START = "2026-05-08T13:00:00-04:00"; // 1:00 PM Orlando, trip day 1

const PROFILE = {
  system: "disney_wdw",
  isSetupComplete: true,
  preferredName: "Gabe",
  adultCount: 2,
  childCount: 2,
  children: [
    { id: "child_1", label: "Child 1", age: 5, heightInches: 40 },
    { id: "child_2", label: "Child 2", age: 8, heightInches: 52 },
  ],
  thrillTolerance: "mixed",
  pace: "balanced",
  heatSensitivity: "medium",
  waterRidePreference: "depends",
  stormTolerance: "brief_outdoor_ok",
  walkingTolerance: "medium",
  priorities: ["low_stress"],
  tripContext: {
    tripStartDate: "2026-05-08",
    tripEndDate: "2026-05-10",
    parkDays: 3,
    parkSelectionIds: ["magic_kingdom", "epcot"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "magic_kingdom",
    parkHopper: "yes",
    parkDaySchedule: [
      { dayNumber: 1, date: "2026-05-08", primaryParkId: "magic_kingdom", secondaryParkId: "epcot" },
    ],
  },
  resortContext: {
    stayingOnProperty: "yes",
    resortId: "grand_floridian",
    resortName: "Disney’s Grand Floridian Resort & Spa",
    offPropertyHotelName: "",
    transportationMode: "monorail",
  },
};

let container = null;
let root = null;

async function flush() {
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
      await Promise.resolve();
    });
  }
}

async function renderApp() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(App));
  });
  await flush();
}

async function click(el) {
  expect(el).toBeTruthy();
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

async function goToTab(label) {
  const button = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === label
  );
  await click(button);
}

const text = () => container.textContent || "";

/** Rendered text of the current screen, plus a check that none of it is corrupted. */
function renderedText() {
  const current = text();
  expect(encodingProblems(current)).toEqual([]);
  return current;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(PROFILE));
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(START));
  fetchParkData.mockImplementation(async (parkId) => ({
    parkId,
    source: "live",
    fetchedAt: "2026-05-08T16:59:00.000Z",
    ageMs: 60000,
    rides:
      parkId === "epcot"
        ? [{ id: "ep-1", name: "Spaceship Earth", land: "World Celebration", waitTime: 10, isOpen: true }]
        : [
            { id: "mk-1", name: "Haunted Mansion", land: "Liberty Square", waitTime: 20, isOpen: true },
            { id: "mk-2", name: "Peter Pan's Flight", land: "Fantasyland", waitTime: 35, isOpen: true },
          ],
  }));
  fetchWeather.mockImplementation(async () => {
    throw new Error("API /api/weather -> 502");
  });
  sendChatMessage.mockImplementation(async () => ({ reply: "Here is a calm next move." }));
  sendTohiPickReview.mockImplementation(async () => null);
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root.unmount();
    });
    root = null;
  }
  if (container?.parentNode) container.parentNode.removeChild(container);
  container = null;
  jest.useRealTimers();
});

describe("rendered text on the affected surfaces", () => {
  test("Profile: trip dates, park hopper, parks, family, age mix and child rows", async () => {
    await renderApp();
    await goToTab("Profile");
    const profile = renderedText();

    expect(profile).toContain("May 8, 2026 – May 10, 2026");
    expect(profile).toContain("Yes — planning to hop");
    expect(profile).toContain("Magic Kingdom · EPCOT");
    expect(profile).toContain("4 guests · 2 adults · 2 kids");
    expect(profile).toContain("0 under 3 · 2 Disney child · 2 Disney adult");
    expect(profile).toContain('Child 1: age 5 · 40" tall');
    expect(profile).toContain('Child 2: age 8 · 52" tall');
    // Legitimate Unicode in stored data is rendered untouched.
    expect(profile).toContain("Disney’s Grand Floridian Resort & Spa");
  });

  test("Waits: every recommendation Done control reads ✓ Done", async () => {
    await renderApp();
    await goToTab("Waits");
    renderedText();

    const done = Array.from(container.querySelectorAll("button")).filter((node) =>
      (node.textContent || "").includes("Done")
    );
    expect(done.length).toBeGreaterThan(0);
    done.forEach((node) => expect(node.textContent.trim()).toBe("✓ Done"));
  });

  test("Home: friendly error copy and the second-park guidance", async () => {
    await renderApp();
    await goToTab("Home");
    expect(renderedText()).toContain("We couldn’t load the weather right now.");

    const epcot = Array.from(container.querySelectorAll("button[aria-pressed]")).find((node) =>
      (node.textContent || "").includes("EPCOT")
    );
    await click(epcot);
    const here = Array.from(container.querySelectorAll("button")).find(
      (node) => (node.textContent || "").trim() === "I’m here now"
    );
    await click(here);
    await goToTab("Home");

    expect(renderedText()).toContain(
      "You’re viewing EPCOT live waits. Today’s plan is Magic Kingdom, then EPCOT, and EPCOT is the second park."
    );
  });
});
