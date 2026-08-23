import React from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { DataStatusBanner } from "./DataStatusBanner";
import { ParkCheckPrompt } from "./ParkCheckPrompt";
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
// 63C-1 added the approved night presentation for every Waits surface. It is
// PREPARED BUT INACTIVE: App passes a literal night={false}, so production is
// still day-only and pixel-identical. Activation is 63C-2's job, and Waits is
// deliberately still excluded from shellNight until then.
//
// `night` is an explicit boolean prop and nothing else. It is never derived here
// from the clock, planNight, shellNight, theme state, the active tab, storage, a
// media query, or browser appearance. One parent owns the decision; this file
// only renders it.

// The approved night palette, read off the committed day/night blueprint pairs.
// Every value below is the night colour that the blueprint renders at the exact
// coordinate where the day sheet renders the day value named beside it, so this
// table is a measurement rather than an interpretation.
//
// Deep navy throughout, no pure black and no bright white card. Borders are
// muted indigo, titles soft white, supporting copy muted blue-grey, and the
// green/amber/coral/sky semantics stay recognisable without going neon.
const WAITS_NIGHT = {
  surface: "#131C36", //        <- colors.card       #FFFFFF
  surfaceQuiet: "#0A1022", //   <- backgroundSoft    #FFF9F1
  border: "1px solid #282E66",
  // Same offset and blur as day — a shadow's geometry is spacing, and the
  // blueprint locks day and night to identical structure and spacing. Only the
  // colour deepens, so the card still lifts off the navy page.
  shadow: "0 10px 30px rgba(2, 6, 23, 0.45)",

  title: "#F5F3FF", //          <- colors.text       #241C15
  muted: "#B6C2E2", //          <- colors.muted      #7A6F63
  mutedOnPanel: "#CBD5F0", //   <- colors.muted inside the sky showtimes panel

  eyebrowPill: "#281757", //    <- colors.purpleSoft #F3E8FF
  eyebrow: "#C4B5FD", //        <- colors.purpleDeep #5B21B6
  purple: "#8B5CF6", //         <- colors.purple     #7C3AED

  caution: "#FCD34D", //        <- caution icon      #B58A3C

  // A refresh that failed while usable data stayed on screen. Deep rose, and
  // deliberately not the same hue as the stale banner above.
  errorRetainedFill: "#2A0B1F", //   <- #FEF2F2
  errorRetainedBorder: "1px solid rgba(251, 113, 133, 0.30)",
  errorRetainedText: "#FDA4AF", //   <- #9F1239

  skeletonFill: "#1E2650", //   <- rgba(234, 220, 200, 0.85)
  viewingOnlyBorder: "1px dashed rgba(129, 140, 248, 0.34)",
};

// Card-shaped skeletons that match the healthy card geometry: 26px radius,
// 20px padding, a name/meta/status column, a wait block and a 2x2 action area.
// The pulse is restrained and is disabled under prefers-reduced-motion.
const SKELETON_FILL = "rgba(234, 220, 200, 0.85)";

function SkeletonBar({ width, height, radius = 8, night = false }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: night ? WAITS_NIGHT.skeletonFill : SKELETON_FILL,
        animation: "tohiWaitsPulse 1.8s ease-in-out infinite",
      }}
    />
  );
}

function WaitsSkeletonList({ night = false }) {
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
            background: night ? WAITS_NIGHT.surface : colors.card,
            border: night ? WAITS_NIGHT.border : "1px solid rgba(234, 220, 200, 0.45)",
            borderRadius: 26,
            padding: 20,
            boxShadow: night
              ? WAITS_NIGHT.shadow
              : "0 10px 30px rgba(28, 25, 23, 0.055)",
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
              <SkeletonBar width="78%" height={18} night={night} />
              <SkeletonBar width="52%" height={12} night={night} />
              <SkeletonBar width={88} height={20} radius={999} night={night} />
            </div>
            <SkeletonBar width={64} height={38} night={night} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <SkeletonBar width="100%" height={48} radius={16} night={night} />
            <SkeletonBar width="100%" height={48} radius={16} night={night} />
            <SkeletonBar width="100%" height={48} radius={16} night={night} />
            <SkeletonBar width="100%" height={48} radius={16} night={night} />
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
  parkPresencePrompt,

  // Explicit, parent-owned presentation switch. Never derived in this file.
  night = false,

  // handlers owned by App
  loadData,
  handleConfirmParkPresence,
  handleDismissParkPresencePrompt,

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
            background: night ? WAITS_NIGHT.eyebrowPill : colors.purpleSoft,
            color: night ? WAITS_NIGHT.eyebrow : colors.purpleDeep,
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
            color: night ? WAITS_NIGHT.title : colors.text,
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
              night={night}
            />
          )}

          {/* One control. The Loading variant is the same button in its
              disabled state, so it inherits the same night treatment. */}
          <button
            style={{
              ...button,
              minHeight: 44,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 850,
              boxShadow: night
                ? WAITS_NIGHT.shadow
                : "0 10px 30px rgba(28, 25, 23, 0.055)",
              // Spread last so no day fill from `button` survives underneath.
              ...(night
                ? {
                    background: WAITS_NIGHT.surface,
                    border: WAITS_NIGHT.border,
                    color: WAITS_NIGHT.title,
                  }
                : null),
            }}
            onClick={() => loadData(true)}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              style={{ color: night ? WAITS_NIGHT.purple : colors.purple }}
            />{" "}
            {loading ? "Loading" : "Refresh"}
          </button>
        </div>

        <p
          style={{
            margin: 0,
            color: night ? WAITS_NIGHT.muted : colors.muted,
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
            color: night ? WAITS_NIGHT.muted : colors.muted,
            fontSize: 12.5,
            lineHeight: 1.45,
            maxWidth: "34ch",
          }}
        >
          <TriangleAlert
            size={15}
            style={{
              flexShrink: 0,
              marginTop: 2,
              color: night ? WAITS_NIGHT.caution : "#B58A3C",
            }}
          />
          Wait data can lag during reopenings or weather delays.
        </p>

        {browsingAnotherPark && (
          <p
            style={{
              margin: 0,
              color: night ? WAITS_NIGHT.eyebrow : colors.purpleDeep,
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

      {/* Park Check. Selecting a planned park on Home now opens its Waits
          immediately, which used to leave the confirmation stranded on the
          screen the guest had just left. The SAME prompt renders here, and only
          when it names the park this list is actually showing — so it can never
          ask about a park that is not on screen, and Home and Waits can never
          show two different questions. Whether a prompt exists at all, and what
          the answers do, stay entirely with App and utils/parkPresence. */}
      {parkPresencePrompt?.parkId === waitListParkId && (
        <ParkCheckPrompt
          parkPresencePrompt={parkPresencePrompt}
          night={night}
          getParkNameById={getParkNameById}
          handleConfirmParkPresence={handleConfirmParkPresence}
          handleDismissParkPresencePrompt={handleDismissParkPresencePrompt}
          button={button}
        />
      )}

      {/* Stale explanation. DataStatusBanner already ships this exact copy and
          the correct day treatment, so it is reused rather than duplicated. */}
      {view.status === WAITS_VIEW_STATES.STALE && (
        <DataStatusBanner source={waitListParkData?.source} night={night} />
      )}

      {/* A failure that kept usable data on screen. The cards stay, Refresh
          stays available, and the freshness pill is withheld above. */}
      {view.status === WAITS_VIEW_STATES.ERROR_RETAINED && (
        <p
          style={{
            margin: "0 0 14px",
            padding: "11px 14px",
            borderRadius: 16,
            // Deep rose at night, deliberately a different hue from the amber
            // stale banner above, so the two stay tellable apart in the dark.
            background: night ? WAITS_NIGHT.errorRetainedFill : "#FEF2F2",
            border: night
              ? WAITS_NIGHT.errorRetainedBorder
              : "1px solid rgba(225, 29, 72, 0.26)",
            color: night ? WAITS_NIGHT.errorRetainedText : "#9F1239",
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
            background: night ? WAITS_NIGHT.surface : colors.card,
            border: night ? WAITS_NIGHT.border : "1px solid rgba(234, 220, 200, 0.45)",
            borderRadius: 26,
            padding: view.composedTitle ? "26px 20px" : 20,
            boxShadow: night
              ? WAITS_NIGHT.shadow
              : "0 10px 30px rgba(28, 25, 23, 0.055)",
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
                color: night ? WAITS_NIGHT.title : colors.text,
              }}
            >
              {view.composedTitle}
            </div>
          )}
          <p
            style={{
              margin: "0 auto",
              maxWidth: "34ch",
              color: night ? WAITS_NIGHT.muted : colors.muted,
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
      {view.showSkeletons && <WaitsSkeletonList night={night} />}

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
                border: night
                  ? WAITS_NIGHT.viewingOnlyBorder
                  : `1px dashed ${colors.cardBorder}`,
                color: night ? WAITS_NIGHT.muted : colors.muted,
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
            night={night}
            formatLandLabel={formatLandLabel}
            // Browsing another park stays informational: showtime detail and
            // every action are withheld, exactly as before this redesign.
            hasShowtimeSchedule={browsingAnotherPark ? () => false : hasShowtimeSchedule}
            // The renderers stay App's. WaitsTab supplies only the night value,
            // so one prop drives every surface on this screen and the Waits
            // renderers can never disagree with the header about the mode.
            renderShowtimeInfo={
              browsingAnotherPark ? () => null : (ride) => renderShowtimeInfo(ride, { night })
            }
            renderRideActions={
              browsingAnotherPark ? () => null : (ride) => renderRideActions(ride, { night })
            }
          />
        </>
      )}
    </>
  );
}

export default WaitsTab;
