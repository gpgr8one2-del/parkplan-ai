const express = require("express");
const { getWeather } = require("../services/weatherService");

const router = express.Router();

router.get("/weather", async (req, res) => {
  const force = req.query.force === "true";

  try {
    const data = await getWeather({ force });
    res.json(data);
  } catch (err) {
    req.log?.error(
      { force, err: err.message },
      "weather fetch failed"
    );

    res.status(502).json({
      error: "Could not fetch weather",
      detail: err.message,
    });
  }
});

module.exports = router;
