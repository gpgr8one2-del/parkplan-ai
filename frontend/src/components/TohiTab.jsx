import React, { useEffect, useRef } from "react";
import { Mic, Play, Send, Square, Volume2, VolumeX } from "lucide-react";

import { colors } from "../theme";
import { VOICE_COPY } from "../utils/voiceRecording";
import { SPEECH_COPY } from "../utils/voiceSpeech";

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
// 64B-2C delivered autoscroll, TOHI-only keyboard and navigation suppression,
// and the accessibility log/status split. 64B-2D added the Safari toolbar
// clearance and the state-aware keyboard rule.
//
// 64B-2E-1 added the approved NIGHT presentation and 64B-2E-2 activated it — see
// the TOHI_NIGHT table below. Still deferred: chat persistence and Start Over.

// Approved day tokens, taken from the committed day blueprints.
//
// 64B-2E-1 added inputFill, inputLine and onAccent. Day reuses the exact values
// the input and Send button already rendered inline, so day output is unchanged
// to the byte; they exist because night draws the input as its own recessed
// well rather than reusing the card surface.
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
  inputFill: "#FFFFFF",
  inputLine: "rgba(234, 220, 200, 0.55)",
  onAccent: "#FFFFFF",
};

// 64B-2E-1. The approved NIGHT tokens, measured off the committed night
// blueprints rather than interpreted.
//
// Method, identical to the one WaitsTab documents: every value below is the
// colour the night sheet renders at the exact coordinate where the day sheet
// renders the day value named beside it. Nothing here was chosen by eye and
// nothing was carried over from another product surface by assumption.
//
// Two day tokens map to more than one night value, so each was resolved at its
// own surface instead of being substituted globally:
//   - #FFF9F1 -> #0A1022 at the empty-state card (measured in state 1). The
//     #0E172A instances of #FFF9F1 elsewhere on the sheet are the bottom
//     navigation, which BottomTabs owns and which this file never draws.
//   - #5B21B6 -> #C4B5FD at the TOHI speaker label, and -> #8B5CF6 at the
//     locked card's Finish trip setup button. The button belongs to App's
//     shared locked-card renderer, which already carries its own night branch,
//     so accentDeep here is the speaker-label value only.
//
// PREPARED in 64B-2E-1 behind an inactive gate, ACTIVATED in 64B-2E-2. App now
// passes the shared explicit shellNight value — the one decision Home, Waits and
// Plan read — so content, page background and navigation flip in a single render.
//
// `night` is an explicit boolean prop and nothing else. It is never derived here
// from the clock, planNight, shellNight, theme state, the active tab, storage, a
// media query, or browser appearance. One parent owns the decision; this file
// only renders it.
const TOHI_NIGHT = {
  surface: "#131C36", //        <- DAY.surface        #FFFFFF
  surfaceQuiet: "#0A1022", //   <- DAY.surfaceQuiet   #FFF9F1
  line: "#282E66", //           <- DAY.line
  title: "#F5F3FF", //          <- DAY.title          #241C15
  muted: "#B6C2E2", //          <- DAY.muted          #7A6F63
  accent: "#8B5CF6", //         <- DAY.accent         #7C3AED
  accentDeep: "#C4B5FD", //     <- DAY.accentDeep     #5B21B6 (speaker label)
  accentLine: "#48378B", //     <- DAY.accentLine
  // The pale plate is intentional and is NOT darkened. The committed wordmark
  // ink may not be recoloured, and on the navy shell it would fall to about
  // 2.8:1. The plate carries it at roughly 4.8:1 while staying clearly not
  // white. The README locks this exception.
  brandPlate: "#E9E3FB", //     <- DAY.brandPlate     #F3E8FF
  brandPlateLine: "#BDAAEC", // <- DAY.brandPlateLine
  userFill: "#1F214A", //       <- DAY.userFill       #F6F1FF
  skyInk: "#7ACEF6", //         <- DAY.skyInk         #0369A1
  skyFill: "#182C49", //        <- DAY.skyFill        #E0F2FE
  skyLine: "#1A3F60", //        <- DAY.skyLine
  goldInk: "#FCD34D", //        <- DAY.goldInk        #92400E
  goldFill: "#2F1B1A", //       <- DAY.goldFill       #FEF3C7
  goldLine: "#75521D", //       <- DAY.goldLine
  coralInk: "#FDA4AF", //       <- DAY.coralInk       #9F1239
  coralFill: "#2A0B1F", //      <- DAY.coralFill      #FFF1F3
  coralLine: "#6D2B40", //      <- DAY.coralLine
  // Same offset and blur as day — a shadow's geometry is spacing, and the
  // blueprint locks day and night to identical structure and spacing. Only the
  // colour deepens.
  shadow: "0 10px 30px rgba(2, 6, 23, 0.45)",
  disabledFill: "#131B32", //   <- DAY.disabledFill   #F1EDE7
  disabledInk: "#6A7598", //    <- DAY.disabledInk    #A9A297
  disabledLine: "#282E66", //   <- DAY.disabledLine
  // Day draws the input on the same white as its card. Night does not: the
  // sheet recesses the field below the composer surface, so it needs its own
  // fill and border rather than reusing `surface` and `line`.
  inputFill: "#090F21", //      <- DAY.inputFill      #FFFFFF
  inputLine: "#4B536A", //      <- DAY.inputLine
  onAccent: "#FFFFFF", //       <- DAY.onAccent — Send label stays white on violet
};

// The three approved prompts. Order is part of the contract.
const SUGGESTED_PROMPTS = [
  "What should we do next without wearing everyone out?",
  "Should we take a break or keep going?",
  "What if storms hit this afternoon?",
];

const LOADING_COPY = "TOHI is checking your park-day context…";

// 64B-2C. How much the visual viewport must shrink before we call it a software
// keyboard rather than ordinary browser chrome moving.
//
// The two things we must tell apart differ by roughly a factor of three:
//   - iOS Safari's collapsing URL bar / toolbars shrink the visual viewport by
//     about 44–88px depending on orientation and Safari version.
//   - A software keyboard takes roughly 250–340px in portrait, and still around
//     200px in landscape on the smallest phones.
//
// 150px sits comfortably in the gap: well above the largest toolbar movement we
// expect, and well below the smallest real keyboard. A percentage alone would be
// unreliable because landscape viewports are short enough that a toolbar can be
// a large fraction of them.
const KEYBOARD_MIN_VIEWPORT_SHRINK_PX = 150;

// 64B-2D. Scroll clearance kept beneath the composer while the keyboard is open.
//
// iPhone Safari floats its address/toolbar bar ABOVE the software keyboard, and
// that bar is not part of the visual viewport it reports. So scrolling the
// composer flush to the bottom of the reduced viewport is not enough — Safari's
// own bar then sits on top of the Send button and the input. Real-device QA saw
// exactly that.
//
// The floating bar measures roughly 50–56pt, and sits a little above the
// keyboard rather than flush against it. 96px clears the bar itself plus the
// gap, with room left for the taller layout Safari uses in landscape.
//
// This is applied as scroll-margin, NOT padding or a spacer. scroll-margin only
// changes where scrollIntoView decides to stop; it contributes nothing to layout
// and is invisible when the keyboard is closed.
const COMPOSER_TOOLBAR_CLEARANCE_PX = 96;

// 64B-2C, revised in 64B-2D. The whole keyboard decision, as one pure function.
//
// It is exported so the rule can be exercised directly with real numbers rather
// than inferred from the source or from a simulated browser. The effect below is
// the only caller in production; it supplies the live values and does nothing
// with the answer except report it upward.
//
// 64B-2D made it state-aware, because on a real iPhone the keyboard does not
// close at the instant focus is lost. Safari drops focus first and restores the
// visual viewport a moment later, so the previous focus-only rule reported
// "closed" while the viewport was still keyboard-sized. BottomTabs then remounted
// inside the shrunken viewport and appeared halfway up the screen before settling.
//
// So opening and staying open are deliberately different questions:
//   - OPENING requires both a focused composer and a keyboard-sized shrink. A
//     shrink alone must never open it, or browser chrome would hide navigation.
//   - STAYING OPEN requires only that the viewport is still keyboard-sized.
//     Losing focus mid-dismissal is not evidence the keyboard has gone.
//
// It closes when the viewport genuinely comes back, which Safari tells us via
// the resize/scroll events the effect already listens to. There is no timer and
// no guess about how long a dismissal takes.
//
// The remaining "no" cases each protect a different user:
//   - no access           -> locked TOHI has no composer at all
//   - no viewport height  -> visualViewport is unsupported, so fail safe
export function isComposerKeyboardOpen({
  wasOpen,
  composerFocused,
  hasAccess,
  innerHeight,
  viewportHeight,
}) {
  if (!hasAccess) return false;
  if (typeof innerHeight !== "number" || typeof viewportHeight !== "number") return false;

  const keyboardSizedShrink =
    innerHeight - viewportHeight >= KEYBOARD_MIN_VIEWPORT_SHRINK_PX;

  // The viewport came back: the keyboard is really gone, whatever focus says.
  if (!keyboardSizedShrink) return false;
  // Already open and still shrunk — hold, even through the focus loss that
  // begins a dismissal.
  if (wasOpen) return true;
  // Opening from closed still needs the composer to be the reason.
  return Boolean(composerFocused);
}

// Scrolling and keyboard-follow both honour the user's motion preference. Read
// at call time rather than cached, so a preference change mid-session applies.
function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function scrollElementIntoView(element, block) {
  if (!element || typeof element.scrollIntoView !== "function") return;
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block,
  });
}

// A small uppercase speaker label sits above each message, replacing the inline
// "You: " / "TOHI: " prefixes. Clarification turns carry the QUICK CHECK chip,
// driven only by the existing msg.isLiveStateQuestion value that App already
// sets — this component never infers it from copy.
function SpeakerLabel({ who, quickCheck, t }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1.2,
        color: who === "YOU" ? t.muted : t.accentDeep,
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
            background: t.skyFill,
            color: t.skyInk,
            border: `1px solid ${t.skyLine}`,
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

  // 64C-A2 voice input. Presentation only, exactly like everything else here:
  // App owns the recorder, the permission prompt, the upload, the transcript
  // and the submission. This component renders a button and some copy.
  //
  // Every one of these defaults to the "no voice" value, so a caller that has
  // not opted in renders the composer byte-for-byte as it was before A2.
  voiceSupported = false,
  voiceState = "idle",
  voiceBusy = false,
  voiceStatusMessage = "",
  onVoicePress,

  // 64C-A3 spoken replies. Presentation only, exactly like the voice-input
  // props: App owns synthesis, the Audio element, the object-URL lifecycle and
  // every cancellation rule. This component renders controls and reflects
  // state. All default to the "no speech" value, so a caller that has not
  // opted in renders exactly as it did before A3.
  speechSupported = false,
  speechState = "idle",
  voiceRepliesEnabled = true,
  onToggleVoiceReplies,
  onStopSpeech,
  onPlaySpeech,

  // renderer owned by App — passed through, never reimplemented, so its Dev
  // Preview branch and setActiveScreen wiring stay in one place
  renderLockedFeatureCard,

  // 64B-2C: reports ONLY whether this composer's software keyboard is open. App
  // decides what to do with it. No other component observes the viewport.
  onComposerKeyboardChange,

  // 64B-2E-1: the ONE explicit, parent-owned presentation switch. Defaulting to
  // false means any caller that has not opted in still renders day, so the gate
  // cannot open by accident.
  night = false,

  // shared style objects owned by App
  card,
  button,
}) {
  // Send is unavailable while a request is in flight, and while there is nothing
  // to send. The trim guard in App is unchanged and still authoritative; this
  // only stops the control inviting a submit that App would discard.
  // 64B-2E-1: the whole night decision, in one place. When night is false this
  // is the DAY object itself, by identity, so the day render is unchanged.
  const t = night ? TOHI_NIGHT : DAY;

  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  // 64C-A2 adds voiceBusy for one reason: while the microphone is listening or
  // a transcript is being fetched, a typed submit would race the spoken one.
  // The moment voice finishes or fails, App sets it false and typing is
  // restored. When voice is unsupported it is always false, so this reduces to
  // the original expression.
  const sendDisabled = chatLoading || trimmedMessage === "" || voiceBusy;

  // The microphone is rendered only when App reports a usable recorder AND has
  // given us something to call. No capability is detected here.
  const showVoice = voiceSupported === true && typeof onVoicePress === "function";
  const voiceListening = voiceState === "listening";
  const voicePending = voiceState === "requesting" || voiceState === "transcribing";

  // App already refuses to start a recording while a chat turn is in flight.
  // Without this the control still LOOKED available and the tap did nothing
  // visible, which reads as a broken button. Stopping an in-progress recording
  // stays allowed, so a turn that starts mid-recording cannot trap the guest.
  //
  // Deliberately NOT folded into voicePending: that value describes what the
  // microphone itself is doing, and drives aria-busy. Chat sending is a
  // separate reason for unavailability and must not be announced as the
  // microphone being busy.
  const voiceBlockedByChat = chatLoading === true && !voiceListening;
  const voiceDisabled = voicePending || voiceBlockedByChat;

  // 64C-A3. Speech controls appear only alongside a usable microphone: a spoken
  // reply can only follow a spoken question, so without voice input there is
  // nothing for them to control.
  const showSpeech = showVoice && speechSupported === true;
  const speechSpeaking = speechState === "speaking" || speechState === "loading";
  const speechBlocked = speechState === "blocked";
  const showPlaybackControl = showSpeech && (speechSpeaking || speechBlocked);

  // 64B-2C DOM refs. These exist for scrolling, focused-composer detection and
  // viewport observation only. No chat data, submission logic, validation or
  // access decision lives here — all of that is still App's.
  const transcriptEndRef = useRef(null);
  const composerRef = useRef(null);
  const composerFocusedRef = useRef(false);
  const keyboardOpenRef = useRef(false);
  const evaluateKeyboardRef = useRef(() => {});

  // The callback is held in a ref so the viewport effect does not re-subscribe
  // on every render if a caller passes an inline function.
  const notifyKeyboardRef = useRef(onComposerKeyboardChange);
  notifyKeyboardRef.current = onComposerKeyboardChange;

  // --- keep the newest activity visible -------------------------------------
  // Keyed on the transcript length and the loading flag, so a submitted message,
  // the loading surface, a reply and a connection notice each bring themselves
  // into view. The target is a stable end sentinel — nothing is located by
  // matching message text. Native page scrolling is untouched; there is no
  // separate scrolling panel.
  useEffect(() => {
    if (chat.length === 0 && !chatLoading) return undefined;
    const frame = requestAnimationFrame(() => {
      scrollElementIntoView(transcriptEndRef.current, "end");
    });
    return () => cancelAnimationFrame(frame);
  }, [chat.length, chatLoading]);

  // --- software-keyboard detection ------------------------------------------
  // This effect owns only the plumbing: it reads the live focus and viewport
  // values plus the current open state, hands them to isComposerKeyboardOpen
  // above, and reports the answer upward. The rule itself lives in that pure
  // function, so it can be exercised directly rather than through a simulated
  // browser.
  //
  // Both viewport events are observed because iOS fires resize when the keyboard
  // animates in and scroll when the page settles underneath it. Since 64B-2D
  // those same events are also what CLOSES the state: the rule holds open until
  // Safari actually restores the viewport, so no timer is needed.
  useEffect(() => {
    const viewport =
      typeof window !== "undefined" && window.visualViewport ? window.visualViewport : null;

    const report = (open) => {
      if (open === keyboardOpenRef.current) return;
      keyboardOpenRef.current = open;
      if (typeof notifyKeyboardRef.current === "function") {
        notifyKeyboardRef.current(open);
      }
    };

    const evaluate = () => {
      const open = isComposerKeyboardOpen({
        // 64B-2D: the rule needs to know whether it is already open, so a focus
        // loss during dismissal cannot close it while the viewport is still
        // keyboard-sized. This is the same ref report() maintains.
        wasOpen: keyboardOpenRef.current,
        composerFocused: composerFocusedRef.current,
        hasAccess: hasPersonalizedAccess,
        innerHeight: typeof window !== "undefined" ? window.innerHeight : null,
        // null when visualViewport is unsupported, which the rule treats as
        // "no keyboard" so navigation simply stays visible.
        viewportHeight: viewport ? viewport.height : null,
      });
      report(open);
      if (open) {
        // Keep the whole composer inside the reduced viewport. The form carries
        // scrollMarginBottom, so this stops short of Safari's floating toolbar
        // rather than tucking the composer underneath it.
        scrollElementIntoView(composerRef.current, "end");
      }
    };

    evaluateKeyboardRef.current = evaluate;

    if (viewport) {
      viewport.addEventListener("resize", evaluate);
      viewport.addEventListener("scroll", evaluate);
    }
    evaluate();

    return () => {
      if (viewport) {
        viewport.removeEventListener("resize", evaluate);
        viewport.removeEventListener("scroll", evaluate);
      }
      evaluateKeyboardRef.current = () => {};
      // Unmount, leaving TOHI, or losing access all restore normal navigation.
      report(false);
    };
  }, [hasPersonalizedAccess]);

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
            background: t.brandPlate,
            border: `1px solid ${t.brandPlateLine}`,
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
            color: t.title,
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
            color: t.muted,
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
          outline: 2px solid ${t.accent};
          outline-offset: 2px;
        }
        @keyframes tohiChatPulse { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          [data-tohi-loading] span { animation: none !important; opacity: .7 !important; }${showVoice ? `
          [data-tohi-listening] { animation: none !important; opacity: 1 !important; }` : ""}
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
          // The shared App renderer already carries its own night branch; this
          // only tells it which mode TOHI is in. It is not redesigned here.
          night,
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
                  background: picked ? t.userFill : t.surface,
                  border: `1px solid ${picked ? t.accentLine : t.line}`,
                  color: t.title,
                  fontSize: 13.5,
                  fontWeight: 650,
                  lineHeight: 1.35,
                  boxShadow: t.shadow,
                }}
              >
                {prompt}
              </button>
            );
          })}
        </div>
      )}

      {/* 64B-2C: the transcript is an accessible log holding the conversation
          entries and nothing else. aria-relevant="additions" is what stops a new
          reply re-announcing the whole conversation — only the added entry is
          spoken. aria-busy reflects the real chatLoading value, so assistive
          tech knows a reply is on its way.

          The loading surface is deliberately NOT in here. A region cannot
          reliably announce its own contents while it is marked busy, so the
          temporary loading copy lives in its own status region below. */}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={chatLoading}
        aria-label="TOHI conversation"
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        {chat.length === 0 && (
          <div
            style={{
              borderRadius: 20,
              padding: "13px 14px",
              background: t.surfaceQuiet,
              border: `1px solid ${t.line}`,
              color: t.muted,
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
                  background: t.coralFill,
                  border: `1px solid ${t.coralLine}`,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 1.2,
                    color: t.coralInk,
                  }}
                >
                  CONNECTION
                </span>
                <span
                  style={{
                    color: t.coralInk,
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
              <SpeakerLabel who={isUser ? "YOU" : "TOHI"} quickCheck={quickCheck} t={t} />

              <div
                style={{
                  maxWidth: isUser ? "85%" : "92%",
                  borderRadius: 20,
                  padding: "12px 14px",
                  background: isUser ? t.userFill : t.surface,
                  border: `1px solid ${isUser ? t.accentLine : t.line}`,
                  color: t.title,
                  boxShadow: t.shadow,
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
      </div>

      {/* Sending. The submitted message stays above this; no assistant reply is
          invented, and nothing is removed from the transcript.

          This sits OUTSIDE the busy log, as its own status region, so the
          loading copy has exactly one announcement path. aria-atomic groups the
          speaker label and the copy into a single utterance rather than letting
          them be read as two unrelated fragments. role="status" is already
          implicitly polite, so no second aria-live is declared anywhere.

          Its visual position is unchanged: the parent <section> is the same
          14-gap column as the log, so this renders exactly where it did as the
          log's last child, with the same styling. */}
      {chatLoading && (
        <div
          role="status"
          aria-atomic="true"
          style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}
        >
          <SpeakerLabel who="TOHI" t={t} />
          <div
            data-tohi-loading="true"
            style={{
              maxWidth: "92%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderRadius: 20,
              padding: "12px 14px",
              background: t.goldFill,
              border: `1px solid ${t.goldLine}`,
              color: t.goldInk,
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

      {/* Stable scroll target, kept after the loading region so bringing it into
          view also reveals whichever of the two rendered last. The newest
          activity is scrolled to via this sentinel, never by locating an element
          from its message text. It is an empty flex child of the same 14-gap
          column it previously occupied inside the log, so spacing is unchanged. */}
      <div ref={transcriptEndRef} aria-hidden="true" />

      {/* Approved composer. Same form callback, same setter, same placeholder.
          64B-2D adds scroll-margin only: it is what stops iPhone Safari's
          floating address bar covering the input and Send button when the
          keyboard-follow scroll runs. It changes no visible spacing. */}
      <form
        ref={composerRef}
        onSubmit={onChatSubmit}
        style={{
          ...card,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: t.surface,
          border: `1px solid ${t.line}`,
          borderRadius: 24,
          padding: 12,
          boxShadow: t.shadow,
          marginBottom: 0,
          // Affects where scrollIntoView stops, never layout. See
          // COMPOSER_TOOLBAR_CLEARANCE_PX for why the room is needed.
          scrollMarginBottom: COMPOSER_TOOLBAR_CLEARANCE_PX,
        }}
      >
        <label
          htmlFor="tohi-question"
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 1.1,
            color: t.muted,
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
            // Focus is one half of the keyboard test; the viewport shrink is the
            // other. Neither alone reports a keyboard. No autoFocus is used —
            // the field is never focused on the user's behalf.
            onFocus={() => {
              composerFocusedRef.current = true;
              evaluateKeyboardRef.current();
            }}
            onBlur={() => {
              composerFocusedRef.current = false;
              evaluateKeyboardRef.current();
            }}
            placeholder="Ask TOHI..."
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 48,
              borderRadius: 16,
              padding: "12px 13px",
              background: t.inputFill,
              border: `1px solid ${t.inputLine}`,
              color: t.title,
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
              background: sendDisabled ? t.disabledFill : t.accent,
              border: `1px solid ${sendDisabled ? t.disabledLine : t.accentLine}`,
              color: sendDisabled ? t.disabledInk : t.onAccent,
              cursor: sendDisabled ? "not-allowed" : "pointer",
            }}
          >
            <Send size={15} /> Send
          </button>
        </div>

        {/* 64C-A2 voice input.
            Rendered only when App reports a usable recorder, so a browser
            without MediaRecorder, without getUserMedia, or without a format we
            will record sees the composer exactly as it was — typed chat is
            never degraded by voice being unavailable.

            The status copy sits in its own role="status" region, OUTSIDE the
            conversation log, so microphone state is announced without being
            written into the transcript. role="status" is implicitly polite, so
            no aria-live is declared here — the same rule the loading region
            follows, and the reason there is still exactly one explicit live
            region in this component. */}
        {showVoice && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                data-tohi-focus="true"
                data-tohi-voice="true"
                onClick={onVoicePress}
                disabled={voiceDisabled}
                aria-pressed={voiceListening}
                aria-busy={voicePending}
                aria-label={
                  voiceListening
                    ? "Stop recording your question"
                    : VOICE_COPY.idle
                }
                style={{
                  ...button,
                  flex: "0 0 auto",
                  // Full 48px touch target on the smallest phone.
                  minHeight: 48,
                  minWidth: 48,
                  borderRadius: 16,
                  padding: "0 16px",
                  fontSize: 13,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: voiceListening
                    ? t.goldFill
                    : voiceDisabled
                      ? t.disabledFill
                      : t.surfaceQuiet,
                  border: `1px solid ${
                    voiceListening ? t.goldLine : voiceDisabled ? t.disabledLine : t.accentLine
                  }`,
                  color: voiceListening
                    ? t.goldInk
                    : voiceDisabled
                      ? t.disabledInk
                      : t.accent,
                  cursor: voiceDisabled ? "not-allowed" : "pointer",
                }}
              >
                {voiceListening ? (
                  <>
                    <Square size={14} aria-hidden="true" /> Stop
                  </>
                ) : (
                  <>
                    <Mic size={14} aria-hidden="true" /> {VOICE_COPY.idle}
                  </>
                )}
                {voiceListening && (
                  <span
                    aria-hidden="true"
                    data-tohi-listening="true"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: "currentColor",
                      animation: "tohiChatPulse 1.25s ease-in-out infinite",
                    }}
                  />
                )}
              </button>
            </div>

            {/* 64C-A3: Voice replies on/off, and the playback control.
                The toggle is a real pressed-state button so a screen reader
                reports the setting, not just the word. The playback control
                only exists when there is something to stop or start — it is
                never a dead affordance. */}
            {showSpeech && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  data-tohi-focus="true"
                  data-tohi-voice-replies="true"
                  onClick={onToggleVoiceReplies}
                  aria-pressed={voiceRepliesEnabled === true}
                  aria-label={SPEECH_COPY.toggleLabel}
                  style={{
                    ...button,
                    flex: "0 0 auto",
                    minHeight: 44,
                    borderRadius: 14,
                    padding: "0 12px",
                    fontSize: 12,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    background: t.surfaceQuiet,
                    border: `1px solid ${voiceRepliesEnabled ? t.accentLine : t.line}`,
                    color: voiceRepliesEnabled ? t.accent : t.muted,
                    cursor: "pointer",
                  }}
                >
                  {voiceRepliesEnabled ? (
                    <>
                      <Volume2 size={14} aria-hidden="true" /> {SPEECH_COPY.toggleOn}
                    </>
                  ) : (
                    <>
                      <VolumeX size={14} aria-hidden="true" /> {SPEECH_COPY.toggleOff}
                    </>
                  )}
                </button>

                {showPlaybackControl && (
                  <button
                    type="button"
                    data-tohi-focus="true"
                    data-tohi-speech-playback="true"
                    onClick={speechSpeaking ? onStopSpeech : onPlaySpeech}
                    aria-label={speechSpeaking ? "Stop reading the reply" : SPEECH_COPY.play}
                    style={{
                      ...button,
                      flex: "0 0 auto",
                      minHeight: 44,
                      borderRadius: 14,
                      padding: "0 12px",
                      fontSize: 12,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      background: speechSpeaking ? t.goldFill : t.surfaceQuiet,
                      border: `1px solid ${speechSpeaking ? t.goldLine : t.accentLine}`,
                      color: speechSpeaking ? t.goldInk : t.accent,
                      cursor: "pointer",
                    }}
                  >
                    {speechSpeaking ? (
                      <>
                        <Square size={13} aria-hidden="true" /> {SPEECH_COPY.stop}
                      </>
                    ) : (
                      <>
                        <Play size={13} aria-hidden="true" /> {SPEECH_COPY.play}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {voiceStatusMessage ? (
              <div
                role="status"
                aria-atomic="true"
                data-tohi-voice-status="true"
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.4,
                  fontWeight: 650,
                  color: t.muted,
                }}
              >
                {voiceStatusMessage}
              </div>
            ) : null}

            {/* Claims only what this application controls. No provider is
                named, and no promise is made about what any downstream service
                does or does not retain. When speech is available this also
                discloses plainly that the speaking voice is not a recording of
                a person. */}
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.35, color: t.muted }}>
              {VOICE_COPY.privacy}
              {showSpeech ? ` ${SPEECH_COPY.disclosure}` : ""}
            </p>
          </div>
        )}
      </form>
        </>
      )}
    </section>
  );
}

export default TohiTab;
