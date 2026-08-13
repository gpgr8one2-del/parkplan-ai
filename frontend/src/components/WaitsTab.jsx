import React from "react";
import { RefreshCw } from "lucide-react";

import { WaitTimesList } from "./WaitTimesList";
import { colors } from "../theme";

// 63B-1: Waits presentation extracted verbatim from App.jsx ahead of the
// approved Waits redesign. This is a structural safety move only — the markup
// below is the block that shipped, character for character, so the screen looks
// and behaves exactly as it did before.
//
// This component is presentation only. Every piece of state, every fetch,
// effect, timer, storage read, park-presence decision, sort, filter and action
// handler stays in App.jsx and arrives here as an explicit prop. WaitsTab
// creates no state, no effects and no replacement handlers.
//
// The legacy presentation this block carries — the second Waits header inside
// WaitTimesList, the attraction-count tile, the decorative row circles, the
// wrapping action row, the day-only palette — is INTENTIONALLY preserved here.
// Those are replaced in the later blueprint phases, not in this one.
export function WaitsTab({
  // data + derived state
  activeRideId,
  browsedParkLabel,
  browsingAnotherPark,
  confirmedActiveParkLabel,
  loading,
  sortedRides,
  waitListParkId,

  // handlers owned by App
  loadData,

  // renderers owned by App
  formatLandLabel,
  renderRideActions,
  renderShowtimeInfo,

  // shared style objects owned by App
  button,
  card,
}) {
  return (
    <>
      <section style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: "#7C3AED",
              }}
            >
              WAITS
            </div>
            <h2 style={{ margin: "6px 0 4px", color: "#1C1917" }}>
              Live Wait Times
            </h2>
            <p
              style={{
                margin: 0,
                color: colors.muted,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              Browse all visible attractions, refresh live data, and use ride actions
              without cluttering the Home dashboard.
            </p>
          </div>

          <button style={button} onClick={() => loadData(true)} disabled={loading}>
            <RefreshCw size={14} /> {loading ? "Loading" : "Refresh"}
          </button>
        </div>

        <p
          style={{
            margin: "10px 0 0",
            color: colors.muted,
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          Live wait data can lag the official park app during reopenings or
          weather delays. Verify headliner status before walking across the park.
        </p>

        {browsingAnotherPark && (
          <p
            style={{
              margin: "8px 0 0",
              color: colors.purpleDeep,
              fontSize: 12,
              fontWeight: 750,
              lineHeight: 1.4,
            }}
          >
            Browsing {browsedParkLabel}. Your day stays anchored at{" "}
            {confirmedActiveParkLabel}.
          </p>
        )}
      </section>

      <WaitTimesList
        rides={sortedRides}
        activeRideId={activeRideId}
        activePark={waitListParkId}
        card={card}
        formatLandLabel={formatLandLabel}
        renderShowtimeInfo={browsingAnotherPark ? () => null : renderShowtimeInfo}
        renderRideActions={browsingAnotherPark ? () => null : renderRideActions}
      />
    </>
  );
}

export default WaitsTab;
