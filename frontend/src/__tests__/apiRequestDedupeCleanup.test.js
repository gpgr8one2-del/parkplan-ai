/**
 * Regression: apiFetch's in-flight cleanup must not leave an orphaned rejection.
 *
 * The defect: de-duplicated requests were cleaned up with
 *
 *   requestPromise.finally(() => activeRequests.delete(key));
 *
 * That derived promise is never awaited. When the request failed it rejected
 * again, as an unhandled rejection, even though every caller handled the
 * original failure. Park-data outages now fail honestly instead of returning
 * sample rides, so this path is an expected one.
 *
 * These run the REAL api.js (through fetchParkData, which de-duplicates
 * non-forced requests) with the real Promise implementation. Only global.fetch
 * is scripted. No rejection is suppressed: an orphaned rejection fails the run.
 */

import { fetchParkData } from "../api";

const PATH = "/api/park-data?parkId=magic_kingdom";

const LIVE = {
  parkId: "magic_kingdom",
  source: "live",
  fetchedAt: "2026-05-08T16:59:00.000Z",
  ageMs: 60000,
  rides: [{ id: "mk-1", name: "Haunted Mansion", land: "Liberty Square", waitTime: 25, isOpen: true }],
};

const OUTAGE_BODY = { error: "Could not fetch park data", detail: "Queue-Times 503" };
const OUTAGE_MESSAGE = `API ${PATH} -> 502: ${JSON.stringify(OUTAGE_BODY)}`;

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

/** A response the test settles by hand, so requests really overlap. */
function deferredResponse() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Runs apiFetch's retry back-off (300ms, then 600ms) to completion. */
async function settleRetries() {
  for (let i = 0; i < 10; i++) {
    jest.advanceTimersByTime(400);
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

/** Real macrotask turns, so any unhandled rejection is reported inside the test. */
async function drainRealTicks() {
  jest.useRealTimers();
  for (let i = 0; i < 3; i++) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

beforeEach(() => {
  jest.useFakeTimers("modern");
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
  delete global.fetch;
});

test("concurrent equivalent requests share one in-flight request, and success returns the response", async () => {
  const pending = deferredResponse();
  global.fetch.mockImplementationOnce(() => pending.promise);

  const first = fetchParkData("magic_kingdom");
  const second = fetchParkData("magic_kingdom");
  await Promise.resolve();

  pending.resolve(response(200, LIVE));
  const [a, b] = await Promise.all([first, second]);

  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(a).toEqual(LIVE);
  expect(b).toEqual(LIVE);
  await drainRealTicks();
});

test("forced refreshes are not de-duplicated", async () => {
  global.fetch.mockImplementation(() => Promise.resolve(response(200, LIVE)));

  await Promise.all([
    fetchParkData("magic_kingdom", { force: true }),
    fetchParkData("magic_kingdom", { force: true }),
  ]);

  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch.mock.calls.every(([url]) => url.endsWith(`${PATH}&force=true`))).toBe(true);
});

test("success removes the in-flight entry, so the next request goes to the network", async () => {
  global.fetch.mockImplementation(() => Promise.resolve(response(200, LIVE)));

  await expect(fetchParkData("magic_kingdom")).resolves.toEqual(LIVE);
  await Promise.resolve();
  await expect(fetchParkData("magic_kingdom")).resolves.toEqual(LIVE);

  expect(global.fetch).toHaveBeenCalledTimes(2);
  await drainRealTicks();
});

test("failure rejects every awaiting caller, removes the entry, and a later request can recover", async () => {
  global.fetch.mockImplementation(() => Promise.resolve(response(502, OUTAGE_BODY)));

  const first = fetchParkData("magic_kingdom");
  const second = fetchParkData("magic_kingdom");
  const firstOutcome = first.then(
    () => "resolved",
    (err) => err
  );
  const secondOutcome = second.then(
    () => "resolved",
    (err) => err
  );

  await settleRetries();

  const [firstError, secondError] = await Promise.all([firstOutcome, secondOutcome]);
  expect(firstError).toBeInstanceOf(Error);
  expect(firstError.message).toBe(OUTAGE_MESSAGE);
  expect(firstError.status).toBe(502);
  // Both callers awaited the same shared request.
  expect(secondError).toBe(firstError);
  // One request: the initial attempt plus its two retries, not one per caller.
  expect(global.fetch).toHaveBeenCalledTimes(3);

  // The failed entry is gone: a later request is a fresh network request.
  global.fetch.mockImplementation(() => Promise.resolve(response(200, LIVE)));
  await expect(fetchParkData("magic_kingdom")).resolves.toEqual(LIVE);
  expect(global.fetch).toHaveBeenCalledTimes(4);

  await drainRealTicks();
});

test("a handled request failure leaves no orphaned cleanup rejection", async () => {
  global.fetch.mockImplementation(() => Promise.resolve(response(502, OUTAGE_BODY)));

  const outcome = fetchParkData("magic_kingdom").catch((err) => err.message);
  await settleRetries();

  expect(await outcome).toBe(OUTAGE_MESSAGE);
  // Nothing is suppressed. Under the previous `.finally` cleanup, the ignored
  // derived promise rejects here and Jest fails this test with OUTAGE_MESSAGE.
  await drainRealTicks();
});
