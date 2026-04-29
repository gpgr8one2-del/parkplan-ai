import { AlertTriangle } from "lucide-react";

export function DataStatusBanner({ source }) {
  if (source === "live" || source === "cached" || !source) return null;
  const messages = {
    stale: "Using slightly older data while we refresh in the background.",
    mock: "Live data is currently unavailable. Showing best estimates.",
  };
  return (
    <div style={{ marginTop: "8px", padding: "10px 14px", borderRadius: "16px", display: "flex", alignItems: "flex-start", gap: "8px", backgroundColor: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: "11px" }}>
      <AlertTriangle size={14} style={{ marginTop: "2px", flexShrink: 0 }} />
      <p style={{ margin: 0, lineHeight: 1.3 }}>{messages[source] || "Data status unclear."}</p>
    </div>
  );
}
