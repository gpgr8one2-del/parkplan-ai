/**
 * TOHI Voice — spoken replies (Phase A3).
 *
 * Deliberately a SEPARATE service from voiceService.js. Transcription is
 * merged, reviewed and in production; speech is a different provider endpoint
 * with a different payload, different bounds and a different failure surface.
 * Keeping them apart means an A3 mistake cannot reach the A1 upload path.
 *
 * WHAT THIS IS NOT:
 *   - It is not a second assistant. It renders text TOHI already decided to say
 *     into audio. It never reasons, never calls Anthropic, and never changes a
 *     reply.
 *   - It is not a conversation channel. No Realtime API, no WebSocket, no
 *     streaming session, no always-listening behaviour.
 *
 * Every decision below is a pure function so the harness can execute the real
 * logic without a network and without installed packages. The provider
 * transport is injected; the default is resolved LAZILY so requiring this
 * module never needs node-fetch to be present.
 */

/**
 * The app logger is resolved LAZILY, exactly as the provider transport is.
 *
 * Requiring this module must never pull in pino: routes/voice.js is loaded by
 * the deterministic harnesses without backend packages installed, and a hard
 * require here would break the whole route — including the merged transcription
 * path that shares the file.
 */
function resolveLogger() {
  try {
    // eslint-disable-next-line global-require
    return require("../logger");
  } catch {
    return null;
  }
}

const SPEECH_URL = "https://api.openai.com/v1/audio/speech";

/** The low-latency speech model. Quality tiers cost more and are slower. */
const SPEECH_MODEL = "tts-1";

/**
 * Calm, warm and unhurried — the closest match to how CLAUDE.md describes TOHI:
 * "a calm, experienced friend walking with the family through the park".
 * Deliberately not a brisk or clipped voice.
 */
const SPEECH_VOICE = "nova";

/** MP3 is the format iPhone Safari plays most reliably. */
const SPEECH_FORMAT = "mp3";
const SPEECH_CONTENT_TYPE = "audio/mpeg";

/**
 * Input ceiling. TOHI replies are already short — live-mode answers are trimmed
 * to two sentences before they are ever shown — so this is a guard against a
 * pathological reply, and it is the primary cost bound on this endpoint.
 */
const MAX_SPEECH_CHARS = 600;

/** Output ceiling. A 600-character MP3 is far smaller; this bounds a surprise. */
const MAX_SPEECH_BYTES = 2 * 1024 * 1024;

/** Bounded provider timeout. Shorter than transcription: speech is latency-critical. */
const PROVIDER_TIMEOUT_MS = 10000;

const SPEAK_OUTCOMES = Object.freeze({
  OK: "ok",
  EMPTY_TEXT: "empty_text",
  TEXT_TOO_LONG: "text_too_long",
  UNAVAILABLE: "speech_unavailable",
});

/**
 * Reduces a requested reply to the exact string that will be spoken, or null.
 *
 * Whitespace is collapsed so a reply that renders over several lines is not
 * read with long dead air. Nothing else is rewritten: TOHI's words are spoken
 * as TOHI wrote them.
 */
function normalizeSpeechText(text) {
  if (typeof text !== "string") return null;

  const normalized = text.replace(/\s+/g, " ").trim();

  return normalized || null;
}

/**
 * Decides whether a reply is speakable.
 *
 * Both bounds are enforced BEFORE the provider call, so an empty reply costs
 * nothing and an over-long one is refused locally rather than billed.
 */
function validateSpeechText(text) {
  const normalized = normalizeSpeechText(text);

  if (!normalized) return { ok: false, outcome: SPEAK_OUTCOMES.EMPTY_TEXT };

  if (normalized.length > MAX_SPEECH_CHARS) {
    return { ok: false, outcome: SPEAK_OUTCOMES.TEXT_TOO_LONG };
  }

  return { ok: true, text: normalized };
}

/** Lazy so requiring this module never depends on node-fetch being installed. */
function resolveFetchImpl(fetchImpl) {
  if (typeof fetchImpl === "function") return fetchImpl;

  // eslint-disable-next-line global-require
  return require("node-fetch");
}

function unavailable(category) {
  return { ok: false, outcome: SPEAK_OUTCOMES.UNAVAILABLE, category };
}

/** Bare media type, lowercased, or null. Parameters and casing are ignored. */
function normalizeContentType(value) {
  if (typeof value !== "string") return null;

  const mediaType = value.split(";")[0].trim().toLowerCase();

  return mediaType || null;
}

/** Reads a response header across the shapes different transports expose. */
function readHeader(response, name) {
  const value = response?.headers?.get?.(name);

  return typeof value === "string" ? value : null;
}

/**
 * Reads a provider response body as a Buffer, whichever shape the transport
 * offers.
 *
 * HONEST BOUND, stated precisely: this is NOT streaming-bounded. When a valid
 * Content-Length is present and exceeds the ceiling, the body is refused before
 * it is read at all — that is the cheap, common case. When the header is absent
 * or unparseable, the body IS fully buffered and only then measured. Bounding
 * that case properly would require consuming the stream chunk by chunk and
 * aborting mid-read, which this phase does not do.
 *
 * The exposure is small and deliberate: the request is capped at 600
 * characters of input, so a body far past 2 MB would be a provider anomaly
 * rather than anything a guest can cause.
 */
async function readAudioBuffer(response) {
  if (!response) return { ok: false, category: "malformed_response" };

  const declaredLength = readHeader(response, "content-length");

  if (declaredLength !== null && declaredLength.trim() !== "") {
    const claimed = Number(declaredLength);

    if (!Number.isFinite(claimed) || !Number.isInteger(claimed) || claimed < 0) {
      return { ok: false, category: "malformed_response" };
    }

    // Refused before the body is consumed.
    if (claimed > MAX_SPEECH_BYTES) return { ok: false, category: "audio_too_large" };
  }

  let audio = null;

  if (typeof response.arrayBuffer === "function") {
    audio = Buffer.from(await response.arrayBuffer());
  } else if (typeof response.buffer === "function") {
    audio = Buffer.from(await response.buffer());
  } else {
    return { ok: false, category: "malformed_response" };
  }

  return { ok: true, audio };
}

/**
 * Sends one reply for synthesis. Never retries — a retry duplicates cost for
 * audio the guest has probably stopped waiting for.
 *
 * The API key is read from process.env on the server and travels only in the
 * outbound Authorization header. It is never returned, never logged, and never
 * reaches the client. When it is absent, no provider call is attempted at all.
 */
async function synthesizeSpeech({
  text,
  apiKey = process.env.OPENAI_API_KEY,
  fetchImpl,
  timeoutMs = PROVIDER_TIMEOUT_MS,
  voice = SPEECH_VOICE,
  model = SPEECH_MODEL,
} = {}) {
  const validated = validateSpeechText(text);
  if (!validated.ok) return { ok: false, outcome: validated.outcome };

  if (!apiKey) {
    // Mirrors the transcription path's posture: a missing key degrades to
    // unavailable rather than throwing, and costs nothing.
    return unavailable("not_configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const doFetch = resolveFetchImpl(fetchImpl);

    const response = await doFetch(SPEECH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        input: validated.text,
        response_format: SPEECH_FORMAT,
      }),
      signal: controller.signal,
    });

    if (!response || response.ok !== true) {
      // The upstream status is recorded as a bare number for operations. The
      // response body is never read, logged, or surfaced.
      return unavailable(`provider_status_${response?.status ?? "unknown"}`);
    }

    // A successful response that does not claim MP3 is not the audio that was
    // requested, whatever it contains. An absent header is tolerated: some
    // transports do not expose one, and the byte checks below still apply.
    const declaredType = readHeader(response, "content-type");

    if (declaredType !== null && normalizeContentType(declaredType) !== "audio/mpeg") {
      return unavailable("malformed_response");
    }

    let read;
    try {
      read = await readAudioBuffer(response);
    } catch {
      return unavailable("malformed_response");
    }

    if (!read.ok) return unavailable(read.category);

    const audio = read.audio;

    if (!Buffer.isBuffer(audio) || audio.length === 0) {
      return unavailable("malformed_response");
    }

    // The real ceiling, applied to what actually arrived rather than to what a
    // header claimed. Kept even when Content-Length already passed.
    if (audio.length > MAX_SPEECH_BYTES) {
      return unavailable("audio_too_large");
    }

    return { ok: true, outcome: SPEAK_OUTCOMES.OK, audio, contentType: SPEECH_CONTENT_TYPE };
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
 * On success returns { status, audio, contentType }; on every failure returns
 * { status, body } carrying only a bounded category.
 */
async function handleSpeechRequest({ text, log, ...speechOptions } = {}) {
  const startedAt = Date.now();
  const requestedChars = typeof text === "string" ? text.length : 0;

  const finish = (status, outcome, extra = {}) => {
    const safeLog = log || resolveLogger();

    // Operational facts only. No reply text, no audio, no provider body, no
    // header values.
    safeLog?.info?.(
      {
        chars: requestedChars,
        bytes: extra.audio ? extra.audio.length : 0,
        status,
        outcome,
        durationMs: Date.now() - startedAt,
      },
      "voice speech request"
    );

    return { status, ...extra };
  };

  const validated = validateSpeechText(text);

  if (!validated.ok) {
    const status = validated.outcome === SPEAK_OUTCOMES.TEXT_TOO_LONG ? 413 : 400;
    return finish(status, validated.outcome, { body: { error: validated.outcome } });
  }

  const result = await synthesizeSpeech({ text: validated.text, ...speechOptions });

  if (result.ok) {
    return finish(200, SPEAK_OUTCOMES.OK, {
      audio: result.audio,
      contentType: result.contentType,
    });
  }

  if (result.outcome === SPEAK_OUTCOMES.EMPTY_TEXT) {
    return finish(400, SPEAK_OUTCOMES.EMPTY_TEXT, { body: { error: SPEAK_OUTCOMES.EMPTY_TEXT } });
  }

  if (result.outcome === SPEAK_OUTCOMES.TEXT_TOO_LONG) {
    return finish(413, SPEAK_OUTCOMES.TEXT_TOO_LONG, {
      body: { error: SPEAK_OUTCOMES.TEXT_TOO_LONG },
    });
  }

  // Every provider-side failure kind converges here: not configured, timeout,
  // rejection, network error, malformed or oversized reply. The client learns
  // only that speech is unavailable — and still has the text.
  return finish(503, result.category || SPEAK_OUTCOMES.UNAVAILABLE, {
    body: { error: SPEAK_OUTCOMES.UNAVAILABLE },
  });
}

module.exports = {
  MAX_SPEECH_BYTES,
  MAX_SPEECH_CHARS,
  PROVIDER_TIMEOUT_MS,
  SPEAK_OUTCOMES,
  SPEECH_CONTENT_TYPE,
  SPEECH_FORMAT,
  SPEECH_MODEL,
  SPEECH_URL,
  SPEECH_VOICE,
  handleSpeechRequest,
  normalizeSpeechText,
  synthesizeSpeech,
  validateSpeechText,
};
