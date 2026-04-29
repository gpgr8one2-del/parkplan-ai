const express = require("express");
const { getParkData } = require("../services/parkService");

const router = express.Router();

const VALID_PARK_IDS = [
  "magic_kingdom", "epcot", "hollywood", "animal_kingdom",
  "epic_universe", "universal_sf", "islands",
];

router.get("/park-data", async (req, res) => {
  const { parkId } = req.query;
  if (!parkId) return res.status(400).json({ error: "parkId is required" });
  if (!VALID_PARK_IDS.includes(parkId)) return res.status(400).json({ error: `Unknown parkId: ${parkId}` });

  try {
    const data = await getParkData(parkId);
    res.json(data);
  } catch (err) {
    req.log?.error({ parkId, err: err.message }, "park data failed");
    res.status(502).json({ error: "Could not fetch park data", detail: err.message });
  }
});

module.exports = router;
