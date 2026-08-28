/**
 * TOHI Voice — Phase A2 recording helpers.
 *
 * Voice is an INPUT LAYER. Nothing here reasons, replies, or talks to the AI
 * path. These helpers only decide how to record, whether a recording is worth
 * uploading, and whether a returned transcript is worth submitting. The chat
 * authority stays App's handleChatSubmit.
 *
 * Everything below is deterministic and free of browser globals: capability
 * detection takes the objects to inspect as arguments. That is what lets the
 * tests and the harness execute this real production logic without a
 * microphone, a network, or a DOM.
 */

/** Hard stop for one recording. Also the auto-stop deadline. */
export const MAX_RECORDING_MS = 30000;

/** Matches the merged backend ceiling exactly. Never raise one without the other. */
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

/**
 * Recording formats we are willing to produce, in preference order.
 *
 * Ordering is deliberate. Opus-in-WebM is the smallest and is what Android
 * Chrome offers, so it is tried first; iOS Safari supports none of the WebM
 * entries and lands on audio/mp4. Both are documented upload formats for the
 * merged endpoint.
 *
 * OGG is ABSENT on purpose and must stay absent: the transcription endpoint
 * does not document Opus-in-Ogg, so recording it would mean uploading bytes the
 * provider is not documented to decode.
 */
export const RECORDING_MIME_CANDIDATES = Object.freeze([
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
]);

/** The media types the merged backend accepts, parameters removed. */
export const SUPPORTED_AUDIO_MEDIA_TYPES = Object.freeze([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
]);

/** Bounded, provider-free failure categories. These reach the UI; nothing else does. */
export const VOICE_ERRORS = Object.freeze({
  EMPTY_AUDIO: "empty_audio",
  UNSUPPORTED_AUDIO: "unsupported_audio",
  AUDIO_TOO_LARGE: "audio_too_large",
  RATE_LIMITED: "rate_limited",
  UNAVAILABLE: "voice_unavailable",
  PERMISSION_DENIED: "permission_denied",
});

/**
 * Calm copy for each microphone state.
 *
 * No provider is named anywhere. The privacy line claims only what this
 * application itself controls — that the recording is used to produce text —
 * and does not make promises about what any downstream service retains.
 */
export const VOICE_COPY = Object.freeze({
  idle: "Ask by voice",
  requesting: "Asking to use the microphone…",
  listening: "Listening… Tap Stop when you’re finished.",
  transcribing: "Getting your question…",
  blank: "I didn’t catch anything. Try again or type your question.",
  denied: "Microphone access is off. You can still type your question.",
  failed: "Voice isn’t available right now. You can still type your question.",
  privacy: "Your recording is used only to turn your question into text.",
});

/** Media type with parameters and casing removed. `null` when unreadable. */
export function getAudioMediaType(contentType) {
  if (typeof contentType !== "string") return null;

  const mediaType = contentType.split(";")[0].trim().toLowerCase();

  return mediaType || null;
}

/** True only for a type the merged endpoint documents as supported. */
export function isSupportedRecordingMimeType(contentType) {
  const mediaType = getAudioMediaType(contentType);

  return mediaType !== null && SUPPORTED_AUDIO_MEDIA_TYPES.includes(mediaType);
}

/**
 * First candidate this browser can actually record, or null.
 *
 * `isTypeSupported` is passed in rather than read off MediaRecorder so the
 * decision can be exercised for an iPhone-shaped browser and an Android-shaped
 * one in the same test run. A browser that offers no candidate gets null, and
 * the caller hides the microphone rather than recording something unusable.
 */
export function selectRecordingMimeType(isTypeSupported) {
  if (typeof isTypeSupported !== "function") return null;

  for (const candidate of RECORDING_MIME_CANDIDATES) {
    let supported = false;

    try {
      supported = isTypeSupported(candidate) === true;
    } catch {
      supported = false;
    }

    // Belt and braces: even if a candidate list were edited carelessly, an
    // unsupported media type can never be selected.
    if (supported && isSupportedRecordingMimeType(candidate)) return candidate;
  }

  return null;
}

/**
 * The Content-Type to send for a finished recording.
 *
 * The Blob's own type wins when it is usable, because that is what was really
 * recorded; the recorder's configured type is the fallback for browsers that
 * hand back a blank Blob type. Parameters such as `;codecs=opus` are preserved
 * — the backend normalizes them itself, and dropping them here would discard
 * true information about the bytes.
 */
export function resolveUploadContentType(blobType, recorderMimeType) {
  if (isSupportedRecordingMimeType(blobType)) return blobType.trim();
  if (isSupportedRecordingMimeType(recorderMimeType)) return recorderMimeType.trim();

  return null;
}

/**
 * The media type the recorder actually produced, or null when it is not one we
 * are willing to upload.
 *
 * A browser may negotiate something other than the type it was asked for —
 * `isTypeSupported` is a claim about what it can do, `recorder.mimeType` is what
 * it did. So whenever the recorder reports a type, that report DECIDES: if it is
 * supported it is used, and if it is not, the answer is null.
 *
 * Falling back to the requested type when the recorder reports something
 * unsupported would be the worst outcome available — it would label, say, Opus-
 * in-Ogg bytes as `audio/webm` and upload them under a content type that does
 * not describe them. A recording we cannot honestly label is refused instead.
 *
 * The requested type is consulted ONLY when the recorder exposes nothing at all,
 * and even then it must itself be supported.
 */
export function resolveRecorderMimeType(recorder, requestedMimeType) {
  const actual =
    recorder && typeof recorder.mimeType === "string" ? recorder.mimeType.trim() : "";

  if (actual) {
    return isSupportedRecordingMimeType(actual) ? actual : null;
  }

  return isSupportedRecordingMimeType(requestedMimeType) ? requestedMimeType.trim() : null;
}

/**
 * Decides whether a finished recording is worth uploading.
 *
 * Both bounds are enforced BEFORE the request so an empty tap costs nothing and
 * an oversized recording is refused locally rather than travelling 8 MB to be
 * refused remotely.
 */
export function validateRecordingBlob(blob, contentType) {
  const size = blob && typeof blob.size === "number" ? blob.size : 0;

  if (!blob || size <= 0) return { ok: false, reason: VOICE_ERRORS.EMPTY_AUDIO };
  if (size > MAX_AUDIO_BYTES) return { ok: false, reason: VOICE_ERRORS.AUDIO_TOO_LARGE };
  if (!isSupportedRecordingMimeType(contentType)) {
    return { ok: false, reason: VOICE_ERRORS.UNSUPPORTED_AUDIO };
  }

  return { ok: true, contentType: contentType.trim(), size };
}

/**
 * Decides whether a returned transcript is worth submitting.
 *
 * A blank-but-valid transcript is a real answer — it means the recording held
 * no speech — and must NOT become a chat turn. Submitting silence would put an
 * empty question to TOHI and waste a turn.
 */
export function validateTranscript(value) {
  if (typeof value !== "string") return { ok: false, reason: VOICE_ERRORS.UNAVAILABLE };

  const transcript = value.trim();

  if (!transcript) return { ok: false, reason: "blank" };

  return { ok: true, transcript };
}

/** True only when this browser can record at a format we are willing to send. */
export function isVoiceInputSupported({ mediaDevices, MediaRecorderCtor } = {}) {
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") return false;
  if (typeof MediaRecorderCtor !== "function") return false;

  return selectRecordingMimeType(MediaRecorderCtor.isTypeSupported) !== null;
}

/**
 * Stops every track on a stream, swallowing per-track failures.
 *
 * This is the function the iPhone microphone indicator depends on, so it is
 * deliberately total: one throwing track must not prevent the rest being
 * stopped, and being called twice must be harmless.
 */
export function stopMediaStream(stream) {
  if (!stream || typeof stream.getTracks !== "function") return 0;

  let stopped = 0;

  let tracks = [];
  try {
    tracks = stream.getTracks() || [];
  } catch {
    return 0;
  }

  for (const track of tracks) {
    try {
      if (track && typeof track.stop === "function") {
        track.stop();
        stopped += 1;
      }
    } catch {
      // A track that refuses to stop must not strand the others.
    }
  }

  return stopped;
}
