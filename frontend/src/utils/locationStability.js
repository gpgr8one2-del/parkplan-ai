/**
 * ParkPlan AI — In-park location stability
 *
 * Field test, Hollywood Studios: around Toy Story Land and Galaxy's Edge the
 * resolved area was occasionally offset, changed unexpectedly, or lagged while
 * walking. Near Rise of the Resistance TOHI sometimes reported Toy Story Land;
 * inside Toy Story Land it sometimes jumped to a neighbouring land; and while
 * leaving Galaxy's Edge the detected area sometimes stayed put.
 *
 * The land detector answers "which land do these coordinates sit in", using
 * anchor geometry alone. That is the right question, but it is answered as if
 * the coordinates were exact. Three things were missing around it:
 *
 *   - coords.accuracy never reached the detector, so a fix that was 80-180 m
 *     off could still be reported as high confidence purely because it landed
 *     near a different land's anchors,
 *   - position.timestamp was never checked, so a cached or backgrounded fix
 *     could overwrite a newer one,
 *   - nothing remembered the previously trusted land, so a single qualifying
 *     sample replaced it and immediately reshaped recommendation proximity.
 *
 * This module supplies the missing memory. It is deliberately a pure reducer:
 * given the previous state, one reading and a clock, it returns the next state
 * and a decision. No timers, no geolocation, no React, no coordinates.
 *
 * It deliberately does NOT smooth or snap positions. Averaging coordinates
 * would trail a walking guest, and moving a fix toward an anchor would invent
 * a position the device never reported. Accuracy is treated as an uncertainty
 * radius: a reading is either trustworthy enough to act on, or it is not.
 *
 * Coordinates never enter this module. It sees a land key, an accuracy radius
 * and a timestamp, which is all the decision needs.
 */

/**
 * Thresholds are derived from the measured Hollywood Studios anchor geometry,
 * not copied from the park-arrival tracker (which answers a different question
 * at a different scale — whole parks, hundreds of metres apart).
 *
 * Distances measured from the shipped anchors:
 *
 *   Toy Story Mania      -> nearest foreign-land anchor  45 m
 *   Toy Story Land path  -> nearest foreign-land anchor  77 m
 *   Smugglers Run        -> nearest foreign-land anchor 112 m
 *   Rise of the          -> nearest foreign-land anchor 213 m
 *   Echo Lake <-> Galaxy's Edge centroids              161 m
 *   Galaxy's Edge <-> Toy Story Land centroids         304 m
 *
 * TRUSTED_ACCURACY_METERS = 40 sits below the tightest genuine separation
 * (45 m at Toy Story Mania), so a reading within it cannot have wandered into
 * a neighbouring land's basin at one sigma.
 *
 * MAX_ACCURACY_METERS = 90 sits just above the 77 m Toy Story Land separation
 * and below the 112 m Smugglers Run margin. Past this radius the reading simply
 * cannot distinguish the lands it sits between, so it is not evidence about
 * which land the guest is in.
 */
export const LOCATION_STABILITY_THRESHOLDS = {
  // Beyond this uncertainty radius a reading cannot resolve neighbouring lands,
  // so it is not evidence about which land the guest is in.
  MAX_ACCURACY_METERS: 90,
  // Within this radius a reading is precise enough to be called a trusted fix.
  // Between the two an "intermediate" reading is usable but less certain.
  //
  // What that distinction does NOT mean: an intermediate reading may establish
  // the INITIAL location on its own when no trusted land exists yet, because
  // there is nothing for confirmation to protect and holding would leave the
  // guest with no location at all.
  //
  // Confirmation is required when a reading — intermediate or trusted —
  // proposes CHANGING an already-established land. See reduceLocationReading.
  TRUSTED_ACCURACY_METERS: 40,
  // Fixes older than this are treated as history, not as "where you are now".
  // Chosen well above the watch's own maximumAge (5 s) so ordinary readings are
  // never rejected, and below the point where a guest could have walked between
  // lands unnoticed.
  MAX_SAMPLE_AGE_MS: 45 * 1000,
  // Qualifying readings that must agree before the established land changes.
  // Two is the smallest number that cannot be satisfied by a single outlier;
  // the watch fires every few seconds, so a real walk still transitions quickly.
  LAND_CHANGE_CONFIRMATIONS: 2,
  // A part-built case for a new land goes stale rather than lingering all day.
  PENDING_LAND_WINDOW_MS: 90 * 1000,
  /**
   * How long an ACCEPTED fix keeps describing where the guest is.
   *
   * Rejecting bad incoming readings is only half of the lifecycle. If the app
   * is backgrounded — which stops the watch delivering entirely — the last
   * accepted fix would otherwise stay authoritative indefinitely, and the guest
   * could walk to another land while TOHI still recommended around the old one.
   * That is the "stuck in Galaxy's Edge" half of the field report.
   *
   * Derived from walking time between the lands this has to separate. The
   * closest genuinely distinct pair in Hollywood Studios is Echo Lake and
   * Galaxy's Edge at ~161 m between centroids; unhurried park walking is around
   * 1.3 m/s, so ~124 s is enough to be somewhere else entirely. Three minutes
   * sits just past that: long enough to ride out a covered queue or a brief
   * signal gap without churn, short enough that a fix can never outlive the
   * walk that would invalidate it.
   */
  CONTEXT_TTL_MS: 3 * 60 * 1000,
};

/**
 * Is an accepted GPS context still describing the present?
 *
 * Measured against the FIX time, not the moment the app happened to store it —
 * a context built from a cached sample is already partly spent when it arrives.
 */
export function isGpsContextFresh(context, now = Date.now()) {
  if (!context) return false;

  const fixedAt = Number(context.fixedAtMs);
  if (!Number.isFinite(fixedAt)) return false;

  const age = now - fixedAt;

  // A fix from the future is a clock problem, not a fresh reading.
  if (age < 0) return false;

  return age <= LOCATION_STABILITY_THRESHOLDS.CONTEXT_TTL_MS;
}

/**
 * Should the GPS-owned location state be torn down?
 *
 * resolveLocationTrust below stops an expired fix reaching the recommendation
 * engine, but that alone leaves the interface disagreeing with the engine: the
 * area picker still shows the old land and the card still reads "Near <old
 * attraction>", because those render from the raw state rather than from the
 * resolved decision context. What the guest sees and what TOHI reasons over
 * have to be the same thing.
 *
 * Scoped deliberately to EXPIRY — a fix that has aged out, is missing, or
 * belongs to a park the guest has left. A fresh-but-uncertain reading is not
 * expiry: the land came from a confident fix moments ago and the current sample
 * is merely imprecise, so the last known area still stands for its lifetime
 * rather than blinking out on one weak sample.
 *
 * Never true for a manual selection. The guest chose that, and nothing about a
 * GPS timer makes their choice less valid.
 */
export function shouldClearExpiredGpsLocation({
  gpsContext,
  currentLand,
  currentLandSource,
  activeParkId,
  now = Date.now(),
} = {}) {
  // Only GPS-owned state is on a timer.
  if (currentLandSource !== "gps") return false;

  // Nothing to tear down.
  if (!currentLand && !gpsContext) return false;

  const stillCurrent =
    Boolean(gpsContext) &&
    gpsContext.parkId === activeParkId &&
    isGpsContextFresh(gpsContext, now);

  return !stillCurrent;
}

/**
 * What to restore from previously saved park state.
 *
 * Older builds persisted currentLand with no record of who chose it, so a saved
 * land may have come from GPS or from the guest. Assuming "manual" would turn a
 * long-dead GPS reading into a permanent selection that never expires — exactly
 * the confident-stale-location failure this work exists to remove.
 *
 * So it fails open: a saved land is restored only when it was explicitly
 * recorded as a manual choice. GPS-owned and source-less state is dropped,
 * because neither has a fresh fix behind it and neither is known to be a
 * decision the guest made. Asking someone to pick their area once is a smaller
 * cost than telling them they are somewhere they are not.
 */
export function resolveRestoredLocationState(saved = {}) {
  const savedLand = saved?.currentLand || null;
  const savedSource = saved?.currentLandSource || null;

  if (savedLand && savedSource === "manual") {
    return { currentLand: savedLand, currentLandSource: "manual" };
  }

  return { currentLand: null, currentLandSource: null };
}

/**
 * Decide which location source may speak for the guest right now.
 *
 * Pure so the whole lifecycle can be tested without rendering the app.
 *
 * The trust order is fixed: a fresh, confident GPS fix for the active park
 * outranks a standing manual selection, and a manual selection outranks
 * nothing at all. What it must never do is let an EXPIRED GPS-derived land
 * present itself as a manual choice — the guest never picked it, and treating
 * it as a deliberate selection would hide the fact that TOHI no longer knows
 * where they are.
 *
 * manualLandKey must be supplied only when the guest genuinely chose it.
 */
export function resolveLocationTrust({
  gpsContext,
  activeParkId,
  manualLandKey,
  now = Date.now(),
} = {}) {
  const gpsUsable =
    Boolean(gpsContext) &&
    Boolean(gpsContext.landKey) &&
    gpsContext.parkId === activeParkId &&
    gpsContext.confidence !== "low" &&
    isGpsContextFresh(gpsContext, now);

  if (gpsUsable) {
    return { source: "gps", landKey: gpsContext.landKey, gpsContext };
  }

  if (manualLandKey) {
    return { source: "manual", landKey: manualLandKey, gpsContext: null };
  }

  // Deliberately not falling back to a GPS-written land. Without a fresh fix
  // behind it there is nothing to stand behind that land, and the honest state
  // is "ask, or let the guest pick" rather than a confident wrong answer.
  return { source: "none", landKey: null, gpsContext: null };
}

export function createLocationStabilityState() {
  return {
    landKey: null,
    // Timestamp of the fix behind the established land, so an out-of-order
    // sample can be recognised as older rather than newer.
    acceptedSampleAt: null,
    pendingLandKey: null,
    pendingCount: 0,
    pendingFirstAt: null,
  };
}

function reject(state, reason) {
  return { state, decision: { action: "reject", reason, landKey: state.landKey } };
}

/**
 * Decide what one reading should be allowed to do.
 *
 * reading: { landKey, confidence, accuracyMeters, timestamp }
 *   confidence     — the detector's verdict on whether the anchor geometry
 *                    actually supports this land. Distinct from accuracy: a
 *                    tight 10 m fix sitting far from every anchor is precise
 *                    but not persuasive, and only the detector can say so.
 *   accuracyMeters — coords.accuracy, an uncertainty radius in metres
 *   timestamp      — position.timestamp, when the FIX was taken, not when it
 *                    was handled
 *
 * Returns { state, decision } where decision.action is:
 *   "accept" — trust this reading; it establishes or refreshes the land
 *   "hold"   — plausible but unconfirmed; keep the previously trusted land
 *   "reject" — unusable; keep the previously trusted land
 *
 * A caller that sees anything other than "accept" should leave its trusted
 * location untouched rather than overwrite it, which is what keeps weak GPS
 * from replacing a good fix or a manual selection.
 */
export function reduceLocationReading(state, reading, now = Date.now()) {
  const current = state || createLocationStabilityState();

  if (!reading || !reading.landKey) {
    return reject(current, "no_zone");
  }

  const accuracy = Number(reading.accuracyMeters);
  const timestamp = Number(reading.timestamp);

  // An unknown accuracy is not an accurate reading. Browsers always populate
  // coords.accuracy, so a missing value means something synthetic is upstream
  // and it should not be allowed to move a family to a different land.
  if (
    !Number.isFinite(accuracy) ||
    accuracy > LOCATION_STABILITY_THRESHOLDS.MAX_ACCURACY_METERS
  ) {
    return reject(current, "inaccurate");
  }

  // Precision and persuasiveness are different things. A tight fix can still
  // sit far from every anchor, or between two lands, and the detector reports
  // that as low confidence. Such a reading must not merely be distrusted for
  // decisions — it must not land at all, or it would overwrite the stored
  // context, refresh its timestamps and keep renewing the lifetime of a
  // location TOHI has already decided it cannot stand behind. That is how the
  // visible "Near <anchor>" line drifts away from what the engine believes.
  //
  // Rejecting leaves the last genuinely trusted context in place, still ageing
  // against its own original fix time — so a weak sample costs nothing and
  // cannot buy anything either.
  //
  // A missing or unrecognised confidence is treated as low. The detector always
  // supplies one; anything else is a caller we have no reason to trust.
  if (reading.confidence !== "high" && reading.confidence !== "medium") {
    return reject(current, "low_confidence");
  }

  if (!Number.isFinite(timestamp)) {
    return reject(current, "no_timestamp");
  }

  if (now - timestamp > LOCATION_STABILITY_THRESHOLDS.MAX_SAMPLE_AGE_MS) {
    return reject(current, "stale");
  }

  // A fix taken no later than the one already accepted tells us nothing new,
  // and must never replace it. This is what a cached fix delivered after the
  // app returns from the background looks like.
  if (
    Number.isFinite(current.acceptedSampleAt) &&
    timestamp <= current.acceptedSampleAt
  ) {
    return reject(current, "out_of_order");
  }

  const sameLand = current.landKey === reading.landKey;
  const isTrustedAccuracy =
    accuracy <= LOCATION_STABILITY_THRESHOLDS.TRUSTED_ACCURACY_METERS;

  // A reading that agrees with the established land is always accepted, at any
  // usable accuracy. There is no land change to guard against, and this is what
  // keeps nearest-anchor and distance refreshing while walking around inside
  // one land.
  if (current.landKey && sameLand) {
    return {
      state: {
        ...current,
        acceptedSampleAt: timestamp,
        pendingLandKey: null,
        pendingCount: 0,
        pendingFirstAt: null,
      },
      decision: { action: "accept", reason: "same_land", landKey: reading.landKey },
    };
  }

  // Establishing the first land, with nothing to fall back to.
  //
  // Any reading that has reached this point is already usable: it is inside
  // MAX_ACCURACY_METERS, the detector backs it with high or medium confidence,
  // it is fresh, and it is not out of order. With no established land there is
  // nothing for confirmation to protect — so requiring a second reading here
  // does not guard a good fix, it simply leaves the guest with NO location.
  //
  // That was the regression: "Use My Location" takes exactly one reading, and
  // ordinary in-park accuracy is frequently between TRUSTED_ACCURACY_METERS and
  // MAX_ACCURACY_METERS. Every such tap held, so the tap appeared to do nothing.
  // Worse, at a land border the proposed land alternates, so pendingCount reset
  // to 1 on every sample and location could never establish at all.
  //
  // Confirmation still governs land CHANGES below, which is the case it was
  // written for: there, holding preserves something the guest can still use.
  // The reason distinguishes the two qualities so a caller can tell how firm
  // the first fix was.
  if (!current.landKey) {
    return {
      state: {
        ...current,
        landKey: reading.landKey,
        acceptedSampleAt: timestamp,
        pendingLandKey: null,
        pendingCount: 0,
        pendingFirstAt: null,
      },
      decision: {
        action: "accept",
        reason: isTrustedAccuracy ? "established" : "established_intermediate",
        landKey: reading.landKey,
      },
    };
  }

  // A different land. One reading is not enough — this is the flip the field
  // test hit, where a single displaced sample moved the guest to a neighbouring
  // land and immediately reshaped recommendation proximity.
  const continuingPending =
    current.pendingLandKey === reading.landKey &&
    Number.isFinite(current.pendingFirstAt) &&
    now - current.pendingFirstAt <= LOCATION_STABILITY_THRESHOLDS.PENDING_LAND_WINDOW_MS;

  const pendingCount = continuingPending ? current.pendingCount + 1 : 1;
  const pendingFirstAt = continuingPending ? current.pendingFirstAt : now;

  if (pendingCount >= LOCATION_STABILITY_THRESHOLDS.LAND_CHANGE_CONFIRMATIONS) {
    return {
      state: {
        ...current,
        landKey: reading.landKey,
        acceptedSampleAt: timestamp,
        pendingLandKey: null,
        pendingCount: 0,
        pendingFirstAt: null,
      },
      decision: {
        action: "accept",
        reason: current.landKey ? "land_changed" : "established",
        landKey: reading.landKey,
      },
    };
  }

  return {
    state: {
      ...current,
      pendingLandKey: reading.landKey,
      pendingCount,
      pendingFirstAt,
    },
    decision: {
      action: "hold",
      reason: "awaiting_confirmation",
      // The land the caller should keep using, not the one being proposed.
      landKey: current.landKey,
      candidateLandKey: reading.landKey,
    },
  };
}
