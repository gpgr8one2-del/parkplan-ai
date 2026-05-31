import React from "react";

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

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        border: `1px solid ${borderColor}`,
        background,
      }}
    >
      <div style={{ fontSize: 12, color, fontWeight: 900 }}>{title}</div>

      <h4 style={{ margin: "4px 0", fontSize: titleSize }}>{ride.name}</h4>

      <p style={{ margin: 0, color, fontWeight: 800 }}>
        {ride.waitTime} min wait
      </p>

      {reason && (
        <p style={{ margin: "8px 0 0", color: "#334155" }}>
          {reason}
        </p>
      )}

      {renderShowtimeInfo?.(ride)}
      {renderRideActions?.(ride)}
    </div>
  );
}

export default RecommendationCard;
