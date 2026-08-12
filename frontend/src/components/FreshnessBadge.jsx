import { getFreshnessLabel } from "../utils/freshness";

// 62B-2F-1 night variants. getFreshnessLabel stays untouched — it owns the
// label, tooltip and source logic, and it is shared. Only the presentation is
// selected here, keyed by the same source values that utility already branches
// on, so the two cannot drift apart in what they consider a state.
//
// Day pills are pale fills with dark text. Those stay high-contrast on a dark
// card but read as bright day chips on it, so night uses muted navy/translucent
// fills and moves the recognisable status hue onto the text and border.
const NIGHT_BADGE_STYLES = {
  live: {
    backgroundColor: "rgba(6, 78, 59, 0.55)",
    color: "#6EE7B7",
    borderColor: "rgba(52, 211, 153, 0.42)",
  },
  cached: {
    backgroundColor: "rgba(69, 26, 3, 0.50)",
    color: "#FCD34D",
    borderColor: "rgba(251, 191, 36, 0.40)",
  },
  stale: {
    backgroundColor: "rgba(67, 20, 7, 0.55)",
    color: "#FDBA74",
    borderColor: "rgba(251, 146, 60, 0.42)",
  },
  mock: {
    backgroundColor: "rgba(69, 10, 10, 0.55)",
    color: "#FCA5A5",
    borderColor: "rgba(248, 113, 113, 0.42)",
  },
  unknown: {
    backgroundColor: "rgba(30, 41, 59, 0.66)",
    color: "#C7D2FE",
    borderColor: "rgba(99, 102, 241, 0.34)",
  },
};

function resolveNightBadgeStyle(source) {
  if (source === "live") return NIGHT_BADGE_STYLES.live;
  if (source === "cached") return NIGHT_BADGE_STYLES.cached;
  if (source === "stale") return NIGHT_BADGE_STYLES.stale;
  if (source === "mock") return NIGHT_BADGE_STYLES.mock;
  return NIGHT_BADGE_STYLES.unknown;
}

export function FreshnessBadge({ source, ageMs, fetchedAt, night = false }) {
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
        // Night overrides the day palette AFTER it is spread, so no day fill
        // survives underneath. Day is byte-identical to before.
        ...(night ? resolveNightBadgeStyle(source) : null),
      }}
    >
      {label}
    </span>
  );
}
