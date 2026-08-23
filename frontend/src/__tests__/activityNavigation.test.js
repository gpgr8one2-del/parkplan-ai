/**
 * Navigation flow: In Line -> Home, and Home park card -> Waits.
 *
 * Two existing actions produced a result on a screen the guest was not on.
 * Joining a line from Plan or Waits created the activity but left them where
 * they started, one tab away from the elapsed timer, While You Wait and the
 * queue mini-games. Tapping a park card on Home selected that park but left
 * them on Home rather than on its waits.
 *
 * These render the REAL App with `../api` mocked, click the REAL buttons, and
 * read the REAL BottomTabs `aria-current` to decide which tab is showing. The
 * intended transition is deliberately NOT reimplemented here — every assertion
 * runs through the shipped wiring, so a regression in App.jsx fails these.
 *
 * Deterministic throughout: fixed clock, fixed park payload, fixed waits, no
 * network.
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import App from "../App";
import { renderToStaticMarkup } from "react-dom/server";
import { WaitsTab } from "../components/WaitsTab";

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../api", () => ({
  fetchParkData: jest.fn(),
  fetchWeather: jest.fn(() => Promise.resolve(null)),
  sendChatMessage: jest.fn(() => Promise.resolve({ reply: "" })),
  sendTohiPickReview: jest.fn(() => Promise.resolve(null)),
  trackEvent: jest.fn(),
}));

// eslint-disable-next-line import/first
import { fetchParkData, trackEvent } from "../api";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const CONTROLLED_DAY = new Date(2026, 4, 8, 13, 0, 0);

const COMPLETE_PROFILE = {
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
  walkingTolerance: "medium",
  priorities: [],
  tripContext: {
    tripStartDate: "2026-05-08",
    tripEndDate: "2026-05-10",
    parkDays: 3,
    parkSelectionIds: ["magic_kingdom", "epcot"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "magic_kingdom",
    parkHopper: "yes",
  },
  resortContext: {
    stayingOnProperty: "no",
    resortId: "",
    resortName: "",
    offPropertyHotelName: "",
    transportationMode: "car",
  },
};

/**
 * Today's park day: Magic Kingdom primary, EPCOT a planned secondary hop.
 *
 * createInitialParkPresence() derives today's planned parks from this, so
 * EPCOT becomes a park the family MAY confirm — which is exactly what makes
 * selecting its card raise the manual-hop Park Check.
 */
const TODAY_DATE_STRING = "2026-05-08";

const PARK_HOP_PROFILE = {
  ...COMPLETE_PROFILE,
  tripContext: {
    ...COMPLETE_PROFILE.tripContext,
    parkDaySchedule: [
      {
        dayNumber: 1,
        date: TODAY_DATE_STRING,
        primaryParkId: "magic_kingdom",
        secondaryParkId: "epcot",
      },
    ],
  },
};

const MK_RIDES = [
  { id: "mk-1", name: "Big Thunder Mountain Railroad", land: "frontierland", waitTime: 20, isOpen: true },
  { id: "mk-2", name: "Haunted Mansion", land: "liberty_square", waitTime: 25, isOpen: true },
  { id: "mk-3", name: "Pirates of the Caribbean", land: "adventureland", waitTime: 15, isOpen: true },
  { id: "mk-4", name: "It's a Small World", land: "fantasyland", waitTime: 10, isOpen: true },
  { id: "mk-5", name: "Peter Pan's Flight", land: "fantasyland", waitTime: 40, isOpen: true },
];

const EPCOT_RIDES = [
  { id: "ep-1", name: "Soarin' Around the World", land: "world_nature", waitTime: 30, isOpen: true },
  { id: "ep-2", name: "Living with the Land", land: "world_nature", waitTime: 10, isOpen: true },
];

function parkPayload(parkId) {
  return {
    parkId,
    source: "live",
    rides: parkId === "epcot" ? EPCOT_RIDES : MK_RIDES,
    lands: [],
  };
}

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

let container = null;
let root = null;

function setClock(when) {
  jest.useFakeTimers("modern");
  jest.setSystemTime(when);
}

function seedProfile(profile) {
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(profile));
}

/**
 * A standing manual area choice, in exactly the shape the app persists after
 * the guest picks their area. Plan needs a location before it will show
 * recommendation cards at all, so without this it renders its setup state and
 * there is no "In Line" to click.
 */
function seedManualLand(parkId = "magic_kingdom", land = "frontierland") {
  window.localStorage.setItem(
    "parkplan.state",
    JSON.stringify({
      [parkId]: { currentLand: land, currentLandSource: "manual" },
    })
  );
}

/** BottomTabs renders through a portal into document.body. */
function tabButtons() {
  return Array.from(document.body.querySelectorAll("nav button"));
}

function tabNamed(label) {
  return tabButtons().find((node) => node.textContent.trim() === label);
}

/** The single source of truth for "which tab is showing". */
function activeTabLabel() {
  const current = tabButtons().find(
    (node) => node.getAttribute("aria-current") === "page"
  );
  return current ? current.textContent.trim() : null;
}

async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => {
    node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function renderApp() {
  root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(App));
  });

  // App restores per-park state on mount and releases the "still restoring"
  // guard on a zero-delay timeout, which fake timers hold indefinitely. Letting
  // it fire means later state changes persist exactly as they do in the real
  // app, so these tests can read the saved activity rather than assume it.
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
}

async function goToTab(label) {
  await click(tabNamed(label));
}

/** Every enabled "In Line" button currently on screen. */
function inLineButtons() {
  return Array.from(container.querySelectorAll("button")).filter(
    (node) => node.textContent.trim() === "In Line" && !node.disabled
  );
}

function inLineNowButtons() {
  return Array.from(container.querySelectorAll("button")).filter(
    (node) => node.textContent.trim() === "In Line Now"
  );
}

/** The Home park-selector cards, which carry the park name as their label. */
function parkCardNamed(name) {
  return Array.from(container.querySelectorAll("button")).find(
    (node) => node.textContent.trim() === name
  );
}

function screenText() {
  return container.textContent || "";
}

const RIDE_NAMES = MK_RIDES.map((ride) => ride.name);

/** Walk up from an action button to the card that names its attraction. */
function rideNameForButton(button) {
  let node = button;

  while (node && node !== container) {
    const text = node.textContent || "";
    const matches = RIDE_NAMES.filter((name) => text.includes(name));
    if (matches.length === 1) return matches[0];
    node = node.parentElement;
  }

  return null;
}

/** Which attractions Plan is currently recommending. */
async function planRecommendedRideNames() {
  await goToTab("Plan");
  const text = screenText();
  return RIDE_NAMES.filter((name) => text.includes(name));
}

function inLineButtonForRide(name) {
  return inLineButtons().find((button) => rideNameForButton(button) === name);
}

function lastInLineEvent() {
  return trackEvent.mock.calls
    .filter(([eventName]) => eventName === "recommendation_in_line_clicked")
    .pop();
}

beforeEach(() => {
  window.localStorage.clear();
  trackEvent.mockClear();
  fetchParkData.mockImplementation((parkId) => Promise.resolve(parkPayload(parkId)));
  root = null;
  container = document.createElement("div");
  document.body.appendChild(container);
  setClock(CONTROLLED_DAY);
  seedProfile(COMPLETE_PROFILE);
  seedManualLand();
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root.unmount();
    });
    root = null;
  }
  container.remove();
  container = null;
  window.localStorage.clear();
  jest.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/* In Line -> Home                                                            */
/* -------------------------------------------------------------------------- */

describe("In Line opens Home", () => {
  test("from Waits: creates the activity and lands on Home", async () => {
    await renderApp();
    await goToTab("Waits");
    expect(activeTabLabel()).toBe("Waits");

    const buttons = inLineButtons();
    expect(buttons.length).toBeGreaterThan(0);

    await click(buttons[0]);

    expect(activeTabLabel()).toBe("Home");
    // Home is showing the queue it just started.
    expect(screenText()).toContain("CURRENTLY IN LINE");
  });

  test("from Plan: creates the activity and lands on Home", async () => {
    await renderApp();
    await goToTab("Plan");
    expect(activeTabLabel()).toBe("Plan");

    const buttons = inLineButtons();
    expect(buttons.length).toBeGreaterThan(0);

    await click(buttons[0]);

    expect(activeTabLabel()).toBe("Home");
    expect(screenText()).toContain("CURRENTLY IN LINE");
  });

  test("the activity keeps ride name, land, posted wait and a start time", async () => {
    await renderApp();
    await goToTab("Waits");

    const button = inLineButtons()[0];
    const rideName = rideNameForButton(button);
    expect(rideName).toBeTruthy();

    const ride = MK_RIDES.find((entry) => entry.name === rideName);

    await click(button);

    const homeText = screenText();

    // Name and posted-wait-at-join travel with the activity onto Home.
    expect(homeText).toContain(ride.name);
    expect(homeText).toContain(`Posted wait when you joined: ${ride.waitTime} min`);
    // A start time exists, so Home can report elapsed queue time.
    expect(homeText).toMatch(/Just joined the line|min in line/i);

    // Ride id and land reached the activity record that Home persists.
    const stored = JSON.parse(window.localStorage.getItem("parkplan.state"));
    const activity = stored.magic_kingdom.currentActivity;

    expect(activity.type).toBe("in_line");
    expect(String(activity.rideId)).toBe(String(ride.id));
    expect(activity.rideName).toBe(ride.name);
    expect(activity.land).toBe(ride.land);
    expect(activity.postedWaitAtStart).toBe(ride.waitTime);
    expect(Date.parse(activity.startedAt)).not.toBeNaN();
  });

  test("completed state for that ride is cleared when its line is joined", async () => {
    await renderApp();
    await goToTab("Waits");

    const button = inLineButtons()[0];
    const rideName = rideNameForButton(button);
    const ride = MK_RIDES.find((entry) => entry.name === rideName);

    // Mark it Done first, which records it as completed.
    const doneButton = Array.from(container.querySelectorAll("button")).find(
      (node) =>
        node.textContent.trim() === "✓ Done" && rideNameForButton(node) === rideName
    );
    expect(doneButton).toBeTruthy();
    await click(doneButton);

    let stored = JSON.parse(window.localStorage.getItem("parkplan.state"));
    expect(stored.magic_kingdom.completedRideIds).toContain(String(ride.id));

    // Joining that ride's line again must clear the completed record rather
    // than leaving it marked done while standing in its queue.
    const rejoin = inLineButtonForRide(rideName);
    expect(rejoin).toBeTruthy();
    await click(rejoin);

    expect(activeTabLabel()).toBe("Home");

    stored = JSON.parse(window.localStorage.getItem("parkplan.state"));
    expect(stored.magic_kingdom.completedRideIds).not.toContain(String(ride.id));
    expect(stored.magic_kingdom.skippedRideIds).not.toContain(String(ride.id));
    expect(stored.magic_kingdom.reportedRideIssueIds || []).not.toContain(String(ride.id));
  });

  test("the disabled In Line Now state cannot restart the activity", async () => {
    await renderApp();
    await goToTab("Waits");
    await click(inLineButtons()[0]);
    expect(activeTabLabel()).toBe("Home");

    const startedText = screenText();
    const startedAt = JSON.parse(window.localStorage.getItem("parkplan.state"))
      .magic_kingdom.currentActivity.startedAt;

    await goToTab("Waits");
    const nowButtons = inLineNowButtons();
    expect(nowButtons.length).toBe(1);
    expect(nowButtons[0].disabled).toBe(true);

    // Dispatching a click on the disabled control changes nothing: no activity
    // restart, and no navigation away from Waits.
    await act(async () => {
      nowButtons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(activeTabLabel()).toBe("Waits");

    const afterStartedAt = JSON.parse(window.localStorage.getItem("parkplan.state"))
      .magic_kingdom.currentActivity.startedAt;
    expect(afterStartedAt).toBe(startedAt);

    await goToTab("Home");
    // Same queue, same elapsed reading — nothing was recreated.
    expect(screenText()).toBe(startedText);
  });

  test("a ride that is not a live recommendation is still attributed to wait_times", async () => {
    await renderApp();

    // Attribution is slot-based, not tab-based: `source` reports whether the
    // ride was one of the recommendation cards. Pick a Waits ride that Plan is
    // NOT recommending, so the wait_times branch is the one exercised.
    const recommended = await planRecommendedRideNames();
    await goToTab("Waits");

    const target = RIDE_NAMES.find(
      (name) => !recommended.includes(name) && inLineButtonForRide(name)
    );
    expect(target).toBeTruthy();

    await click(inLineButtonForRide(target));

    const event = lastInLineEvent();
    expect(event).toBeTruthy();
    expect(event[1].source).toBe("wait_times");
    expect(event[1].recommendationSlot).toBe("wait_times");
    expect(event[1].action).toEqual({ type: "in_line", label: "In Line" });
    expect(activeTabLabel()).toBe("Home");
  });

  test("a recommended ride is attributed to its recommendation slot", async () => {
    await renderApp();
    await goToTab("Plan");

    const button = inLineButtons()[0];
    const rideName = rideNameForButton(button);
    const ride = MK_RIDES.find((entry) => entry.name === rideName);

    await click(button);

    const event = lastInLineEvent();
    expect(event).toBeTruthy();
    expect(event[1].source).toBe("recommendation_card");
    expect(event[1].recommendationSlot).not.toBe("wait_times");
    expect(
      ["bestMove", "backup", "worthTheWalk", "planAhead", "waitOnThis"]
    ).toContain(event[1].recommendationSlot);
    expect(String(event[1].metadata.rideId)).toBe(String(ride.id));
    expect(activeTabLabel()).toBe("Home");
  });

  test("navigating does not change what Plan recommends", async () => {
    await renderApp();
    const before = await planRecommendedRideNames();

    await goToTab("Waits");
    const target = RIDE_NAMES.find(
      (name) => !before.includes(name) && inLineButtonForRide(name)
    );
    await click(inLineButtonForRide(target));
    expect(activeTabLabel()).toBe("Home");

    // The ride now in progress is suppressed against itself by existing logic;
    // every other recommendation keeps its place and order.
    const after = await planRecommendedRideNames();
    expect(after).toEqual(before.filter((name) => name !== target));
  });
});

/* -------------------------------------------------------------------------- */
/* Home park card -> Waits                                                    */
/* -------------------------------------------------------------------------- */

describe("Home park card opens Waits", () => {
  test("selecting another park navigates to Waits and shows that park", async () => {
    await renderApp();
    expect(activeTabLabel()).toBe("Home");

    await click(parkCardNamed("EPCOT"));

    expect(activeTabLabel()).toBe("Waits");
    expect(screenText()).toContain("EPCOT");
    // The waits shown belong to the park just chosen.
    expect(screenText()).toContain("Living with the Land");
    expect(screenText()).not.toContain("Haunted Mansion");
  });

  test("selecting the already-selected park still opens its Waits", async () => {
    await renderApp();
    expect(activeTabLabel()).toBe("Home");

    await click(parkCardNamed("Magic Kingdom"));

    expect(activeTabLabel()).toBe("Waits");
    expect(screenText()).toContain("Haunted Mansion");
  });

  test("browsing another park does not overwrite the confirmed active park", async () => {
    await renderApp();
    await click(parkCardNamed("EPCOT"));
    expect(activeTabLabel()).toBe("Waits");

    const parkSelectedEvent = trackEvent.mock.calls
      .filter(([name]) => name === "park_selected")
      .pop();

    expect(parkSelectedEvent).toBeTruthy();
    expect(parkSelectedEvent[1].metadata.nextPark).toBe("epcot");

    // Whatever the confirmed active park was, selecting a card did not become a
    // claim that the family physically moved parks.
    const confirmed = parkSelectedEvent[1].metadata.confirmedActivePark;
    expect(confirmed).not.toBe("epcot");

    // And no presence confirmation was emitted by browsing.
    expect(
      trackEvent.mock.calls.some(([name]) => name === "park_presence_confirmed")
    ).toBe(false);
  });

  test("park selection still emits its existing event and source", async () => {
    await renderApp();
    await click(parkCardNamed("EPCOT"));

    const event = trackEvent.mock.calls.find(([name]) => name === "park_selected");
    expect(event).toBeTruthy();
    expect(event[1].source).toBe("park_tabs");
    expect(event[1].activePark).toBe("epcot");
  });
});

/* -------------------------------------------------------------------------- */
/* Planned park hop — the Park Check must survive the navigation              */
/* -------------------------------------------------------------------------- */

describe("planned park hop keeps the Park Check reachable", () => {
  /**
   * Selecting a PLANNED secondary park raises the existing manual-hop Park
   * Check. Navigating straight to Waits used to strand that confirmation on
   * Home — the guest landed on the park they asked for with no visible way to
   * say "I'm here now", and Waits stays viewing-only until they do.
   *
   * The same prompt now renders on Waits when it names the park on screen.
   * Everything about WHEN a prompt exists, and what the answers do, still comes
   * from utils/parkPresence through App.
   */
  beforeEach(() => {
    seedProfile(PARK_HOP_PROFILE);
  });

  function parkCheckSections() {
    return Array.from(container.querySelectorAll("section")).filter((node) =>
      (node.textContent || "").includes("PARK CHECK")
    );
  }

  function parkCheckVisible() {
    return parkCheckSections().length > 0;
  }

  function buttonLabelled(label) {
    return Array.from(container.querySelectorAll("button")).find(
      (node) => node.textContent.trim() === label
    );
  }

  /** Waits withholds attraction actions while merely browsing. */
  function waitsHasRideActions() {
    return (
      inLineButtons().length > 0 ||
      Array.from(container.querySelectorAll("button")).some(
        (node) => node.textContent.trim() === "✓ Done"
      )
    );
  }

  function confirmedActivePark() {
    const raw = window.localStorage.getItem("parkplan.parkPresence");
    return raw ? JSON.parse(raw).confirmedActivePark : null;
  }

  test("today's plan really does make EPCOT a confirmable secondary park", async () => {
    await renderApp();

    // Guards the fixture itself: if the schedule stopped resolving, EPCOT would
    // not be confirmable and every assertion below would pass vacuously by
    // never raising a prompt at all.
    const presence = JSON.parse(window.localStorage.getItem("parkplan.parkPresence"));

    expect(presence.plannedParkIds).toEqual(["magic_kingdom", "epcot"]);
    expect(presence.confirmedActivePark).toBe("magic_kingdom");
    expect(presence.prompt).toBeNull();
  });

  test("selecting EPCOT opens EPCOT Waits with the Park Check still visible", async () => {
    await renderApp();
    expect(activeTabLabel()).toBe("Home");

    await click(parkCardNamed("EPCOT"));

    // Navigated, and showing the park that was chosen.
    expect(activeTabLabel()).toBe("Waits");
    expect(screenText()).toContain("EPCOT wait times");
    expect(screenText()).toContain("Living with the Land");

    // The confirmation travelled with the guest.
    expect(parkCheckVisible()).toBe(true);
    expect(screenText()).toContain("Are you at EPCOT now?");
    expect(buttonLabelled("I’m here now")).toBeTruthy();
    expect(buttonLabelled("Just checking")).toBeTruthy();
  });

  test("exactly one Park Check renders", async () => {
    await renderApp();
    await click(parkCardNamed("EPCOT"));

    expect(parkCheckSections()).toHaveLength(1);
  });

  test("before confirming, Magic Kingdom stays active and EPCOT stays viewing-only", async () => {
    await renderApp();
    await click(parkCardNamed("EPCOT"));

    expect(confirmedActivePark()).toBe("magic_kingdom");
    expect(screenText()).toContain("Browsing EPCOT");
    expect(screenText()).toContain("Magic Kingdom");
    expect(waitsHasRideActions()).toBe(false);
  });

  test('"I\u2019m here now" confirms EPCOT without leaving Waits, and restores actions', async () => {
    await renderApp();
    await click(parkCardNamed("EPCOT"));
    expect(confirmedActivePark()).toBe("magic_kingdom");

    await click(buttonLabelled("I’m here now"));

    // Stayed put.
    expect(activeTabLabel()).toBe("Waits");
    // Confirmed through the existing handler.
    expect(confirmedActivePark()).toBe("epcot");
    // Prompt is answered and gone; browse-only state is lifted.
    expect(parkCheckVisible()).toBe(false);
    expect(screenText()).not.toContain("Browsing EPCOT");
    expect(screenText()).toContain("EPCOT wait times");
    // EPCOT's attraction actions are available now that it is the active park.
    expect(waitsHasRideActions()).toBe(true);
  });

  test('"Just checking" keeps Magic Kingdom confirmed and EPCOT browse-only', async () => {
    await renderApp();
    await click(parkCardNamed("EPCOT"));

    await click(buttonLabelled("Just checking"));

    expect(activeTabLabel()).toBe("Waits");
    expect(confirmedActivePark()).toBe("magic_kingdom");
    expect(parkCheckVisible()).toBe(false);
    expect(screenText()).toContain("Browsing EPCOT");
    expect(waitsHasRideActions()).toBe(false);
  });

  test("selecting the confirmed park raises no Park Check", async () => {
    await renderApp();

    await click(parkCardNamed("Magic Kingdom"));

    expect(activeTabLabel()).toBe("Waits");
    expect(screenText()).toContain("Magic Kingdom wait times");
    expect(parkCheckVisible()).toBe(false);
    // The confirmed park is not browse-only, so its actions are present.
    expect(waitsHasRideActions()).toBe(true);
  });

  test("an unplanned park browses read-only and raises no Park Check", async () => {
    await renderApp();

    // Hollywood Studios is not on today's schedule, so it can be browsed but
    // never confirmed — and must not be asked about.
    await click(parkCardNamed("Hollywood Studios"));

    expect(activeTabLabel()).toBe("Waits");
    expect(parkCheckVisible()).toBe(false);
    expect(confirmedActivePark()).toBe("magic_kingdom");
    expect(waitsHasRideActions()).toBe(false);
  });

  test("the Waits gate only shows a prompt naming the park on screen", () => {
    // In-app, a prompt for one park while Waits shows another only arises from
    // detected arrival, which needs GPS. The gate is therefore pinned directly
    // on the real component instead, so it cannot regress unnoticed.
    const render = (promptParkId, waitsParkId) =>
      renderToStaticMarkup(
        React.createElement(WaitsTab, {
          activeRideId: null,
          browsedParkLabel: "EPCOT",
          browsingAnotherPark: true,
          confirmedActiveParkLabel: "Magic Kingdom",
          loading: false,
          sortedRides: [],
          waitListParkData: { source: "live", rides: [] },
          waitListParkId: waitsParkId,
          waitsError: "",
          parkPresencePrompt: { type: "manual_hop", parkId: promptParkId },
          loadData: () => {},
          handleConfirmParkPresence: () => {},
          handleDismissParkPresencePrompt: () => {},
          formatLandLabel: () => "",
          getParkNameById: (id) => (id === "epcot" ? "EPCOT" : "Magic Kingdom"),
          hasShowtimeSchedule: () => false,
          renderRideActions: () => null,
          renderShowtimeInfo: () => null,
          button: {},
        })
      );

    // Same park: the confirmation belongs here.
    expect(render("epcot", "epcot")).toContain("PARK CHECK");
    // Different park: never ask about a park that is not on screen.
    expect(render("epcot", "magic_kingdom")).not.toContain("PARK CHECK");
    // No prompt at all.
    expect(render(null, "epcot")).not.toContain("PARK CHECK");
  });

  test("the Park Check does not follow the guest to an unrelated park", async () => {
    await renderApp();
    await click(parkCardNamed("EPCOT"));
    expect(parkCheckVisible()).toBe(true);

    // Browsing on to a park the prompt does not name must not keep asking.
    await goToTab("Home");
    await click(parkCardNamed("Hollywood Studios"));

    expect(activeTabLabel()).toBe("Waits");
    expect(parkCheckVisible()).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Nothing else moves                                                         */
/* -------------------------------------------------------------------------- */

describe("navigation stays otherwise unchanged", () => {
  test("every bottom tab still switches normally", async () => {
    await renderApp();

    for (const label of ["Waits", "Plan", "TOHI", "Profile", "Home"]) {
      await goToTab(label);
      expect(activeTabLabel()).toBe(label);
    }
  });

  test("returning to a tab after an automatic transition still works", async () => {
    await renderApp();
    await goToTab("Waits");
    await click(inLineButtons()[0]);
    expect(activeTabLabel()).toBe("Home");

    await goToTab("Plan");
    expect(activeTabLabel()).toBe("Plan");

    await goToTab("Waits");
    expect(activeTabLabel()).toBe("Waits");
  });

  test("Plan Tools does not become a tab state", async () => {
    await renderApp();
    // Exactly the five shipped tabs, unchanged.
    expect(tabButtons().map((node) => node.textContent.trim())).toEqual([
      "Home",
      "Waits",
      "Plan",
      "TOHI",
      "Profile",
    ]);
  });
});
