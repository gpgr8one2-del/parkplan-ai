const { getCached, setCached } = require("./cache");
const { isOpen, recordFailure, recordSuccess } = require("./circuitBreaker");
const logger = require("../logger");

const inFlight = new Map();

async function withTimeout(promiseFactory, timeoutMs = 10000) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(`Timed out after ${timeoutMs}ms`);
      err.code = "FETCH_TIMEOUT";
      reject(err);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promiseFactory(), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithResiliency(key, fetchFn, options = {}) {
  const {
    ttlMs = 3 * 60 * 1000,
    staleWhileRevalidate = true,
    timeoutMs = 10000,
    fallbackFn = null,
  } = options;

  const cached = getCached(key);

  if (cached?.isFresh) {
    return { ...cached.value, source: "cached", ageMs: cached.ageMs, fetchedAt: cached.fetchedAt };
  }

  if (cached?.isStale && staleWhileRevalidate) {
    if (!inFlight.has(key)) {
      const refreshPromise = (async () => {
        try {
          if (isOpen(key)) return;
          const freshValue = await withTimeout(() => fetchFn(), timeoutMs);
          recordSuccess(key);
          setCached(key, freshValue, ttlMs);
        } catch (err) {
          recordFailure(key, err);
          logger.warn({ key, err: err.message }, "background refresh failed");
        } finally {
          inFlight.delete(key);
        }
      })();
      inFlight.set(key, refreshPromise);
    }
    return { ...cached.value, source: "stale", ageMs: cached.ageMs, fetchedAt: cached.fetchedAt };
  }

  if (inFlight.has(key)) return inFlight.get(key);

  const livePromise = (async () => {
    try {
      if (isOpen(key)) throw new Error("Circuit open");
      const freshValue = await withTimeout(() => fetchFn(), timeoutMs);
      recordSuccess(key);
      const entry = setCached(key, freshValue, ttlMs);
      return { ...freshValue, source: "live", ageMs: 0, fetchedAt: entry.fetchedAt };
    } catch (err) {
      recordFailure(key, err);
      logger.warn({ key, err: err.message }, "live fetch failed");

      if (cached?.value) {
        return { ...cached.value, source: "stale", ageMs: cached.ageMs, fetchedAt: cached.fetchedAt };
      }

      if (fallbackFn) {
        try {
          const fallbackValue = await fallbackFn(err);
          return { ...fallbackValue, source: "mock", ageMs: 0, fetchedAt: new Date().toISOString() };
        } catch (fallbackErr) {
          logger.error({ key, err: fallbackErr.message }, "fallback failed");
        }
      }
      throw err;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, livePromise);
  return livePromise;
}

module.exports = { fetchWithResiliency };
