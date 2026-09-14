/**
 * Regression: the Morning Target names the park the day's plan is for.
 *
 * Field report: Day 1 Magic Kingdom, Day 2 Hollywood Studios, must-dos saved
 * only for Magic Kingdom and EPCOT. At Hollywood Studios on Day 2, Plan's
 * "Today's plan at a glance" Morning Target said "Treat Magic Kingdom like the
 * day's first anchor."
 *
 * The cause: generateDayGamePlan receives the planning park — today's scheduled
 * park, from the Orlando date — and every card uses it, except the rope-drop
 * start card's body, which read familyProfile.tripContext.firstPark: the trip's
 * FIRST park, the same on every day. Missing must-dos only chose which variant
 * of that card rendered; the must-do variant named the first park too.
 *
 * These render the REAL App on an explicit Orlando clock, drive the real Plan
 * controls, and read the visible Morning Target alongside the debug rows that
 * show which park and day the plan was built for. The day game plan is derived
 * live from those inputs; nothing about it is stored, so there is no saved Day 1
 * plan to go stale.
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
import { getParkRides } from "../rideMetadata";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const MINUTE = 60 * 1000;

/** A real must-do entry, using the id the Plan must-do picker stores. */
function mustDo(parkId, displayName) {
  const entry = getParkRides(parkId).find(([, meta]) => meta.displayName === displayName);
  if (!entry) throw new Error(`no ride metadata for ${parkId}: ${displayName}`);
  return { id: entry[0], name: displayName, parkId, type: "attraction", priority: "must_do", land: entry[1].land || "", source: "plan_tab" };
}

// Neither is an official Early Entry or official rope-drop target, so for this
// off-property family the rope-drop day uses the start card under test.
const MK_MUST_DO = mustDo("magic_kingdom", "Haunted Mansion");
const EPCOT_MUST_DO = mustDo("epcot", "Living with the Land");
const HS_MUST_DO = mustDo("hollywood", "Toy Story Mania!");

function profileWith({ firstParkId = "magic_kingdom", parkSelectionIds, schedule, parkHopper = "no" }) {
  return {
    system: "disney_wdw",
    isSetupComplete: true,
    preferredName: "Gabe",
    adultCount: 2,
    childCount: 0,
    children: [],
    thrillTolerance: "mixed",
    pace: "balanced",
    heatSensitivity: "medium",
    waterRidePreference: "depends",
    stormTolerance: "brief_outdoor_ok",
    walkingTolerance: "medium",
    priorities: ["low_stress"],
    tripContext: {
      tripStartDate: schedule[0].date,
      tripEndDate: schedule[schedule.length - 1].date,
      parkDays: schedule.length,
      parkSelectionIds,
      firstParkId,
      mostImportantParkId: firstParkId,
      parkHopper,
      parkDaySchedule: schedule,
    },
    resortContext: {
      stayingOnProperty: "no",
      resortId: "",
      resortName: "",
      offPropertyHotelName: "Nearby hotel",
      transportationMode: "car",
    },
  };
}

const FIELD_PROFILE = profileWith({
  parkSelectionIds: ["magic_kingdom", "epcot", "hollywood"],
  schedule: [
    { dayNumber: 1, date: "2026-06-27", primaryParkId: "magic_kingdom", secondaryParkId: "" },
    { dayNumber: 2, date: "2026-06-28", primaryParkId: "hollywood", secondaryParkId: "" },
  ],
});

function tripPlanWith(mustDoExperiences) {
  return {
    version: 1,
    system: "disney_wdw",
    preferences: {
      startStrategy: "rope_drop",
      breakPreference: "in_park_rest",
      diningStyle: "quick_service",
      showsImportance: "medium",
      nighttimeImportance: "if_we_re_still_here",
      paidQueueStrategy: "avoid_paid",
    },
    mustDoExperiences,
    parkDays: [],
    derivedPlan: null,
    lastGeneratedAt: "2026-06-27T12:00:00.000Z",
  };
}

const FIELD_TRIP_PLAN = tripPlanWith([MK_MUST_DO, EPCOT_MUST_DO]);

const DAY_1_MORNING = "2026-06-27T10:30:00-04:00";
const DAY_2_MORNING = "2026-06-28T10:30:00-04:00";

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
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

async function click(el) {
  expect(el).toBeTruthy();
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

const buttonNamed = (name) =>
  Array.from(container.querySelectorAll("button")).find((node) => (node.textContent || "").trim() === name);

async function goToTab(label) {
  const button = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === label
  );
  await click(button);
}

function debugValue(label) {
  const labels = Array.from(container.querySelectorAll("details span")).filter((node) => node.textContent === label);
  expect(labels).toHaveLength(1);
  return labels[0].nextElementSibling.textContent;
}

function findMorningTargetCard() {
  const eyebrow = Array.from(container.querySelectorAll("*")).find(
    (node) => node.children.length === 0 && (node.textContent || "").trim() === "MORNING TARGET" && !node.closest("details")
  );
  return eyebrow ? eyebrow.parentElement.closest("div") : null;
}

/** The visible Morning Target card text on Plan, opening the full plan if needed. */
async function morningTarget() {
  await goToTab("Plan");
  if (!findMorningTargetCard() && buttonNamed("See full plan")) await click(buttonNamed("See full plan"));
  const card = findMorningTargetCard();
  expect(card).toBeTruthy();
  let node = card;
  while (node && !(node.textContent || "").includes("first") && !(node.textContent || "").includes("Use ")) node = node.parentElement;
  return (node || card).textContent.replace(/\s+/g, " ");
}

/** Which park and day Plan's guidance is being built for. */
async function planContext() {
  await goToTab("Home");
  return {
    activePark: debugValue("activePark"),
    planningPark: debugValue("planningPark"),
    planningParkSource: debugValue("planningParkSource"),
    scheduledParkForToday: debugValue("scheduledParkForToday"),
    scheduledParkDay: debugValue("scheduledParkDay"),
  };
}

const storedTripPlan = () => JSON.parse(window.localStorage.getItem("parkplan.tripPlan"));
const storedProfile = () => JSON.parse(window.localStorage.getItem("parkplan.familyProfile"));

function seed(profile = FIELD_PROFILE, tripPlan = FIELD_TRIP_PLAN) {
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(profile));
  window.localStorage.setItem("parkplan.tripPlan", JSON.stringify(tripPlan));
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem("parkplan.debugSnapshot", "true");
  jest.useFakeTimers("modern");
  fetchParkData.mockImplementation(async (parkId) => ({ parkId, source: "live", fetchedAt: new Date().toISOString(), ageMs: 0, rides: [] }));
  fetchWeather.mockImplementation(async () => null);
  sendChatMessage.mockImplementation(async () => ({ reply: "Here is a calm next move." }));
  sendTohiPickReview.mockImplementation(async () => null);
});

afterEach(async () => {
  await unmount();
  jest.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/* 1 + 12. The field case                                                     */
/* -------------------------------------------------------------------------- */

describe("Day 2 at Hollywood Studios with must-dos only for other parks", () => {
  beforeEach(async () => {
    jest.setSystemTime(new Date(DAY_2_MORNING));
    seed();
    await renderApp();
  });

  test("Plan is built for Day 2's scheduled park", async () => {
    expect(await planContext()).toMatchObject({
      planningPark: "hollywood",
      planningParkSource: "park_day_schedule",
      scheduledParkForToday: "hollywood",
      scheduledParkDay: "2",
    });
  });

  test("the Morning Target names Hollywood Studios and no other park's plan", async () => {
    const card = await morningTarget();
    expect(card).toContain("Make room for the first big move.");
    expect(card).toContain("Treat Hollywood Studios like the day’s first anchor.");
    expect(card).not.toMatch(/Magic Kingdom|EPCOT|Haunted Mansion|Living with the Land/);
  });

  test("saved must-dos and trip details for the other parks are untouched", async () => {
    await morningTarget();
    expect(storedTripPlan().mustDoExperiences).toEqual([MK_MUST_DO, EPCOT_MUST_DO]);
    expect(storedProfile().tripContext.parkDaySchedule.map((day) => [day.dayNumber, day.date, day.primaryParkId])).toEqual([
      [1, "2026-06-27", "magic_kingdom"],
      [2, "2026-06-28", "hollywood"],
    ]);
    expect(storedProfile().tripContext.firstParkId).toBe("magic_kingdom");
  });
});

/* -------------------------------------------------------------------------- */
/* 2 + 3                                                                      */
/* -------------------------------------------------------------------------- */

describe("the same trip on other days and with other must-dos", () => {
  test("Day 2 with a Hollywood Studios must-do names Hollywood Studios and that must-do", async () => {
    jest.setSystemTime(new Date(DAY_2_MORNING));
    seed(FIELD_PROFILE, tripPlanWith([MK_MUST_DO, EPCOT_MUST_DO, HS_MUST_DO]));
    await renderApp();

    const card = await morningTarget();
    expect(card).toContain("Use the opening window for Toy Story Mania!.");
    expect(card).toContain("Treat Hollywood Studios like the day’s first anchor. Because Toy Story Mania! is marked as important");
    expect(card).not.toMatch(/Magic Kingdom|EPCOT|Haunted Mansion/);
  });

  test("Day 1 still names Magic Kingdom and its must-do", async () => {
    jest.setSystemTime(new Date(DAY_1_MORNING));
    seed();
    await renderApp();

    expect(await planContext()).toMatchObject({ planningPark: "magic_kingdom", scheduledParkDay: "1" });
    const card = await morningTarget();
    expect(card).toContain("Treat Magic Kingdom like the day’s first anchor. Because Haunted Mansion is marked as important");
    expect(card).not.toMatch(/Hollywood Studios|EPCOT/);
  });
});

/* -------------------------------------------------------------------------- */
/* 4 + 5 + 6 + 11. Reload, midnight, device timezone, no stale Day 1 plan      */
/* -------------------------------------------------------------------------- */

describe("the day advances with the Orlando date", () => {
  test("4 + 11: reopening the app on Day 2 replaces Day 1's Morning Target", async () => {
    jest.setSystemTime(new Date(DAY_1_MORNING));
    seed();
    await renderApp();
    expect(await morningTarget()).toContain("Treat Magic Kingdom like the day’s first anchor.");

    await unmount();
    jest.setSystemTime(new Date(DAY_2_MORNING));
    await renderApp();

    expect(await planContext()).toMatchObject({ planningPark: "hollywood", scheduledParkDay: "2" });
    const card = await morningTarget();
    expect(card).toContain("Treat Hollywood Studios like the day’s first anchor.");
    expect(card).not.toContain("Magic Kingdom");
  });

  test("5 + 11: an app left open across Orlando midnight moves to Day 2's park", async () => {
    jest.setSystemTime(new Date("2026-06-27T23:58:30-04:00"));
    seed();
    await renderApp();
    // Late at night Plan shows no Morning Target; the plan is still Day 1's.
    expect(await planContext()).toMatchObject({ planningPark: "magic_kingdom", scheduledParkDay: "1" });

    await act(async () => {
      jest.advanceTimersByTime(3 * MINUTE);
    });
    await flush();

    expect(await planContext()).toMatchObject({ planningPark: "hollywood", scheduledParkDay: "2" });
    const card = await morningTarget();
    expect(card).toContain("Treat Hollywood Studios like the day’s first anchor.");
    expect(card).not.toContain("Magic Kingdom");
  });

  test("6: 1:30 AM Orlando on Day 2 is Day 2, whatever calendar day the device is on", async () => {
    // The previous evening in Los Angeles and Honolulu; already Day 2 in UTC
    // and Asia. Run under several TZ values to exercise the device-date path.
    jest.setSystemTime(new Date("2026-06-28T01:30:00-04:00"));
    seed();
    await renderApp();

    expect(await planContext()).toMatchObject({ planningPark: "hollywood", scheduledParkDay: "2" });
    expect(await morningTarget()).toContain("Treat Hollywood Studios like the day’s first anchor.");
  });
});

/* -------------------------------------------------------------------------- */
/* 7. Another park pair                                                       */
/* -------------------------------------------------------------------------- */

describe("the fix does not depend on these parks", () => {
  test("Day 1 Animal Kingdom, Day 2 EPCOT: Day 2 names EPCOT", async () => {
    jest.setSystemTime(new Date("2026-07-02T09:45:00-04:00"));
    seed(
      profileWith({
        firstParkId: "animal_kingdom",
        parkSelectionIds: ["animal_kingdom", "epcot"],
        schedule: [
          { dayNumber: 1, date: "2026-07-01", primaryParkId: "animal_kingdom", secondaryParkId: "" },
          { dayNumber: 2, date: "2026-07-02", primaryParkId: "epcot", secondaryParkId: "" },
        ],
      }),
      tripPlanWith([mustDo("animal_kingdom", "Kilimanjaro Safaris")])
    );
    await renderApp();

    expect(await planContext()).toMatchObject({ planningPark: "epcot", scheduledParkDay: "2" });
    const card = await morningTarget();
    expect(card).toContain("Treat EPCOT like the day’s first anchor.");
    expect(card).not.toMatch(/Animal Kingdom|Kilimanjaro/);
  });
});

/* -------------------------------------------------------------------------- */
/* 8 + 9. Park hopping and a different active park                             */
/*                                                                            */
/* 10 (explicit future-day or planning-park browsing) is not a supported path: */
/* PlanTab's PlanningParkSelector is deliberately not rendered, and App's      */
/* handlePlanningParkChange has no caller.                                     */
/* -------------------------------------------------------------------------- */

describe("park hopping keeps the live park and the day's plan distinct", () => {
  const HOPPER_PROFILE = profileWith({
    parkSelectionIds: ["magic_kingdom", "epcot", "hollywood"],
    parkHopper: "yes",
    schedule: [
      { dayNumber: 1, date: "2026-06-27", primaryParkId: "magic_kingdom", secondaryParkId: "" },
      { dayNumber: 2, date: "2026-06-28", primaryParkId: "hollywood", secondaryParkId: "epcot" },
    ],
  });

  test("8 + 9: hopping to EPCOT moves the live park; the plan stays on Day 2's primary park", async () => {
    jest.setSystemTime(new Date(DAY_2_MORNING));
    seed(HOPPER_PROFILE);
    await renderApp();

    await goToTab("Home");
    const epcot = Array.from(container.querySelectorAll("button[aria-pressed]")).find((node) =>
      (node.textContent || "").includes("EPCOT")
    );
    await click(epcot);
    await click(buttonNamed("I’m here now"));

    expect(await planContext()).toMatchObject({
      activePark: "epcot",
      planningPark: "hollywood",
      scheduledParkForToday: "hollywood",
      scheduledParkDay: "2",
    });
    const card = await morningTarget();
    expect(card).toContain("Treat Hollywood Studios like the day’s first anchor.");
    expect(card).not.toMatch(/Magic Kingdom|Living with the Land/);
  });
});
