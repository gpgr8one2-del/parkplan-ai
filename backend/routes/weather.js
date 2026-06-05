const express = require("express");
const { getWeather } = require("../services/weatherService");

const router = express.Router();

router.get("/weather", async (req, res) => {
  const force = req.query.force === "true";
  const parkId = typeof req.query.parkId === "string" ? req.query.parkId : undefined;

  try {
    const data = await getWeather({ force, parkId });
    res.json(data);
  } catch (err) {
    req.log?.error(
      { force, parkId, err: err.message },
      "weather fetch failed"
    );

    res.status(502).json({
      error: "Could not fetch weather",
      detail: err.message,
    });
  }
});

module.exports = router;
