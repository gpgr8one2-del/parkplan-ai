const fetch = require("node-fetch");
const { fetchWithResiliency } = require("./fetchWithResiliency");
const logger = require("../logger");

const PARK_CONFIG = {
  magic_kingdom: { name: "Magic Kingdom", queueTimesId: 6 },
  epcot: { name: "EPCOT", queueTimesId: 5 },
  hollywood: { name: "Hollywood Studios", queueTimesId: 7 },
  animal_kingdom: { name: "Animal Kingdom", queueTimesId: 8 },
  epic_universe: { name: "Epic Universe", queueTimesId: null },
  universal_sf: { name: "Universal Studios Florida", queueTimesId: 64 },
  islands: { name: "Islands of Adventure", queueTimesId: 65 },
};

function buildMockParkData(parkId) {
  const park = PARK_CONFIG[parkId] || { name: parkId };
  return {
    parkId,
    parkName: park.name,
    rides: [
      { id: "mock-1", name: "Popular Headliner", waitTime: 45, isOpen: true, land: "Main Area", outdoor: false },
      { id: "mock-2", name: "Family Favorite", waitTime: 25, isOpen: true, land: "Main Area", outdoor: true },
      { id: "mock-3", name: "Quick Ride", waitTime: 10, isOpen: true, land: "Main Area", outdoor: false },
    ],
  };
}

function normalizeRide(rawRide) {
  return {
    id: String(rawRide.id || rawRide.name || Math.random()),
    name: rawRide.name || "Unknown ride",
    waitTime: Number(rawRide.wait_time ?? rawRide.waitTime ?? 0),
    isOpen: Boolean(rawRide.is_open ?? rawRide.isOpen ?? true),
    land: rawRide.land || "Unknown",
    outdoor: Boolean(rawRide.outdoor || false),
  };
}

async function fetchLiveParkData(parkId) {
  const park = PARK_CONFIG[parkId];
  if (!park) throw new Error(`Unknown parkId: ${parkId}`);
  if (!park.queueTimesId) return buildMockParkData(parkId);

  const url = `https://queue-times.com/parks/${park.queueTimesId}/queue_times.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Queue-Times ${res.status}`);
  const json = await res.json();

  const rides = [];
  for (const land of json.lands || []) {
    for (const ride of land.rides || []) {
      rides.push(normalizeRide({ ...ride, land: land.name }));
    }
  }

  return { parkId, parkName: park.name, rides };
}

async function getParkData(parkId) {
  const result = await fetchWithResiliency(`park:${parkId}`, () => fetchLiveParkData(parkId), {
    ttlMs: 3 * 60 * 1000,
    staleWhileRevalidate: true,
    timeoutMs: 10000,
    fallbackFn: () => buildMockParkData(parkId),
  });

  logger.info({ parkId, source: result.source, ageMs: result.ageMs || 0, rideCount: Array.isArray(result.rides) ? result.rides.length : 0 }, "park data returned");
  return result;
}

module.exports = { getParkData };
