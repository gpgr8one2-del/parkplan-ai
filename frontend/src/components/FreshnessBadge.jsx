import { getFreshnessLabel } from "../utils/freshness";

export function FreshnessBadge({ source, ageMs, fetchedAt }) {
  const { label, tooltip, style } = getFreshnessLabel(source, ageMs, fetchedAt);
  return (
    <span
      title={tooltip || undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        fontSize: "10px",
        fontWeight: 900,
        borderRadius: "9999px",
        border: "1px solid",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
    </span>
  );
}
