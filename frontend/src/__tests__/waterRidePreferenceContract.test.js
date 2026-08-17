/**
 * Water-ride preference contract.
 *
 * Two defects are pinned here.
 *
 * SCORING: onboarding stores the canonical `"love"`, but the engine only ever gave
 * the positive water-ride modifier to the legacy `"yes"`, so "We love water rides"
 * changed nothing.
 *
 * VISIBILITY: "Okay if TOHI warns us first" stored `"okay_with_warning"`, stayed
 * correctly score-neutral, and then said nothing when a wet ride was surfaced.
 * Threading the note through `buildReason` could not fix that, because no single
 * reason string reaches every card: buildReason returns early for a must-do, Plan
 * Ahead renders `planAheadReason`, Wait on This renders `waitOnThisReason`, and a
 * height note outranks other secondary notes. The heads-up is therefore rendered by
 * RecommendationCard from the structured `ride.wetRideHeadsUp` field, and the tests
 * below verify BOTH that the engine populates that field in every slot AND that the
 * card actually renders it regardless of which reason string it was handed.
 *
 * Everything drives real code: the real engine through `getNextBestRides`, real
 * `rideMetadata` attractions, and the real `RecommendationCard` through
 * react-dom/server. No scoring formula is re-implemented, and the scoring tests
 * compare real outputs against each other so an authorized retune of +8/-45 does
 * not break them while a regression in which preference reaches which branch does.
 *
 * Fixtures are chosen deliberately:
 *   - "Journey of Water, Inspired by Moana" is really `getsWet: true` with
 *     `minHeightInches: 0`, so no height note interferes.
 *   - "Living with the Land" is the dry control in the SAME land.
 *   - "Tiana's Bayou Adventure" is really wet AND plan-ahead, for the Plan Ahead slot.
 *   - "Kali River Rapids" is really wet AND requires 38 inches, for the height case.
 *   - Weather is mild: every wet attraction is also `closesInRain: true`, and a storm
 *     would remove it through existing rules before preference mattered.
 *   - The clock is pinned, because the engine reads the real wall clock for
 *     closed/pre-open gating.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { getNextBestRides } from "../rideRecommendations";
import { RecommendationCard } from "../components/RecommendationCard";
import { adultOnlyFamily, mildWeather, locationAtLand, neutralTimeContext } from "./fixtures/testHelpers";

const HEADS_UP = "Heads up: this one can get you wet";

const PARK = "epcot";
const LAND = "world_nature";
const WET_RIDE_ID = "contract-wet-ride";
const DRY_RIDE_ID = "contract-dry-ride";

const RIDES = [
  { id: WET_RIDE_ID, name: "Journey of Water, Inspired by Moana", land: LAND, waitTime: 15, isOpen: true },
  { id: DRY_RIDE_ID, name: "Living with the Land", land: LAND, waitTime: 15, isOpen: true },
];

const SLOTS = ["bestMove", "backup", "worthTheWalk", "planAhead", "waitOnThis"];

function runFor(waterRidePreference, overrides = {}) {
  return getNextBestRides({
    parkId: PARK,
    rides: RIDES,
    weather: mildWeather(),
    locationContext: locationAtLand(LAND),
    familyProfile: adultOnlyFamily({ waterRidePreference, ...overrides }),
    timeContext: neutralTimeContext(),
  });
}

function findRide(recs, rideId) {
  for (const slot of SLOTS) {
    const candidate = recs[slot];
    if (candidate && String(candidate.id) === rideId) return candidate;
  }
  return null;
}

function wetRideFor(preference, overrides) {
  const ride = findRide(runFor(preference, overrides), WET_RIDE_ID);
  // Guard: if the fixture stopped being surfaced every comparison would be vacuous.
  expect(ride).toBeTruthy();
  return ride;
}

function dryRideFor(preference) {
  const ride = findRide(runFor(preference), DRY_RIDE_ID);
  expect(ride).toBeTruthy();
  return ride;
}

function renderCard(props) {
  return renderToStaticMarkup(
    React.createElement(RecommendationCard, {
      title: "BEST MOVE",
      ride: { id: "x", name: "Journey of Water, Inspired by Moana", waitTime: 15 },
      ...props,
    })
  );
}

const IN_PARK_NOW = new Date("2026-01-15T13:00:00-05:00");

beforeEach(() => {
  jest.useFakeTimers("modern");
  jest.setSystemTime(IN_PARK_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/* Scoring contract                                                           */
/* -------------------------------------------------------------------------- */

describe("water-ride preference scoring contract", () => {
  test("the wet fixture really is a wet attraction the engine surfaces", () => {
    const wet = wetRideFor("depends");
    expect(wet.wetRideHeadsUp).toBeFalsy();
    expect(typeof wet.rawFamilyProfileModifier).toBe("number");
  });

  test('canonical "love" earns the positive water-ride modifier', () => {
    const neutral = wetRideFor("depends");
    const love = wetRideFor("love");

    expect(love.rawFamilyProfileModifier).toBeGreaterThan(neutral.rawFamilyProfileModifier);
    expect(love.recommendationScore).toBeGreaterThan(neutral.recommendationScore);
  });

  test('legacy "yes" stays compatible and matches "love" exactly', () => {
    const love = wetRideFor("love");
    const legacyYes = wetRideFor("yes");

    expect(legacyYes.rawFamilyProfileModifier).toBe(love.rawFamilyProfileModifier);
    expect(legacyYes.recommendationScore).toBe(love.recommendationScore);
  });

  test('"avoid" keeps its existing negative modifier and still dominates the positive one', () => {
    const neutral = wetRideFor("depends");
    const avoid = wetRideFor("avoid");
    const love = wetRideFor("love");

    expect(avoid.rawFamilyProfileModifier).toBeLessThan(neutral.rawFamilyProfileModifier);
    expect(avoid.recommendationScore).toBeLessThan(neutral.recommendationScore);

    const avoidDelta = neutral.rawFamilyProfileModifier - avoid.rawFamilyProfileModifier;
    const loveDelta = love.rawFamilyProfileModifier - neutral.rawFamilyProfileModifier;
    expect(avoidDelta).toBeGreaterThan(loveDelta);
  });

  test('"okay_with_warning" is score-neutral, exactly like "depends"', () => {
    const neutral = wetRideFor("depends");
    const okay = wetRideFor("okay_with_warning");

    expect(okay.rawFamilyProfileModifier).toBe(neutral.rawFamilyProfileModifier);
    expect(okay.recommendationScore).toBe(neutral.recommendationScore);
  });

  test("a dry attraction is untouched by every water-ride preference", () => {
    const preferences = ["love", "yes", "avoid", "okay_with_warning", "depends"];
    const scores = preferences.map((preference) => dryRideFor(preference).recommendationScore);

    expect(new Set(scores).size).toBe(1);

    preferences.forEach((preference) => {
      expect(dryRideFor(preference).wetRideHeadsUp).toBeFalsy();
    });
  });

  test("a missing or unrecognised preference stays neutral and silent", () => {
    const neutral = wetRideFor("depends");

    [undefined, null, "", "nonsense_value"].forEach((value) => {
      const ride = wetRideFor(value);
      expect(ride.rawFamilyProfileModifier).toBe(neutral.rawFamilyProfileModifier);
      expect(ride.recommendationScore).toBe(neutral.recommendationScore);
      expect(ride.wetRideHeadsUp).toBeFalsy();
    });
  });

  test("no preference other than okay_with_warning produces the heads-up field", () => {
    ["love", "yes", "avoid", "depends"].forEach((preference) => {
      const ride = findRide(runFor(preference), WET_RIDE_ID);
      if (!ride) return; // avoid may legitimately drop it from every slot
      expect(ride.wetRideHeadsUp).toBeFalsy();
    });
  });

  test("the heads-up is never concatenated into any reason string", () => {
    // The card owns the message now. A copy in `reason` would double it.
    const okay = wetRideFor("okay_with_warning");
    expect(okay.reason).not.toContain("can get you wet");
  });
});

/* -------------------------------------------------------------------------- */
/* The field reaches every slot the guest can actually see                     */
/* -------------------------------------------------------------------------- */

describe("wetRideHeadsUp is populated in every surfaced slot", () => {
  test("ordinary recommendation", () => {
    const okay = wetRideFor("okay_with_warning");
    expect(okay.wetRideHeadsUp?.message).toBe(HEADS_UP);
  });

  test("must-do, where buildReason returns early", () => {
    const recs = getNextBestRides({
      parkId: PARK,
      rides: RIDES,
      weather: mildWeather(),
      locationContext: locationAtLand(LAND),
      familyProfile: adultOnlyFamily({ waterRidePreference: "okay_with_warning" }),
      timeContext: neutralTimeContext(),
      tripPlan: {
        mustDoExperiences: [
          {
            id: "md-wet",
            name: "Journey of Water, Inspired by Moana",
            parkId: PARK,
            type: "ride",
            priority: "must_do",
          },
        ],
      },
    });

    const wet = findRide(recs, WET_RIDE_ID);
    expect(wet).toBeTruthy();
    expect(wet.mustDoModifier).toBeGreaterThan(0);
    expect(wet.wetRideHeadsUp?.message).toBe(HEADS_UP);
    // Proof the reason path alone was never enough: the must-do reason says nothing
    // about getting wet, which is exactly why the card must read the field.
    expect(wet.reason).not.toContain("can get you wet");
  });

  test("Plan Ahead, which renders planAheadReason instead of reason", () => {
    const recs = getNextBestRides({
      parkId: "magic_kingdom",
      weather: mildWeather(),
      timeContext: neutralTimeContext(),
      locationContext: locationAtLand("tomorrowland"),
      familyProfile: adultOnlyFamily({ waterRidePreference: "okay_with_warning" }),
      rides: [
        { id: "pa-wet", name: "Tiana's Bayou Adventure", land: "frontierland", waitTime: 85, isOpen: true },
        { id: "buzz", name: "Buzz Lightyear's Space Ranger Spin", land: "tomorrowland", waitTime: 10, isOpen: true },
        { id: "pm", name: "Tomorrowland Transit Authority PeopleMover", land: "tomorrowland", waitTime: 5, isOpen: true },
        { id: "cop", name: "Walt Disney's Carousel of Progress", land: "tomorrowland", waitTime: 5, isOpen: true },
      ],
    });

    expect(recs.planAhead).toBeTruthy();
    expect(String(recs.planAhead.id)).toBe("pa-wet");
    expect(recs.planAhead.wetRideHeadsUp?.message).toBe(HEADS_UP);
  });

  test("Wait on This, which renders waitOnThisReason instead of reason", () => {
    const recs = getNextBestRides({
      parkId: PARK,
      weather: mildWeather(),
      timeContext: neutralTimeContext(),
      locationContext: locationAtLand(LAND),
      familyProfile: adultOnlyFamily({ waterRidePreference: "okay_with_warning" }),
      rides: [
        { id: "wot-wet", name: "Journey of Water, Inspired by Moana", land: LAND, waitTime: 80, isOpen: true },
        { id: "lwl", name: "Living with the Land", land: LAND, waitTime: 5, isOpen: true },
        { id: "nemo", name: "The Seas with Nemo & Friends", land: LAND, waitTime: 5, isOpen: true },
        { id: "tt", name: "Turtle Talk With Crush", land: LAND, waitTime: 5, isOpen: true },
        { id: "ap", name: "Awesome Planet", land: LAND, waitTime: 5, isOpen: true },
      ],
    });

    expect(recs.waitOnThis).toBeTruthy();
    expect(String(recs.waitOnThis.id)).toBe("wot-wet");
    expect(recs.waitOnThis.wetRideHeadsUp?.message).toBe(HEADS_UP);
  });

  test("a height note no longer suppresses the heads-up", () => {
    // Kali River Rapids is really getsWet AND requires 38 inches. Previously the
    // buildReason else-if meant the height note erased the wet note entirely; both
    // signals must now survive.
    const recs = getNextBestRides({
      parkId: "animal_kingdom",
      weather: mildWeather(),
      timeContext: neutralTimeContext(),
      locationContext: locationAtLand("asia"),
      familyProfile: adultOnlyFamily({
        waterRidePreference: "okay_with_warning",
        childCount: 1,
        children: [{ id: "c1", label: "Child 1", age: 6, heightInches: 37 }],
        shortestHeightInches: 37,
        hasSmallChildren: true,
        wholeGroupRidesTogether: "rider_switch",
      }),
      rides: [
        { id: "h-wet", name: "Kali River Rapids", land: "asia", waitTime: 10, isOpen: true },
        { id: "everest", name: "Expedition Everest", land: "asia", waitTime: 45, isOpen: true },
      ],
    });

    const wet = findRide(recs, "h-wet");
    expect(wet).toBeTruthy();

    expect(wet.heightWarning).toBeTruthy();
    expect(wet.wetRideHeadsUp?.message).toBe(HEADS_UP);

    // Height stays in the reason (the more prominent signal)...
    expect(wet.reason).toContain("38 inches");
    // ...and the wet note is carried by the field for the card to render.
    expect(wet.reason).not.toContain("can get you wet");
  });
});

/* -------------------------------------------------------------------------- */
/* The card actually renders it                                               */
/* -------------------------------------------------------------------------- */

describe("RecommendationCard renders the heads-up from the structured field", () => {
  const wetRideHeadsUp = { reason: "water_ride_heads_up", message: HEADS_UP };
  const ride = { id: "x", name: "Journey of Water, Inspired by Moana", waitTime: 15, wetRideHeadsUp };

  test("with an ordinary reason", () => {
    const markup = renderCard({ ride, reason: "Reasonable wait for this ride." });
    expect(markup).toContain(HEADS_UP);
  });

  test("with a Plan Ahead reason, where `reason` is not the displayed string", () => {
    const markup = renderCard({
      ride,
      reason: "Poor value right now. Use when already nearby and the group needs a short indoor break.",
    });
    expect(markup).toContain(HEADS_UP);
  });

  test("with a Wait on This reason", () => {
    const markup = renderCard({
      ride,
      reason: "This may fit better later when the wait or effort drops.",
    });
    expect(markup).toContain(HEADS_UP);
  });

  test("with no reason at all", () => {
    const markup = renderCard({ ride, reason: undefined });
    expect(markup).toContain(HEADS_UP);
  });

  test("alongside a height note, with height still the more prominent signal", () => {
    const markup = renderCard({
      ride,
      reason: "Well below its usual wait and you're already nearby. Some riders may be under 38 inches. Use Rider Switch or split up if needed.",
    });

    expect(markup).toContain("38 inches");
    expect(markup).toContain(HEADS_UP);

    // The reason paragraph renders above the heads-up, so height reads first.
    expect(markup.indexOf("38 inches")).toBeLessThan(markup.indexOf(HEADS_UP));
  });

  test("exactly once, never duplicated", () => {
    const markup = renderCard({ ride, reason: "Reasonable wait for this ride." });
    expect(markup.split(HEADS_UP).length - 1).toBe(1);
  });

  test("in night mode as well as day", () => {
    expect(renderCard({ ride, reason: "x", night: true })).toContain(HEADS_UP);
    expect(renderCard({ ride, reason: "x", night: false })).toContain(HEADS_UP);
  });

  test("not at all for a ride without the field", () => {
    const markup = renderCard({
      ride: { id: "y", name: "Living with the Land", waitTime: 15 },
      reason: "Reasonable wait for this ride.",
    });
    expect(markup).not.toContain(HEADS_UP);
    expect(markup).not.toContain("can get you wet");
  });
});

/* -------------------------------------------------------------------------- */
/* End to end: engine output straight into the real card                       */
/* -------------------------------------------------------------------------- */

describe("engine output renders through the real card", () => {
  test("an ordinary wet recommendation shows the heads-up", () => {
    const wet = wetRideFor("okay_with_warning");
    expect(renderCard({ ride: wet, reason: wet.reason })).toContain(HEADS_UP);
  });

  test("a neutral preference shows nothing", () => {
    const wet = wetRideFor("depends");
    expect(renderCard({ ride: wet, reason: wet.reason })).not.toContain(HEADS_UP);
  });

  test('a "love" preference shows nothing, since it did not ask to be told', () => {
    const wet = wetRideFor("love");
    expect(renderCard({ ride: wet, reason: wet.reason })).not.toContain(HEADS_UP);
  });
});
