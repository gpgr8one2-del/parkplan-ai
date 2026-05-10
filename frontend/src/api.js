const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const activeRequests = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
}

function buildRequestKey(path, options = {}) {
  const method = options.method || "GET";
  let body = "";
  try {
    body = options.body ? stableStringify(JSON.parse(options.body)) : "";
  } catch {
    body = options.body || "";
  }
  return `${method}:${path}:${body}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function apiFetch(path, options = {}, config = {}) {
  const { retries = 2, timeoutMs = 8000, dedupe = true } = config;
  const key = buildRequestKey(path, options);

  if (dedupe && activeRequests.has(key)) return activeRequests.get(key);

  const requestPromise = (async () => {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetchWithTimeout(
          `${BASE_URL}${path}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(options.headers || {}),
            },
            ...options,
          },
          timeoutMs
        );

        if (!res.ok) {
          const body = await res.text();
          const error = new Error(`API ${path} -> ${res.status}: ${body}`);
          error.status = res.status;

          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            throw error;
          }

          throw error;
        }

        return await res.json();
      } catch (err) {
        lastError = err;

        if (attempt === retries) throw lastError;

        await sleep(300 * Math.pow(2, attempt));

        if (err.name === "AbortError" || err.status === 429) {
          await sleep(250);
        }
      }
    }

    throw lastError;
  })();

  if (dedupe) {
    activeRequests.set(key, requestPromise);
    requestPromise.finally(() => activeRequests.delete(key));
  }

  return requestPromise;
}

export async function fetchParkData(parkId, options = {}) {
  const { force = false } = options;

  const path =
    `/api/park-data?parkId=${encodeURIComponent(parkId)}` +
    (force ? "&force=true" : "");

  return apiFetch(
    path,
    { method: "GET" },
    {
      retries: 2,
      timeoutMs: force ? 12000 : 8000,
      dedupe: !force,
    }
  );
}

export async function fetchWeather(options = {}) {
  const { force = false } = options;

  const path = "/api/weather" + (force ? "?force=true" : "");

  return apiFetch(
    path,
    { method: "GET" },
    {
      retries: 2,
      timeoutMs: force ? 12000 : 8000,
      dedupe: !force,
    }
  );
}

export async function sendChatMessage(message, sessionData) {
  return apiFetch(
    "/api/ai-chat",
    {
      method: "POST",
      body: JSON.stringify({ message, sessionData }),
    },
    { retries: 1, timeoutMs: 12000, dedupe: false }
  );
}
