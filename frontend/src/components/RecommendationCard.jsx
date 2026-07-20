import React, { useEffect, useRef, useState } from "react";
import { colors } from "../theme";

const SLOT_STYLES = {
  "BEST MOVE": {
    eyebrow: "BEST MOVE",
    accent: colors.success,
    accentNight: "#6EE7B7",
    accentSoft: colors.successSoft,
    border: "rgba(5, 150, 105, 0.24)",
  },
  "SMART BACKUP": {
    eyebrow: "SMART BACKUP",
    accent: "#0284C7",
    accentNight: "#7DD3FC",
    accentSoft: colors.skySoft,
    border: "rgba(56, 189, 248, 0.32)",
  },
  "WORTH THE WALK": {
    eyebrow: "WORTH THE WALK",
    accent: colors.purple,
    accentNight: "#C4B5FD",
    accentSoft: colors.purpleSoft,
    border: "rgba(124, 58, 237, 0.26)",
  },
  "PLAN AHEAD": {
    eyebrow: "PLAN AHEAD",
    accent: colors.amber,
    accentNight: "#FCD34D",
    accentSoft: colors.amberSoft,
    border: "rgba(245, 158, 11, 0.32)",
  },
  "WAIT ON THIS": {
    eyebrow: "WAIT ON THIS",
    accent: "#B45309",
    accentNight: "#FCD34D",
    accentSoft: colors.amberSoft,
    border: "rgba(245, 158, 11, 0.26)",
  },
};

// Local compact-card presentation tokens (61C-1). Presentation-only: slot
// accents still come from SLOT_STYLES; night stays a navy surface with a
// thin purple border per the approved blueprint.
const COMPACT_CARD = {
  padding: 12,
  daySurface: "#FFFFFF",
  nightSurface: "#131C36",
  nightBorder: "rgba(139, 92, 246, 0.32)",
  dayShadow: "0 6px 14px rgba(28, 25, 23, 0.05)",
  nightShadow: "0 8px 18px rgba(2, 6, 23, 0.35)",
};

const TWO_LINE_CLAMP = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

function getSlotStyle(title, fallbackColor, fallbackBorder) {
  return (
    SLOT_STYLES[title] || {
      eyebrow: title,
      accent: fallbackColor || colors.purple,
      accentNight: "#C4B5FD",
      accentSoft: colors.purpleSoft,
      border: fallbackBorder || colors.cardBorder,
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
  protectReason = false,
  artwork = null,
  renderShowtimeInfo,
  renderRideActions,
}) {
  const [reasonExpanded, setReasonExpanded] = useState(false);
  const [reasonClipped, setReasonClipped] = useState(false);
  const reasonRef = useRef(null);

  // Only measure while the reason is visually clamped; once expanded the
  // element no longer overflows, so keep the last clipped result for "Less".
  useEffect(() => {
    if (protectReason || reasonExpanded) return;
    const el = reasonRef.current;
    if (!el) return;
    setReasonClipped(el.scrollHeight > el.clientHeight + 1);
  }, [reason, protectReason, reasonExpanded]);

  if (!ride) return null;

  const slot = getSlotStyle(title, color, borderColor, background);
  const accent = night ? slot.accentNight : slot.accent;
  const border = night ? COMPACT_CARD.nightBorder : slot.border;
  const surface = night ? COMPACT_CARD.nightSurface : COMPACT_CARD.daySurface;
  const titleColor = night ? "#F5F3FF" : colors.text;
  const mutedColor = night ? "#B6C2E2" : colors.muted;
  const pillSurface = night ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.78)";
  const showFullReason = protectReason || reasonExpanded;
  const hasArtwork = Boolean(artwork?.src);

  const upperContent = (
    <>
      <div
        style={{
          fontSize: 11,
          color: accent,
          fontWeight: 950,
          letterSpacing: 0.6,
          marginBottom: 5,
        }}
      >
        {slot.eyebrow}
      </div>

      <h4
        style={{
          margin: "0 0 6px",
          fontSize: Math.min(titleSize, 18),
          lineHeight: 1.15,
          color: titleColor,
          letterSpacing: -0.25,
          ...TWO_LINE_CLAMP,
        }}
      >
        {ride.name}
      </h4>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 9px",
          borderRadius: 999,
          background: pillSurface,
          border: `1px solid ${border}`,
          color: accent,
          fontWeight: 950,
          fontSize: 13,
        }}
      >
        {ride.waitTime != null ? `${ride.waitTime} min wait` : "Wait unavailable"}
      </div>

      {reason && (
        <div style={{ margin: "8px 0 0" }}>
          <p
            ref={reasonRef}
            style={{
              margin: 0,
              color: mutedColor,
              fontSize: 12.5,
              lineHeight: 1.4,
              ...(showFullReason ? {} : TWO_LINE_CLAMP),
            }}
          >
            {reason}
          </p>

          {!protectReason && (reasonClipped || reasonExpanded) && (
            <button
              type="button"
              aria-expanded={reasonExpanded}
              onClick={() => setReasonExpanded((expanded) => !expanded)}
              style={{
                background: "none",
                border: "none",
                padding: "3px 0 0",
                fontSize: 12,
                fontWeight: 800,
                color: accent,
                cursor: "pointer",
              }}
            >
              {reasonExpanded ? "Less" : "More"}
            </button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div
      style={{
        padding: COMPACT_CARD.padding,
        borderRadius: 20,
        border: `1px solid ${border}`,
        background: surface,
        boxShadow: night ? COMPACT_CARD.nightShadow : COMPACT_CARD.dayShadow,
      }}
    >
      {hasArtwork ? (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0, flex: "1 1 auto" }}>{upperContent}</div>

          <div
            style={{
              flex: "0 0 36%",
              maxWidth: "40%",
              aspectRatio: "4 / 5",
              borderRadius: 14,
              overflow: "hidden",
              border: `1px solid ${border}`,
            }}
          >
            <img
              src={artwork.src}
              alt={artwork.alt || ""}
              loading="lazy"
              decoding="async"
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        </div>
      ) : (
        upperContent
      )}

      {renderShowtimeInfo?.(ride)}
      {renderRideActions?.(ride)}
    </div>
  );
}

export default RecommendationCard;
