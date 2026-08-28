/**
 * TOHI Voice routes.
 *
 * A thin adapter. Every decision — MIME normalization, size limits, provider
 * handling, error mapping — lives in services/voiceService.js so it can be
 * executed without express. This file only moves bytes between express and
 * that service.
 */

const express = require("express");

const {
  MAX_AUDIO_BYTES,
  SUPPORTED_AUDIO_MIMES,
  TRANSCRIBE_OUTCOMES,
  handleTranscriptionRequest,
} = require("../services/voiceService");

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

module.exports = router;
module.exports.MAX_AUDIO_BYTES = MAX_AUDIO_BYTES;
module.exports.SUPPORTED_AUDIO_MIMES = SUPPORTED_AUDIO_MIMES;
