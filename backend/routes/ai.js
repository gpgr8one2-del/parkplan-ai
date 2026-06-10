const express = require("express");
const logger = require("../logger");
const { getAIResponse } = require("../services/aiService");

const router = express.Router();

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
