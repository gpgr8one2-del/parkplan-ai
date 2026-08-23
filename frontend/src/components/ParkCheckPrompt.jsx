import { colors } from "../theme";

/**
 * Park Check.
 *
 * The existing park-presence confirmation, extracted from HomeTab so Home and
 * Waits can render the SAME prompt rather than each owning a copy. Nothing
 * about its copy, actions, accessibility or day/night treatment changes here —
 * this is a move, not a redesign.
 *
 * It holds no park-presence logic of its own. Whether a prompt exists, which
 * park it names, and what confirming or dismissing does all stay with App and
 * utils/parkPresence. This component only draws what it is handed, so it can
 * never confirm a park on its own or disagree with the other surface.
 */
export function ParkCheckPrompt({
  parkPresencePrompt,
  night = false,
  getParkNameById,
  handleConfirmParkPresence,
  handleDismissParkPresencePrompt,
  button,
}) {
  if (!parkPresencePrompt) return null;

  const isDetectedArrival = parkPresencePrompt.type === "detected_arrival";
  const parkName = getParkNameById(parkPresencePrompt.parkId);

  return (
    <section
      // Key ORDER matters, not just the values: React serialises inline styles
      // in insertion order, and Home's rendering is byte-pinned. This is
      // exactly the order `{ ...card, position, overflow, background, border,
      // boxShadow }` produced — borderRadius, padding and marginBottom are the
      // only three values this prompt ever took from the shared `card` object,
      // so owning them lets Waits render the same prompt without threading
      // `card` back into that surface.
      style={{
        background: night
          ? "linear-gradient(150deg, #0F172A 0%, #1E1B4B 100%)"
          : "linear-gradient(150deg, #FFFFFF 0%, #FFF9F1 55%, #F3E8FF 100%)",
        border: night
          ? "1px solid rgba(139, 92, 246, 0.45)"
          : "1px solid rgba(124, 58, 237, 0.20)",
        borderRadius: 24,
        padding: 16,
        boxShadow: night
          ? "0 14px 34px rgba(76, 29, 149, 0.35)"
          : "0 14px 34px rgba(91, 33, 182, 0.10)",
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 950,
          letterSpacing: 0.7,
          marginBottom: 6,
          color: night ? "#C4B5FD" : colors.purpleDeep,
        }}
      >
        PARK CHECK
      </div>

      <h3
        style={{
          margin: "0 0 6px",
          fontSize: 20,
          letterSpacing: -0.3,
          color: night ? "#F5F3FF" : colors.text,
        }}
      >
        {isDetectedArrival
          ? `Looks like you’ve arrived at ${parkName}`
          : `Are you at ${parkName} now?`}
      </h3>

      <p
        style={{
          margin: "0 0 12px",
          fontSize: 13,
          lineHeight: 1.45,
          color: night ? "#C7D2FE" : colors.muted,
        }}
      >
        {isDetectedArrival
          ? `Start using ${parkName} waits and recommendations?`
          : `TOHI can start using ${parkName} waits, weather, and recommendations.`}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => handleConfirmParkPresence(parkPresencePrompt.parkId)}
          style={{
            ...button,
            background: night ? "#6D28D9" : colors.purpleDeep,
            borderColor: night ? "#6D28D9" : colors.purpleDeep,
            color: "white",
          }}
        >
          {isDetectedArrival ? `I’m at ${parkName} now` : "I’m here now"}
        </button>

        <button
          type="button"
          onClick={handleDismissParkPresencePrompt}
          style={{
            ...button,
            ...(night
              ? {
                  background: "rgba(30, 27, 75, 0.6)",
                  color: "#C7D2FE",
                  borderColor: "rgba(139, 92, 246, 0.4)",
                }
              : { color: colors.muted }),
          }}
        >
          {isDetectedArrival ? "Not yet" : "Just checking"}
        </button>
      </div>
    </section>
  );
}
