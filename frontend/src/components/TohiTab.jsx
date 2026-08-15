import React from "react";
import { Send } from "lucide-react";

import { colors } from "../theme";

// 64B-1 extracted this presentation verbatim from App.jsx.
// 64B-2A rebuilt the DAY presentation to the approved TOHI blueprints committed
// under the TOHI design documentation.
// 64B-2B added the approved deliberate states.
//
// Still presentation only: every piece of state, the whole of handleChatSubmit,
// the chat network call, the clarification interception, the reply cleaning, the
// response validation, the connection-failure entry construction, the
// duplicate-submission latch, tracking, access derivation, and the locked card's
// real actions all stay in App.jsx and arrive here as explicit props. This
// component creates no state, no effects, no network calls and no replacement
// handlers.
//
// Gone with the redesign: both decorative corner circles, the radial card glow,
// the three-stop gradient wash, the full-purple gradient user bubble, the emoji
// text badge, the generic chat icon, and the inline "You: " / "TOHI: " prefixes.
//
// DELIVERED in 64B-2B:
//   - the distinct inline connection-status surface, rendered from the explicit
//     isConnectionFailure flag App sets — never inferred by matching reply copy
//   - malformed/missing-reply protection, which reaches this component as that
//     same marked entry rather than as an empty bubble
//   - a real duplicate-submission guard (an App-owned synchronous ref latch;
//     this component only reflects the resulting disabled state)
//   - the approved locked TOHI presentation: the branded header stays, and the
//     personalized-feature card is requested from App's renderer through an
//     opt-in variant rather than being reimplemented here
//
// Still deferred, each approved for a later phase: autoscroll, TOHI-only
// keyboard and navigation suppression, accessibility live-region work, chat
// persistence, Start Over, and night support.

// Approved day tokens, taken from the committed day blueprints.
const DAY = {
  surface: "#FFFFFF",
  surfaceQuiet: "#FFF9F1",
  line: "rgba(234, 220, 200, 0.55)",
  title: colors.text,
  muted: colors.muted,
  accent: colors.purple,
  accentDeep: colors.purpleDeep,
  accentLine: "rgba(124, 58, 237, 0.20)",
  brandPlate: colors.purpleSoft,
  brandPlateLine: "rgba(124, 58, 237, 0.16)",
  userFill: "#F6F1FF",
  skyInk: "#0369A1",
  skyFill: colors.skySoft,
  skyLine: "rgba(56, 189, 248, 0.30)",
  goldInk: "#92400E",
  goldFill: colors.amberSoft,
  goldLine: "rgba(245, 158, 11, 0.32)",
  coralInk: "#9F1239",
  coralFill: "#FFF1F3",
  coralLine: "rgba(225, 29, 72, 0.26)",
  shadow: "0 10px 30px rgba(28, 25, 23, 0.055)",
  disabledFill: "#F1EDE7",
  disabledInk: "#A9A297",
  disabledLine: "rgba(234, 220, 200, 0.85)",
};

// The three approved prompts. Order is part of the contract.
const SUGGESTED_PROMPTS = [
  "What should we do next without wearing everyone out?",
  "Should we take a break or keep going?",
  "What if storms hit this afternoon?",
];

const LOADING_COPY = "TOHI is checking your park-day context…";

// A small uppercase speaker label sits above each message, replacing the inline
// "You: " / "TOHI: " prefixes. Clarification turns carry the QUICK CHECK chip,
// driven only by the existing msg.isLiveStateQuestion value that App already
// sets — this component never infers it from copy.
function SpeakerLabel({ who, quickCheck }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1.2,
        color: who === "YOU" ? DAY.muted : DAY.accentDeep,
      }}
    >
      <span>{who}</span>
      {quickCheck && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: 999,
            background: DAY.skyFill,
            color: DAY.skyInk,
            border: `1px solid ${DAY.skyLine}`,
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          QUICK CHECK
        </span>
      )}
    </div>
  );
}

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

  // shared style objects owned by App
  card,
  button,
}) {
  // Send is unavailable while a request is in flight, and while there is nothing
  // to send. The trim guard in App is unchanged and still authoritative; this
  // only stops the control inviting a submit that App would discard.
  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  const sendDisabled = chatLoading || trimmedMessage === "";

  // 64B-2B: the approved locked state keeps the branded header and integrates
  // the personalized-feature card beneath it, so a gated TOHI tab still reads as
  // TOHI rather than as a bare generic card. The header markup is therefore
  // shared by both states rather than duplicated.
  const brandedHeader = (
    /* Approved branded header: the official committed wordmark on a compact
       plate, with the heading directly beneath. No emoji, no text badge, and
       no generic chat icon. */
    <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 12px",
            borderRadius: 999,
            background: DAY.brandPlate,
            border: `1px solid ${DAY.brandPlateLine}`,
          }}
        >
          {/* alt="" on purpose: the "Ask TOHI" heading immediately below already
              names the feature, so alt text here would be a duplicate
              announcement. The mark is decorative in this position. */}
          <img
            src="/tohi-logo.png"
            alt=""
            style={{ display: "block", width: 80, height: "auto" }}
          />
        </div>

        <h2
          style={{
            margin: 0,
            color: DAY.title,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: -0.5,
            lineHeight: 1.15,
          }}
        >
          Ask TOHI
        </h2>

        <p
          style={{
            margin: 0,
            color: DAY.muted,
            fontSize: 13.5,
            lineHeight: 1.5,
            maxWidth: "34ch",
          }}
        >
          Ask what to do next, how to handle heat or storms, whether a resort
          break is realistic, or how to keep the day calm without overdoing it.
        </p>
      </header>
  );

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Focus rings and the loading pulse need selectors that inline styles
          cannot express. This follows the same inline <style> pattern WaitsTab
          already uses rather than introducing the first stylesheet. */}
      <style>{`
        [data-tohi-focus]:focus-visible {
          outline: 2px solid ${DAY.accent};
          outline-offset: 2px;
        }
        @keyframes tohiChatPulse { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          [data-tohi-loading] span { animation: none !important; opacity: .7 !important; }
        }
      `}</style>

      {brandedHeader}

      {!hasPersonalizedAccess ? (
        // The card, its Finish trip setup navigation and its Dev Preview gate
        // all stay in App. TohiTab only asks for the TOHI variant.
        renderLockedFeatureCard({
          title: "TOHI guidance needs your trip setup",
          body:
            "TOHI needs your trip setup so it can answer with your family, resort, height, and park context.",
          actionLabel: "Finish trip setup",
          variant: "tohi",
        })
      ) : (
        <>

      {chat.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SUGGESTED_PROMPTS.map((prompt) => {
            // Selection is derived purely from an exact match with the current
            // composer value. Nothing is stored, and tapping still only fills
            // the input.
            const picked = message === prompt;

            return (
              <button
                key={prompt}
                type="button"
                data-tohi-focus="true"
                onClick={() => setMessage(prompt)}
                style={{
                  ...button,
                  justifyContent: "flex-start",
                  textAlign: "left",
                  minHeight: 48,
                  borderRadius: 16,
                  padding: "12px 14px",
                  background: picked ? DAY.userFill : DAY.surface,
                  border: `1px solid ${picked ? DAY.accentLine : DAY.line}`,
                  color: DAY.title,
                  fontSize: 13.5,
                  fontWeight: 650,
                  lineHeight: 1.35,
                  boxShadow: DAY.shadow,
                }}
              >
                {prompt}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {chat.length === 0 && (
          <div
            style={{
              borderRadius: 20,
              padding: "13px 14px",
              background: DAY.surfaceQuiet,
              border: `1px solid ${DAY.line}`,
              color: DAY.muted,
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
          const quickCheck = !isUser && msg.isLiveStateQuestion === true;

          // A connection notice is stored with an assistant role so the
          // transcript stays one ordered list, but it is NOT something TOHI
          // said. It gets its own status surface with a CONNECTION label
          // instead of a speaker bubble, driven only by the explicit flag App
          // sets — never by matching the copy. No Retry control is added; the
          // composer's existing Send is the retry.
          if (msg.isConnectionFailure === true) {
            return (
              <div
                key={idx}
                data-tohi-connection="true"
                style={{
                  maxWidth: "92%",
                  alignSelf: "flex-start",
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  borderRadius: 20,
                  padding: "12px 14px",
                  background: DAY.coralFill,
                  border: `1px solid ${DAY.coralLine}`,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 1.2,
                    color: DAY.coralInk,
                  }}
                >
                  CONNECTION
                </span>
                <span
                  style={{
                    color: DAY.coralInk,
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                alignItems: isUser ? "flex-end" : "flex-start",
              }}
            >
              <SpeakerLabel who={isUser ? "YOU" : "TOHI"} quickCheck={quickCheck} />

              <div
                style={{
                  maxWidth: isUser ? "85%" : "92%",
                  borderRadius: 20,
                  padding: "12px 14px",
                  background: isUser ? DAY.userFill : DAY.surface,
                  border: `1px solid ${isUser ? DAY.accentLine : DAY.line}`,
                  color: DAY.title,
                  boxShadow: DAY.shadow,
                  fontSize: 14,
                  lineHeight: 1.5,
                  // Replies arrive as plain text with real newlines. pre-wrap
                  // keeps the paragraph breaks the model wrote, without parsing
                  // or injecting any markup.
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Sending. The submitted message stays above this; no assistant reply
            is invented, and nothing is removed from the transcript. */}
        {chatLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
            <SpeakerLabel who="TOHI" />
            <div
              data-tohi-loading="true"
              style={{
                maxWidth: "92%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 20,
                padding: "12px 14px",
                background: DAY.goldFill,
                border: `1px solid ${DAY.goldLine}`,
                color: DAY.goldInk,
                fontSize: 13,
                fontWeight: 650,
                lineHeight: 1.4,
              }}
            >
              <span
                aria-hidden="true"
                style={{ display: "inline-flex", gap: 4, flex: "0 0 auto" }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: "currentColor",
                      opacity: 0.35,
                      animation: `tohiChatPulse 1.25s ease-in-out ${i * 0.18}s infinite`,
                    }}
                  />
                ))}
              </span>
              {LOADING_COPY}
            </div>
          </div>
        )}
      </div>

      {/* Approved composer. Same form callback, same setter, same placeholder. */}
      <form
        onSubmit={onChatSubmit}
        style={{
          ...card,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: DAY.surface,
          border: `1px solid ${DAY.line}`,
          borderRadius: 24,
          padding: 12,
          boxShadow: DAY.shadow,
          marginBottom: 0,
        }}
      >
        <label
          htmlFor="tohi-question"
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 1.1,
            color: DAY.muted,
          }}
        >
          Your question
        </label>

        <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
          <input
            id="tohi-question"
            data-tohi-focus="true"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask TOHI..."
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 48,
              borderRadius: 16,
              padding: "12px 13px",
              background: DAY.surface,
              border: `1px solid ${DAY.line}`,
              color: DAY.title,
              fontSize: 14,
              lineHeight: 1.35,
              fontFamily: "inherit",
            }}
          />

          <button
            type="submit"
            data-tohi-focus="true"
            disabled={sendDisabled}
            style={{
              ...button,
              flex: "0 0 auto",
              minHeight: 48,
              borderRadius: 16,
              padding: "0 18px",
              fontSize: 14,
              fontWeight: 800,
              background: sendDisabled ? DAY.disabledFill : DAY.accent,
              border: `1px solid ${sendDisabled ? DAY.disabledLine : DAY.accentLine}`,
              color: sendDisabled ? DAY.disabledInk : "#FFFFFF",
              cursor: sendDisabled ? "not-allowed" : "pointer",
            }}
          >
            <Send size={15} /> Send
          </button>
        </div>
      </form>
        </>
      )}
    </section>
  );
}

export default TohiTab;
