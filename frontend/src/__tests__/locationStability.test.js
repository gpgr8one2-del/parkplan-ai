/**
 * Field test — Hollywood Studios, GPS stability.
 *
 * Reported around Toy Story Land and Galaxy's Edge: the resolved area was
 * occasionally offset, changed unexpectedly, or lagged while walking. Near Rise
 * of the Resistance TOHI sometimes reported Toy Story Land; inside Toy Story
 * Land it sometimes jumped to a neighbouring land; and while leaving Galaxy's
 * Edge the detected area sometimes stayed put.
 *
 * What these tests pin:
 *
 *   Fresh, accurate readings resolve promptly. Imprecise or stale readings never
 *   become trusted context. A single noisy border sample cannot move a stable
 *   land, while genuine movement still transitions within a couple of readings.
 *
 * Determinism: the stability reducer is pure, so every sequence below is an
 * explicit list of readings with explicit accuracy radii and timestamps against
 * an explicit clock. Nothing samples the wall clock, the host timezone, or the
 * browser. The detector tests use the real shipped anchors rather than invented
 * coordinates.
 */

import fs from "fs";
import path from "path";

import {
  createLocationStabilityState,
  reduceLocationReading,
  isGpsContextFresh,
  resolveLocationTrust,
  resolveRestoredLocationState,
  shouldClearExpiredGpsLocation,
  LOCATION_STABILITY_THRESHOLDS as T,
} from "../utils/locationStability";
import { detectNearestLocationZone } from "../utils/locationDetection";

/* -------------------------------------------------------------------------- */
/* Real anchor coordinates, read from the shipped Hollywood Studios data       */
/* -------------------------------------------------------------------------- */

const RISE = { lat: 28.354, lng: -81.561 };
const TSL_CENTRE = { lat: 28.3558, lng: -81.5591 };
const TOY_STORY_MANIA = { lat: 28.3562, lng: -81.5591 };
const SMUGGLERS_RUN = { lat: 28.3553, lng: -81.5626 };

// Metres -> degrees at Hollywood Studios' latitude, so displacements below are
// stated in metres and stay readable.
const M_LAT = (m) => m / 111320;
const M_LNG = (m) => m / 97960;

const GALAXYS_EDGE = "star_wars_galaxys_edge";
const TOY_STORY_LAND = "toy_story_land";

const CLOCK = 1_800_000_000_000; // fixed epoch; no wall-clock reads anywhere

function detect(point, accuracyMeters) {
  return detectNearestLocationZone({
    parkId: "hollywood",
    lat: point.lat,
    lng: point.lng,
    accuracyMeters,
  });
}

// Run a sequence of readings through the reducer and return every decision, so
// a sequence test asserts on the whole trajectory rather than the end state.
function runSequence(readings, startState = createLocationStabilityState()) {
  let state = startState;
  const decisions = [];

  readings.forEach((reading) => {
    const result = reduceLocationReading(state, reading, reading.now);
    state = result.state;
    decisions.push(result.decision);
  });

  return { state, decisions, actions: decisions.map((d) => d.action) };
}

// Readings default to a confident detector verdict, because these sequences are
// about accuracy, staleness and hysteresis. Confidence is set explicitly by the
// tests that are about it. Note the reducer treats a MISSING confidence as low,
// so this default is deliberate rather than incidental.
function reading(
  landKey,
  { accuracy = 12, at = 0, now = 0, confidence = "high" } = {}
) {
  return {
    landKey,
    confidence,
    accuracyMeters: accuracy,
    timestamp: CLOCK + at,
    now: CLOCK + now,
  };
}

/* -------------------------------------------------------------------------- */

describe("land detection uses accuracy as an uncertainty radius", () => {
  test("Rise of the Resistance remains Galaxy's Edge", () => {
    const zone = detect(RISE, 8);

    expect(zone.landKey).toBe(GALAXYS_EDGE);
    expect(["high", "medium"]).toContain(zone.confidence);
  });

  test("Toy Story Land centre remains Toy Story Land", () => {
    const zone = detect(TSL_CENTRE, 8);

    expect(zone.landKey).toBe(TOY_STORY_LAND);
    expect(["high", "medium"]).toContain(zone.confidence);
  });

  test("a wide uncertainty radius cannot report a confident land", () => {
    // The field failure: a fix displaced ~80 m still read as high confidence,
    // because the geometry had no way to know the fix itself was poor. The
    // coordinates here sit squarely on Toy Story Mania, so the geometry is
    // perfect — only the radius says the reading cannot be trusted.
    const precise = detect(TOY_STORY_MANIA, 6);
    expect(precise.confidence).toBe("high");

    // Past the point where the radius spans neighbouring lands, confidence is
    // withheld entirely rather than asserted from geometry alone.
    const vague = detect(TOY_STORY_MANIA, T.MAX_ACCURACY_METERS + 30);
    expect(vague.landKey).toBe(TOY_STORY_LAND);
    expect(vague.confidence).toBe("low");
    expect(vague.geometryConfidence).toBe("high");
  });

  test("accuracy is never used to move the reported position", () => {
    // Same coordinates, three radii. The land, the nearest anchor and the
    // distance must be identical — only the confidence may differ. A radius is
    // not a correction, and nothing here may drift toward an anchor.
    const [tight, loose, unusable] = [5, 60, 300].map((a) =>
      detect(TOY_STORY_MANIA, a)
    );

    [loose, unusable].forEach((zone) => {
      expect(zone.landKey).toBe(tight.landKey);
      expect(zone.anchorName).toBe(tight.anchorName);
      expect(zone.distanceMeters).toBe(tight.distanceMeters);
    });

    expect(unusable.confidence).toBe("low");
  });

  test("callers that supply no accuracy keep the previous geometry behaviour", () => {
    // The park-arrival tracker and the existing fieldwork tests ask a pure
    // geometry question. They must be unaffected by the new radius handling.
    const withoutAccuracy = detect(TOY_STORY_MANIA, undefined);
    const geometryOnly = detectNearestLocationZone({
      parkId: "hollywood",
      lat: TOY_STORY_MANIA.lat,
      lng: TOY_STORY_MANIA.lng,
    });

    expect(withoutAccuracy.confidence).toBe(geometryOnly.confidence);
    expect(withoutAccuracy.landKey).toBe(geometryOnly.landKey);
    expect(withoutAccuracy.accuracyMeters).toBeNull();
  });
});

describe("a reading must earn trust before it can be acted on", () => {
  test("a fresh accurate initial reading resolves promptly", () => {
    // No waiting, no confirmation: the first good fix establishes the land.
    const { state, actions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 0, now: 1000 }),
    ]);

    expect(actions).toEqual(["accept"]);
    expect(state.landKey).toBe(GALAXYS_EDGE);
  });

  test("an imprecise reading cannot become trusted context", () => {
    const { state, decisions } = runSequence([
      reading(GALAXYS_EDGE, {
        accuracy: T.MAX_ACCURACY_METERS + 1,
        at: 0,
        now: 1000,
      }),
    ]);

    expect(decisions[0].action).toBe("reject");
    expect(decisions[0].reason).toBe("inaccurate");
    // Nothing was established, so there is no trusted land to hand downstream.
    expect(state.landKey).toBeNull();
  });

  test("a reading with no accuracy at all is not treated as accurate", () => {
    const { decisions } = runSequence([
      // No accuracy at all — rejected before confidence is even considered.
      { landKey: GALAXYS_EDGE, confidence: "high", timestamp: CLOCK, now: CLOCK + 1000 },
    ]);

    expect(decisions[0].action).toBe("reject");
    expect(decisions[0].reason).toBe("inaccurate");
  });

  test("a stale reading cannot overwrite a fresher location", () => {
    // Establish Toy Story Land from a good fix, then deliver an old Galaxy's
    // Edge fix — the shape of a cached sample arriving after the app returns
    // from the background.
    const { state, decisions } = runSequence([
      reading(TOY_STORY_LAND, { accuracy: 10, at: 0, now: 1000 }),
      reading(GALAXYS_EDGE, {
        accuracy: 10,
        at: -(T.MAX_SAMPLE_AGE_MS + 60_000),
        now: 2000,
      }),
    ]);

    expect(decisions[1].action).toBe("reject");
    expect(decisions[1].reason).toBe("stale");
    expect(state.landKey).toBe(TOY_STORY_LAND);
  });

  test("an out-of-order fix cannot replace a newer one already accepted", () => {
    // Not old enough to be stale, but older than the fix behind the current
    // land. It describes the past, so it must not become the present.
    const { state, decisions } = runSequence([
      reading(TOY_STORY_LAND, { accuracy: 10, at: 20_000, now: 20_500 }),
      reading(GALAXYS_EDGE, { accuracy: 10, at: 5_000, now: 21_000 }),
    ]);

    expect(decisions[1].action).toBe("reject");
    expect(decisions[1].reason).toBe("out_of_order");
    expect(state.landKey).toBe(TOY_STORY_LAND);
  });
});

describe("a stable land survives noise but still follows real movement", () => {
  test("one noisy border reading does not flip a stable land", () => {
    // Standing in Galaxy's Edge. A single sample lands in Toy Story Land — the
    // exact reported symptom near Rise of the Resistance.
    const { state, decisions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 0, now: 1000 }),
      reading(GALAXYS_EDGE, { accuracy: 10, at: 4000, now: 5000 }),
      reading(TOY_STORY_LAND, { accuracy: 10, at: 8000, now: 9000 }),
    ]);

    expect(decisions[2].action).toBe("hold");
    expect(decisions[2].landKey).toBe(GALAXYS_EDGE);
    expect(decisions[2].candidateLandKey).toBe(TOY_STORY_LAND);
    expect(state.landKey).toBe(GALAXYS_EDGE);
  });

  test("a noisy sample followed by a return to the real land leaves no trace", () => {
    // The outlier must not leave a half-built case that a later stray sample
    // could complete.
    const { state, actions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 0, now: 1000 }),
      reading(TOY_STORY_LAND, { accuracy: 10, at: 4000, now: 5000 }),
      reading(GALAXYS_EDGE, { accuracy: 10, at: 8000, now: 9000 }),
    ]);

    expect(actions).toEqual(["accept", "hold", "accept"]);
    expect(state.landKey).toBe(GALAXYS_EDGE);
    expect(state.pendingLandKey).toBeNull();
    expect(state.pendingCount).toBe(0);
  });

  test("repeated accurate readings showing real movement transition promptly", () => {
    // Walking Galaxy's Edge -> Toy Story Land. The change lands on the second
    // agreeing reading, seconds later, not after a long settling period.
    const { state, actions, decisions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 0, now: 1000 }),
      reading(TOY_STORY_LAND, { accuracy: 10, at: 4000, now: 5000 }),
      reading(TOY_STORY_LAND, { accuracy: 10, at: 8000, now: 9000 }),
    ]);

    expect(actions).toEqual(["accept", "hold", "accept"]);
    expect(decisions[2].reason).toBe("land_changed");
    expect(state.landKey).toBe(TOY_STORY_LAND);
  });

  test("confirmation is exactly the documented number of readings", () => {
    // Pins the cost of a genuine transition, so the delay cannot creep upward
    // without this failing.
    expect(T.LAND_CHANGE_CONFIRMATIONS).toBe(2);

    const { actions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 0, now: 0 }),
      ...Array.from({ length: T.LAND_CHANGE_CONFIRMATIONS }, (_, i) =>
        reading(TOY_STORY_LAND, { accuracy: 10, at: (i + 1) * 4000, now: (i + 1) * 4000 })
      ),
    ]);

    expect(actions[actions.length - 1]).toBe("accept");
    expect(actions.filter((a) => a === "hold")).toHaveLength(
      T.LAND_CHANGE_CONFIRMATIONS - 1
    );
  });

  test("a part-built case for another land expires rather than lingering", () => {
    // One stray reading in the morning must not combine with an unrelated stray
    // reading much later to move the guest.
    const { state, decisions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 0, now: 0 }),
      reading(TOY_STORY_LAND, { accuracy: 10, at: 4000, now: 4000 }),
      reading(TOY_STORY_LAND, {
        accuracy: 10,
        at: T.PENDING_LAND_WINDOW_MS + 60_000,
        now: T.PENDING_LAND_WINDOW_MS + 60_000,
      }),
    ]);

    expect(decisions[2].action).toBe("hold");
    expect(state.landKey).toBe(GALAXYS_EDGE);
  });

  test("accurate readings within the current land keep refreshing normally", () => {
    // No hysteresis penalty for staying put: same-land readings are accepted
    // every time, so nearest-anchor and distance stay live while walking around
    // inside one land.
    const { state, actions, decisions } = runSequence([
      reading(TOY_STORY_LAND, { accuracy: 10, at: 0, now: 0 }),
      reading(TOY_STORY_LAND, { accuracy: 12, at: 4000, now: 4000 }),
      reading(TOY_STORY_LAND, { accuracy: 9, at: 8000, now: 8000 }),
      reading(TOY_STORY_LAND, { accuracy: 15, at: 12000, now: 12000 }),
    ]);

    expect(actions).toEqual(["accept", "accept", "accept", "accept"]);
    expect(decisions[3].reason).toBe("same_land");
    expect(state.acceptedSampleAt).toBe(CLOCK + 12000);
  });

  test("an imprecise sample cannot even begin a case for a different land", () => {
    // Weak GPS preserves the previously trusted location; it does not get to
    // accumulate evidence toward moving the guest.
    const { state, decisions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 0, now: 0 }),
      reading(TOY_STORY_LAND, { accuracy: T.MAX_ACCURACY_METERS + 40, at: 4000, now: 4000 }),
      reading(TOY_STORY_LAND, { accuracy: T.MAX_ACCURACY_METERS + 40, at: 8000, now: 8000 }),
    ]);

    expect(decisions.map((d) => d.action)).toEqual(["accept", "reject", "reject"]);
    expect(state.landKey).toBe(GALAXYS_EDGE);
    expect(state.pendingCount).toBe(0);
  });
});

describe("the reported Hollywood confusions, end to end", () => {
  // A displaced fix is a real position the device reported; the detector will
  // honestly resolve it to whichever land it fell in. The stabilizer is what
  // stops that single answer from becoming the guest's location.
  function walkThroughDetector(points, accuracy) {
    return points.map((point, index) => {
      const zone = detect(point, accuracy);
      return {
        landKey: zone.landKey,
        // The detector's real verdict for these real coordinates, not an
        // assumed one — so the sequence exercises the same inputs App passes.
        confidence: zone.confidence,
        accuracyMeters: accuracy,
        timestamp: CLOCK + index * 4000,
        now: CLOCK + index * 4000,
      };
    });
  }

  test("standing at Rise, one displaced sample does not become Toy Story Land", () => {
    // Reproduces the report directly: a fix ~180 m east of Rise resolves to Toy
    // Story Land on geometry alone. Confirm that first, so the test is pinning a
    // real hazard rather than an imagined one.
    const displaced = { lat: RISE.lat, lng: RISE.lng + M_LNG(180) };
    expect(detect(displaced, 10).landKey).toBe(TOY_STORY_LAND);

    const { state, actions } = runSequence(
      walkThroughDetector([RISE, RISE, displaced, RISE], 10)
    );

    expect(actions).toEqual(["accept", "accept", "hold", "accept"]);
    expect(state.landKey).toBe(GALAXYS_EDGE);
  });

  test("standing in Toy Story Land, one displaced sample does not change land", () => {
    // ~80 m north of Toy Story Mania resolves to a neighbouring land, and does
    // so at high geometric confidence — the shape of the reported Toy Story Land
    // switch.
    const displaced = {
      lat: TOY_STORY_MANIA.lat + M_LAT(80),
      lng: TOY_STORY_MANIA.lng,
    };
    const strayZone = detect(displaced, 10);
    expect(strayZone.landKey).not.toBe(TOY_STORY_LAND);

    const { state, actions } = runSequence(
      walkThroughDetector(
        [TOY_STORY_MANIA, TOY_STORY_MANIA, displaced, TOY_STORY_MANIA],
        10
      )
    );

    expect(actions).toEqual(["accept", "accept", "hold", "accept"]);
    expect(state.landKey).toBe(TOY_STORY_LAND);
  });

  test("genuinely walking Galaxy's Edge to Toy Story Land still transitions", () => {
    // Two real Toy Story Land readings after leaving Smugglers Run. The guard
    // must not become stickiness that trails a walking family.
    const { state, actions } = runSequence(
      walkThroughDetector(
        [SMUGGLERS_RUN, SMUGGLERS_RUN, TSL_CENTRE, TSL_CENTRE],
        10
      )
    );

    expect(actions).toEqual(["accept", "accept", "hold", "accept"]);
    expect(state.landKey).toBe(TOY_STORY_LAND);
  });
});

describe("an accepted fix expires rather than lasting forever", () => {
  // The shape App stores after accepting a reading. fixedAtMs is the fix time,
  // deliberately separate from updatedAt, which is only when it was stored.
  function gpsContext({ landKey = GALAXYS_EDGE, fixedAt = 0, confidence = "high" } = {}) {
    return {
      source: "gps_watch",
      parkId: "hollywood",
      landKey,
      landLabel: "Galaxy's Edge",
      nearestAnchorName: "Star Wars: Rise of the Resistance",
      distanceMeters: 12,
      confidence,
      fixedAtMs: CLOCK + fixedAt,
      updatedAt: new Date(CLOCK + fixedAt).toISOString(),
    };
  }

  test("freshness is measured against the fix, not against when it was stored", () => {
    // A context built from a cached sample is already partly spent on arrival.
    const context = gpsContext({ fixedAt: 0 });

    expect(isGpsContextFresh(context, CLOCK + 1000)).toBe(true);
    expect(isGpsContextFresh(context, CLOCK + T.CONTEXT_TTL_MS - 1000)).toBe(true);
    expect(isGpsContextFresh(context, CLOCK + T.CONTEXT_TTL_MS + 1000)).toBe(false);

    // A fix stamped in the future is a clock problem, not a fresh reading.
    expect(isGpsContextFresh(gpsContext({ fixedAt: 60_000 }), CLOCK)).toBe(false);
    expect(isGpsContextFresh(null, CLOCK)).toBe(false);
    expect(isGpsContextFresh({ landKey: GALAXYS_EDGE }, CLOCK)).toBe(false);
  });

  test("an accepted GPS location stops driving proximity once it ages out", () => {
    const context = gpsContext({ fixedAt: 0 });

    const fresh = resolveLocationTrust({
      gpsContext: context,
      activeParkId: "hollywood",
      manualLandKey: null,
      now: CLOCK + 30_000,
    });
    expect(fresh.source).toBe("gps");
    expect(fresh.landKey).toBe(GALAXYS_EDGE);

    const expired = resolveLocationTrust({
      gpsContext: context,
      activeParkId: "hollywood",
      manualLandKey: null,
      now: CLOCK + T.CONTEXT_TTL_MS + 1000,
    });
    expect(expired.source).toBe("none");
    expect(expired.landKey).toBeNull();
    expect(expired.gpsContext).toBeNull();
  });

  test("an expired GPS land does not reappear as a manual selection", () => {
    // The reported failure: backgrounded in Galaxy's Edge, guest walks away,
    // the old land lingers — and because currentLand was written by GPS it
    // would previously fall through labelled manual_land. The guest never chose
    // it, so nothing may present it as their choice.
    const expired = resolveLocationTrust({
      gpsContext: gpsContext({ fixedAt: 0 }),
      activeParkId: "hollywood",
      // App passes manualLandKey only when the guest genuinely chose it. A
      // GPS-written currentLand is not offered here at all.
      manualLandKey: null,
      now: CLOCK + T.CONTEXT_TTL_MS + 60_000,
    });

    expect(expired.source).toBe("none");
    expect(expired.source).not.toBe("manual");
    expect(expired.landKey).toBeNull();
  });

  test("a stale cached reading after backgrounding leaves nothing trusted", () => {
    // Both halves together: the incoming cached fix is rejected by the reducer,
    // AND the previously accepted context has aged out, so there is no trusted
    // land left standing.
    const established = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 0, now: 0 }),
    ]);
    expect(established.state.landKey).toBe(GALAXYS_EDGE);

    const backgroundedFor = T.CONTEXT_TTL_MS + 120_000;

    // The cached fix the browser hands over on resume is old.
    const resumed = reduceLocationReading(
      established.state,
      {
        landKey: GALAXYS_EDGE,
        confidence: "high",
        accuracyMeters: 10,
        timestamp: CLOCK, // same old fix
      },
      CLOCK + backgroundedFor
    );
    expect(resumed.decision.action).toBe("reject");

    // ...and the context it produced earlier no longer counts either.
    const trust = resolveLocationTrust({
      gpsContext: gpsContext({ fixedAt: 0 }),
      activeParkId: "hollywood",
      manualLandKey: null,
      now: CLOCK + backgroundedFor,
    });
    expect(trust.source).toBe("none");
  });

  test("a genuine manual selection has no expiry at all", () => {
    // Manual selections are a standing instruction, not a measurement. They
    // outrank nothing-at-all forever, and are only replaced by the guest.
    [0, T.CONTEXT_TTL_MS * 10, T.CONTEXT_TTL_MS * 1000].forEach((elapsed) => {
      const trust = resolveLocationTrust({
        gpsContext: null,
        activeParkId: "hollywood",
        manualLandKey: TOY_STORY_LAND,
        now: CLOCK + elapsed,
      });

      expect(trust.source).toBe("manual");
      expect(trust.landKey).toBe(TOY_STORY_LAND);
    });
  });

  test("a fresh confident fix outranks a standing manual selection", () => {
    const trust = resolveLocationTrust({
      gpsContext: gpsContext({ landKey: GALAXYS_EDGE, fixedAt: 0 }),
      activeParkId: "hollywood",
      manualLandKey: TOY_STORY_LAND,
      now: CLOCK + 10_000,
    });

    expect(trust.source).toBe("gps");
    expect(trust.landKey).toBe(GALAXYS_EDGE);
  });

  test("when the fix expires, the manual selection underneath it returns", () => {
    const trust = resolveLocationTrust({
      gpsContext: gpsContext({ landKey: GALAXYS_EDGE, fixedAt: 0 }),
      activeParkId: "hollywood",
      manualLandKey: TOY_STORY_LAND,
      now: CLOCK + T.CONTEXT_TTL_MS + 1000,
    });

    expect(trust.source).toBe("manual");
    expect(trust.landKey).toBe(TOY_STORY_LAND);
  });

  test("a low-confidence or wrong-park context never speaks for the guest", () => {
    const lowConfidence = resolveLocationTrust({
      gpsContext: gpsContext({ confidence: "low", fixedAt: 0 }),
      activeParkId: "hollywood",
      manualLandKey: null,
      now: CLOCK + 1000,
    });
    expect(lowConfidence.source).toBe("none");

    const otherPark = resolveLocationTrust({
      gpsContext: gpsContext({ fixedAt: 0 }),
      activeParkId: "magic_kingdom",
      manualLandKey: null,
      now: CLOCK + 1000,
    });
    expect(otherPark.source).toBe("none");
  });
});

describe("accuracy tiers behave as documented", () => {
  test("a high-quality initial reading establishes on its own", () => {
    const { state, decisions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: T.TRUSTED_ACCURACY_METERS, at: 0, now: 0 }),
    ]);

    expect(decisions[0].action).toBe("accept");
    expect(decisions[0].reason).toBe("established");
    expect(state.landKey).toBe(GALAXYS_EDGE);
  });

  test("an intermediate initial reading establishes immediately", () => {
    // Usable but imprecise. It used to be held for confirmation, which is what
    // broke "Use My Location": that control takes exactly ONE reading, and
    // ordinary in-park accuracy sits in this band, so the tap did nothing.
    //
    // With no established land there is nothing for confirmation to protect —
    // holding buys no safety and costs the guest all location.
    const intermediate = T.TRUSTED_ACCURACY_METERS + 20;
    expect(intermediate).toBeLessThan(T.MAX_ACCURACY_METERS);

    const { state, decisions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: intermediate, at: 0, now: 0 }),
    ]);

    expect(decisions[0].action).toBe("accept");
    // The reason still records how firm the fix was.
    expect(decisions[0].reason).toBe("established_intermediate");
    expect(state.landKey).toBe(GALAXYS_EDGE);
  });

  test("a first intermediate reading at a border establishes and a change still waits", () => {
    // The worst version of the regression: at a land border the proposed land
    // alternates, so the pending counter reset on every sample and location
    // could never establish at all.
    const intermediate = T.TRUSTED_ACCURACY_METERS + 20;

    const { state, actions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: intermediate, at: 0, now: 0 }),
      reading(TOY_STORY_LAND, { accuracy: intermediate, at: 4000, now: 4000 }),
    ]);

    // Established on the first reading, and the disagreeing second one is a
    // CHANGE — which still needs confirmation, exactly as designed.
    expect(actions).toEqual(["accept", "hold"]);
    expect(state.landKey).toBe(GALAXYS_EDGE);
  });

  test("an intermediate reading still refreshes an already-established land", () => {
    // Confirmation is only for establishing or changing. Agreeing with what is
    // already known needs no ceremony, so distance keeps updating in a covered
    // queue where accuracy naturally degrades.
    const { state, decisions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 0, now: 0 }),
      reading(GALAXYS_EDGE, { accuracy: T.MAX_ACCURACY_METERS, at: 4000, now: 4000 }),
    ]);

    expect(decisions[1].action).toBe("accept");
    expect(decisions[1].reason).toBe("same_land");
    expect(state.acceptedSampleAt).toBe(CLOCK + 4000);
  });

  test("the accuracy constants have exactly one home", () => {
    // Both modules must read the same numbers. Two copies of 40/90 would drift.
    const detectionSource = fs.readFileSync(
      path.join(__dirname, "..", "utils", "locationDetection.js"),
      "utf8"
    );

    expect(detectionSource).toContain("LOCATION_STABILITY_THRESHOLDS");
    // No re-declared literals in the detector.
    expect(detectionSource).not.toMatch(/const\s+\w*ACCURACY\w*\s*=\s*\d+/);
  });
});

describe("stabilization history is cleared when it stops being relevant", () => {
  test("a cleared history lets the next trusted reading establish promptly", () => {
    // What resetting buys: a first-class establishment instead of a land change
    // weighed against whatever was believed before.
    const carried = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 0, now: 0 }),
    ]).state;

    // Without a reset, arriving in a different land is a CHANGE and waits for
    // confirmation...
    const withoutReset = reduceLocationReading(
      carried,
      { landKey: TOY_STORY_LAND, confidence: "high", accuracyMeters: 10, timestamp: CLOCK + 4000 },
      CLOCK + 4000
    );
    expect(withoutReset.decision.action).toBe("hold");

    // ...with a reset it establishes immediately.
    const withReset = reduceLocationReading(
      createLocationStabilityState(),
      { landKey: TOY_STORY_LAND, confidence: "high", accuracyMeters: 10, timestamp: CLOCK + 4000 },
      CLOCK + 4000
    );
    expect(withReset.decision.action).toBe("accept");
    expect(withReset.decision.reason).toBe("established");
    expect(withReset.state.landKey).toBe(TOY_STORY_LAND);
  });

  test("a cleared history also drops the accepted-sample watermark", () => {
    // Otherwise the old park's fix time would make the new park's first reading
    // look out of order.
    const carried = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 500_000, now: 500_000 }),
    ]).state;
    expect(carried.acceptedSampleAt).toBe(CLOCK + 500_000);

    const fresh = createLocationStabilityState();
    expect(fresh.acceptedSampleAt).toBeNull();
    expect(fresh.landKey).toBeNull();
    expect(fresh.pendingLandKey).toBeNull();
    expect(fresh.pendingCount).toBe(0);
  });

  test("App clears the history at each lifecycle event that invalidates it", () => {
    // A thin wiring check only. The semantics are covered behaviourally above
    // and in the expiry/restore suites below; this exists so the four reset
    // points cannot quietly disappear.
    const appSource = fs.readFileSync(path.join(__dirname, "..", "App.jsx"), "utf8");

    const resets = appSource.match(
      /locationStabilityRef\.current\s*=\s*createLocationStabilityState\(\)/g
    );
    // Manual choice, GPS disabled, park change, and GPS expiry.
    expect(resets).toHaveLength(4);
  });
});

/* -------------------------------------------------------------------------- */
/* The user-facing half of expiry                                             */
/* -------------------------------------------------------------------------- */

describe("expired GPS state is torn down, not just distrusted", () => {
  const PARK = "hollywood";

  function ctx({ fixedAt = 0, parkId = PARK, confidence = "high" } = {}) {
    return {
      parkId,
      landKey: GALAXYS_EDGE,
      landLabel: "Galaxy's Edge",
      nearestAnchorName: "Star Wars: Rise of the Resistance",
      distanceMeters: 12,
      confidence,
      fixedAtMs: CLOCK + fixedAt,
    };
  }

  // Mirrors what App does: the decision context and the visible state are
  // derived from the same inputs, so a test can assert they agree.
  function uiAndDecisionState({ gpsContext, currentLand, currentLandSource, now }) {
    const cleared = shouldClearExpiredGpsLocation({
      gpsContext,
      currentLand,
      currentLandSource,
      activeParkId: PARK,
      now,
    });

    const visible = cleared
      ? { currentLand: null, currentLandSource: null, gpsContext: null }
      : { currentLand, currentLandSource, gpsContext };

    const trust = resolveLocationTrust({
      gpsContext: visible.gpsContext,
      activeParkId: PARK,
      manualLandKey:
        visible.currentLandSource === "manual" ? visible.currentLand : null,
      now,
    });

    return { cleared, visible, trust };
  }

  test("an expired GPS fix empties both the decision context and the visible state", () => {
    const fresh = uiAndDecisionState({
      gpsContext: ctx({ fixedAt: 0 }),
      currentLand: GALAXYS_EDGE,
      currentLandSource: "gps",
      now: CLOCK + 30_000,
    });
    expect(fresh.cleared).toBe(false);
    expect(fresh.trust.source).toBe("gps");
    expect(fresh.visible.currentLand).toBe(GALAXYS_EDGE);

    const expired = uiAndDecisionState({
      gpsContext: ctx({ fixedAt: 0 }),
      currentLand: GALAXYS_EDGE,
      currentLandSource: "gps",
      now: CLOCK + T.CONTEXT_TTL_MS + 1000,
    });

    expect(expired.cleared).toBe(true);
    expect(expired.visible.currentLand).toBeNull();
    expect(expired.visible.gpsContext).toBeNull();
    expect(expired.trust.source).toBe("none");
  });

  test("the area picker does not keep showing an expired GPS land", () => {
    // currentLand is what the picker renders as its selected value.
    const { visible } = uiAndDecisionState({
      gpsContext: ctx({ fixedAt: 0 }),
      currentLand: GALAXYS_EDGE,
      currentLandSource: "gps",
      now: CLOCK + T.CONTEXT_TTL_MS + 60_000,
    });

    expect(visible.currentLand).toBeNull();
  });

  test('"Near <anchor>" cannot be rendered from an expired context', () => {
    // The nearest-anchor name is read straight off detectedLocationContext.
    const { visible } = uiAndDecisionState({
      gpsContext: ctx({ fixedAt: 0 }),
      currentLand: GALAXYS_EDGE,
      currentLandSource: "gps",
      now: CLOCK + T.CONTEXT_TTL_MS + 60_000,
    });

    expect(visible.gpsContext).toBeNull();
    expect(visible.gpsContext?.nearestAnchorName).toBeUndefined();
  });

  test("a genuine manual selection survives GPS expiry untouched", () => {
    const { cleared, visible, trust } = uiAndDecisionState({
      gpsContext: ctx({ fixedAt: 0 }),
      currentLand: TOY_STORY_LAND,
      currentLandSource: "manual",
      now: CLOCK + T.CONTEXT_TTL_MS * 100,
    });

    expect(cleared).toBe(false);
    expect(visible.currentLand).toBe(TOY_STORY_LAND);
    expect(trust.source).toBe("manual");
    expect(trust.landKey).toBe(TOY_STORY_LAND);
  });

  test("a fresh but uncertain reading is not treated as expiry", () => {
    // Expiry is about age. A confident fix moments ago plus an imprecise sample
    // now is not a reason to blank the screen — the last known area still
    // stands for its lifetime.
    const cleared = shouldClearExpiredGpsLocation({
      gpsContext: ctx({ fixedAt: 0, confidence: "low" }),
      currentLand: GALAXYS_EDGE,
      currentLandSource: "gps",
      activeParkId: PARK,
      now: CLOCK + 20_000,
    });

    expect(cleared).toBe(false);
  });

  test("a context belonging to a park the guest has left is torn down", () => {
    const cleared = shouldClearExpiredGpsLocation({
      gpsContext: ctx({ fixedAt: 0, parkId: "magic_kingdom" }),
      currentLand: GALAXYS_EDGE,
      currentLandSource: "gps",
      activeParkId: PARK,
      now: CLOCK + 1000,
    });

    expect(cleared).toBe(true);
  });

  test("with nothing to tear down there is nothing to do", () => {
    expect(
      shouldClearExpiredGpsLocation({
        gpsContext: null,
        currentLand: null,
        currentLandSource: null,
        activeParkId: PARK,
        now: CLOCK,
      })
    ).toBe(false);
  });

  test("after expiry the next trusted fix re-establishes normally", () => {
    // Expiry clears the stabilization history too, so re-establishing is a
    // first-class establishment rather than a land change waiting on
    // confirmation. The watch is never disabled, so this reading does arrive.
    const afterExpiry = createLocationStabilityState();

    const result = reduceLocationReading(
      afterExpiry,
      {
        landKey: TOY_STORY_LAND,
        confidence: "high",
        accuracyMeters: 10,
        timestamp: CLOCK + T.CONTEXT_TTL_MS + 90_000,
      },
      CLOCK + T.CONTEXT_TTL_MS + 90_000
    );

    expect(result.decision.action).toBe("accept");
    expect(result.decision.reason).toBe("established");
    expect(result.state.landKey).toBe(TOY_STORY_LAND);
  });

  test("App leaves automatic GPS enabled when a fix expires", () => {
    // The fix expired; the permission did not. Nothing in the teardown may
    // switch the watch off, or the next good reading would never arrive.
    const appSource = fs.readFileSync(path.join(__dirname, "..", "App.jsx"), "utf8");
    const start = appSource.indexOf("shouldClearExpiredGpsLocation({");
    expect(start).toBeGreaterThan(-1);
    const effectBody = appSource.slice(start, appSource.indexOf("}, [", start));

    expect(effectBody).not.toContain("setLocationAutoEnabled");
  });
});

describe("a low-confidence reading cannot become stored context", () => {
  const PARK = "hollywood";

  // Mirrors App: a reading is only written to state when the reducer accepts
  // it. Rejecting means the previous context — and its original fix time —
  // survives untouched.
  function applyReading(previous, read, now) {
    const result = reduceLocationReading(previous.stability, read, now);

    if (result.decision.action !== "accept") {
      return { ...previous, stability: result.state, lastAction: result.decision };
    }

    return {
      stability: result.state,
      // What App would store: presentation and decision read the same object.
      context: {
        parkId: PARK,
        landKey: read.landKey,
        nearestAnchorName: read.anchorName,
        confidence: read.confidence,
        fixedAtMs: read.timestamp,
      },
      lastAction: result.decision,
    };
  }

  const trusted = (landKey, at, anchorName) => ({
    landKey,
    confidence: "high",
    accuracyMeters: 10,
    timestamp: CLOCK + at,
    anchorName,
  });

  const weak = (landKey, at, anchorName) => ({
    landKey,
    confidence: "low",
    // Deliberately a PRECISE weak reading: the radius is fine, the geometry is
    // not. Accuracy alone would have let this through.
    accuracyMeters: 8,
    timestamp: CLOCK + at,
    anchorName,
  });

  const empty = { stability: createLocationStabilityState(), context: null };

  test("an initial low-confidence reading establishes nothing at all", () => {
    const state = applyReading(empty, weak(GALAXYS_EDGE, 0, "Docking Bay 7"), CLOCK);

    expect(state.lastAction.action).toBe("reject");
    expect(state.lastAction.reason).toBe("low_confidence");
    expect(state.stability.landKey).toBeNull();
    expect(state.context).toBeNull();

    // Nothing visible and nothing for the engine — the two agree on "unknown".
    const trust = resolveLocationTrust({
      gpsContext: state.context,
      activeParkId: PARK,
      manualLandKey: null,
      now: CLOCK,
    });
    expect(trust.source).toBe("none");
  });

  test("a low-confidence reading does not overwrite a trusted context", () => {
    let state = applyReading(empty, trusted(GALAXYS_EDGE, 0, "Rise of the Resistance"), CLOCK);
    expect(state.context.nearestAnchorName).toBe("Rise of the Resistance");

    state = applyReading(state, weak(TOY_STORY_LAND, 4000, "Slinky Dog Dash"), CLOCK + 4000);

    expect(state.lastAction.reason).toBe("low_confidence");
    // The visible anchor is still the trusted one, not the weak sample's.
    expect(state.context.landKey).toBe(GALAXYS_EDGE);
    expect(state.context.nearestAnchorName).toBe("Rise of the Resistance");
    expect(state.context.confidence).toBe("high");
  });

  test("a low-confidence reading refreshes neither timestamp", () => {
    let state = applyReading(empty, trusted(GALAXYS_EDGE, 0, "Rise of the Resistance"), CLOCK);
    const originalFixedAt = state.context.fixedAtMs;
    const originalAccepted = state.stability.acceptedSampleAt;

    state = applyReading(state, weak(GALAXYS_EDGE, 60_000, "Docking Bay 7"), CLOCK + 60_000);

    expect(state.context.fixedAtMs).toBe(originalFixedAt);
    expect(state.stability.acceptedSampleAt).toBe(originalAccepted);
  });

  test("repeated weak readings cannot hold expiry off", () => {
    // The renewal loop: a weak sample every 20 s across the whole lifetime. If
    // any of them refreshed fixedAtMs the context would live forever.
    let state = applyReading(empty, trusted(GALAXYS_EDGE, 0, "Rise of the Resistance"), CLOCK);

    for (let elapsed = 20_000; elapsed <= T.CONTEXT_TTL_MS + 40_000; elapsed += 20_000) {
      state = applyReading(state, weak(GALAXYS_EDGE, elapsed, "Docking Bay 7"), CLOCK + elapsed);
      expect(state.lastAction.reason).toBe("low_confidence");
    }

    const now = CLOCK + T.CONTEXT_TTL_MS + 40_000;

    // The original fix is untouched, so it has genuinely aged out...
    expect(state.context.fixedAtMs).toBe(CLOCK);
    expect(isGpsContextFresh(state.context, now)).toBe(false);

    // ...the engine stops trusting it...
    expect(
      resolveLocationTrust({
        gpsContext: state.context,
        activeParkId: PARK,
        manualLandKey: null,
        now,
      }).source
    ).toBe("none");

    // ...and the teardown clears the visible state too, so nothing is left
    // showing an anchor the engine has abandoned.
    expect(
      shouldClearExpiredGpsLocation({
        gpsContext: state.context,
        currentLand: state.context.landKey,
        currentLandSource: "gps",
        activeParkId: PARK,
        now,
      })
    ).toBe(true);
  });

  test("a trusted context survives weak samples for exactly its original TTL", () => {
    let state = applyReading(empty, trusted(GALAXYS_EDGE, 0, "Rise of the Resistance"), CLOCK);
    state = applyReading(state, weak(GALAXYS_EDGE, 30_000, "Docking Bay 7"), CLOCK + 30_000);

    // Still inside the original lifetime: visible and trusted, unchanged.
    const beforeExpiry = CLOCK + T.CONTEXT_TTL_MS - 1000;
    expect(isGpsContextFresh(state.context, beforeExpiry)).toBe(true);
    expect(
      resolveLocationTrust({
        gpsContext: state.context,
        activeParkId: PARK,
        manualLandKey: null,
        now: beforeExpiry,
      }).source
    ).toBe("gps");

    // One second past it, gone.
    const afterExpiry = CLOCK + T.CONTEXT_TTL_MS + 1000;
    expect(isGpsContextFresh(state.context, afterExpiry)).toBe(false);
  });

  test("a later trusted reading re-establishes location normally", () => {
    let state = applyReading(empty, trusted(GALAXYS_EDGE, 0, "Rise of the Resistance"), CLOCK);
    state = applyReading(state, weak(TOY_STORY_LAND, 20_000, "Slinky Dog Dash"), CLOCK + 20_000);
    expect(state.context.landKey).toBe(GALAXYS_EDGE);

    // A real move, confirmed by two trusted readings, still goes through — the
    // weak samples in between neither helped nor hindered.
    state = applyReading(state, trusted(TOY_STORY_LAND, 40_000, "Toy Story Mania"), CLOCK + 40_000);
    expect(state.lastAction.action).toBe("hold");

    state = applyReading(state, trusted(TOY_STORY_LAND, 44_000, "Toy Story Mania"), CLOCK + 44_000);
    expect(state.lastAction.action).toBe("accept");
    expect(state.context.landKey).toBe(TOY_STORY_LAND);
    expect(state.context.nearestAnchorName).toBe("Toy Story Mania");
  });

  test("after a weak-only gap, the first trusted fix establishes immediately", () => {
    // Nothing was ever established, so there is no land to change from.
    let state = empty;
    [0, 20_000, 40_000].forEach((at) => {
      state = applyReading(state, weak(GALAXYS_EDGE, at, "Docking Bay 7"), CLOCK + at);
    });
    expect(state.context).toBeNull();

    state = applyReading(state, trusted(GALAXYS_EDGE, 60_000, "Rise of the Resistance"), CLOCK + 60_000);

    expect(state.lastAction.action).toBe("accept");
    expect(state.lastAction.reason).toBe("established");
    expect(state.context.landKey).toBe(GALAXYS_EDGE);
  });

  test("medium confidence is trusted; anything unrecognised is not", () => {
    expect(
      applyReading(empty, { ...trusted(GALAXYS_EDGE, 0), confidence: "medium" }, CLOCK)
        .lastAction.action
    ).toBe("accept");

    // Missing, null, or an unknown string are all treated as low.
    [undefined, null, "", "unknown", "HIGH", 1].forEach((confidence) => {
      const result = applyReading(
        empty,
        { ...trusted(GALAXYS_EDGE, 0), confidence },
        CLOCK
      );
      expect(result.lastAction.action).toBe("reject");
      expect(result.lastAction.reason).toBe("low_confidence");
    });
  });

  test("visible anchor details and decision location never disagree", () => {
    // The property this whole issue is about, asserted across a mixed sequence.
    const sequence = [
      trusted(GALAXYS_EDGE, 0, "Rise of the Resistance"),
      weak(TOY_STORY_LAND, 10_000, "Slinky Dog Dash"),
      weak(GALAXYS_EDGE, 20_000, "Docking Bay 7"),
      trusted(GALAXYS_EDGE, 30_000, "Millennium Falcon: Smugglers Run"),
      weak(TOY_STORY_LAND, 40_000, "Toy Story Mania"),
    ];

    let state = empty;

    sequence.forEach((read) => {
      const now = read.timestamp;
      state = applyReading(state, read, now);

      const trust = resolveLocationTrust({
        gpsContext: state.context,
        activeParkId: PARK,
        manualLandKey: null,
        now,
      });

      const cleared = shouldClearExpiredGpsLocation({
        gpsContext: state.context,
        currentLand: state.context?.landKey ?? null,
        currentLandSource: state.context ? "gps" : null,
        activeParkId: PARK,
        now,
      });

      const visibleLand = cleared ? null : state.context?.landKey ?? null;
      const visibleAnchor = cleared ? null : state.context?.nearestAnchorName ?? null;

      // Whatever is on screen is exactly what the engine is reasoning over.
      expect(visibleLand).toBe(trust.landKey);
      if (visibleAnchor) {
        expect(trust.gpsContext?.nearestAnchorName).toBe(visibleAnchor);
      }
    });

    // And the end state reflects the last TRUSTED reading, not the last one.
    expect(state.context.nearestAnchorName).toBe("Millennium Falcon: Smugglers Run");
  });
});

describe("restoring saved park state fails open", () => {
  test("an explicitly manual selection is restored", () => {
    expect(
      resolveRestoredLocationState({
        currentLand: TOY_STORY_LAND,
        currentLandSource: "manual",
      })
    ).toEqual({ currentLand: TOY_STORY_LAND, currentLandSource: "manual" });
  });

  test("a saved GPS land is not restored without a new fix", () => {
    // It has no fresh fix behind it, and restoring it would put a land in the
    // picker that nothing stands behind.
    expect(
      resolveRestoredLocationState({
        currentLand: GALAXYS_EDGE,
        currentLandSource: "gps",
      })
    ).toEqual({ currentLand: null, currentLandSource: null });
  });

  test("source-less legacy state is not assumed to be manual", () => {
    // Older builds saved currentLand with no provenance. Guessing "manual"
    // would turn a long-dead GPS reading into a selection that never expires.
    expect(resolveRestoredLocationState({ currentLand: GALAXYS_EDGE })).toEqual({
      currentLand: null,
      currentLandSource: null,
    });

    expect(
      resolveRestoredLocationState({
        currentLand: GALAXYS_EDGE,
        currentLandSource: null,
      })
    ).toEqual({ currentLand: null, currentLandSource: null });
  });

  test("ignored state leaves nothing selected in the picker", () => {
    // currentLand is the picker's value; null renders as no selection rather
    // than a stale land the guest never chose.
    [
      { currentLand: GALAXYS_EDGE },
      { currentLand: GALAXYS_EDGE, currentLandSource: "gps" },
      { currentLand: GALAXYS_EDGE, currentLandSource: "something_else" },
    ].forEach((saved) => {
      expect(resolveRestoredLocationState(saved).currentLand).toBeNull();
    });
  });

  test("empty, missing and malformed saved state are all handled", () => {
    [undefined, null, {}, { currentLandSource: "manual" }].forEach((saved) => {
      expect(resolveRestoredLocationState(saved)).toEqual({
        currentLand: null,
        currentLandSource: null,
      });
    });
  });
});

describe("privacy", () => {
  test("the stability reducer never receives or returns coordinates", () => {
    const { state, decisions } = runSequence([
      reading(GALAXYS_EDGE, { accuracy: 10, at: 0, now: 0 }),
      reading(TOY_STORY_LAND, { accuracy: 10, at: 4000, now: 4000 }),
    ]);

    const serialised = JSON.stringify({ state, decisions });

    ["lat", "lng", "latitude", "longitude", "coords"].forEach((token) => {
      expect(serialised).not.toContain(token);
    });

    // What it does carry is a land key, a timestamp and counters.
    expect(Object.keys(state).sort()).toEqual([
      "acceptedSampleAt",
      "landKey",
      "pendingCount",
      "pendingFirstAt",
      "pendingLandKey",
    ]);
  });

  test("detector output carries anchors and a radius, never raw coordinates", () => {
    const zone = detect(TOY_STORY_MANIA, 25);
    const serialised = JSON.stringify(zone);

    expect(zone.accuracyMeters).toBe(25);
    ["latitude", "longitude"].forEach((token) => {
      expect(serialised).not.toContain(token);
    });
    // No bare lat/lng fields either — the zone describes anchors, not a point.
    expect(zone.lat).toBeUndefined();
    expect(zone.lng).toBeUndefined();
  });
});
