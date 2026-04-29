const express = require("express");
const { getWeather } = require("../services/weatherService");

const router = express.Router();

router.get("/weather", async (_req, res) => {
  try {
    const data = await getWeather();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Could not fetch weather", detail: err.message });
  }
});

module.exports = router;
