import { CloudRain } from "lucide-react";

/**
 * Rain check.
 *
 * A calm, nonblocking banner shown only when the forecast says rain may be
 * moving in but nothing has confirmed it is actually falling. The family can
 * tell TOHI what the sky is doing, or ignore it entirely.
 *
 * Deliberately NOT a modal: it is a polite live region, it never traps focus,
 * it never autofocuses, and it renders inline in normal document order so it
 * cannot cover anything. Everything on the page stays reachable while it is up.
 *
 * The three actions are real buttons with generous touch targets that wrap
 * rather than overflow on a narrow phone.
 */

const DAY_STYLE = {
  background: "linear-gradient(150deg, #FFFFFF 0%, #F8FAFC 55%, #EFF6FF 100%)",
  border: "1px solid rgba(37, 99, 235, 0.20)",
  boxShadow: "0 14px 34px rgba(30, 64, 175, 0.10)",
  eyebrow: "#1D4ED8",
  heading: "#0F172A",
  body: "#475569",
  quietText: "#475569",
  quietBorder: "rgba(37, 99, 235, 0.22)",
  quietBackground: "rgba(255, 255, 255, 0.75)",
};

const NIGHT_STYLE = {
  background: "linear-gradient(150deg, #0F172A 0%, #172554 100%)",
  border: "1px solid rgba(59, 130, 246, 0.42)",
  boxShadow: "0 14px 34px rgba(30, 58, 138, 0.35)",
  eyebrow: "#93C5FD",
  heading: "#E0F2FE",
  body: "#BFDBFE",
  quietText: "#BFDBFE",
  quietBorder: "rgba(59, 130, 246, 0.40)",
  quietBackground: "rgba(15, 23, 42, 0.60)",
};

const BASE_BUTTON = {
  minHeight: 44,
  padding: "10px 16px",
  borderRadius: 14,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.2,
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
};

export function RainCheckPrompt({
  watchKind = "rain",
  night = false,
  onConfirm,
  onNotYet,
  onDismiss,
}) {
  const t = night ? NIGHT_STYLE : DAY_STYLE;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Rain check"
      style={{
        marginTop: 12,
        padding: "14px 16px",
        borderRadius: 18,
        background: t.background,
        border: t.border,
        boxShadow: t.boxShadow,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 950,
          letterSpacing: 0.7,
          marginBottom: 6,
          color: t.eyebrow,
        }}
      >
        <CloudRain size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
        RAIN CHECK
      </div>

      <h3
        style={{
          margin: "0 0 6px",
          fontSize: 17,
          letterSpacing: -0.3,
          lineHeight: 1.3,
          color: t.heading,
        }}
      >
        We noticed {watchKind === "storm" ? "storms" : "rain"} may be moving in. Is it
        raining where you are?
      </h3>

      <p
        style={{
          margin: "0 0 12px",
          fontSize: 13,
          lineHeight: 1.45,
          color: t.body,
        }}
      >
        Telling us keeps the next few moves realistic. The forecast on its own
        cannot see your corner of the park.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onConfirm}
          style={{
            ...BASE_BUTTON,
            background: night ? "#1D4ED8" : "#1D4ED8",
            border: "1px solid #1D4ED8",
            color: "#FFFFFF",
          }}
        >
          Yes — switch to Rain Mode
        </button>

        <button
          type="button"
          onClick={onNotYet}
          style={{
            ...BASE_BUTTON,
            background: t.quietBackground,
            border: `1px solid ${t.quietBorder}`,
            color: t.quietText,
          }}
        >
          Not yet
        </button>

        <button
          type="button"
          onClick={onDismiss}
          style={{
            ...BASE_BUTTON,
            background: "transparent",
            border: "1px solid transparent",
            color: t.quietText,
            fontWeight: 600,
          }}
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}
