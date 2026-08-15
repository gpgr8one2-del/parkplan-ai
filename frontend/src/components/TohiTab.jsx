import React from "react";
import { MessageCircle, Send } from "lucide-react";

import { colors } from "../theme";

// 64B-1 extracted this presentation verbatim from App.jsx.
//
// Presentation only: every piece of state, the whole of handleChatSubmit, the
// chat network call, the clarification interception, the reply cleaning, the
// local failure fallback, tracking, and access derivation all stay in App.jsx
// and arrive here as explicit props. This component creates no state, no
// effects, no network calls and no replacement handlers.
//
// This phase is byte-identical to the pre-extraction output, proven by
// tohiExtractionParityHarness.cjs against a pinned baseline commit. Nothing was
// redesigned, corrected, or tidied on the way across — the approved blueprints
// committed under the TOHI design documentation are a LATER phase's target, not
// this one's.
//
// Deliberately NOT in this phase, and each one is approved for the redesign:
// separate YOU/TOHI speaker labels (the inline "You: " / "TOHI: " prefixes
// below must survive extraction), QUICK CHECK styling, a distinct failure
// surface, an inline loading surface, paragraph preservation, autoscroll, a
// visible composer label, focus-ring correction, blank-input disabling,
// duplicate-submit guarding, and night support.

export function TohiTab({
  // data + derived state
  chat,
  message,
  chatLoading,
  hasPersonalizedAccess,

  // handlers owned by App
  setMessage,
  onChatSubmit,

  // renderer owned by App — passed through, never reimplemented, so its Dev
  // Preview branch and setActiveScreen wiring stay in one place
  renderLockedFeatureCard,

  // shared style objects owned by App. Passed rather than recreated because
  // React emits inline style properties in insertion order, so rebuilding them
  // locally would change the output even with identical values.
  card,
  button,
}) {
  return hasPersonalizedAccess ? (
    <section
      style={{
        ...card,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 92% 4%, rgba(124, 58, 237, 0.20) 0%, rgba(124, 58, 237, 0.05) 30%, transparent 54%), linear-gradient(155deg, #FFFFFF 0%, #FFF7ED 48%, #F3E8FF 100%)",
        border: "1px solid rgba(124, 58, 237, 0.18)",
        borderRadius: 28,
        boxShadow: "0 18px 46px rgba(91, 33, 182, 0.12)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 112,
          height: 112,
          borderRadius: "999px",
          right: -38,
          top: -44,
          background: "rgba(56, 189, 248, 0.14)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 96,
          height: 96,
          borderRadius: "999px",
          left: -42,
          bottom: -46,
          background: "rgba(245, 158, 11, 0.14)",
        }}
      />

      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(145deg, rgba(124,58,237,0.16), rgba(245,158,11,0.14))",
                border: "1px solid rgba(124, 58, 237, 0.16)",
                color: colors.purple,
                boxShadow: "0 10px 24px rgba(124, 58, 237, 0.10)",
              }}
            >
              <MessageCircle size={20} />
            </div>

            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 9px",
                  borderRadius: 999,
                  background: "rgba(124, 58, 237, 0.10)",
                  color: colors.purpleDeep,
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 0.7,
                }}
              >
                ✨ TOHI COMPANION
              </div>
              <h2
                style={{
                  margin: "8px 0 0",
                  color: colors.text,
                  fontSize: 26,
                  letterSpacing: -0.5,
                  lineHeight: 1.15,
                }}
              >
                Ask TOHI
              </h2>
            </div>
          </div>
        </div>

        <p
          style={{
            margin: "0 0 14px",
            color: colors.muted,
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 620,
          }}
        >
          Ask what to do next, how to handle heat or storms, whether a resort
          break is realistic, or how to keep the day calm without overdoing it.
        </p>

        {chat.length === 0 && (
          <div
            style={{
              display: "grid",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {[
              "What should we do next without wearing everyone out?",
              "Should we take a break or keep going?",
              "What if storms hit this afternoon?",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setMessage(prompt)}
                style={{
                  ...button,
                  justifyContent: "flex-start",
                  textAlign: "left",
                  borderRadius: 18,
                  padding: "10px 12px",
                  background: "rgba(255, 255, 255, 0.72)",
                  borderColor: "rgba(124, 58, 237, 0.14)",
                  color: colors.text,
                  boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gap: 10,
          }}
        >
          {chat.length === 0 && (
            <div
              style={{
                padding: 13,
                borderRadius: 18,
                border: `1px solid ${colors.cardBorder}`,
                background: "rgba(255, 255, 255, 0.68)",
                color: colors.muted,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              TOHI uses your park, weather, family setup, current activity,
              and recommendations to answer with real trip context.
            </div>
          )}

          {chat.map((msg, idx) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "88%",
                    padding: "11px 12px",
                    borderRadius: isUser
                      ? "18px 18px 6px 18px"
                      : "18px 18px 18px 6px",
                    background: isUser
                      ? "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)"
                      : "rgba(255, 255, 255, 0.82)",
                    border: isUser
                      ? "1px solid rgba(124, 58, 237, 0.26)"
                      : `1px solid ${colors.cardBorder}`,
                    color: isUser ? "white" : colors.text,
                    boxShadow: isUser
                      ? "0 12px 24px rgba(124, 58, 237, 0.16)"
                      : "0 10px 22px rgba(28, 25, 23, 0.05)",
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  <strong>{isUser ? "You" : "TOHI"}: </strong>
                  {msg.content}
                </div>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={onChatSubmit}
          style={{
            display: "flex",
            gap: 8,
            marginTop: 14,
            padding: 8,
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.76)",
            border: `1px solid ${colors.cardBorder}`,
            boxShadow: "0 12px 24px rgba(28, 25, 23, 0.06)",
          }}
        >
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask TOHI..."
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              borderRadius: 999,
              padding: "9px 10px",
              color: colors.text,
              background: "transparent",
              fontWeight: 700,
            }}
          />
          <button
            type="submit"
            style={{
              ...button,
              background:
                "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
              color: "white",
              borderColor: "rgba(124, 58, 237, 0.26)",
              boxShadow: "0 10px 20px rgba(124, 58, 237, 0.18)",
            }}
            disabled={chatLoading}
          >
            <Send size={14} /> {chatLoading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </section>
  ) : (
    renderLockedFeatureCard({
      title: "TOHI guidance needs your trip setup",
      body:
        "TOHI needs your trip setup so it can answer with your family, resort, height, and park context.",
      actionLabel: "Finish trip setup",
    })
  );
}

export default TohiTab;
