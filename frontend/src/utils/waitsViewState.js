/**
 * Waits view state (63B-3).
 *
 * Pure, deterministic, data-only. No React, no fetching, no storage, no timers,
 * no mutation. It takes explicit inputs and returns what the Waits screen
 * should present, so the precedence rules can be table-tested rather than
 * scattered through JSX conditionals.
 *
 * WHY PRECEDENCE MATTERS
 *
 * Each of these is a way the screen could tell the family something untrue, and
 * each is prevented by the ordering below:
 *
 *   - An in-flight first request must not flash "No attractions to show".
 *     A pending request is not a successful empty response.
 *   - Loading must not replace cards the family can already use.
 *   - An active-park failure must never be presented as the browsed park's
 *     failure. The caller passes one park's request state at a time.
 *   - An error must not sit next to a "Live" freshness pill.
 *   - Stale data must not be described as live.
 *   - A successful empty response must not be described as an error, and must
 *     never claim the park is closed.
 */

export const WAITS_VIEW_STATES = {
  // There is deliberately no IDLE. A displayed park with no data and no error
  // has nothing to show yet, whether or not the loading flag has flipped, so it
  // renders as initial loading. An idle state would be a blank first frame.
  LOADING_INITIAL: "loading_initial",
  ERROR_NO_DATA: "error_no_data",
  ERROR_RETAINED: "error_retained",
  EMPTY: "empty",
  STALE: "stale",
  HEALTHY: "healthy",
};

// Exact approved copy. These strings are the contract.
export const WAITS_COPY = {
  STALE_BANNER: "Using slightly older data while we refresh in the background.",
  ACTIVE_REFRESH_ERROR: "Couldn’t refresh wait times. Showing the last available data.",
  ACTIVE_ERROR_TITLE: "Wait times unavailable",
  ACTIVE_ERROR_BODY:
    "We couldn’t load wait times right now. Try refreshing in a moment.",
  EMPTY_TITLE: "No attractions to show",
  EMPTY_BODY: "No attractions are available for this park right now.",
  VIEWING_ONLY: "VIEWING ONLY",
};

export function browsedLoadingCopy(parkLabel) {
  return `Loading ${parkLabel || "park"} wait times…`;
}

export function browsedErrorCopy(parkLabel) {
  return `${parkLabel || "Park"} wait times are unavailable right now.`;
}

/**
 * Guard for a browsed-park response.
 *
 * A park-ID check alone is not enough. Manually refreshing EPCOT, leaving,
 * returning to EPCOT and starting a newer request leaves two in-flight
 * requests carrying the SAME park ID — so an older response could overwrite a
 * newer one. A monotonic request ID makes only the newest request writable.
 *
 * Both must match: the request must be the current one, and it must still be
 * for the park currently held in state.
 */
export function shouldApplyBrowsedResponse(input = {}) {
  const { requestId, currentRequestId, parkId, currentParkId } = input;

  if (!Number.isFinite(requestId) || !Number.isFinite(currentRequestId)) return false;
  if (requestId !== currentRequestId) return false;
  if (!parkId || parkId !== currentParkId) return false;

  return true;
}

function hasData(data) {
  return Boolean(data);
}

/**
 * @param {object} input
 * @param {boolean} input.browsing        viewing a park other than the confirmed one
 * @param {string}  input.parkLabel       label of the park actually being shown
 * @param {object|null} input.data        the park payload for the displayed park
 * @param {boolean} input.loading         a request for the displayed park is in flight
 * @param {string}  input.error           an error for the displayed park, "" when none
 * @param {number}  input.visibleRideCount attractions remaining after filtering
 */
export function resolveWaitsViewState(input = {}) {
  const browsing = input.browsing === true;
  const parkLabel = typeof input.parkLabel === "string" ? input.parkLabel : "";
  const data = input.data || null;
  const loading = input.loading === true;
  const error = typeof input.error === "string" ? input.error : "";
  const visibleRideCount = Number.isFinite(input.visibleRideCount)
    ? input.visibleRideCount
    : 0;

  const source = typeof data?.source === "string" ? data.source : "";
  const dataPresent = hasData(data);

  // ---- status precedence -------------------------------------------------
  let status;
  if (!dataPresent) {
    // No usable data. Either the request failed, or there is nothing to show
    // yet — including the very first render, before the effect has set
    // loading. Neither is an empty result.
    status = error ? WAITS_VIEW_STATES.ERROR_NO_DATA : WAITS_VIEW_STATES.LOADING_INITIAL;
  } else if (error) {
    // Usable data survives the failure; the message explains the staleness.
    status = WAITS_VIEW_STATES.ERROR_RETAINED;
  } else if (visibleRideCount === 0) {
    status = WAITS_VIEW_STATES.EMPTY;
  } else if (source === "stale") {
    status = WAITS_VIEW_STATES.STALE;
  } else {
    status = WAITS_VIEW_STATES.HEALTHY;
  }

  // A refresh over usable data never clears the list.
  const refreshing = loading && dataPresent;

  const showSkeletons = status === WAITS_VIEW_STATES.LOADING_INITIAL;
  const showCards =
    status === WAITS_VIEW_STATES.HEALTHY ||
    status === WAITS_VIEW_STATES.STALE ||
    status === WAITS_VIEW_STATES.ERROR_RETAINED;

  // Freshness describes data. It is shown only when usable data exists and
  // nothing has failed for the displayed park.
  const showFreshness = dataPresent && !error && status !== WAITS_VIEW_STATES.LOADING_INITIAL;

  // ---- messages ----------------------------------------------------------
  let bannerMessage = "";
  if (status === WAITS_VIEW_STATES.STALE) {
    bannerMessage = WAITS_COPY.STALE_BANNER;
  } else if (status === WAITS_VIEW_STATES.ERROR_RETAINED) {
    bannerMessage = browsing
      ? browsedErrorCopy(parkLabel)
      : WAITS_COPY.ACTIVE_REFRESH_ERROR;
  }

  let composedTitle = "";
  let composedBody = "";
  if (status === WAITS_VIEW_STATES.ERROR_NO_DATA) {
    if (browsing) {
      composedBody = browsedErrorCopy(parkLabel);
    } else {
      composedTitle = WAITS_COPY.ACTIVE_ERROR_TITLE;
      composedBody = WAITS_COPY.ACTIVE_ERROR_BODY;
    }
  } else if (status === WAITS_VIEW_STATES.EMPTY) {
    composedTitle = WAITS_COPY.EMPTY_TITLE;
    composedBody = WAITS_COPY.EMPTY_BODY;
  } else if (status === WAITS_VIEW_STATES.LOADING_INITIAL && browsing) {
    // Browsed loading gets a quiet composed line instead of skeletons.
    composedBody = browsedLoadingCopy(parkLabel);
  }

  // Browsed loading uses the quiet line, so it shows no skeletons.
  const skeletons = showSkeletons && !browsing;

  return {
    status,
    browsing,
    refreshing,
    showSkeletons: skeletons,
    showCards,
    showFreshness,
    showViewingOnly: browsing && showCards,
    bannerMessage,
    composedTitle,
    composedBody,
    showComposed: Boolean(composedTitle || composedBody),
  };
}

export default resolveWaitsViewState;
