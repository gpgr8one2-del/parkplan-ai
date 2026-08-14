import React from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { FreshnessBadge } from "./FreshnessBadge";
import { WaitTimesList } from "./WaitTimesList";
import { colors } from "../theme";

// 63B-1 extracted this presentation verbatim from App.jsx.
// 63B-2 rebuilt the healthy day presentation to the approved healthy day
// blueprint committed under the Waits design documentation.
//
// Still presentation only: every piece of state, every fetch, effect, sort,
// filter, park-presence decision and action handler stays in App.jsx and
// arrives here as an explicit prop. This component creates no state, no
// effects and no replacement handlers.
//
// Deliberately NOT in this phase: night styling, skeleton loading, the
// refresh-error, error-with-no-data and empty presentations, and separate
// browsed-park loading/error state. Those keep their current behaviour until
// their own phase.
export function WaitsTab({
  // data + derived state
  activeRideId,
  browsedParkLabel,
  browsingAnotherPark,
  confirmedActiveParkLabel,
  loading,
  sortedRides,
  waitListParkData,
  waitListParkId,

  // handlers owned by App
  loadData,

  // resolvers and renderers owned by App
  formatLandLabel,
  getParkNameById,
  hasShowtimeSchedule,
  renderRideActions,
  renderShowtimeInfo,

  // shared style objects owned by App
  button,
}) {
  // The heading names the park the list is actually showing, so the title and
  // the rides below can never describe different parks.
  const waitsParkName = waitListParkId ? getParkNameById(waitListParkId) : "";

  return (
    <>
      {/* Approved page header. Open on the page ground — no card, no border,
          no decorative shapes — and the only Waits heading on the screen. */}
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "10px 2px 0",
          marginBottom: 26,
        }}
      >
        <span
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 13px",
            borderRadius: 999,
            background: colors.purpleSoft,
            color: colors.purpleDeep,
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 1.1,
          }}
        >
          LIVE WAITS
        </span>

        <h1
          style={{
            margin: 0,
            fontSize: 31,
            lineHeight: 1.12,
            letterSpacing: -0.8,
            fontWeight: 900,
            color: colors.text,
            maxWidth: 320,
          }}
        >
          {waitsParkName ? `${waitsParkName} wait times` : "Wait times"}
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {/* Real freshness, from the same park payload the list is built from. */}
          <FreshnessBadge
            source={waitListParkData?.source}
            ageMs={waitListParkData?.ageMs}
            fetchedAt={waitListParkData?.fetchedAt}
          />

          <button
            style={{
              ...button,
              minHeight: 44,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 850,
              boxShadow: "0 10px 30px rgba(28, 25, 23, 0.055)",
            }}
            onClick={() => loadData(true)}
            disabled={loading}
          >
            <RefreshCw size={16} style={{ color: colors.purple }} />{" "}
            {loading ? "Loading" : "Refresh"}
          </button>
        </div>

        <p
          style={{
            margin: 0,
            color: colors.muted,
            fontSize: 14.5,
            lineHeight: 1.55,
            maxWidth: "33ch",
          }}
        >
          Check current waits and mark what your family is doing.
        </p>

        <p
          style={{
            margin: 0,
            display: "flex",
            gap: 9,
            alignItems: "flex-start",
            color: colors.muted,
            fontSize: 12.5,
            lineHeight: 1.45,
            maxWidth: "34ch",
          }}
        >
          <TriangleAlert
            size={15}
            style={{ flexShrink: 0, marginTop: 2, color: "#B58A3C" }}
          />
          Wait data can lag during reopenings or weather delays.
        </p>

        {browsingAnotherPark && (
          <p
            style={{
              margin: 0,
              color: colors.purpleDeep,
              fontSize: 12.5,
              fontWeight: 750,
              lineHeight: 1.45,
            }}
          >
            Browsing {browsedParkLabel}. Your day stays anchored at{" "}
            {confirmedActiveParkLabel}.
          </p>
        )}
      </header>

      <WaitTimesList
        rides={sortedRides}
        activeRideId={activeRideId}
        activePark={waitListParkId}
        formatLandLabel={formatLandLabel}
        // Browsing another park stays informational: showtime detail and every
        // action are withheld, exactly as before this redesign.
        hasShowtimeSchedule={browsingAnotherPark ? () => false : hasShowtimeSchedule}
        renderShowtimeInfo={browsingAnotherPark ? () => null : renderShowtimeInfo}
        renderRideActions={browsingAnotherPark ? () => null : renderRideActions}
      />
    </>
  );
}

export default WaitsTab;
