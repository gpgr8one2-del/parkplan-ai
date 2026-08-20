/**
 * Field test — Hollywood Studios, Issue 2.
 *
 * Reported: on August 18, 2026 Disney's Hollywood Studios was open until
 * 10:00 PM, but TOHI's Home hero displayed "Closes 9:00 PM".
 *
 * The 9:00 PM came from DEFAULT_WEEKLY_SCHEDULE.hollywood, a flat weekly
 * estimate applied to every weekday, because PARK_HOURS_OVERRIDES had no
 * hollywood entry at all. Nothing in the app possessed real hours for that date
 * — Queue-Times, the only live source, returns lands and rides and carries no
 * operating hours — so an unverified average was being rendered as fact.
 *
 * The invariant these tests pin:
 *
 *   The displayed closing time must be correct for the selected park and the
 *   specific Orlando calendar date. Without verified date-specific hours, TOHI
 *   must not display a weekly estimate as "Closes X".
 *
 * Determinism: every test pins an absolute UTC instant and the assertions are
 * about Orlando wall-clock results, so nothing depends on the host machine's
 * clock or timezone. The host-TZ pair in "the Orlando calendar date decides the
 * schedule" fails if the module ever goes back to reading host-local dates.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  formatCloseTimeLabel,
  getParkCloseTime,
  getParkHoursForDate,
} from "../parkHours";
import { getNextBestRides } from "../rideRecommendations";
import { HomeTab } from "../components/HomeTab";
import {
  MK,
  buildRide,
  adultOnlyFamily,
  locationAtLand,
  mildWeather,
  neutralTimeContext,
} from "./fixtures/testHelpers";

/* -------------------------------------------------------------------------- */
/* Fixed instants — Orlando is UTC-4 in August (EDT), UTC-5 in January (EST)   */
/* -------------------------------------------------------------------------- */

const AUG_18_7_00_PM = new Date("2026-08-18T23:00:00.000Z"); // 7:00 PM Orlando
const AUG_18_8_20_PM = new Date("2026-08-19T00:20:00.000Z"); // 8:20 PM Orlando
const AUG_18_9_15_PM = new Date("2026-08-19T01:15:00.000Z"); // 9:15 PM Orlando
const AUG_18_11_30_PM = new Date("2026-08-19T03:30:00.000Z"); // 11:30 PM Orlando
const AUG_19_12_30_AM = new Date("2026-08-19T04:30:00.000Z"); // 12:30 AM Orlando
const MAY_10_2_00_PM = new Date("2026-05-10T18:00:00.000Z"); // 2:00 PM Orlando

// A Tuesday with no override for any park — the same weekday as the field test,
// so the weekly Hollywood estimate that caused the report (9:00 PM) would apply
// here too if anything still consumed it.
const AUG_25_8_20_PM = new Date("2026-08-26T00:20:00.000Z"); // 8:20 PM Orlando

// Independent of the module under test: what does Orlando's clock really read?
function orlandoLabel(instant) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "short",
    timeStyle: "short",
  }).format(instant);
}

function orlandoTimeOf(instant) {
  return instant
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
      }).format(instant)
    : null;
}

/* -------------------------------------------------------------------------- */

describe("park hours resolution", () => {
  test("Hollywood Studios on August 18, 2026 resolves to a verified 10:00 PM", () => {
    // The reported date. Asserted from mid-evening, when the field test ran.
    expect(orlandoLabel(AUG_18_7_00_PM)).toBe("8/18/26, 7:00 PM");

    const hours = getParkHoursForDate("hollywood", AUG_18_7_00_PM);

    expect(hours.dateKey).toBe("2026-08-18");
    expect(hours.source).toBe("date_override");
    expect(hours.closeVerified).toBe(true);
    expect(orlandoTimeOf(hours.close)).toBe("10:00 PM");
    expect(formatCloseTimeLabel("hollywood", AUG_18_7_00_PM)).toBe("10:00 PM");
  });

  test("a date-specific value outranks the weekly fallback", () => {
    // Magic Kingdom's weekly estimate closes at 10:00 PM; its verified override
    // for May 10 closes at 11:00 PM. The override must win.
    const weekly = getParkHoursForDate("magic_kingdom", AUG_18_7_00_PM);
    expect(weekly.source).toBe("weekly_estimate");
    expect(weekly.closeVerified).toBe(false);
    expect(orlandoTimeOf(weekly.close)).toBe("10:00 PM");

    const overridden = getParkHoursForDate("magic_kingdom", MAY_10_2_00_PM);
    expect(overridden.dateKey).toBe("2026-05-10");
    expect(overridden.source).toBe("date_override");
    expect(overridden.closeVerified).toBe(true);
    expect(orlandoTimeOf(overridden.close)).toBe("11:00 PM");
    expect(formatCloseTimeLabel("magic_kingdom", MAY_10_2_00_PM)).toBe("11:00 PM");
  });

  test("an unverified weekly estimate is never offered as an exact closing time", () => {
    // Hollywood on a date with no override still HAS an estimate for internal
    // use, but it must not be formatted as a closing time a guest would read.
    const hours = getParkHoursForDate("hollywood", AUG_19_12_30_AM);

    expect(hours.source).toBe("weekly_estimate");
    expect(hours.closeVerified).toBe(false);
    expect(hours.close).toBeInstanceOf(Date);
    expect(formatCloseTimeLabel("hollywood", AUG_19_12_30_AM)).toBeNull();
  });

  test("the Orlando calendar date decides the schedule, whatever the host is", () => {
    // 11:30 PM Orlando on the 18th is already the 19th in UTC. The Orlando date
    // is the one that selects the schedule, so the verified override still
    // applies; half an hour later, in Orlando, it correctly stops applying.
    expect(orlandoLabel(AUG_18_11_30_PM)).toBe("8/18/26, 11:30 PM");
    expect(AUG_18_11_30_PM.getUTCDate()).toBe(19);

    const lateOn18th = getParkHoursForDate("hollywood", AUG_18_11_30_PM);
    expect(lateOn18th.dateKey).toBe("2026-08-18");
    expect(lateOn18th.closeVerified).toBe(true);
    expect(orlandoTimeOf(lateOn18th.close)).toBe("10:00 PM");

    expect(orlandoLabel(AUG_19_12_30_AM)).toBe("8/19/26, 12:30 AM");
    const earlyOn19th = getParkHoursForDate("hollywood", AUG_19_12_30_AM);
    expect(earlyOn19th.dateKey).toBe("2026-08-19");
    expect(earlyOn19th.closeVerified).toBe(false);
  });

  test("the resolved close is a real Orlando instant, not a host-local one", () => {
    // A wall-clock string alone would be ambiguous. The returned Date must point
    // at the actual moment Hollywood closed: 10:00 PM EDT is 02:00 UTC next day.
    const close = getParkCloseTime("hollywood", AUG_18_7_00_PM);

    expect(close.toISOString()).toBe("2026-08-19T02:00:00.000Z");
    expect(orlandoTimeOf(close)).toBe("10:00 PM");
  });

  test("getParkCloseTime withholds an unverified close entirely", () => {
    // The decision boundary. getParkHoursForDate still knows the estimate, so
    // planning and pre-open behaviour keep working, but the value handed to the
    // close-time filter is null rather than a guess.
    const hours = getParkHoursForDate("hollywood", AUG_25_8_20_PM);

    expect(hours.dateKey).toBe("2026-08-25");
    expect(hours.closeVerified).toBe(false);
    expect(orlandoTimeOf(hours.close)).toBe("9:00 PM"); // the estimate still exists
    expect(hours.open).toBeInstanceOf(Date); // and pre-open still has an open time

    expect(getParkCloseTime("hollywood", AUG_25_8_20_PM)).toBeNull();
  });

  test("other parks and existing verified overrides are unchanged", () => {
    // Every previously shipped Magic Kingdom override still resolves to the same
    // Orlando wall-clock time it always did.
    const expected = [
      ["2026-05-06", "10:00 PM"],
      ["2026-05-07", "11:00 PM"],
      ["2026-05-08", "11:00 PM"],
      ["2026-05-09", "11:00 PM"],
      ["2026-05-10", "11:00 PM"],
      ["2026-05-11", "10:00 PM"],
    ];

    expected.forEach(([dateKey, closeLabel]) => {
      // Noon Orlando on that date — EDT in May, so 16:00 UTC.
      const instant = new Date(`${dateKey}T16:00:00.000Z`);
      const hours = getParkHoursForDate("magic_kingdom", instant);

      expect(hours.dateKey).toBe(dateKey);
      expect(hours.closeVerified).toBe(true);
      expect(orlandoTimeOf(hours.close)).toBe(closeLabel);
    });

    // Weekly estimates for the other parks still resolve, and still stay unnamed.
    [
      ["epcot", "9:00 PM"],
      ["animal_kingdom", "8:00 PM"],
      ["epic_universe", "11:00 PM"],
    ].forEach(([parkId, closeLabel]) => {
      const hours = getParkHoursForDate(parkId, AUG_18_7_00_PM);
      expect(orlandoTimeOf(hours.close)).toBe(closeLabel);
      expect(hours.closeVerified).toBe(false);
      expect(formatCloseTimeLabel(parkId, AUG_18_7_00_PM)).toBeNull();
    });

    // An unknown park still yields nothing rather than throwing.
    expect(getParkHoursForDate("not_a_park", AUG_18_7_00_PM)).toBeNull();
    expect(getParkCloseTime("not_a_park", AUG_18_7_00_PM)).toBeNull();
    expect(formatCloseTimeLabel("not_a_park", AUG_18_7_00_PM)).toBeNull();
  });
});

describe("the Home hero never states an unverified closing time", () => {
  // Minimal but real props: the hero only needs enough to render. Anything the
  // closing-time branch does not touch is stubbed with an inert value.
  function renderHome(closeTimeLabel) {
    const noop = () => {};
    const style = {};

    return renderToStaticMarkup(
      React.createElement(HomeTab, {
        activePark: "hollywood",
        browsedParkId: "hollywood",
        closeTimeLabel,
        currentActivity: null,
        currentActivityContext: null,
        error: null,
        homeGreeting: "Good evening",
        liveParkContext: null,
        night: false,
        loading: false,
        parkData: { rides: [], source: "live", ageMs: 0, fetchedAt: new Date().toISOString() },
        parkHopperContext: null,
        parkPresence: null,
        parkPresencePrompt: null,
        planningPark: "hollywood",
        planningParkLabel: "Hollywood Studios",
        planningParkSource: "manual",
        scheduledParkForToday: null,
        todayPlannedParkLabel: null,
        weather: mildWeather(),
        weatherMode: "mild",
        whileYouWaitContent: null,
        activeMiniGame: null,
        activeMiniGameType: null,
        lookAroundFound: [],
        revealedTriviaAnswer: false,
        selectedFamilyVoteOption: null,
        selectedTriviaChoice: null,
        getParkNameById: () => "Hollywood Studios",
        handleCancelCurrentActivity: noop,
        handleConfirmParkPresence: noop,
        handleDismissParkPresencePrompt: noop,
        handleDone: noop,
        handleSelectPark: noop,
        loadData: noop,
        setActivePark: noop,
        setParkPresence: noop,
        trackAppEvent: noop,
        handleFamilyVote: noop,
        handleLookAroundFound: noop,
        handleMiniGameTypeChange: noop,
        handleNextMiniGame: noop,
        handleTriviaChoice: noop,
        showTriviaAnswer: noop,
        actionButton: style,
        button: style,
        card: style,
      })
    );
  }

  test("a verified time is shown as Closes", () => {
    // Proves the hero really does render this branch, so the negative case below
    // is meaningful rather than vacuous.
    const markup = renderHome(formatCloseTimeLabel("hollywood", AUG_18_7_00_PM));

    expect(markup).toContain("Closes 10:00 PM");
  });

  test("an unverified date renders no closing claim at all", () => {
    const label = formatCloseTimeLabel("hollywood", AUG_19_12_30_AM);
    expect(label).toBeNull();

    const markup = renderHome(label);

    expect(markup).not.toContain("Closes");
    // ...and specifically not the weekly estimate that caused the field report.
    expect(markup).not.toContain("9:00 PM");
  });
});

describe("the recommendation engine reads the same corrected hours", () => {
  const HOLLYWOOD_RIDES = () => [
    buildRide({ name: "Star Tours – The Adventures Continue", land: "echo_lake", waitTime: 10 }),
    buildRide({ name: "The Twilight Zone Tower of Terror", land: "sunset_boulevard", waitTime: 45 }),
    buildRide({ name: "Slinky Dog Dash", land: "toy_story_land", waitTime: 60 }),
  ];

  function recommend() {
    return getNextBestRides({
      parkId: "hollywood",
      rides: HOLLYWOOD_RIDES(),
      weather: mildWeather(),
      locationContext: locationAtLand("echo_lake"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext(),
    });
  }

  beforeEach(() => {
    jest.useFakeTimers("modern");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("long-wait rides are no longer dropped early against a too-early close", () => {
    // The masked half of this issue. Against the incorrect 9:00 PM, a 45-minute
    // wait at 8:20 PM did not "fit before close" and was silently filtered out,
    // leaving only the shortest queue and an empty backup slot — even though it
    // fits comfortably before the real 10:00 PM.
    jest.setSystemTime(AUG_18_8_20_PM);

    expect(getParkCloseTime("hollywood", new Date()).toISOString()).toBe(
      "2026-08-19T02:00:00.000Z"
    );

    const recs = recommend();

    expect(recs.bestMove?.name).toBe("The Twilight Zone Tower of Terror");
    expect(recs.backup?.name).toBe("Star Tours – The Adventures Continue");
  });

  test("the close-time filter still applies, against the real closing time", () => {
    // The corrected hours must not simply disable the guard. At 9:15 PM a
    // 45-minute wait genuinely does not fit before 10:00 PM, so it is filtered —
    // and this is a real filter decision, not the emergency relaxed-close-time
    // fallback that the incorrect 9:00 PM used to force.
    jest.setSystemTime(AUG_18_9_15_PM);

    // The filter is operating against the verified 10:00 PM, not an estimate.
    expect(getParkCloseTime("hollywood", new Date()).toISOString()).toBe(
      "2026-08-19T02:00:00.000Z"
    );

    const warnings = [];
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation((message) => warnings.push(String(message)));

    try {
      const recs = recommend();

      expect(recs.bestMove?.name).toBe("Star Tours – The Adventures Continue");
      expect(recs.backup).toBeNull();
      expect(
        warnings.some((message) => message.includes("relaxed close-time fallback"))
      ).toBe(false);
    } finally {
      warnSpy.mockRestore();
    }
  });

  test("an unverified date never removes rides against the weekly estimate", () => {
    // Same weekday and same clock time as the field report, on a date with no
    // verified hours. The weekly Hollywood estimate closes at 9:00 PM, so if it
    // still reached the filter the 45- and 60-minute waits would be dropped and
    // the backup slot would be empty — exactly the defect the field test hit.
    //
    // With no verified close, fitsBeforeClose fails open and every ride is kept.
    jest.setSystemTime(AUG_25_8_20_PM);

    expect(getParkHoursForDate("hollywood", new Date()).closeVerified).toBe(false);
    expect(getParkCloseTime("hollywood", new Date())).toBeNull();

    const recs = recommend();

    expect(recs.bestMove?.name).toBe("The Twilight Zone Tower of Terror");
    expect(recs.backup?.name).toBe("Star Tours – The Adventures Continue");
  });

  test("pre-open gating still reads the estimated opening time", () => {
    // getParkHoursForDate keeps its estimates, so the pre-open path is untouched
    // by withholding the close. Magic Kingdom has no override for this date and
    // opens at 09:00 in the weekly schedule; at 08:00 Orlando the go-now slots
    // must still be suppressed while planning survives.
    jest.setSystemTime(new Date("2026-01-15T13:00:00.000Z")); // 8:00 AM Orlando

    const recs = getNextBestRides({
      parkId: "magic_kingdom",
      // Same ride set the existing pre-open suite uses: the two headliners are
      // plan-ahead attractions, so the surviving planning slot is real rather
      // than an artifact of the pool being empty.
      rides: [
        MK.peterPan({ waitTime: 5 }),
        MK.spaceMountain({ waitTime: 5 }),
        MK.tron({ waitTime: 80 }),
        MK.sevenDwarfs({ waitTime: 70 }),
      ],
      weather: mildWeather(),
      locationContext: locationAtLand("fantasyland"),
      familyProfile: adultOnlyFamily(),
      timeContext: neutralTimeContext({ orlandoTotalMinutes: 8 * 60 }),
    });

    expect(recs.parkOpenStatus?.isPreOpen).toBe(true);
    expect(recs.parkOpenStatus?.shouldBlockGoNow).toBe(true);
    expect(recs.bestMove).toBeNull();
    expect(recs.planAhead).not.toBeNull();
  });
});
