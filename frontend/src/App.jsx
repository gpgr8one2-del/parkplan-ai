import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudSun, MapPin, MessageCircle, RefreshCw, Send } from "lucide-react";
import { fetchParkData, fetchWeather, sendChatMessage } from "./api";
import { FreshnessBadge } from "./components/FreshnessBadge";
import { DataStatusBanner } from "./components/DataStatusBanner";
import { getNextBestRides } from "./rideRecommendations";
import { getWeatherMode, getRecoverySuggestions } from "./utils/weatherAdvice";
import { formatCloseTimeLabel } from "./parkHours";

const PARKS = [
  { id: "magic_kingdom", name: "Magic Kingdom" },
  { id: "epcot", name: "EPCOT" },
  { id: "hollywood", name: "Hollywood Studios" },
  { id: "animal_kingdom", name: "Animal Kingdom" },
  { id: "universal_sf", name: "Universal Studios Florida" },
  { id: "islands", name: "Islands of Adventure" },
  { id: "epic_universe", name: "Epic Universe" },
];

const LAND_OPTIONS = {
  magic_kingdom: [
    { value: "not_sure", label: "Not sure" },
    { value: "main_street", label: "Main Street, U.S.A." },
    { value: "adventureland", label: "Adventureland" },
    { value: "frontierland", label: "Frontierland" },
    { value: "liberty_square", label: "Liberty Square" },
    { value: "fantasyland", label: "Fantasyland" },
    { value: "tomorrowland", label: "Tomorrowland" },
  ],
};

const STORAGE_KEY = "parkplan.state";

const AUTO_REFRESH_MS = 6 * 60 * 1000;

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #fff7ed 0%, #f8fafc 100%)",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  color: "#0f172a",
};

const shell = { maxWidth: 900, margin: "0 auto", padding: 18 };

const card = {
  background: "rgba(255,255,255,.92)",
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  padding: 16,
  boxShadow: "0 10px 30px rgba(15,23,42,.08)",
  marginBottom: 14,
};

const button = {
  border: "1px solid #e2e8f0",
  background: "white",
  borderRadius: 999,
  padding: "9px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const actionButton = {
  background: "rgba(255,255,255,.72)",
  border: "1px solid #dbeafe",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

function readStoredParkState(parkId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return stored[parkId] || {};
  } catch {
    return {};
  }
}

function writeStoredParkState(parkId, parkState) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    stored[parkId] = parkState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (err) {
    console.warn("ParkPlan: could not save state", err);
  }
}

function App() {
  const [activePark, setActivePark] = useState("magic_kingdom");
  const [parkData, setParkData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [currentLand, setCurrentLand] = useState("not_sure");
  const [completedRideIds, setCompletedRideIds] = useState([]);
  const [skippedRideIds, setSkippedRideIds] = useState([]);

  const isRestoringParkState = useRef(false);

  const loadData = useCallback(
    async (force = false) => {
      setLoading(true);
      setError("");

      try {
        const [park, weatherData] = await Promise.all([
          fetchParkData(activePark, { force }),
          fetchWeather({ force }),
        ]);

        setParkData(park);
        setWeather(weatherData);
      } catch (err) {
        setError(err.message || "Could not load app data.");
      } finally {
        setLoading(false);
      }
    },
    [activePark]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData(false);
      }
    }, AUTO_REFRESH_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadData(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadData]);

  useEffect(() => {
    isRestoringParkState.current = true;

    const saved = readStoredParkState(activePark);

    setCurrentLand(saved.currentLand || "not_sure");
    setCompletedRideIds(saved.completedRideIds || []);
    setSkippedRideIds(saved.skippedRideIds || []);

    setTimeout(() => {
      isRestoringParkState.current = false;
    }, 0);
  }, [activePark]);

  useEffect(() => {
    if (isRestoringParkState.current) return;

    writeStoredParkState(activePark, {
      currentLand,
      completedRideIds,
      skippedRideIds,
    });
  }, [activePark, currentLand, completedRideIds, skippedRideIds]);

  const sortedRides = useMemo(() => {
    return [...(parkData?.rides || [])].sort(
      (a, b) => (b.waitTime || 0) - (a.waitTime || 0)
    );
  }, [parkData]);

  const recommendations = useMemo(() => {
    return getNextBestRides({
      parkId: activePark,
      rides: parkData?.rides || [],
      weather,
      locationContext: {
        type: "manual_land",
        land: currentLand,
      },
      completedRideIds,
      skippedRideIds,
    });
  }, [activePark, parkData, weather, currentLand, completedRideIds, skippedRideIds]);

  const weatherMode = useMemo(() => {
    return getWeatherMode(weather);
  }, [weather]);

  const recoverySuggestions = useMemo(() => {
    return getRecoverySuggestions({
      parkId: activePark,
      weather,
      currentLand,
    });
  }, [activePark, weather, currentLand]);

  const closeTimeLabel = useMemo(() => {
    return formatCloseTimeLabel(activePark);
  }, [activePark]);

  function handleDone(rideId) {
    if (rideId == null) return;
    const id = String(rideId);

    setCompletedRideIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSkippedRideIds((prev) => prev.filter((existingId) => existingId !== id));
  }

  function handleSkip(rideId) {
    if (rideId == null) return;
    const id = String(rideId);

    setSkippedRideIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setCompletedRideIds((prev) => prev.filter((existingId) => existingId !== id));
  }

  function handleResetRecs() {
    setCompletedRideIds([]);
    setSkippedRideIds([]);
  }

  function renderRideActions(ride) {
    if (!ride?.id) return null;

    return (
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => handleDone(ride.id)}
          style={{ ...actionButton, color: "#166534" }}
        >
          ✓ Done
        </button>
        <button
          onClick={() => handleSkip(ride.id)}
          style={{ ...actionButton, color: "#64748b" }}
        >
          Skip
        </button>
      </div>
    );
  }

  async function handleChatSubmit(e) {
    e.preventDefault();

    const trimmed = message.trim();
    if (!trimmed) return;

    const nextChat = [...chat, { role: "user", content: trimmed }];
    setChat(nextChat);
    setMessage("");
    setChatLoading(true);

    try {
      const res = await sendChatMessage(trimmed, {
        activePark,
        weather,
        conversationHistory: nextChat.slice(-6),
        completedRideIds,
        skippedRideIds,
        currentLand,
      });

      setChat([...nextChat, { role: "assistant", content: res.reply }]);
    } catch {
      setChat([
        ...nextChat,
        {
          role: "assistant",
          content: "I had trouble connecting to AI chat. Try again in a minute.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const landOptions = LAND_OPTIONS[activePark] || [{ value: "not_sure", label: "Not sure" }];
  const hiddenRideCount = completedRideIds.length + skippedRideIds.length;

  return (
    <main style={page}>
      <div style={shell}>
        <header style={{ padding: "18px 0" }}>
          <h1 style={{ fontSize: 36, margin: 0, letterSpacing: -1 }}>
            ParkPlan AI
          </h1>
          <p style={{ color: "#64748b", marginTop: 6 }}>
            Smart park planning for Disney World and Universal Orlando.
          </p>
        </header>

        <section style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <MapPin size={18} />
                <h2 style={{ margin: 0, fontSize: 18 }}>
                  {parkData?.parkName || "Choose a park"}
                </h2>
                <FreshnessBadge
                  source={parkData?.source}
                  ageMs={parkData?.ageMs}
                  fetchedAt={parkData?.fetchedAt}
                />
              </div>
              <p style={{ margin: "7px 0 0", color: "#64748b", fontSize: 13 }}>
                {sortedRides.length} rides loaded
                {closeTimeLabel ? ` · closes ${closeTimeLabel}` : ""}
              </p>
            </div>

            <button style={button} onClick={() => loadData(true)} disabled={loading}>
              <RefreshCw size={14} /> {loading ? "Loading" : "Refresh"}
            </button>
          </div>

          <DataStatusBanner source={parkData?.source} />

          {error && (
            <p style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p>
          )}
        </section>

        <section style={card}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {PARKS.map((park) => (
              <button
                key={park.id}
                onClick={() => setActivePark(park.id)}
                style={{
                  ...button,
                  background: activePark === park.id ? "#0f172a" : "white",
                  color: activePark === park.id ? "white" : "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                {park.name}
              </button>
            ))}
          </div>
        </section>

        <section style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CloudSun size={18} />
              <strong>Orlando Weather</strong>
            </div>

            <FreshnessBadge
              source={weather?.source}
              ageMs={weather?.ageMs}
              fetchedAt={weather?.fetchedAt}
            />
          </div>

          <p style={{ margin: "10px 0 0", color: "#334155" }}>
            {weather?.tempF ? `${weather.tempF}°F · ` : ""}
            {weather?.summary || "Loading weather..."}
            {weather?.stormMode ? " · Storm Mode active" : ""}
          </p>

          <DataStatusBanner source={weather?.source} />
        </section>

        {weatherMode.mode !== "normal" && (
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>{weatherMode.label}</h3>
            <p style={{ color: "#334155", marginTop: 0 }}>
              {weatherMode.message}
            </p>

            {recoverySuggestions.length > 0 && (
              <div style={{ display: "grid", gap: 10 }}>
                {recoverySuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      border: "1px solid #fde68a",
                      background: "#fffbeb",
                    }}
                  >
                    <strong>{item.title}</strong>
                    <p style={{ margin: "6px 0 0", color: "#475569" }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section style={card}>
          <h3 style={{ marginTop: 0 }}>Best Move Right Now</h3>

          <div style={{ marginBottom: 12 }}>
            <label
              htmlFor="current-land"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 800,
                color: "#475569",
                marginBottom: 6,
              }}
            >
              Where are you now?
            </label>
            <select
              id="current-land"
              value={currentLand}
              onChange={(e) => setCurrentLand(e.target.value)}
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 14,
                padding: "10px 12px",
                fontWeight: 700,
                background: "white",
                color: "#0f172a",
              }}
            >
              {landOptions.map((land) => (
                <option key={land.value} value={land.value}>
                  {land.label}
                </option>
              ))}
            </select>
          </div>

          {hiddenRideCount > 0 && (
            <button
              onClick={handle
