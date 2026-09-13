/**
 * Regression: a missing child age is not a newborn, and choosing zero children
 * really means zero.
 *
 * AGE: getAgeRangeId read ages with Number(age). Number("") and Number(null) are
 * 0, so a blank age classified as "under_3" — "Under 3 / no ticket" on the
 * child card, "1 under 3" in the setup and Profile summaries, hasUnder3 and
 * hasSmallChildren set for recommendations and chat. A negative age was also
 * "under 3", and a fractional 2.5 fell between the ranges into "adult". The
 * packing checklist had its own Number() coercion that counted a blank age as a
 * young kid.
 *
 * COUNT: normalizeFamilyProfile resolved counts as `Number(x) || fallback`, so
 * an explicit 0 children fell back to the previous children list — the Children
 * select could not go from 2 back to 0.
 *
 * The invariants pinned here: blank, whitespace, null, malformed, negative and
 * fractional ages are unknown and make no age-group claim; an entered 0 is age
 * zero; whole numbers and whole-number strings agree; an explicit child count,
 * including 0, is honoured and totals stay numeric; valid and legacy profiles
 * keep their meaning. Stored values are never rewritten.
 *
 * Helper tests use the real familyProfile / packingChecklist modules. The form
 * tests render the REAL App and drive the real setup controls (Onboarding and
 * the Profile screen's "Review setup" share one form), then save, reload, and
 * read the Profile screen, the chat request, and — through the real backend
 * route — the family context the model receives.
 */

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

// The REAL backend chat route, for the model-facing family text. backend
// node_modules is not installed, so express's Router shell, pino and the
// Anthropic SDK are stood in for; the SDK stand-in only records its request.
jest.mock(
  "express",
  () => ({
    Router: () => {
      const routes = {};
      return { routes, post: (routePath, handler) => { routes[routePath] = handler; } };
    },
  }),
  { virtual: true }
);
jest.mock(
  "pino",
  () => {
    const logger = () => ({ info() {}, warn() {}, error() {}, debug() {} });
    logger.stdTimeFunctions = { isoTime() {} };
    return logger;
  },
  { virtual: true }
);
jest.mock(
  "@anthropic-ai/sdk",
  () =>
    class MockAnthropicRecorder {
      constructor() {
        this.messages = {
          create: async (request) => {
            global.mockModelRequests.push(request);
            return { content: [{ type: "text", text: "placeholder" }] };
          },
        };
      }
    },
  { virtual: true }
);

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { fetchParkData, fetchWeather, sendChatMessage, sendTohiPickReview } from "../api";
// eslint-disable-next-line import/first
import {
  buildFamilyProfileSummary,
  getAgeRangeId,
  getAgeRangeLabel,
  normalizeFamilyProfile,
} from "../utils/familyProfile";
// eslint-disable-next-line import/first
import { generatePackingChecklist } from "../utils/packingChecklist";

const STORAGE_KEY = "parkplan.familyProfile";
const START = "2026-05-08T13:00:00-04:00"; // 1:00 PM Orlando, trip day 1

/* -------------------------------------------------------------------------- */
/* 1-4. Age classification                                                    */
/* -------------------------------------------------------------------------- */

describe("child age classification", () => {
  test.each([
    ["blank", ""],
    ["whitespace", "   "],
    ["null", null],
    ["undefined", undefined],
    ["malformed", "seven"],
    ["negative number", -1],
    ["negative string", "-1"],
    ["fractional number", 2.5],
    ["fractional string", "9.5"],
    ["not a number", NaN],
  ])("a %s age is unknown, with no age-group label", (_label, age) => {
    expect(getAgeRangeId(age)).toBe("unknown");
    expect(getAgeRangeLabel(getAgeRangeId(age))).toBe("Age not set");
  });

  test.each([
    [0, "under_3"],
    ["0", "under_3"],
    [2, "under_3"],
    ["2", "under_3"],
    [3, "child"],
    ["3", "child"],
    [" 7 ", "child"],
    [9, "child"],
    [10, "adult"],
    ["10", "adult"],
    [17, "adult"],
  ])("an entered age of %j classifies as %s, the same for numbers and numeric strings", (age, expected) => {
    expect(getAgeRangeId(age)).toBe(expected);
  });

  test("an entered zero is age zero: Under 3, distinct from a missing age", () => {
    expect(getAgeRangeLabel(getAgeRangeId(0))).toBe("Under 3 / no ticket");
    expect(getAgeRangeId(0)).not.toBe(getAgeRangeId(""));
  });
});

describe("family summary makes no age claim for unknown ages", () => {
  const withChildren = (children) =>
    buildFamilyProfileSummary({ adultCount: 2, childCount: children.length, children });

  test("a blank-age child is not under 3 and not a small child", () => {
    const summary = withChildren([{ age: "", heightInches: 44 }]);
    expect(summary.ageSummary).toEqual({ under3Count: 0, childCount: 0, disneyAdultCount: 2 });
    expect(summary.hasUnder3).toBe(false);
    expect(summary.hasSmallChildren).toBe(false);
    // The child still exists and still counts toward the party.
    expect(summary.childCount).toBe(1);
    expect(summary.partySize).toBe(3);
  });

  test("an entered zero is counted as under 3", () => {
    const summary = withChildren([{ age: "0", heightInches: 30 }]);
    expect(summary.ageSummary.under3Count).toBe(1);
    expect(summary.hasUnder3).toBe(true);
    expect(summary.hasSmallChildren).toBe(true);
  });

  test("numbers and numeric strings summarise identically", () => {
    const numbers = withChildren([{ age: 2, heightInches: 34 }, { age: 7, heightInches: 46 }, { age: 12, heightInches: 58 }]);
    const strings = withChildren([{ age: "2", heightInches: "34" }, { age: "7", heightInches: "46" }, { age: "12", heightInches: "58" }]);
    expect(strings.ageSummary).toEqual(numbers.ageSummary);
    expect(numbers.ageSummary).toEqual({ under3Count: 1, childCount: 1, disneyAdultCount: 3 });
    expect(strings.hasSmallChildren).toBe(numbers.hasSmallChildren);
  });

  test("the packing checklist does not treat a blank age as a young kid", () => {
    const checklist = (age) =>
      generatePackingChecklist({
        familyProfile: buildFamilyProfileSummary({
          adultCount: 2,
          childCount: 1,
          children: [{ age, heightInches: 44 }],
          priorities: ["shows_parades"],
        }),
      });
    const ids = (result) => JSON.stringify(result).includes("ear_support");

    expect(ids(checklist(""))).toBe(false);
    expect(ids(checklist("0"))).toBe(true);
    expect(ids(checklist("6"))).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* 5 + 7. Counts and legacy compatibility                                     */
/* -------------------------------------------------------------------------- */

describe("family counts", () => {
  test("numeric-string counts become numbers, and totals add rather than concatenate", () => {
    const profile = normalizeFamilyProfile({ adultCount: "2", childCount: "3" });
    expect(profile.adultCount).toBe(2);
    expect(profile.childCount).toBe(3);
    expect(profile.partySize).toBe(5);
    expect(profile.children).toHaveLength(3);
  });

  test.each([
    ["the number 0", 0],
    ["the string \"0\"", "0"],
  ])("choosing %s children after having two leaves an adults-only group", (_label, zero) => {
    const two = normalizeFamilyProfile({
      adultCount: 2,
      childCount: 2,
      children: [{ age: 5, heightInches: 40 }, { age: 8, heightInches: 52 }],
    });
    const none = normalizeFamilyProfile({ ...two, childCount: zero });

    expect(none.childCount).toBe(0);
    expect(none.children).toEqual([]);
    expect(none.partySize).toBe(2);
    expect(buildFamilyProfileSummary(none).hasSmallChildren).toBe(false);
  });

  test("a malformed or fractional count falls back rather than producing a fractional party", () => {
    const children = [{ age: 5, heightInches: 40 }, { age: 8, heightInches: 52 }];
    for (const bad of ["abc", "2.5", 2.5, ""]) {
      const profile = normalizeFamilyProfile({ adultCount: 2, childCount: bad, children });
      expect(Number.isInteger(profile.childCount)).toBe(true);
      expect(profile.childCount).toBe(2);
      expect(profile.partySize).toBe(4);
    }
  });

  test("the existing 0–12 child and 1–12 adult bounds still apply", () => {
    expect(normalizeFamilyProfile({ adultCount: 40, childCount: 40 })).toMatchObject({ adultCount: 12, childCount: 12, partySize: 24 });
    // Unchanged existing behaviour: an adult count of 0 is not a count and falls
    // back to 1; a negative child count clamps to 0.
    expect(normalizeFamilyProfile({ adultCount: 0, childCount: -3 })).toMatchObject({ adultCount: 1, childCount: 0 });
  });

  test("a legacy guests-only profile keeps its existing counts, and its unknown ages are not guessed", () => {
    // Existing behaviour, unchanged: the default two-child placeholder is merged
    // before legacy guests are read, so these guests' ages were never carried
    // into `children`. The counts stay as they were; what changes is that the
    // two blank ages are no longer reported as two children under 3.
    const legacy = normalizeFamilyProfile({
      partySize: 4,
      guests: [
        { id: "g1", age: 35 },
        { id: "g2", age: 33 },
        { id: "g3", age: 1, heightInches: 30 },
        { id: "g4", age: 6, heightInches: 44 },
      ],
    });

    expect(legacy).toMatchObject({ adultCount: 2, childCount: 2, partySize: 4 });
    expect(legacy.children.map((child) => child.age)).toEqual(["", ""]);

    const summary = buildFamilyProfileSummary(legacy);
    expect(summary.ageSummary).toEqual({ under3Count: 0, childCount: 0, disneyAdultCount: 2 });
    expect(summary.hasUnder3).toBe(false);
    expect(summary.hasSmallChildren).toBe(false);
  });

  test("stored values are not rewritten: a blank age stays blank and a zero stays zero", () => {
    const profile = normalizeFamilyProfile({
      adultCount: 2,
      childCount: 2,
      children: [{ age: "", heightInches: 40 }, { age: 0, heightInches: 30 }],
    });
    expect(profile.children.map((child) => child.age)).toEqual(["", 0]);
  });
});

/* -------------------------------------------------------------------------- */
/* 6 + 8 + 9. The real setup form, save, reload, Profile and chat             */
/* -------------------------------------------------------------------------- */

const COMPLETE_PROFILE = {
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
    parkSelectionIds: ["magic_kingdom"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "magic_kingdom",
  },
  resortContext: {
    stayingOnProperty: "no",
    resortId: "",
    resortName: "",
    offPropertyHotelName: "Nearby hotel",
    transportationMode: "car",
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

async function unmount() {
  if (root) {
    await act(async () => {
      root.unmount();
    });
    root = null;
  }
  if (container?.parentNode) container.parentNode.removeChild(container);
  container = null;
}

async function reload() {
  await unmount();
  await renderApp();
}

async function click(el) {
  expect(el).toBeTruthy();
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

const buttonNamed = (text) =>
  Array.from(container.querySelectorAll("button")).find((node) => (node.textContent || "").trim() === text);

async function goToTab(label) {
  const button = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === label
  );
  await click(button);
}

async function openSetupFromProfile() {
  await goToTab("Profile");
  await click(buttonNamed("Review setup"));
  expect(container.querySelector("#child-count")).toBeTruthy();
}

async function leaveSetup() {
  await click(buttonNamed("← View basic waits"));
}

async function setField(element, value) {
  expect(element).toBeTruthy();
  const proto = element.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
    element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
  await flush();
}

function childAgeInput(index) {
  const labels = Array.from(container.querySelectorAll("label")).filter((node) =>
    (node.textContent || "").trim().startsWith("Age")
  );
  return labels[index]?.querySelector("input");
}

const text = () => (container.textContent || "").replace(/\s+/g, " ");
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY));

/** The Profile screen's "Disney age mix" value. */
async function profileAgeMix() {
  await goToTab("Profile");
  const match = text().match(/Disney age mix\s*(\d+ under 3 · \d+ Disney child · \d+ Disney adult)/);
  expect(match).toBeTruthy();
  return match[1];
}

async function sentFamilyProfile() {
  await goToTab("TOHI");
  const input = container.querySelector("#tohi-question");
  expect(input).toBeTruthy();
  await setField(input, "is the wait for haunted mansion worth it");
  const before = sendChatMessage.mock.calls.length;
  const send = Array.from(container.querySelectorAll('button[type="submit"]')).find((b) =>
    (b.textContent || "").includes("Send")
  );
  await click(send);
  expect(sendChatMessage.mock.calls.length).toBe(before + 1);
  return sendChatMessage.mock.calls[sendChatMessage.mock.calls.length - 1];
}

/** The family lines the REAL backend builds for the model from an App chat call. */
async function modelFamilyContext([message, sessionData]) {
  const { sanitizeChatSessionData } = jest.requireActual("../api");
  const savedKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-placeholder-anthropic";
  global.mockModelRequests = [];
  try {
    // eslint-disable-next-line global-require
    const handler = require("../../../backend/routes/ai.js").routes["/ai-chat"];
    const res = { json() { return res; }, status() { return res; } };
    await handler(
      { body: JSON.parse(JSON.stringify({ message, sessionData: sanitizeChatSessionData(sessionData) })), log: { error() {} } },
      res
    );
  } finally {
    if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = savedKey;
  }
  expect(global.mockModelRequests).toHaveLength(1);
  const context = global.mockModelRequests[0].messages[0].content;
  return context.split("\n").filter((line) => /^- (Party|Age summary|Children):/.test(line));
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(START));
  fetchParkData.mockImplementation(async () => ({ parkId: "magic_kingdom", rides: [], source: "live", fetchedAt: START, ageMs: 0 }));
  fetchWeather.mockImplementation(async () => null);
  sendChatMessage.mockImplementation(async () => ({ reply: "Here is a calm next move." }));
  sendTohiPickReview.mockImplementation(async () => null);
});

afterEach(async () => {
  await unmount();
  jest.useRealTimers();
});

describe("the real setup form", () => {
  test("first-run setup: choosing 0 children gives an adults-only group", async () => {
    await renderApp();
    const childCount = container.querySelector("#child-count");
    expect(childCount).toBeTruthy();
    expect(childCount.value).toBe("2");

    await setField(childCount, "0");

    expect(container.querySelector("#child-count").value).toBe("0");
    expect(text()).toContain("Adults-only group");
    expect(stored()).toMatchObject({ childCount: 0, children: [], partySize: 2 });
  });

  test("Profile setup: 2 children → 0 is saved, survives a reload, and Profile agrees", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(COMPLETE_PROFILE));
    await renderApp();
    await openSetupFromProfile();

    await setField(container.querySelector("#child-count"), "0");
    expect(text()).toContain("Adults-only group");
    expect(text()).toContain("2 guests · 0 under 3 · 0 Disney child · 2 Disney adult");
    await leaveSetup();

    await reload();
    expect(stored()).toMatchObject({ adultCount: 2, childCount: 0, children: [], partySize: 2 });
    await goToTab("Profile");
    expect(text()).toContain("2 guests · 2 adults · 0 kids");
    expect(await profileAgeMix()).toBe("0 under 3 · 0 Disney child · 2 Disney adult");
  });

  test("Profile setup: a cleared age stays unknown through save, reload, Profile and chat", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(COMPLETE_PROFILE));
    await renderApp();
    await openSetupFromProfile();

    await setField(childAgeInput(0), "");
    expect(text()).toContain("Age not set");
    expect(text()).not.toContain("Under 3 / no ticket");
    expect(text()).toContain("4 guests · 0 under 3 · 1 Disney child · 2 Disney adult");
    await leaveSetup();

    await reload();
    expect(stored().children.map((child) => child.age)).toEqual(["", 8]);
    expect(await profileAgeMix()).toBe("0 under 3 · 1 Disney child · 2 Disney adult");

    const call = await sentFamilyProfile();
    const family = call[1].familyProfile;
    expect(family.ageSummary).toEqual({ under3Count: 0, childCount: 1, disneyAdultCount: 2 });
    expect(family.hasUnder3).toBe(false);
    expect(family.childCount).toBe(2);
    expect(family.partySize).toBe(4);

    expect(await modelFamilyContext(call)).toEqual([
      "- Party: 2 adults, 2 children, 4 total",
      "- Age summary: 0 under 3, 1 Disney children, 2 Disney adults",
      "- Children: child 1: age unknown age, 40 in; child 2: age 8, 52 in",
    ]);
  });

  test("Profile setup: an entered 0 is age zero through save, reload, Profile and chat", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(COMPLETE_PROFILE));
    await renderApp();
    await openSetupFromProfile();

    await setField(childAgeInput(0), "0");
    expect(text()).toContain("Under 3 / no ticket");
    expect(text()).toContain("4 guests · 1 under 3 · 1 Disney child · 2 Disney adult");
    await leaveSetup();

    await reload();
    expect(stored().children.map((child) => child.age)).toEqual(["0", 8]);
    expect(await profileAgeMix()).toBe("1 under 3 · 1 Disney child · 2 Disney adult");

    const call = await sentFamilyProfile();
    expect(call[1].familyProfile.ageSummary.under3Count).toBe(1);
    expect(call[1].familyProfile.hasUnder3).toBe(true);
    expect(await modelFamilyContext(call)).toContain("- Age summary: 1 under 3, 1 Disney children, 2 Disney adults");
  });

  test("a valid stored profile keeps its meaning after a reload", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(COMPLETE_PROFILE));
    await renderApp();
    await reload();

    expect(stored()).toMatchObject({ adultCount: 2, childCount: 2, partySize: 4 });
    expect(stored().children.map((child) => [child.age, child.heightInches])).toEqual([[5, 40], [8, 52]]);
    expect(await profileAgeMix()).toBe("0 under 3 · 2 Disney child · 2 Disney adult");
  });
});
