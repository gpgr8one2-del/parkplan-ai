import React from "react";
import { colors } from "../theme";

const SLOT_STYLES = {
  "BEST MOVE": {
    eyebrow: "BEST MOVE",
    accent: colors.success,
    accentNight: "#6EE7B7",
    accentSoft: colors.successSoft,
    border: "rgba(5, 150, 105, 0.24)",
    borderNight: "rgba(110, 231, 183, 0.30)",
    badge: "Go now",
  },
  "SMART BACKUP": {
    eyebrow: "SMART BACKUP",
    accent: "#0284C7",
    accentNight: "#7DD3FC",
    accentSoft: colors.skySoft,
    border: "rgba(56, 189, 248, 0.32)",
    borderNight: "rgba(125, 211, 252, 0.30)",
    badge: "Safe pick",
  },
  "WORTH THE WALK": {
    eyebrow: "WORTH THE WALK",
    accent: colors.purple,
    accentNight: "#C4B5FD",
    accentSoft: colors.purpleSoft,
    border: "rgba(124, 58, 237, 0.26)",
    borderNight: "rgba(196, 181, 253, 0.32)",
    badge: "Big payoff",
  },
  "PLAN AHEAD": {
    eyebrow: "PLAN AHEAD",
    accent: colors.amber,
    accentNight: "#FCD34D",
    accentSoft: colors.amberSoft,
    border: "rgba(245, 158, 11, 0.32)",
    borderNight: "rgba(252, 211, 77, 0.28)",
    badge: "Strategy",
  },
  "WAIT ON THIS": {
    eyebrow: "WAIT ON THIS",
    accent: "#B45309",
    accentNight: "#FCD34D",
    accentSoft: colors.amberSoft,
    border: "rgba(245, 158, 11, 0.26)",
    borderNight: "rgba(252, 211, 77, 0.24)",
    badge: "Later",
  },
};

function getSlotStyle(title, fallbackColor, fallbackBorder) {
  return (
    SLOT_STYLES[title] || {
      eyebrow: title,
      accent: fallbackColor || colors.purple,
      accentNight: "#C4B5FD",
      accentSoft: colors.purpleSoft,
      border: fallbackBorder || colors.cardBorder,
      borderNight: "rgba(139, 92, 246, 0.30)",
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
  night = false,
  renderShowtimeInfo,
  renderRideActions,
}) {
  if (!ride) return null;

  const slot = getSlotStyle(title, color, borderColor, background);
  const accent = night ? slot.accentNight : slot.accent;
  const border = night ? slot.borderNight : slot.border;
  const surface = night ? "#131C36" : "#FFFFFF";
  const titleColor = night ? "#F5F3FF" : colors.text;
  const mutedColor = night ? "#B6C2E2" : colors.muted;
  const pillSurface = night ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.78)";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: 16,
        borderRadius: 20,
        border: `1px solid ${border}`,
        background: surface,
        boxShadow: night
          ? "0 12px 30px rgba(2, 6, 23, 0.45)"
          : "0 10px 24px rgba(28, 25, 23, 0.06)",
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
          background: night ? "rgba(76, 29, 149, 0.28)" : slot.accentSoft,
          opacity: night ? 0.5 : 0.6,
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
              color: accent,
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
              background: pillSurface,
              border: `1px solid ${border}`,
              color: accent,
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
            color: titleColor,
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
            background: pillSurface,
            border: `1px solid ${border}`,
            color: accent,
            fontWeight: 950,
            fontSize: 14,
          }}
        >
          {ride.waitTime != null ? `${ride.waitTime} min wait` : "Wait unavailable"}
        </div>

        {reason && (
          <p
            style={{
              margin: "10px 0 0",
              color: mutedColor,
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
