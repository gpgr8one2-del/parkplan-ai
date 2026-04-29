const express = require("express");
const { z } = require("zod");
const { getAIResponse } = require("../services/aiService");

const router = express.Router();

const chatSchema = z.object({
  message: z.string().trim().min(1).max(500),
  sessionData: z.object({
    activePark: z.string().max(100).optional(),
    weather: z.any().optional(),
    completedRideIds: z.array(z.string().max(100)).max(100).optional(),
    skippedRideIds: z.array(z.string().max(100)).max(100).optional(),
    conversationHistory: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(1000),
    })).max(12).optional(),
  }).passthrough().optional(),
});

router.post("/ai-chat", async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request payload", detail: parsed.error.flatten() });
  }

  try {
    const { message, sessionData = {} } = parsed.data;
    const reply = await getAIResponse(message, sessionData);
    res.json({ reply });
  } catch (err) {
    req.log?.error({ err: err.message }, "AI chat failed");
    res.status(502).json({ error: "AI service unavailable", detail: err.message });
  }
});

module.exports = router;
