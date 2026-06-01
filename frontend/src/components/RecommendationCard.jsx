import React from "react";
import { colors } from "../theme";

const SLOT_STYLES = {
  "BEST MOVE": {
    eyebrow: "BEST MOVE",
    accent: colors.success,
    accentSoft: colors.successSoft,
    border: "rgba(5, 150, 105, 0.24)",
    background:
      "linear-gradient(145deg, #FFFFFF 0%, #F0FDF4 100%)",
    shadow: "0 14px 34px rgba(5, 150, 105, 0.10)",
    badge: "Go now",
  },
  "SMART BACKUP": {
    eyebrow: "SMART BACKUP",
    accent: "#0284C7",
    accentSoft: colors.skySoft,
    border: "rgba(56, 189, 248, 0.32)",
    background:
      "linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%)",
    shadow: "0 14px 34px rgba(2, 132, 199, 0.10)",
    badge: "Safe pick",
  },
  "WORTH THE WALK": {
    eyebrow: "WORTH THE WALK",
    accent: colors.purple,
    accentSoft: colors.purpleSoft,
    border: "rgba(124, 58, 237, 0.26)",
    background:
      "linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 100%)",
    shadow: "0 14px 34px rgba(124, 58, 237, 0.12)",
    badge: "Big payoff",
  },
  "PLAN AHEAD": {
    eyebrow: "PLAN AHEAD",
    accent: colors.amber,
    accentSoft: colors.amberSoft,
    border: "rgba(245, 158, 11, 0.32)",
    background:
      "linear-gradient(145deg, #FFFFFF 0%, #FEF3C7 100%)",
    shadow: "0 14px 34px rgba(245, 158, 11, 0.12)",
    badge: "Strategy",
  },
  "WAIT ON THIS": {
    eyebrow: "WAIT ON THIS",
    accent: "#E11D48",
    accentSoft: colors.coralSoft,
    border: "rgba(251, 113, 133, 0.32)",
    background:
      "linear-gradient(145deg, #FFFFFF 0%, #FFE4E6 100%)",
    shadow: "0 14px 34px rgba(225, 29, 72, 0.10)",
    badge: "Later",
  },
};

function getSlotStyle(title, fallbackColor, fallbackBorder, fallbackBackground) {
  return (
    SLOT_STYLES[title] || {
      eyebrow: title,
      accent: fallbackColor || colors.purple,
      accentSoft: colors.purpleSoft,
      border: fallbackBorder || colors.cardBorder,
      background: fallbackBackground || colors.card,
      shadow: "0 14px 34px rgba(28, 25, 23, 0.08)",
      badge: "Recommended",
    }
  );
}

export function RecommendationCard({
  title,
  ride,
  reason,
  color,
  borderColor,
  background,
  titleSize = 18,
  renderShowtimeInfo,
  renderRideActions,
}) {
  if (!ride) return null;

  const slot = getSlotStyle(title, color, borderColor, background);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: 16,
        borderRadius: 24,
        border: `1px solid ${slot.border}`,
        background: slot.background,
        boxShadow: slot.shadow,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 92,
          height: 92,
          borderRadius: "999px",
          right: -36,
          top: -38,
          background: slot.accentSoft,
          opacity: 0.72,
        }}
      />

      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: slot.accent,
              fontWeight: 950,
              letterSpacing: 0.6,
            }}
          >
            {slot.eyebrow}
          </div>

          <div
            style={{
              padding: "5px 9px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.72)",
              border: `1px solid ${slot.border}`,
              color: slot.accent,
              fontSize: 11,
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            {slot.badge}
          </div>
        </div>

        <h4
          style={{
            margin: "0 0 7px",
            fontSize: titleSize,
            lineHeight: 1.15,
            color: colors.text,
            letterSpacing: -0.25,
          }}
        >
          {ride.name}
        </h4>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 10px",
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.78)",
            border: `1px solid ${slot.border}`,
            color: slot.accent,
            fontWeight: 950,
            fontSize: 14,
          }}
        >
          {ride.waitTime} min wait
        </div>

        {reason && (
          <p
            style={{
              margin: "10px 0 0",
              color: colors.muted,
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            {reason}
          </p>
        )}

        {renderShowtimeInfo?.(ride)}
        {renderRideActions?.(ride)}
      </div>
    </div>
  );
}

export default RecommendationCard;
