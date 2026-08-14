import React from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { DataStatusBanner } from "./DataStatusBanner";
import { FreshnessBadge } from "./FreshnessBadge";
import { WaitTimesList } from "./WaitTimesList";
import { colors } from "../theme";
import { resolveWaitsViewState, WAITS_COPY, WAITS_VIEW_STATES } from "../utils/waitsViewState";

// 63B-1 extracted this presentation verbatim from App.jsx.
// 63B-2 rebuilt the healthy day presentation to the approved healthy day
// blueprint committed under the Waits design documentation.
//
// Still presentation only: every piece of state, every fetch, effect, sort,
// filter, park-presence decision and action handler stays in App.jsx and
// arrives here as an explicit prop. This component creates no state, no
// effects and no replacement handlers.
//
// 63B-3 added the approved day secondary states. Which one renders is decided
// by the pure resolver in utils/waitsViewState.js, so the precedence rules are
// table-tested rather than buried in JSX conditionals here.
//
// Deliberately NOT in this phase: night styling. Waits stays day-only.

// Card-shaped skeletons that match the healthy card geometry: 26px radius,
// 20px padding, a name/meta/status column, a wait block and a 2x2 action area.
// The pulse is restrained and is disabled under prefers-reduced-motion.
const SKELETON_FILL = "rgba(234, 220, 200, 0.85)";

function SkeletonBar({ width, height, radius = 8 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: SKELETON_FILL,
        animation: "tohiWaitsPulse 1.8s ease-in-out infinite",
      }}
    />
  );
}

function WaitsSkeletonList() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        @keyframes tohiWaitsPulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
        @media (prefers-reduced-motion: reduce) {
          [data-tohi-waits-skeleton] * { animation: none !important; }
        }
      `}</style>

      {[0, 1].map((index) => (
        <div
          key={index}
          data-tohi-waits-skeleton="true"
          aria-hidden="true"
          style={{
            background: colors.card,
            border: "1px solid rgba(234, 220, 200, 0.45)",
            borderRadius: 26,
            padding: 20,
            boxShadow: "0 10px 30px rgba(28, 25, 23, 0.055)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
              <SkeletonBar width="78%" height={18} />
              <SkeletonBar width="52%" height={12} />
              <SkeletonBar width={88} height={20} radius={999} />
            </div>
            <SkeletonBar width={64} height={38} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <SkeletonBar width="100%" height={48} radius={16} />
            <SkeletonBar width="100%" height={48} radius={16} />
            <SkeletonBar width="100%" height={48} radius={16} />
            <SkeletonBar width="100%" height={48} radius={16} />
          </div>
        </div>
      ))}
    </div>
  );
}

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
  waitsError,

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

  // One resolver call decides everything below. The park whose request state is
  // read is always the park being displayed, so an active-park failure can
  // never surface as the browsed park's failure.
  const view = resolveWaitsViewState({
    browsing: browsingAnotherPark,
    parkLabel: browsingAnotherPark ? browsedParkLabel : waitsParkName,
    data: waitListParkData,
    loading,
    error: waitsError,
    visibleRideCount: sortedRides.length,
  });

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
          {/* Real freshness, from the same park payload the list is built from.
              Hidden whenever the displayed park has no usable data or has an
              error, so the screen never claims data is live when it is not. */}
          {view.showFreshness && (
            <FreshnessBadge
              source={waitListParkData?.source}
              ageMs={waitListParkData?.ageMs}
              fetchedAt={waitListParkData?.fetchedAt}
            />
          )}

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

      {/* Stale explanation. DataStatusBanner already ships this exact copy and
          the correct day treatment, so it is reused rather than duplicated. */}
      {view.status === WAITS_VIEW_STATES.STALE && (
        <DataStatusBanner source={waitListParkData?.source} />
      )}

      {/* A failure that kept usable data on screen. The cards stay, Refresh
          stays available, and the freshness pill is withheld above. */}
      {view.status === WAITS_VIEW_STATES.ERROR_RETAINED && (
        <p
          style={{
            margin: "0 0 14px",
            padding: "11px 14px",
            borderRadius: 16,
            background: "#FEF2F2",
            border: "1px solid rgba(225, 29, 72, 0.26)",
            color: "#9F1239",
            fontSize: 12.5,
            fontWeight: 650,
            lineHeight: 1.4,
          }}
        >
          {view.bannerMessage}
        </p>
      )}

      {/* Composed surface: error with no data, valid empty list, or the quiet
          browsed-park loading and error lines. The header Refresh is the only
          retry control — no second button is added. */}
      {view.showComposed && (
        <div
          style={{
            background: colors.card,
            border: "1px solid rgba(234, 220, 200, 0.45)",
            borderRadius: 26,
            padding: view.composedTitle ? "26px 20px" : 20,
            boxShadow: "0 10px 30px rgba(28, 25, 23, 0.055)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            textAlign: "center",
          }}
        >
          {view.composedTitle && (
            <div
              style={{
                fontSize: 17.5,
                fontWeight: 900,
                letterSpacing: -0.3,
                color: colors.text,
              }}
            >
              {view.composedTitle}
            </div>
          )}
          <p
            style={{
              margin: "0 auto",
              maxWidth: "34ch",
              color: colors.muted,
              fontSize: 13.5,
              lineHeight: 1.5,
            }}
          >
            {view.composedBody}
          </p>
        </div>
      )}

      {/* Card-shaped skeletons hold the space the list will occupy. No invented
          names or wait values, and no empty-state wording while in flight. */}
      {view.showSkeletons && <WaitsSkeletonList />}

      {view.showCards && (
        <>
          {/* Browsing another park is informational. The quiet label makes the
              withheld actions read as intentional rather than broken. */}
          {view.showViewingOnly && (
            <div
              style={{
                alignSelf: "flex-start",
                display: "inline-flex",
                width: "fit-content",
                marginBottom: 12,
                padding: "4px 10px",
                borderRadius: 8,
                border: `1px dashed ${colors.cardBorder}`,
                color: colors.muted,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 1.4,
              }}
            >
              {WAITS_COPY.VIEWING_ONLY}
            </div>
          )}

          <WaitTimesList
            rides={sortedRides}
            activeRideId={activeRideId}
            activePark={waitListParkId}
            formatLandLabel={formatLandLabel}
            // Browsing another park stays informational: showtime detail and
            // every action are withheld, exactly as before this redesign.
            hasShowtimeSchedule={browsingAnotherPark ? () => false : hasShowtimeSchedule}
            renderShowtimeInfo={browsingAnotherPark ? () => null : renderShowtimeInfo}
            renderRideActions={browsingAnotherPark ? () => null : renderRideActions}
          />
        </>
      )}
    </>
  );
}

export default WaitsTab;
