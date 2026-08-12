import { AlertTriangle } from "lucide-react";

// 62B-2F-1. This banner renders only for "stale" and "mock", so it is a
// conditional surface that would otherwise appear as a bright amber block in an
// otherwise dark Home. Day values are preserved exactly; night is a dark
// translucent amber with warm readable text and a restrained border.
const DAY_STATUS_STYLE = {
  backgroundColor: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
};

const NIGHT_STATUS_STYLE = {
  backgroundColor: "rgba(67, 20, 7, 0.55)",
  border: "1px solid rgba(251, 146, 60, 0.34)",
  color: "#FDBA74",
};

export function DataStatusBanner({ source, night = false }) {
  if (source === "live" || source === "cached" || !source) return null;
  const messages = {
    stale: "Using slightly older data while we refresh in the background.",
    mock: "Live data is currently unavailable. Showing best estimates.",
  };
  return (
    <div style={{ marginTop: "8px", padding: "10px 14px", borderRadius: "16px", display: "flex", alignItems: "flex-start", gap: "8px", ...(night ? NIGHT_STATUS_STYLE : DAY_STATUS_STYLE), fontSize: "11px" }}>
      <AlertTriangle size={14} style={{ marginTop: "2px", flexShrink: 0 }} />
      <p style={{ margin: 0, lineHeight: 1.3 }}>{messages[source] || "Data status unclear."}</p>
    </div>
  );
}
