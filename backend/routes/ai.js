const express = require("express");
const logger = require("../logger");
const { getAIResponse } = require("../services/aiService");
const { getTohiPickReview } = require("../services/tohiPickReviewService");

const router = express.Router();

router.post("/tohi-pick-review", async (req, res) => {
  try {
    const result = await getTohiPickReview(req.body || {});
    return res.json(result);
  } catch (err) {
    req.log?.error?.({ err: err?.message || err }, "TOHI Pick review error");
    logger.error({ err }, "TOHI Pick review error");

    // A failed review must never suppress the deterministic pick, so the
    // route always answers with a clean unavailable result instead of a 500.
    return res.json({ unavailable: true, reason: "review_failed" });
  }
});

router.post("/ai-chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const sessionData = req.body?.sessionData || {};

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const reply = await getAIResponse(message, sessionData);
    return res.json({ reply });
  } catch (err) {
    req.log?.error?.({ err: err?.message || err }, "AI chat error");
    logger.error({ err }, "AI chat error");

    return res.status(500).json({
      error: "AI chat failed. Try again.",
      reply:
        "I’m having trouble reaching TOHI chat right now. Refresh once, and if it still happens, use the live cards for the safest next move.",
    });
  }
});

module.exports = router;
