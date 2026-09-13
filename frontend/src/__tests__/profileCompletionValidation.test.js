/**
 * Regression: "setup complete" reflects the profile as it is now.
 *
 * FINDING 1: getFamilyProfileCompletion returned complete whenever the stored
 * profile carried isSetupComplete === true, whatever was missing. A family that
 * had finished setup once and then added a child without an age or height stayed
 * "complete": personalized recommendations stayed unlocked, and because the
 * height filter ignores children with no usable height, that child's height was
 * never checked against posted ride-height requirements. The Done handler then
 * wrote the same bypassed result back, so the stale flag never cleared.
 *
 * FINDING 2: the age requirement checked only `age === ""`, while parseChildAge
 * already reads whitespace, negative, fractional and malformed ages as unknown.
 * Such an age was "Age not set" on screen yet satisfied setup.
 *
 * The invariant pinned here: completion is evaluated from the current
 * normalized profile. A stored flag records the past; it never overrides a
 * requirement that is unmet now. The requirements themselves are unchanged:
 * every child needs an age (an entered 0 counts) and a height; adults need
 * neither; trip dates keep their compatibility exemption.
 *
 * These render the REAL App and drive the real setup form (first-run setup and
 * the Profile screen's "Review setup" share it), then check visible completion
 * feedback, stored profile state across reloads, basic waits, and locked
 * personalization. The clock is explicit: 1:00 PM Orlando on trip day 1.
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

// eslint-disable-next-line import/first
import App from "../App";
// eslint-disable-next-line import/first
import { fetchParkData, fetchWeather, sendChatMessage, sendTohiPickReview } from "../api";
// eslint-disable-next-line import/first
import { getFamilyProfileCompletion } from "../utils/familyProfile";

const STORAGE_KEY = "parkplan.familyProfile";
const START = "2026-05-08T13:00:00-04:00";

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
  pace: "leisurely",
  heatSensitivity: "high",
  waterRidePreference: "avoid",
  stormTolerance: "indoor_only",
  walkingTolerance: "low",
  priorities: ["low_stress", "characters"],
  mobilityAccessibility: { usesStroller: true, usesWheelchair: false, mobilityNotes: "Nap at 1" },
  tripContext: {
    tripStartDate: "2026-05-08",
    tripEndDate: "2026-05-10",
    parkDays: 3,
    parkSelectionIds: ["magic_kingdom", "epcot"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "epcot",
    parkHopper: "yes",
  },
  resortContext: {
    stayingOnProperty: "no",
    resortId: "",
    resortName: "",
    offPropertyHotelName: "Nearby hotel",
    transportationMode: "car",
  },
};

const withChildren = (children, over = {}) => ({
  ...COMPLETE_PROFILE,
  childCount: children.length,
  children,
  ...over,
});

/* -------------------------------------------------------------------------- */
/* Completion helper                                                          */
/* -------------------------------------------------------------------------- */

describe("completion is evaluated from the current profile", () => {
  test("a stored complete flag does not cover a child with no age or height", () => {
    const result = getFamilyProfileCompletion(
      withChildren([...COMPLETE_PROFILE.children, { id: "child_3", age: "", heightInches: "" }])
    );
    expect(result.isComplete).toBe(false);
    expect(result.missing).toEqual(["child ages", "child heights"]);
  });

  test.each([
    ["whitespace", "   "],
    ["negative", "-1"],
    ["fractional", "2.5"],
    ["malformed", "seven"],
  ])("a %s stored age is unknown, so child ages are still needed", (_label, age) => {
    const result = getFamilyProfileCompletion(withChildren([{ id: "child_1", age, heightInches: 40 }]));
    expect(result.isComplete).toBe(false);
    expect(result.missing).toEqual(["child ages"]);
  });

  test.each([
    ["the number 0", 0],
    ["the string \"0\"", "0"],
  ])("an entered age of %s is a valid age", (_label, age) => {
    const result = getFamilyProfileCompletion(withChildren([{ id: "child_1", age, heightInches: 30 }]));
    expect(result).toEqual({ isComplete: true, missing: [], strictMissing: [] });
  });

  test("an age-zero child still needs a height, as every child does today", () => {
    const result = getFamilyProfileCompletion(withChildren([{ id: "child_1", age: 0, heightInches: "" }]));
    expect(result.missing).toEqual(["child heights"]);
  });

  test("adult-only and fully answered profiles stay complete", () => {
    expect(getFamilyProfileCompletion(withChildren([])).isComplete).toBe(true);
    expect(getFamilyProfileCompletion(COMPLETE_PROFILE).isComplete).toBe(true);
    expect(getFamilyProfileCompletion({ ...COMPLETE_PROFILE, isSetupComplete: false }).isComplete).toBe(true);
  });

  test("the trip-dates compatibility exemption is unchanged", () => {
    const result = getFamilyProfileCompletion({
      ...COMPLETE_PROFILE,
      isSetupComplete: false,
      tripContext: { ...COMPLETE_PROFILE.tripContext, tripStartDate: "", tripEndDate: "" },
    });
    expect(result.isComplete).toBe(true);
    expect(result.strictMissing).toEqual(["trip dates"]);
  });
});

/* -------------------------------------------------------------------------- */
/* The real App                                                               */
/* -------------------------------------------------------------------------- */

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

const buttonNamed = (name) =>
  Array.from(container.querySelectorAll("button")).find((node) => (node.textContent || "").trim() === name);

const text = () => (container.textContent || "").replace(/\s+/g, " ");
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY));
const onSetupScreen = () => Boolean(container.querySelector("#child-count"));

async function goToTab(label) {
  const button = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === label
  );
  await click(button);
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

function childInput(index, labelStart) {
  const labels = Array.from(container.querySelectorAll("label")).filter((node) =>
    (node.textContent || "").trim().startsWith(labelStart)
  );
  return labels[index]?.querySelector("input");
}

const ageInput = (index) => childInput(index, "Age");
const heightInput = (index) => childInput(index, "Height in inches");

async function goToSetupStep(label) {
  await click(buttonNamed(label));
}

/** The label of setup's Done button, which lives on step 3. Returns to step 1. */
async function doneButtonLabel() {
  await goToSetupStep("3. Stay");
  const label = buttonNamed("Unlock My Family Plan")
    ? "Unlock My Family Plan"
    : buttonNamed("Finish Setup First")
      ? "Finish Setup First"
      : null;
  await goToSetupStep("1. Trip");
  return label;
}

/** Presses setup's Done button on step 3, exactly as a family would. */
async function pressDone() {
  await goToSetupStep("3. Stay");
  const done = buttonNamed("Unlock My Family Plan") || buttonNamed("Finish Setup First");
  await click(done);
}

/** Leaves setup the way a family can at any time, without declaring it done. */
async function viewBasicWaits() {
  await click(buttonNamed("← View basic waits"));
  expect(onSetupScreen()).toBe(false);
}

async function openSetupFromProfile() {
  await goToTab("Profile");
  const action = buttonNamed("Review setup") || buttonNamed("Finish setup");
  await click(action);
  expect(onSetupScreen()).toBe(true);
}

/** Profile's completion state as the family sees it. */
async function profileStatus() {
  await goToTab("Profile");
  const t = text();
  return {
    complete: t.includes("SETUP COMPLETE"),
    needed: t.includes("SETUP NEEDED"),
    action: buttonNamed("Review setup") ? "Review setup" : buttonNamed("Finish setup") ? "Finish setup" : null,
    stillNeeded: t.includes("Still needed before TOHI can personalize"),
  };
}

async function planIsLocked() {
  await goToTab("Plan");
  return text().includes("Personalized Best Move is locked until setup is finished");
}

/** The unrelated answers that editing a child must never disturb. */
const unrelated = (profile) => ({
  preferredName: profile.preferredName,
  thrillTolerance: profile.thrillTolerance,
  pace: profile.pace,
  heatSensitivity: profile.heatSensitivity,
  waterRidePreference: profile.waterRidePreference,
  stormTolerance: profile.stormTolerance,
  priorities: profile.priorities,
  mobilityAccessibility: profile.mobilityAccessibility,
  tripContext: {
    tripStartDate: profile.tripContext.tripStartDate,
    tripEndDate: profile.tripContext.tripEndDate,
    parkSelectionIds: profile.tripContext.parkSelectionIds,
    firstParkId: profile.tripContext.firstParkId,
    mostImportantParkId: profile.tripContext.mostImportantParkId,
    parkHopper: profile.tripContext.parkHopper,
  },
  resortContext: profile.resortContext,
});

const EXPECTED_UNRELATED = unrelated({
  ...COMPLETE_PROFILE,
  tripContext: COMPLETE_PROFILE.tripContext,
});

const COMPLETE_STATUS = { complete: true, needed: false, action: "Review setup", stillNeeded: false };
const NEEDED_STATUS = { complete: false, needed: true, action: "Finish setup", stillNeeded: true };

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  jest.useFakeTimers("modern");
  jest.setSystemTime(new Date(START));
  fetchParkData.mockImplementation(async () => ({
    parkId: "magic_kingdom",
    source: "live",
    fetchedAt: "2026-05-08T16:59:00.000Z",
    ageMs: 60000,
    rides: [
      { id: "mk-tron", name: "TRON Lightcycle / Run", land: "Tomorrowland", waitTime: 30, isOpen: true },
      { id: "mk-buzz", name: "Buzz Lightyear's Space Ranger Spin", land: "Tomorrowland", waitTime: 10, isOpen: true },
    ],
  }));
  fetchWeather.mockImplementation(async () => null);
  sendChatMessage.mockImplementation(async () => ({ reply: "Here is a calm next move." }));
  sendTohiPickReview.mockImplementation(async () => null);
});

afterEach(async () => {
  await unmount();
  jest.useRealTimers();
});

describe("editing a completed profile from Profile", () => {
  beforeEach(async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(COMPLETE_PROFILE));
    await renderApp();
    expect(await profileStatus()).toEqual(COMPLETE_STATUS);
    expect(await planIsLocked()).toBe(false);
  });

  test("1 + 8 + 10 + 11 + 12: adding a child without an age or height makes setup incomplete, across a reload", async () => {
    await openSetupFromProfile();
    await setField(container.querySelector("#child-count"), "3");
    expect(await doneButtonLabel()).toBe("Finish Setup First");
    await viewBasicWaits();

    expect(await profileStatus()).toEqual(NEEDED_STATUS);
    expect(text()).toContain("child ages, child heights");
    // Personalization is locked, so no recommendation runs against an unchecked height.
    expect(await planIsLocked()).toBe(true);

    // Basic waits remain available.
    await goToTab("Waits");
    expect(text()).toContain("TRON Lightcycle / Run");

    // The stale flag is still stored, and still cannot bypass the requirement.
    await reload();
    expect(stored().isSetupComplete).toBe(true);
    expect(stored().childCount).toBe(3);
    expect(onSetupScreen()).toBe(true);
    await viewBasicWaits();
    expect(await profileStatus()).toEqual(NEEDED_STATUS);
    expect(await planIsLocked()).toBe(true);
    expect(unrelated(stored())).toEqual(EXPECTED_UNRELATED);
  });

  test("2: completing the new child's age and height restores the completed state", async () => {
    await openSetupFromProfile();
    await setField(container.querySelector("#child-count"), "3");
    await setField(ageInput(2), "4");
    expect(await doneButtonLabel()).toBe("Finish Setup First");
    await setField(heightInput(2), "39");
    expect(await doneButtonLabel()).toBe("Unlock My Family Plan");

    await pressDone();
    expect(onSetupScreen()).toBe(false);
    expect(await profileStatus()).toEqual(COMPLETE_STATUS);
    expect(await planIsLocked()).toBe(false);

    await reload();
    expect(onSetupScreen()).toBe(false);
    expect(stored()).toMatchObject({ isSetupComplete: true, childCount: 3 });
    expect(stored().children[2]).toMatchObject({ age: "4", heightInches: "39" });
    expect(await profileStatus()).toEqual(COMPLETE_STATUS);
    expect(unrelated(stored())).toEqual(EXPECTED_UNRELATED);
  });

  test.each([
    ["age", ageInput, "child ages"],
    ["height", heightInput, "child heights"],
  ])("3: clearing an existing child's %s makes setup incomplete", async (_label, input, missing) => {
    await openSetupFromProfile();
    await setField(input(0), "");
    expect(await doneButtonLabel()).toBe("Finish Setup First");
    await viewBasicWaits();

    expect(await profileStatus()).toEqual(NEEDED_STATUS);
    expect(text()).toContain(missing);
    expect(await planIsLocked()).toBe(true);

    await reload();
    expect(await (async () => { await viewBasicWaits(); return profileStatus(); })()).toEqual(NEEDED_STATUS);
  });

  test("6: removing the incomplete child removes its requirements", async () => {
    await openSetupFromProfile();
    await setField(container.querySelector("#child-count"), "3");
    expect(await doneButtonLabel()).toBe("Finish Setup First");

    await setField(container.querySelector("#child-count"), "2");
    expect(await doneButtonLabel()).toBe("Unlock My Family Plan");
    await viewBasicWaits();
    expect(await profileStatus()).toEqual(COMPLETE_STATUS);

    // And down to an adults-only group.
    await openSetupFromProfile();
    await setField(container.querySelector("#child-count"), "0");
    expect(await doneButtonLabel()).toBe("Unlock My Family Plan");
    await viewBasicWaits();
    expect(await profileStatus()).toEqual(COMPLETE_STATUS);
    expect(unrelated(stored())).toEqual(EXPECTED_UNRELATED);
  });

  test("5: an entered age of 0 with a height is complete", async () => {
    await openSetupFromProfile();
    await setField(ageInput(0), "0");
    expect(await doneButtonLabel()).toBe("Unlock My Family Plan");
    await viewBasicWaits();
    expect(await profileStatus()).toEqual(COMPLETE_STATUS);
  });
});

describe("stored profiles on load", () => {
  test.each([
    ["whitespace", "   "],
    ["negative", "-1"],
    ["fractional", "2.5"],
    ["malformed", "seven"],
  ])("4 + 8: a %s stored age with a stale complete flag opens as setup needed", async (_label, age) => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(withChildren([{ id: "child_1", label: "Child 1", age, heightInches: 40 }]))
    );
    await renderApp();

    expect(onSetupScreen()).toBe(true);
    expect(text()).toContain("Age not set");
    expect(await doneButtonLabel()).toBe("Finish Setup First");
    await viewBasicWaits();
    expect(await profileStatus()).toEqual(NEEDED_STATUS);
    expect(text()).toContain("child ages");
    expect(await planIsLocked()).toBe(true);
    // Nothing was inferred or rewritten.
    expect(stored().children[0].age).toBe(age);
  });

  test("7: adult-only and fully answered stored profiles open complete", async () => {
    for (const profile of [withChildren([]), COMPLETE_PROFILE, { ...COMPLETE_PROFILE, isSetupComplete: false }]) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      await renderApp();
      expect(onSetupScreen()).toBe(false);
      expect(await profileStatus()).toEqual(COMPLETE_STATUS);
      await unmount();
    }
  });
});

describe("first-run setup uses the same rules", () => {
  test("9: an unfinished profile cannot be declared done until the child's height is entered", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        withChildren([{ id: "child_1", label: "Child 1", age: 6, heightInches: "" }], { isSetupComplete: false })
      )
    );
    await renderApp();
    expect(onSetupScreen()).toBe(true);

    expect(await doneButtonLabel()).toBe("Finish Setup First");
    await pressDone();
    // Still in setup, and nothing was declared complete.
    expect(buttonNamed("1. Trip")).toBeTruthy();
    expect(stored().isSetupComplete).toBe(false);

    await goToSetupStep("1. Trip");
    await setField(heightInput(0), "46");
    expect(await doneButtonLabel()).toBe("Unlock My Family Plan");
    await pressDone();
    expect(onSetupScreen()).toBe(false);
    expect(stored().isSetupComplete).toBe(true);
    expect(await profileStatus()).toEqual(COMPLETE_STATUS);
  });
});

/* -------------------------------------------------------------------------- */
/* Child heights must be usable, exactly as the family summary reads them      */
/* -------------------------------------------------------------------------- */

/**
 * The family summary — the source of the shortest rider height that ride-height
 * checks read — keeps a height only when it is a finite number above 0. Setup
 * used to accept any height except "", so a zero, negative, whitespace or
 * malformed height completed setup while that child contributed no height at
 * all. Completion now requires the same usable height; nothing about ride-height
 * rules or the summary itself changes.
 */
const HEIGHT_NOTE = "Enter a height above 0 inches.";

describe("child heights: completion requires a usable height", () => {
  const oneChild = (heightInches) => withChildren([{ id: "child_1", label: "Child 1", age: 6, heightInches }]);

  test.each([
    ["whitespace", "   "],
    ["zero", 0],
    ["zero string", "0"],
    ["negative", -4],
    ["negative string", "-4"],
    ["malformed", "tall"],
    ["null", null],
    ["missing", undefined],
    ["blank", ""],
  ])("1: a %s height with a stale complete flag still needs child heights", (_label, heightInches) => {
    const profile = oneChild(heightInches);
    if (heightInches === undefined) delete profile.children[0].heightInches;
    const result = getFamilyProfileCompletion(profile);
    expect(result.isComplete).toBe(false);
    expect(result.missing).toEqual(["child heights"]);
  });

  test.each([
    ["true", true],
    ["false", false],
    ["an array", [42]],
    ["an object", { inches: 42 }],
    ["NaN", NaN],
    ["Infinity", Infinity],
  ])("2: %s is not a usable height", (_label, heightInches) => {
    const result = getFamilyProfileCompletion(oneChild(heightInches));
    expect(result.isComplete).toBe(false);
    expect(result.missing).toEqual(["child heights"]);
  });

  test.each([
    ["a whole number", 44],
    ["a numeric string", "44"],
    ["a padded numeric string", " 44 "],
    ["a fractional number", 44.5],
    ["a fractional string", "38.25"],
  ])("3: %s is a usable height", (_label, heightInches) => {
    expect(getFamilyProfileCompletion(oneChild(heightInches))).toEqual({
      isComplete: true,
      missing: [],
      strictMissing: [],
    });
  });

  test("3: an age-zero child with a positive height is complete", () => {
    const result = getFamilyProfileCompletion(withChildren([{ id: "child_1", age: 0, heightInches: 24 }]));
    expect(result.isComplete).toBe(true);
  });

  test.each([
    ["missing", ""],
    ["zero", "0"],
    ["malformed", "tall"],
  ])("4: one child's valid height does not conceal another child's %s height", (_label, heightInches) => {
    const result = getFamilyProfileCompletion(
      withChildren([
        { id: "child_1", age: 6, heightInches: 46 },
        { id: "child_2", age: 4, heightInches },
      ])
    );
    expect(result.isComplete).toBe(false);
    expect(result.missing).toEqual(["child heights"]);
  });
});

describe("child heights in the real App", () => {
  test.each([
    ["an entered 0", "0"],
    ["a cleared height", ""],
  ])("5 + 6 + 7: %s keeps setup incomplete across a reload, and a valid height restores it", async (_label, value) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(COMPLETE_PROFILE));
    await renderApp();
    expect(await profileStatus()).toEqual(COMPLETE_STATUS);

    await openSetupFromProfile();
    expect(heightInput(0).getAttribute("min")).toBe("1");
    await setField(heightInput(0), value);
    expect(await doneButtonLabel()).toBe("Finish Setup First");
    if (value === "0") {
      expect(text()).toContain(HEIGHT_NOTE);
    } else {
      expect(text()).not.toContain(HEIGHT_NOTE);
    }
    await viewBasicWaits();

    expect(await profileStatus()).toEqual(NEEDED_STATUS);
    expect(text()).toContain("child heights");
    expect(text()).not.toContain('0" tall');
    expect(text()).toContain("height not set");
    expect(await planIsLocked()).toBe(true);
    await goToTab("Waits");
    expect(text()).toContain("TRON Lightcycle / Run");

    await reload();
    expect(onSetupScreen()).toBe(true);
    expect(stored().children[0].heightInches).toBe(value);
    await viewBasicWaits();
    expect(await profileStatus()).toEqual(NEEDED_STATUS);
    expect(unrelated(stored())).toEqual(EXPECTED_UNRELATED);

    // A valid height, fractional included, restores completion.
    await openSetupFromProfile();
    await setField(heightInput(0), "40.5");
    expect(text()).not.toContain(HEIGHT_NOTE);
    expect(await doneButtonLabel()).toBe("Unlock My Family Plan");
    await pressDone();
    expect(onSetupScreen()).toBe(false);
    expect(await profileStatus()).toEqual(COMPLETE_STATUS);
    expect(await planIsLocked()).toBe(false);

    await reload();
    expect(onSetupScreen()).toBe(false);
    expect(stored().children[0].heightInches).toBe("40.5");
    expect(unrelated(stored())).toEqual(EXPECTED_UNRELATED);
  });

  test("a stored zero height with a stale complete flag opens as setup needed, and is not rewritten", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        withChildren([
          { id: "child_1", label: "Child 1", age: 6, heightInches: 46 },
          { id: "child_2", label: "Child 2", age: 3, heightInches: "0" },
        ])
      )
    );
    await renderApp();

    expect(onSetupScreen()).toBe(true);
    expect(text()).toContain(HEIGHT_NOTE);
    expect(await doneButtonLabel()).toBe("Finish Setup First");
    await viewBasicWaits();
    expect(await profileStatus()).toEqual(NEEDED_STATUS);
    expect(await planIsLocked()).toBe(true);
    expect(stored().children.map((child) => child.heightInches)).toEqual([46, "0"]);
  });
});
