const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;

  const ageMs = Date.now() - entry.ts;
  const isFresh = ageMs <= entry.ttlMs;

  return {
    value: entry.value,
    ageMs,
    fetchedAt: entry.fetchedAt,
    isFresh,
    isStale: !isFresh,
  };
}

function setCached(key, value, ttlMs) {
  const entry = {
    value,
    ttlMs,
    ts: Date.now(),
    fetchedAt: new Date().toISOString(),
  };
  cache.set(key, entry);
  return entry;
}

function cleanupExpired(maxAgeMultiplier = 3) {
  const currentTime = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (currentTime - entry.ts > entry.ttlMs * maxAgeMultiplier) cache.delete(key);
  }
}

module.exports = { getCached, setCached, cleanupExpired };
