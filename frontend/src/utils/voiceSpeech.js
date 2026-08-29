/**
 * TOHI Voice — spoken reply helpers (Phase A3).
 *
 * Speech is an OUTPUT layer over text TOHI has already decided to say. Nothing
 * here reasons, reaches the chat path, or changes a reply. The visible text is
 * always authoritative; audio is an addition to it that may silently fail.
 *
 * WHAT THIS DELIBERATELY IS NOT:
 *   - No `speechSynthesis`. The browser's built-in voice is not used, not even
 *     as a hidden fallback: it sounds nothing like TOHI, varies by device, and
 *     would make the spoken voice unpredictable.
 *   - No Realtime API, no WebSocket, no streaming session, no always-listening
 *     behaviour. One bounded request produces one bounded audio file.
 *
 * Everything is deterministic and free of browser globals — capabilities are
 * passed in — so the tests and harness can execute this real production logic
 * without audio hardware, a network, or a DOM.
 */

/** Matches the backend ceiling exactly. Never raise one without the other. */
export const MAX_SPEECH_CHARS = 600;

/** Matches the backend output ceiling exactly. */
export const MAX_SPEECH_BYTES = 2 * 1024 * 1024;

/** The one format requested and expected. iPhone Safari plays MP3 reliably. */
export const SPEECH_CONTENT_TYPE = "audio/mpeg";

/** Bounded, provider-free failure categories. These reach the UI; nothing else does. */
export const SPEECH_ERRORS = Object.freeze({
  EMPTY_TEXT: "empty_text",
  TEXT_TOO_LONG: "text_too_long",
  RATE_LIMITED: "rate_limited",
  UNAVAILABLE: "speech_unavailable",
  BLOCKED: "autoplay_blocked",
});

/**
 * Calm copy for every spoken-reply state.
 *
 * No provider is named anywhere. The disclosure states plainly that the voice
 * is AI-generated, in TOHI's own register rather than as a legal notice, and
 * avoids every word CLAUDE.md bans from user-facing copy.
 */
export const SPEECH_COPY = Object.freeze({
  speaking: "TOHI is reading this out loud.",
  stop: "Stop",
  play: "Play TOHI reply",
  blocked: "Tap to hear this reply.",
  failed: "Couldn’t read that out loud. The answer is here as text.",
  toggleOn: "Voice replies on",
  toggleOff: "Voice replies off",
  toggleLabel: "Voice replies",
  disclosure: "TOHI’s speaking voice is AI-generated.",
});

/**
 * Reduces a reply to the exact string that will be spoken, or null.
 *
 * Whitespace is collapsed so a multi-line reply is not read with long dead air.
 * Nothing else is rewritten: TOHI's words are spoken as TOHI wrote them.
 */
export function normalizeSpeechText(text) {
  if (typeof text !== "string") return null;

  const normalized = text.replace(/\s+/g, " ").trim();

  return normalized || null;
}

/**
 * Decides whether a reply is worth sending for synthesis.
 *
 * Enforced on the client so an empty or over-long reply never becomes a
 * request. The server enforces the same bounds independently — this is the
 * cheap half of a two-sided guard, not the only one.
 */
export function validateSpeechText(text) {
  const normalized = normalizeSpeechText(text);

  if (!normalized) return { ok: false, reason: SPEECH_ERRORS.EMPTY_TEXT };

  if (normalized.length > MAX_SPEECH_CHARS) {
    return { ok: false, reason: SPEECH_ERRORS.TEXT_TOO_LONG };
  }

  return { ok: true, text: normalized };
}

/**
 * Reduces a Content-Type to its bare media type, lowercased, or null.
 *
 * Parameters and casing are both legitimate — `Audio/MPEG; charset=binary` is
 * the same type as `audio/mpeg` — so only the media type decides.
 */
export function normalizeAudioContentType(value) {
  if (typeof value !== "string") return null;

  const mediaType = value.split(";")[0].trim().toLowerCase();

  return mediaType || null;
}

/** True only for the one format this phase requests and expects. */
export function isMpegAudioContentType(value) {
  return normalizeAudioContentType(value) === SPEECH_CONTENT_TYPE;
}

/**
 * Rejects an audio payload that is empty, past the ceiling, or not MP3.
 *
 * The MIME check is defense in depth: the response header has already been
 * validated by the caller. A BLANK blob type is accepted deliberately — some
 * browsers hand back an empty type even for a correctly labelled response, and
 * rejecting those would break real playback for no safety gain. A blob that
 * states a type must state the right one.
 */
export function validateSpeechBlob(blob) {
  const size = blob && typeof blob.size === "number" ? blob.size : 0;

  if (!blob || size <= 0) return { ok: false, reason: SPEECH_ERRORS.UNAVAILABLE };
  if (size > MAX_SPEECH_BYTES) return { ok: false, reason: SPEECH_ERRORS.UNAVAILABLE };

  const declared = typeof blob.type === "string" ? blob.type.trim() : "";
  if (declared && !isMpegAudioContentType(declared)) {
    return { ok: false, reason: SPEECH_ERRORS.UNAVAILABLE };
  }

  return { ok: true, size };
}

/**
 * True only when this browser can play an object-URL audio file.
 *
 * `Audio` and `createObjectURL` are passed in rather than read off globals so
 * both the supported and unsupported shapes can be exercised in one test run.
 * When this is false the microphone still works and the reply is still shown —
 * voice output simply never appears.
 */
export function isSpeechOutputSupported({ AudioCtor, createObjectURL } = {}) {
  return typeof AudioCtor === "function" && typeof createObjectURL === "function";
}

/**
 * Normalizes what `HTMLMediaElement.play()` returns into a promise.
 *
 * Older browsers — and jsdom — return undefined rather than a promise, so a
 * bare `.catch()` on the result would throw and be mistaken for a playback
 * rejection. Treating undefined as "started" is correct: those environments do
 * not report autoplay blocking at all.
 */
export function playbackResultToPromise(result) {
  if (result && typeof result.then === "function") return result;

  return Promise.resolve();
}
