const logger = require("../logger");

const breakers = new Map();

function getBreaker(key) {
  if (!breakers.has(key)) {
    breakers.set(key, {
      failures: 0,
      lastFailure: 0,
      threshold: 3,
      cooldownMs: 2 * 60 * 1000,
    });
  }
  return breakers.get(key);
}

function isOpen(key) {
  const b = getBreaker(key);
  const now = Date.now();
  if (b.failures >= b.threshold) {
    if (now - b.lastFailure < b.cooldownMs) return true;
    b.failures = 0;
  }
  return false;
}

function recordFailure(key, err) {
  const b = getBreaker(key);
  b.failures++;
  b.lastFailure = Date.now();
  logger.warn({ key, failures: b.failures, err: err?.message }, "circuit breaker failure recorded");
}

function recordSuccess(key) {
  const b = getBreaker(key);
  if (b.failures > 0) {
    b.failures = 0;
    logger.info({ key }, "circuit breaker reset");
  }
}

module.exports = { isOpen, recordFailure, recordSuccess };
