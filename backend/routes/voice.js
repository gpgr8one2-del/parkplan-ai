/**
 * TOHI Voice routes.
 *
 * A thin adapter over TWO services, deliberately kept apart:
 *
 *   - services/voiceService.js owns every TRANSCRIPTION decision: MIME
 *     normalization, the upload ceiling, provider handling and error mapping
 *     for POST /voice/transcribe.
 *   - services/voiceSpeechService.js owns every SPOKEN-REPLY decision: text
 *     bounds, provider handling, audio bounds and error mapping for
 *     POST /voice/speak.
 *
 * Both are free of express so they can be executed directly by the harnesses.
 * This file only moves bytes between express and whichever service owns the
 * request.
 */

const express = require("express");

const {
  MAX_AUDIO_BYTES,
  SUPPORTED_AUDIO_MIMES,
  TRANSCRIBE_OUTCOMES,
  handleTranscriptionRequest,
} = require("../services/voiceService");

// A3 speech lives in its own service. Transcription is merged and in
// production; keeping the two apart means a speech change cannot reach the
// upload path.
const {
  MAX_SPEECH_CHARS,
  SPEECH_CONTENT_TYPE,
  handleSpeechRequest,
} = require("../services/voiceSpeechService");

const router = express.Router();

/**
 * Route-scoped raw parser.
 *
 * Deliberately NOT global. The app-wide express.json({ limit: "75kb" }) and
 * every existing JSON route are untouched; only this path buffers binary, and
 * only up to the audio ceiling.
 *
 * `type` accepts everything so an unsupported Content-Type still reaches the
 * handler and receives the specific 415 rather than a silent empty body that
 * would be indistinguishable from a missing recording.
 */
const parseRawAudio = express.raw({
  type: () => true,
  limit: MAX_AUDIO_BYTES,
});

/**
 * Body-parser failures must not reach the global error handler, which answers
 * 500 "Internal server error". An oversized recording is an expected, bounded
 * client condition and gets the documented 413 instead.
 */
function parseAudioBody(req, res, next) {
  parseRawAudio(req, res, (err) => {
    if (!err) return next();

    const isTooLarge =
      err.type === "entity.too.large" || err.status === 413 || err.statusCode === 413;

    req.log?.warn?.(
      { reason: isTooLarge ? "audio_too_large" : "unreadable_body" },
      "voice transcription body rejected"
    );

    res.set("Cache-Control", "no-store");

    return res
      .status(isTooLarge ? 413 : 400)
      .json({
        error: isTooLarge
          ? TRANSCRIBE_OUTCOMES.AUDIO_TOO_LARGE
          : TRANSCRIBE_OUTCOMES.EMPTY_AUDIO,
      });
  });
}

router.post("/voice/transcribe", parseAudioBody, async (req, res) => {
  // Recordings are never written to disk and never cached, here or downstream.
  res.set("Cache-Control", "no-store");

  const result = await handleTranscriptionRequest({
    body: req.body,
    contentType: req.get("content-type"),
    log: req.log,
  });

  return res.status(result.status).json(result.body);
});

/**
 * TOHI Voice — spoken reply.
 *
 * Renders text TOHI has ALREADY decided to say. It never reasons, never calls
 * the chat path, and never changes a reply. The guest always has the text; this
 * is an addition to it, never a replacement.
 *
 * JSON in, audio out. The app-wide express.json({ limit: "75kb" }) already
 * covers the request — no parser is added or changed here, and the raw audio
 * parser above stays bound to the transcribe path alone.
 */
router.post("/voice/speak", async (req, res) => {
  // Spoken replies are never written to disk and never cached, here or
  // downstream.
  res.set("Cache-Control", "no-store");

  const result = await handleSpeechRequest({
    text: req.body?.text,
    log: req.log,
  });

  if (result.audio) {
    res.set("Content-Type", result.contentType);
    res.set("Content-Length", String(result.audio.length));
    return res.status(result.status).send(result.audio);
  }

  return res.status(result.status).json(result.body);
});

module.exports = router;
module.exports.MAX_AUDIO_BYTES = MAX_AUDIO_BYTES;
module.exports.SUPPORTED_AUDIO_MIMES = SUPPORTED_AUDIO_MIMES;
module.exports.MAX_SPEECH_CHARS = MAX_SPEECH_CHARS;
module.exports.SPEECH_CONTENT_TYPE = SPEECH_CONTENT_TYPE;
