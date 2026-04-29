export function formatFreshnessTime(fetchedAt, prefix = "Updated") {
  if (!fetchedAt) return null;
  const date = new Date(fetchedAt);
  if (Number.isNaN(date.getTime())) return null;
  return `${prefix} ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export function getFreshnessLabel(source, ageMs = 0, fetchedAt = null) {
  if (source === "live") return { label: "🟢 Live", tooltip: formatFreshnessTime(fetchedAt, "Updated"), style: { backgroundColor: "#dcfce7", color: "#166534", borderColor: "#86efac" } };
  if (source === "cached") {
    const minutes = Math.max(0, Math.round(ageMs / 60000));
    return { label: minutes < 1 ? "🟡 Just now" : `🟡 Cached ${minutes}m ago`, tooltip: formatFreshnessTime(fetchedAt, "Updated"), style: { backgroundColor: "#fefce8", color: "#854d0e", borderColor: "#fde047" } };
  }
  if (source === "stale") return { label: "🟠 Using older data • refreshing", tooltip: formatFreshnessTime(fetchedAt, "Last update:"), style: { backgroundColor: "#fff7ed", color: "#9a3412", borderColor: "#fed7aa" } };
  if (source === "mock") return { label: "🟠 Estimates (live data unavailable)", tooltip: null, style: { backgroundColor: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" } };
  return { label: "⚪ Status unknown", tooltip: null, style: { backgroundColor: "#f8fafc", color: "#475569", borderColor: "#cbd5e1" } };
}
