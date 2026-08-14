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

// Existing wait-tone thresholds, unchanged.
function getWaitTone(ride, isActiveRide) {
  if (isActiveRide) {
    return {
      label: "In Line Now",
      color: colors.purpleDeep,
      bg: colors.purpleSoft,
      border: "rgba(124, 58, 237, 0.30)",
    };
  }

  if (!ride.isOpen) {
    return {
      label: "Closed",
      color: colors.muted,
      bg: colors.backgroundSoft,
      border: "rgba(234, 220, 200, 0.90)",
    };
  }

  if (ride.waitTime == null) {
    return {
      label: "Wait unavailable",
      color: colors.muted,
      bg: colors.backgroundSoft,
      border: "rgba(234, 220, 200, 0.90)",
    };
  }

  if (ride.waitTime <= 20) {
    return {
      label: "Low wait",
      color: colors.success,
      bg: colors.successSoft,
      border: "rgba(5, 150, 105, 0.22)",
    };
  }

  if (ride.waitTime <= 45) {
    return {
      label: "Manageable",
      color: "#92400E",
      bg: colors.amberSoft,
      border: "rgba(245, 158, 11, 0.30)",
    };
  }

  return {
    label: "High wait",
    color: "#E11D48",
    bg: colors.coralSoft,
    border: "rgba(251, 113, 133, 0.28)",
  };
}

// A scheduled show has a published schedule instead of a queue, so the approved
// card gives it its own status and no numeric wait.
const SHOW_TONE = {
  label: "Showtimes",
  color: "#0369A1",
  bg: colors.skySoft,
  border: "rgba(56, 189, 248, 0.28)",
};

export function WaitTimesList({
  rides,
  activeRideId,
  activePark,
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
          isScheduledShow && !isActiveRide ? SHOW_TONE : getWaitTone(ride, isActiveRide);

        return (
          <article
            key={ride.id}
            style={{
              background: isActiveRide
                ? "linear-gradient(145deg, #FFFFFF 0%, #F6EEFF 100%)"
                : colors.card,
              border: `1px solid ${
                isActiveRide ? "rgba(124, 58, 237, 0.30)" : "rgba(234, 220, 200, 0.45)"
              }`,
              borderRadius: 26,
              padding: 20,
              boxShadow: isActiveRide
                ? "0 12px 32px rgba(124, 58, 237, 0.12)"
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
                    color: colors.text,
                  }}
                >
                  {ride.name}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 650,
                    color: colors.muted,
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
                      color: colors.muted,
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
