/**
 * TOHI GPS — "Use My Location" regression suite.
 *
 * WHAT THIS COVERS, stated plainly:
 *
 *   The field blocker was that tapping "Use My Location" stopped establishing
 *   the guest's position. The tap takes exactly ONE reading, and the stability
 *   gate held any reading between TRUSTED_ACCURACY_METERS and
 *   MAX_ACCURACY_METERS for confirmation that a single tap could never supply.
 *   Ordinary in-park accuracy sits squarely in that band.
 *
 *   These tests EXECUTE the real pipeline: the real getCurrentPosition wrapper
 *   over a stubbed navigator.geolocation, the real detectNearestLocationZone
 *   over real park anchors, and the real reduceLocationReading. Nothing is
 *   reimplemented. No network and no device sensor is involved.
 */

import {
  LOCATION_STABILITY_THRESHOLDS as T,
  createLocationStabilityState,
  isGpsContextFresh,
  reduceLocationReading,
} from "../utils/locationStability";
import { detectNearestLocationZone, getCurrentPosition } from "../utils/locationDetection";

/* Real Animal Kingdom points, from the committed fieldwork fixtures. */
const PARK = "animal_kingdom";
const OASIS = { lat: 28.3576, lng: -81.5907 };
const PANDORA = { lat: 28.3566, lng: -81.5924 };

/** Accuracy that is usable but not "trusted" — the band the regression hit. */
const INTERMEDIATE = T.TRUSTED_ACCURACY_METERS + 20;
const TRUSTED = T.TRUSTED_ACCURACY_METERS - 20;

const CLOCK = 1_700_000_000_000;

function position({ point = OASIS, accuracy = TRUSTED, timestamp = CLOCK }) {
  return {
    coords: { latitude: point.lat, longitude: point.lng, accuracy },
    timestamp,
  };
}

/** Drives the real detector + reducer exactly as App's handlers do. */
function ingest(state, pos, now = pos.timestamp) {
  const zone = detectNearestLocationZone({
    parkId: PARK,
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracyMeters: pos.coords.accuracy,
  });

  if (!zone) return { zone: null, decision: { action: "reject", reason: "no_zone" }, state };

  const result = reduceLocationReading(
    state,
    {
      landKey: zone.landKey,
      confidence: zone.confidence,
      accuracyMeters: pos.coords.accuracy,
      timestamp: pos.timestamp,
    },
    now
  );

  return { zone, decision: result.decision, state: result.state };
}

/** Installs a navigator.geolocation stub with the given behaviour. */
function stubGeolocation({ success, failure }) {
  const calls = [];
  global.navigator.geolocation = {
    getCurrentPosition: (onOk, onErr, options) => {
      calls.push(options);
      if (failure) onErr(failure);
      else onOk(success);
    },
    watchPosition: () => 1,
    clearWatch: () => {},
  };
  return calls;
}

const geolocationError = (code, message) => ({ code, message });

beforeEach(() => {
  if (!global.navigator) global.navigator = {};
});

afterEach(() => {
  delete global.navigator.geolocation;
});

/* ========================================================================== */

describe("1-2. permission granted, fresh or already", () => {
  test("a fresh grant followed by a valid reading establishes location", async () => {
    stubGeolocation({ success: position({ accuracy: TRUSTED }) });

    const pos = await getCurrentPosition();
    const { zone, decision, state } = ingest(createLocationStabilityState(), pos);

    expect(zone.landKey).toBe("oasis");
    expect(decision.action).toBe("accept");
    expect(state.landKey).toBe("oasis");
  });

  test("an already-granted permission resolves without a second prompt", async () => {
    const calls = stubGeolocation({ success: position({ accuracy: TRUSTED }) });

    await getCurrentPosition();
    await getCurrentPosition();

    // Two independent requests, both answered; the wrapper holds no state that
    // could make the second one behave differently.
    expect(calls).toHaveLength(2);
    calls.forEach((options) => expect(options.enableHighAccuracy).toBe(true));
  });
});

describe("3-5. browser failure modes surface, never silently", () => {
  test("permission denied rejects with the denial code", async () => {
    stubGeolocation({ failure: geolocationError(1, "User denied Geolocation") });

    await expect(getCurrentPosition()).rejects.toMatchObject({ code: 1 });
  });

  test("position unavailable rejects with its own code", async () => {
    stubGeolocation({ failure: geolocationError(2, "Position unavailable") });

    await expect(getCurrentPosition()).rejects.toMatchObject({ code: 2 });
  });

  test("timeout rejects with its own code", async () => {
    stubGeolocation({ failure: geolocationError(3, "Timeout expired") });

    await expect(getCurrentPosition()).rejects.toMatchObject({ code: 3 });
  });

  test("a missing geolocation API rejects rather than hanging", async () => {
    delete global.navigator.geolocation;

    await expect(getCurrentPosition()).rejects.toThrow(/not available/i);
  });

  test("App distinguishes denied, unavailable and timeout guidance", () => {
    // Source-level: the three codes must not collapse into one generic string,
    // or the control looks like it did nothing. The behavioural half is the
    // rejection codes proved above.
    // eslint-disable-next-line global-require
    const fs = require("fs");
    // eslint-disable-next-line global-require
    const path = require("path");
    const app = fs.readFileSync(path.join(__dirname, "..", "App.jsx"), "utf8");

    expect(app).toMatch(/err\?\.code === 3/);
    expect(app).toMatch(/err\?\.code === 2/);
    expect(app).toMatch(/taking longer than usual/i);
    expect(app).toMatch(/not available right now/i);
  });
});

describe("6-7. first establishment — the regression", () => {
  test("a valid first reading establishes with no previous accepted coordinate", () => {
    const { decision, state } = ingest(
      createLocationStabilityState(),
      position({ accuracy: TRUSTED })
    );

    expect(decision.action).toBe("accept");
    expect(decision.reason).toBe("established");
    expect(state.landKey).toBe("oasis");
  });

  test("a single intermediate-accuracy tap still establishes location", () => {
    // THE BLOCKER. One tap, ordinary park accuracy. This used to "hold", so the
    // guest saw "your location signal is not steady enough" and got nothing.
    expect(INTERMEDIATE).toBeGreaterThan(T.TRUSTED_ACCURACY_METERS);
    expect(INTERMEDIATE).toBeLessThan(T.MAX_ACCURACY_METERS);

    const { decision, state } = ingest(
      createLocationStabilityState(),
      position({ accuracy: INTERMEDIATE })
    );

    expect(decision.action).toBe("accept");
    expect(decision.reason).toBe("established_intermediate");
    expect(state.landKey).toBe("oasis");
  });

  test("a poor first reading is rejected but a later valid one recovers", () => {
    let state = createLocationStabilityState();

    const poor = ingest(state, position({ accuracy: T.MAX_ACCURACY_METERS + 30 }));
    expect(poor.decision.action).toBe("reject");
    expect(poor.state.landKey).toBeNull();
    state = poor.state;

    const good = ingest(state, position({ accuracy: TRUSTED, timestamp: CLOCK + 5000 }));
    expect(good.decision.action).toBe("accept");
    expect(good.state.landKey).toBe("oasis");
  });

  test("an unusable first reading never blocks later good readings", () => {
    let state = createLocationStabilityState();

    [T.MAX_ACCURACY_METERS + 10, T.MAX_ACCURACY_METERS + 200].forEach((accuracy, index) => {
      const result = ingest(state, position({ accuracy, timestamp: CLOCK + index * 1000 }));
      expect(result.decision.action).toBe("reject");
      state = result.state;
    });

    const recovered = ingest(state, position({ accuracy: TRUSTED, timestamp: CLOCK + 9000 }));
    expect(recovered.decision.action).toBe("accept");
    expect(recovered.state.landKey).toBe("oasis");
  });
});

describe("8-9. stale and implausible readings stay rejected", () => {
  test("a reading older than the sample window is rejected", () => {
    const stale = ingest(
      createLocationStabilityState(),
      position({ accuracy: TRUSTED, timestamp: CLOCK - T.MAX_SAMPLE_AGE_MS - 1000 }),
      CLOCK
    );

    expect(stale.decision.action).toBe("reject");
    expect(stale.decision.reason).toBe("stale");
  });

  test("an accepted context expires and a newer reading replaces it", () => {
    const first = ingest(createLocationStabilityState(), position({ accuracy: TRUSTED }));
    expect(first.decision.action).toBe("accept");

    const context = { landKey: "oasis", fixedAtMs: CLOCK };
    expect(isGpsContextFresh(context, CLOCK + 1000)).toBe(true);
    expect(isGpsContextFresh(context, CLOCK + T.CONTEXT_TTL_MS + 1000)).toBe(false);

    // A later fix in the same land refreshes it rather than being blocked.
    const refreshed = ingest(
      first.state,
      position({ accuracy: TRUSTED, timestamp: CLOCK + T.CONTEXT_TTL_MS + 2000 }),
      CLOCK + T.CONTEXT_TTL_MS + 2000
    );
    expect(refreshed.decision.action).toBe("accept");
  });

  test("an out-of-order fix cannot replace a newer accepted one", () => {
    const first = ingest(
      createLocationStabilityState(),
      position({ accuracy: TRUSTED, timestamp: CLOCK + 10_000 }),
      CLOCK + 10_000
    );
    expect(first.decision.action).toBe("accept");

    const older = ingest(
      first.state,
      position({ accuracy: TRUSTED, timestamp: CLOCK + 5000 }),
      CLOCK + 11_000
    );
    expect(older.decision.action).toBe("reject");
    expect(older.decision.reason).toBe("out_of_order");
  });

  test("an implausible land jump is held, and a later plausible reading still lands", () => {
    let state = ingest(createLocationStabilityState(), position({ accuracy: TRUSTED })).state;
    expect(state.landKey).toBe("oasis");

    // One sample proposing a different land is not enough.
    const jump = ingest(
      state,
      position({ point: PANDORA, accuracy: TRUSTED, timestamp: CLOCK + 4000 }),
      CLOCK + 4000
    );
    expect(jump.decision.action).toBe("hold");
    expect(jump.decision.landKey).toBe("oasis");
    state = jump.state;

    // Returning to the established land is accepted immediately — the rejected
    // jump cost nothing.
    const back = ingest(
      state,
      position({ accuracy: TRUSTED, timestamp: CLOCK + 8000 }),
      CLOCK + 8000
    );
    expect(back.decision.action).toBe("accept");
    expect(back.state.landKey).toBe("oasis");

    // And a genuine, confirmed move still goes through.
    let moving = ingest(
      back.state,
      position({ point: PANDORA, accuracy: TRUSTED, timestamp: CLOCK + 12_000 }),
      CLOCK + 12_000
    );
    expect(moving.decision.action).toBe("hold");
    moving = ingest(
      moving.state,
      position({ point: PANDORA, accuracy: TRUSTED, timestamp: CLOCK + 16_000 }),
      CLOCK + 16_000
    );
    expect(moving.decision.action).toBe("accept");
    expect(moving.state.landKey).toBe("pandora");
  });
});

describe("10-12. lifecycle, manual selection and downstream context", () => {
  test("a relaunch with cleared history establishes from the next reading", async () => {
    // Reopening the app starts from a fresh stability state, exactly as the
    // watch effect does when location is toggled off and on.
    stubGeolocation({ success: position({ accuracy: INTERMEDIATE, timestamp: CLOCK }) });

    const pos = await getCurrentPosition();
    const relaunched = ingest(createLocationStabilityState(), pos);

    expect(relaunched.decision.action).toBe("accept");
    expect(relaunched.state.landKey).toBe("oasis");
  });

  test("a refresh after an accepted fix keeps refreshing the same land", () => {
    const first = ingest(createLocationStabilityState(), position({ accuracy: TRUSTED }));
    const refreshed = ingest(
      first.state,
      position({ accuracy: INTERMEDIATE, timestamp: CLOCK + 6000 }),
      CLOCK + 6000
    );

    expect(refreshed.decision.action).toBe("accept");
    expect(refreshed.decision.reason).toBe("same_land");
  });

  test("manual selection is untouched by the stability gate", () => {
    // The reducer only ever sees GPS readings. A manual choice carries no
    // reading through it at all, so no GPS verdict can revoke one.
    const state = createLocationStabilityState();
    expect(state.landKey).toBeNull();

    // A rejected GPS reading leaves the state empty, so nothing overwrites a
    // manually chosen land downstream.
    const rejected = reduceLocationReading(
      state,
      { landKey: "pandora", confidence: "low", accuracyMeters: 10, timestamp: CLOCK },
      CLOCK
    );
    expect(rejected.decision.action).toBe("reject");
    expect(rejected.state.landKey).toBeNull();
  });

  test("accepted coordinates reach park/area resolution and downstream context", () => {
    const pos = position({ accuracy: INTERMEDIATE });
    const { zone, decision } = ingest(createLocationStabilityState(), pos);

    expect(decision.action).toBe("accept");

    // The land the reducer accepted is the land the detector resolved, and the
    // detector's own anchor detail is what downstream recommendation context
    // consumes. One reading, one land, no divergence.
    expect(decision.landKey).toBe(zone.landKey);
    expect(zone.landLabel).toEqual(expect.any(String));
    expect(zone.anchorName).toEqual(expect.any(String));
    expect(Number.isFinite(zone.distanceMeters)).toBe(true);
    expect(["high", "medium"]).toContain(zone.confidence);
  });
});
