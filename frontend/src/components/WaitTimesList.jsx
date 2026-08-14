import React from "react";
import { colors } from "../theme";

// 63B-2: rebuilt to the approved healthy day cards in the committed Waits
// design documentation.
//
// Locked measurements from the blueprint README: attraction name 17.5px, wait
// value 42px, card radius 26px, card padding 20px, action height 48px (owned by
// renderRideActions), actions in a 2x2 grid.
//
// Gone with the redesign: the outer list card and its second "Wait Times"
// header, the attraction-count tile, and the 76x76 decorative corner circle.
// The cards are text-led — there is no ride artwork here by design.
//
// This file is presentation only. Ride order, filtering, active-ride identity,
// land formatting, showtime data and every action still come from App.
//
// 63C-1 added the approved night card presentation. `night` is an explicit
// boolean supplied by WaitsTab and is never derived here. Structure, geometry
// and every label are shared by both modes — only tokens change — so the locked
// measurements above hold identically in day and night.

// The approved night card palette, measured off the committed blueprint pairs:
// each value is what the night sheet renders where the day sheet renders the
// day token named beside it. Semantics survive the switch — green still reads
// as calm, amber as moderate, coral as busy, sky as scheduled — without any of
// them turning neon.
const NIGHT = {
  surface: "#131C36", //          <- colors.card         #FFFFFF
  activeSurface: "linear-gradient(145deg, #131C36 0%, #1F214A 100%)",
  border: "#282E66",
  activeBorder: "rgba(139, 92, 246, 0.42)",
  // Offsets and blurs match day exactly; only the shadow colour deepens. Day
  // and night are locked to identical structure and spacing.
  shadow: "0 10px 30px rgba(2, 6, 23, 0.45)",
  activeShadow: "0 12px 32px rgba(2, 6, 23, 0.50)",
  title: "#F5F3FF", //            <- colors.text         #241C15
  muted: "#B6C2E2", //            <- colors.muted        #7A6F63
};

// Existing wait-tone thresholds, unchanged. Night only re-tokenises each tone;
// the ordering, the boundaries (20 / 45) and every label are identical.
function getWaitTone(ride, isActiveRide, night = false) {
  if (isActiveRide) {
    return {
      label: "In Line Now",
      color: night ? "#C4B5FD" : colors.purpleDeep,
      bg: night ? "#281757" : colors.purpleSoft,
      border: night ? "rgba(139, 92, 246, 0.42)" : "rgba(124, 58, 237, 0.30)",
    };
  }

  if (!ride.isOpen) {
    return {
      label: "Closed",
      color: night ? NIGHT.muted : colors.muted,
      bg: night ? "#0A1022" : colors.backgroundSoft,
      border: night ? "rgba(129, 140, 248, 0.30)" : "rgba(234, 220, 200, 0.90)",
    };
  }

  if (ride.waitTime == null) {
    return {
      label: "Wait unavailable",
      color: night ? NIGHT.muted : colors.muted,
      bg: night ? "#0A1022" : colors.backgroundSoft,
      border: night ? "rgba(129, 140, 248, 0.30)" : "rgba(234, 220, 200, 0.90)",
    };
  }

  if (ride.waitTime <= 20) {
    return {
      label: "Low wait",
      color: night ? "#6EE7B7" : colors.success,
      bg: night ? "#0C3539" : colors.successSoft,
      border: night ? "rgba(52, 211, 153, 0.34)" : "rgba(5, 150, 105, 0.22)",
    };
  }

  if (ride.waitTime <= 45) {
    return {
      label: "Manageable",
      color: night ? "#FCD34D" : "#92400E",
      bg: night ? "#2F1B1A" : colors.amberSoft,
      border: night ? "rgba(251, 191, 36, 0.34)" : "rgba(245, 158, 11, 0.30)",
    };
  }

  return {
    label: "High wait",
    color: night ? "#FB7185" : "#E11D48",
    bg: night ? "#2E1128" : colors.coralSoft,
    border: night ? "rgba(251, 113, 133, 0.40)" : "rgba(251, 113, 133, 0.28)",
  };
}

// A scheduled show has a published schedule instead of a queue, so the approved
// card gives it its own status and no numeric wait.
function getShowTone(night = false) {
  return {
    label: "Showtimes",
    color: night ? "#7DD3FC" : "#0369A1",
    bg: night ? "#192D4B" : colors.skySoft,
    border: night ? "rgba(56, 189, 248, 0.38)" : "rgba(56, 189, 248, 0.28)",
  };
}

export function WaitTimesList({
  rides,
  activeRideId,
  activePark,
  night = false,
  formatLandLabel,
  hasShowtimeSchedule,
  renderShowtimeInfo,
  renderRideActions,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rides.map((ride) => {
        const isActiveRide = activeRideId === String(ride.id);
        // Closed outranks the scheduled-show treatment. An attraction can keep
        // a stored schedule while it is closed, and the card must still say
        // Closed and show -- / wait rather than implying performances today.
        const isScheduledShow =
          ride.isOpen === true &&
          typeof hasShowtimeSchedule === "function" &&
          hasShowtimeSchedule(ride);
        // The active ride keeps its In Line Now emphasis even when it is a show.
        const tone =
          isScheduledShow && !isActiveRide
            ? getShowTone(night)
            : getWaitTone(ride, isActiveRide, night);

        return (
          <article
            key={ride.id}
            style={{
              background: isActiveRide
                ? night
                  ? NIGHT.activeSurface
                  : "linear-gradient(145deg, #FFFFFF 0%, #F6EEFF 100%)"
                : night
                ? NIGHT.surface
                : colors.card,
              border: `1px solid ${
                isActiveRide
                  ? night
                    ? NIGHT.activeBorder
                    : "rgba(124, 58, 237, 0.30)"
                  : night
                  ? NIGHT.border
                  : "rgba(234, 220, 200, 0.45)"
              }`,
              borderRadius: 26,
              padding: 20,
              boxShadow: isActiveRide
                ? night
                  ? NIGHT.activeShadow
                  : "0 12px 32px rgba(124, 58, 237, 0.12)"
                : night
                ? NIGHT.shadow
                : "0 10px 30px rgba(28, 25, 23, 0.055)",
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
              <div
                style={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                <div
                  style={{
                    fontSize: 17.5,
                    fontWeight: 900,
                    lineHeight: 1.22,
                    letterSpacing: -0.3,
                    color: night ? NIGHT.title : colors.text,
                  }}
                >
                  {ride.name}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 650,
                    color: night ? NIGHT.muted : colors.muted,
                  }}
                >
                  {formatLandLabel(activePark, ride.land)} ·{" "}
                  {isScheduledShow
                    ? "Scheduled show"
                    : ride.isOpen
                    ? "Open"
                    : "Closed"}
                </div>

                <span
                  style={{
                    alignSelf: "flex-start",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "5px 12px",
                    borderRadius: 999,
                    background: tone.bg,
                    color: tone.color,
                    border: `1px solid ${tone.border}`,
                    fontSize: 11.5,
                    fontWeight: 900,
                  }}
                >
                  {tone.label}
                </span>
              </div>

              {/* A scheduled show has no queue, so it shows no wait column at
                  all. Every other card keeps the real value, and -- / wait for
                  a null one. */}
              {!isScheduledShow && (
                <div
                  style={{
                    flexShrink: 0,
                    textAlign: "right",
                    lineHeight: 1,
                    paddingTop: 2,
                    fontVariantNumeric: "tabular-nums",
                    color: tone.color,
                  }}
                >
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 900,
                      letterSpacing: -2,
                      lineHeight: 0.9,
                    }}
                  >
                    {ride.waitTime != null ? ride.waitTime : "--"}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: 0.9,
                      textTransform: "uppercase",
                      color: night ? NIGHT.muted : colors.muted,
                    }}
                  >
                    {ride.waitTime != null ? "min" : "wait"}
                  </div>
                </div>
              )}
            </div>

            {renderShowtimeInfo(ride)}
            {renderRideActions(ride)}
          </article>
        );
      })}
    </div>
  );
}

export default WaitTimesList;
