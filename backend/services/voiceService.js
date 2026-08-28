/**
 * TOHI Voice — recorded-speech transcription.
 *
 * Phase A1 is the backend half only: receive a bounded recording, hand it to
 * the provider, return a validated transcript. Nothing in the app calls this
 * yet.
 *
 * WHAT THIS IS NOT:
 *   - It is not a second assistant. It produces a plain string that the
 *     existing chat path will later submit exactly like typed text. No
 *     conversation state, no reasoning, no context lives here.
 *   - It does not touch the Anthropic chat path, its model, or its behaviour.
 *
 * Every decision below is a pure function so the harness can execute the real
 * logic without a network, without express, and without installed packages.
 * The provider transport is injected; the default is resolved LAZILY so simply
 * requiring this module never needs node-fetch to be present.
 */

const crypto = require("crypto");

const logger = require("../logger");

const TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";

// The currently documented recorded-speech transcription model.
const TRANSCRIPTION_MODEL = "gpt-transcribe";

/** Bounded upload ceiling. Well under the provider's own 25 MB limit. */
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

/** Bounded provider timeout. Never retried — a retry duplicates cost. */
const PROVIDER_TIMEOUT_MS = 15000;

/**
 * Formats the transcription upload endpoint documents as supported.
 *
 * `audio/ogg` is deliberately absent: Opus-in-Ogg is not among the documented
 * upload formats, so accepting it would mean uploading bytes the provider is
 * not documented to decode.
 */
const SUPPORTED_AUDIO_MIMES = Object.freeze([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
]);

/**
 * Vendor spellings that mean exactly one of the supported types. Kept explicit
 * rather than pattern-matched, so a new spelling is a deliberate decision.
 */
const MIME_ALIASES = Object.freeze({
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-pn-wav": "audio/wav",
});

/** Fixed, safe extensions. Never derived from anything the client sends. */
const MIME_FILE_EXTENSIONS = Object.freeze({
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
});

const TRANSCRIBE_OUTCOMES = Object.freeze({
  OK: "ok",
  EMPTY_AUDIO: "empty_audio",
  UNSUPPORTED_AUDIO: "unsupported_audio",
  AUDIO_TOO_LARGE: "audio_too_large",
  UNAVAILABLE: "voice_unavailable",
});

/**
 * Reduces a Content-Type header to a supported media type, or null.
 *
 * Codec parameters are legitimate and common — Android Chrome sends
 * `audio/webm;codecs=opus` — so parameters are dropped for the allowlist
 * comparison rather than causing a rejection. Only the media type decides.
 */
function normalizeAudioMime(contentType) {
  if (typeof contentType !== "string") return null;

  const mediaType = contentType.split(";")[0].trim().toLowerCase();
  if (!mediaType) return null;

  const resolved = MIME_ALIASES[mediaType] || mediaType;

  return SUPPORTED_AUDIO_MIMES.includes(resolved) ? resolved : null;
}

/** Deterministic extension for an already-normalized media type. */
function getAudioFileExtension(normalizedMime) {
  return MIME_FILE_EXTENSIONS[normalizedMime] || null;
}

/** Fixed base name; only the extension varies, and only from the allowlist. */
function buildAudioFilename(normalizedMime) {
  const extension = getAudioFileExtension(normalizedMime);
  return extension ? `audio.${extension}` : null;
}

function createMultipartBoundary() {
  return `----tohiVoice${crypto.randomBytes(16).toString("hex")}`;
}

/**
 * Hand-built multipart body.
 *
 * Built from Buffers rather than a form-data package or browser globals: the
 * deployed Node runtime is not declared in this repository, and this phase is
 * explicitly not allowed to add a dependency. The audio Buffer is concatenated
 * verbatim, so the bytes the provider receives are the bytes the browser
 * recorded.
 */
function buildTranscriptionMultipartBody({
  audio,
  normalizedMime,
  model = TRANSCRIPTION_MODEL,
  boundary,
}) {
  if (!Buffer.isBuffer(audio)) {
    throw new TypeError("audio must be a Buffer");
  }

  const filename = buildAudioFilename(normalizedMime);
  if (!filename) {
    throw new TypeError("unsupported audio mime");
  }

  const safeBoundary = boundary || createMultipartBoundary();
  const CRLF = "\r\n";

  const head = Buffer.from(
    `--${safeBoundary}${CRLF}` +
      `Content-Disposition: form-data; name="model"${CRLF}${CRLF}` +
      `${model}${CRLF}` +
      `--${safeBoundary}${CRLF}` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}` +
      `Content-Type: ${normalizedMime}${CRLF}${CRLF}`,
    "utf8"
  );

  const tail = Buffer.from(`${CRLF}--${safeBoundary}--${CRLF}`, "utf8");

  return {
    boundary: safeBoundary,
    contentType: `multipart/form-data; boundary=${safeBoundary}`,
    body: Buffer.concat([head, audio, tail]),
  };
}

/**
 * Accepts a provider payload only when it is an object carrying a string
 * `text`. Anything else — a non-object, a missing field, a number, an error
 * envelope — is unusable and converges on the same unavailable result.
 *
 * A blank-but-valid transcript is a real answer, not a failure: it means the
 * recording held no speech, and the caller should decline to submit silence.
 */
function resolveTranscriptText(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (typeof payload.text !== "string") return null;

  return payload.text.trim();
}

/** Lazy so requiring this module never depends on node-fetch being installed. */
function resolveFetchImpl(fetchImpl) {
  if (typeof fetchImpl === "function") return fetchImpl;

  // eslint-disable-next-line global-require
  return require("node-fetch");
}

function unavailable(category) {
  return { ok: false, outcome: TRANSCRIBE_OUTCOMES.UNAVAILABLE, category };
}

/**
 * Sends one recording to the provider. Never retries.
 *
 * The API key is read from process.env on the server and travels only in the
 * outbound Authorization header. It is never returned, never logged, and never
 * reaches the client. When it is absent, no provider call is attempted at all.
 */
async function transcribeAudio({
  audio,
  normalizedMime,
  apiKey = process.env.OPENAI_API_KEY,
  fetchImpl,
  timeoutMs = PROVIDER_TIMEOUT_MS,
  boundary,
} = {}) {
  if (!Buffer.isBuffer(audio) || audio.length === 0) {
    return { ok: false, outcome: TRANSCRIBE_OUTCOMES.EMPTY_AUDIO };
  }

  if (audio.length > MAX_AUDIO_BYTES) {
    return { ok: false, outcome: TRANSCRIBE_OUTCOMES.AUDIO_TOO_LARGE };
  }

  if (!getAudioFileExtension(normalizedMime)) {
    return { ok: false, outcome: TRANSCRIBE_OUTCOMES.UNSUPPORTED_AUDIO };
  }

  if (!apiKey) {
    // Mirrors the Anthropic path's posture: a missing key degrades to
    // unavailable rather than throwing, and costs nothing.
    return unavailable("not_configured");
  }

  const multipart = buildTranscriptionMultipartBody({ audio, normalizedMime, boundary });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const doFetch = resolveFetchImpl(fetchImpl);

    const response = await doFetch(TRANSCRIPTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": multipart.contentType,
        "Content-Length": String(multipart.body.length),
      },
      body: multipart.body,
      signal: controller.signal,
    });

    if (!response || response.ok !== true) {
      // The upstream status is recorded as a bare number for operations. The
      // response body is never read, logged, or surfaced.
      return unavailable(`provider_status_${response?.status ?? "unknown"}`);
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      return unavailable("malformed_response");
    }

    const transcript = resolveTranscriptText(payload);

    if (transcript === null) return unavailable("malformed_response");

    return { ok: true, outcome: TRANSCRIBE_OUTCOMES.OK, transcript };
  } catch (err) {
    return unavailable(err?.name === "AbortError" ? "timeout" : "network_error");
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * The whole request decision, expressed without express so it can be executed
 * directly by the harness. The route is a thin adapter over this.
 *
 * Returns { status, body } only — never a stream, never the audio.
 */
async function handleTranscriptionRequest({
  body,
  contentType,
  log,
  ...transcribeOptions
} = {}) {
  const startedAt = Date.now();
  const normalizedMime = normalizeAudioMime(contentType);
  const bytes = Buffer.isBuffer(body) ? body.length : 0;

  const finish = (status, payload, outcome) => {
    const safeLog = log || logger;

    // Operational facts only. No audio, no transcript, no provider body, no
    // header values.
    safeLog?.info?.(
      {
        mime: normalizedMime || "rejected",
        bytes,
        status,
        outcome,
        durationMs: Date.now() - startedAt,
      },
      "voice transcription request"
    );

    return { status, body: payload };
  };

  if (!normalizedMime) {
    return finish(415, { error: TRANSCRIBE_OUTCOMES.UNSUPPORTED_AUDIO }, TRANSCRIBE_OUTCOMES.UNSUPPORTED_AUDIO);
  }

  if (!Buffer.isBuffer(body) || body.length === 0) {
    return finish(400, { error: TRANSCRIBE_OUTCOMES.EMPTY_AUDIO }, TRANSCRIBE_OUTCOMES.EMPTY_AUDIO);
  }

  if (body.length > MAX_AUDIO_BYTES) {
    return finish(413, { error: TRANSCRIBE_OUTCOMES.AUDIO_TOO_LARGE }, TRANSCRIBE_OUTCOMES.AUDIO_TOO_LARGE);
  }

  const result = await transcribeAudio({
    audio: body,
    normalizedMime,
    ...transcribeOptions,
  });

  if (result.ok) {
    return finish(200, { transcript: result.transcript }, TRANSCRIBE_OUTCOMES.OK);
  }

  if (result.outcome === TRANSCRIBE_OUTCOMES.EMPTY_AUDIO) {
    return finish(400, { error: TRANSCRIBE_OUTCOMES.EMPTY_AUDIO }, TRANSCRIBE_OUTCOMES.EMPTY_AUDIO);
  }

  if (result.outcome === TRANSCRIBE_OUTCOMES.AUDIO_TOO_LARGE) {
    return finish(413, { error: TRANSCRIBE_OUTCOMES.AUDIO_TOO_LARGE }, TRANSCRIBE_OUTCOMES.AUDIO_TOO_LARGE);
  }

  if (result.outcome === TRANSCRIBE_OUTCOMES.UNSUPPORTED_AUDIO) {
    return finish(415, { error: TRANSCRIBE_OUTCOMES.UNSUPPORTED_AUDIO }, TRANSCRIBE_OUTCOMES.UNSUPPORTED_AUDIO);
  }

  // Every provider-side failure kind converges here: not configured, timeout,
  // rejection, network error, malformed reply. The client learns only that
  // voice is unavailable.
  return finish(503, { error: TRANSCRIBE_OUTCOMES.UNAVAILABLE }, result.category || TRANSCRIBE_OUTCOMES.UNAVAILABLE);
}

module.exports = {
  MAX_AUDIO_BYTES,
  PROVIDER_TIMEOUT_MS,
  SUPPORTED_AUDIO_MIMES,
  TRANSCRIPTION_MODEL,
  TRANSCRIPTION_URL,
  TRANSCRIBE_OUTCOMES,
  buildAudioFilename,
  buildTranscriptionMultipartBody,
  getAudioFileExtension,
  handleTranscriptionRequest,
  normalizeAudioMime,
  resolveTranscriptText,
  transcribeAudio,
};
