import React from "react";
import { colors } from "../theme";

function getWaitTone(ride, isActiveRide) {
  if (isActiveRide) {
    return {
      label: "In line now",
      color: colors.purple,
      bg: colors.purpleSoft,
      border: "rgba(124, 58, 237, 0.26)",
    };
  }

  if (!ride.isOpen) {
    return {
      label: "Closed",
      color: colors.muted,
      bg: colors.backgroundSoft,
      border: colors.cardBorder,
    };
  }

  if (ride.waitTime == null) {
    return {
      label: "Wait unavailable",
      color: colors.muted,
      bg: colors.backgroundSoft,
      border: colors.cardBorder,
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
      color: colors.amber,
      bg: colors.amberSoft,
      border: "rgba(245, 158, 11, 0.26)",
    };
  }

  return {
    label: "High wait",
    color: "#E11D48",
    bg: colors.coralSoft,
    border: "rgba(251, 113, 133, 0.28)",
  };
}

export function WaitTimesList({
  rides,
  activeRideId,
  activePark,
  card,
  formatLandLabel,
  renderShowtimeInfo,
  renderRideActions,
}) {
  return (
    <section
      style={{
        ...card,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, #FFF9F1 100%)",
        border: `1px solid ${colors.cardBorder}`,
        boxShadow: "0 16px 38px rgba(28, 25, 23, 0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 9px",
              borderRadius: 999,
              background: colors.purpleSoft,
              color: colors.purpleDeep,
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: 0.7,
              marginBottom: 8,
            }}
          >
            LIVE PARK PULSE
          </div>

          <h3
            style={{
              margin: 0,
              color: colors.text,
              fontSize: 24,
              letterSpacing: -0.4,
            }}
          >
            Wait Times
          </h3>

          <p
            style={{
              margin: "7px 0 0",
              color: colors.muted,
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            Riding something that is not on a recommendation card? Mark it here
            so TOHI can keep up with your real day.
          </p>
        </div>

        <div
          style={{
            minWidth: 58,
            height: 58,
            borderRadius: 18,
            background:
              "linear-gradient(145deg, rgba(124,58,237,0.12), rgba(245,158,11,0.14))",
            border: `1px solid ${colors.cardBorder}`,
            display: "grid",
            placeItems: "center",
            color: colors.purple,
            fontWeight: 950,
            fontSize: 18,
          }}
        >
          {rides.length}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {rides.map((ride) => {
          const isActiveRide = activeRideId === String(ride.id);
          const tone = getWaitTone(ride, isActiveRide);

          return (
            <div
              key={ride.id}
              style={{
                position: "relative",
                overflow: "hidden",
                padding: 14,
                border: `1px solid ${tone.border}`,
                borderRadius: 20,
                background: isActiveRide
                  ? "linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 100%)"
                  : colors.card,
                boxShadow: isActiveRide
                  ? "0 14px 30px rgba(124, 58, 237, 0.12)"
                  : "0 8px 22px rgba(28, 25, 23, 0.05)",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  width: 76,
                  height: 76,
                  borderRadius: "999px",
                  right: -32,
                  top: -34,
                  background: tone.bg,
                  opacity: 0.72,
                }}
              />

              <div style={{ position: "relative" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        color: colors.text,
                        fontSize: 15,
                        lineHeight: 1.2,
                      }}
                    >
                      {ride.name}
                    </strong>

                    <div
                      style={{
                        marginTop: 5,
                        color: colors.muted,
                        fontSize: 12,
                        lineHeight: 1.35,
                      }}
                    >
                      {formatLandLabel(activePark, ride.land)} ·{" "}
                      {ride.isOpen ? "Open" : "Closed"}
                    </div>

                    <div
                      style={{
                        display: "inline-flex",
                        marginTop: 8,
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: tone.bg,
                        color: tone.color,
                        border: `1px solid ${tone.border}`,
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {tone.label}
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      whiteSpace: "nowrap",
                      color: tone.color,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 950,
                        fontSize: 24,
                        lineHeight: 1,
                        letterSpacing: -0.7,
                      }}
                    >
                      {ride.waitTime != null ? ride.waitTime : "--"}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 11,
                        fontWeight: 900,
                        color: colors.muted,
                      }}
                    >
                      {ride.waitTime != null ? "min" : "wait"}
                    </div>
                  </div>
                </div>

                {renderShowtimeInfo(ride)}
                {renderRideActions(ride)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default WaitTimesList;
