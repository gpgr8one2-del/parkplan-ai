import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudSun, MapPin, MessageCircle, RefreshCw, Send } from "lucide-react";
import { fetchParkData, fetchWeather, sendChatMessage } from "./api";
import { FreshnessBadge } from "./components/FreshnessBadge";
import { DataStatusBanner } from "./components/DataStatusBanner";
import { getNextBestRides } from "./rideRecommendations";
import { getWeatherMode, getRecoverySuggestions } from "./utils/weatherAdvice";
import { formatCloseTimeLabel } from "./parkHours";
import { getRideExperienceContent } from "./rideExperienceContent";

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

  epcot: [
    { value: "not_sure", label: "Not sure" },
    { value: "world_celebration", label: "World Celebration" },
    { value: "world_discovery", label: "World Discovery" },
    { value: "world_nature", label: "World Nature" },
    { value: "world_showcase_west", label: "World Showcase West / France-UK-Canada" },
    { value: "world_showcase_center", label: "World Showcase Center / America-Japan-Italy" },
    { value: "world_showcase_east", label: "World Showcase East / Mexico-Norway-China" },
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

function formatActivityStartTime(isoString) {
  if (!isoString) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return "";
  }
}

function buildWeatherDisplay(weather) {
  if (!weather) return "Loading weather...";

  const parts = [];

  if (weather.tempF != null) {
    parts.push(`${weather.tempF}°F`);
  }

  if (
    weather.feelsLikeF != null &&
    weather.tempF != null &&
    Math.abs(weather.feelsLikeF - weather.tempF) >= 2
  ) {
    parts.push(`feels like ${weather.feelsLikeF}°F`);
  }

  if (weather.humidity != null) {
    parts.push(`${weather.humidity}% humidity`);
  }

  if (weather.summary) {
    parts.push(weather.summary);
  }

  if (weather.stormMode) {
    parts.push("Storm Mode active");
  }

  return parts.length ? parts.join(" · ") : "Loading weather...";
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
  const [reportedRideIssueIds, setReportedRideIssueIds] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);

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
        loadData(true);
      }
    }, AUTO_REFRESH_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadData(true);
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
    setReportedRideIssueIds(saved.reportedRideIssueIds || []);
    setCurrentActivity(saved.currentActivity || null);

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
      reportedRideIssueIds,
      currentActivity,
    });
  }, [
    activePark,
    currentLand,
    completedRideIds,
    skippedRideIds,
    reportedRideIssueIds,
    currentActivity,
  ]);

  const sortedRides = useMemo(() => {
    return [...(parkData?.rides || [])].sort(
      (a, b) => (b.waitTime || 0) - (a.waitTime || 0)
    );
  }, [parkData]);

  const activeRideId =
    currentActivity?.type === "in_line" && currentActivity?.rideId != null
      ? String(currentActivity.rideId)
      : null;

  const recommendationAvoidedRideIds = useMemo(() => {
    const ids = new Set([
      ...skippedRideIds.map(String),
      ...reportedRideIssueIds.map(String),
    ]);

    if (activeRideId) {
      ids.add(activeRideId);
    }

    return Array.from(ids);
  }, [skippedRideIds, reportedRideIssueIds, activeRideId]);

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
      skippedRideIds: recommendationAvoidedRideIds,
    });
  }, [
    activePark,
    parkData,
    weather,
    currentLand,
    completedRideIds,
    recommendationAvoidedRideIds,
  ]);

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

  const whileYouWaitContent = useMemo(() => {
    if (currentActivity?.type !== "in_line") return null;

    return getRideExperienceContent(activePark, currentActivity.rideName);
  }, [activePark, currentActivity]);

  function handleInLine(ride) {
    if (!ride?.id) return;

    const id = String(ride.id);

    setCurrentActivity({
      type: "in_line",
      rideId: id,
      rideName: ride.name || "Selected attraction",
      land: ride.land || "",
      startedAt: new Date().toISOString(),
      postedWaitAtStart: ride.waitTime ?? null,
    });

    setCompletedRideIds((prev) => prev.filter((existingId) => existingId !== id));
    setSkippedRideIds((prev) => prev.filter((existingId) => existingId !== id));
    setReportedRideIssueIds((prev) => prev.filter((existingId) => existingId !== id));
  }

  function handleDone(rideId) {
    if (rideId == null) return;
    const id = String(rideId);

    setCompletedRideIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSkippedRideIds((prev) => prev.filter((existingId) => existingId !== id));
    setReportedRideIssueIds((prev) => prev.filter((existingId) => existingId !== id));

    if (activeRideId === id) {
      setCurrentActivity(null);
    }
  }

  function handleSkip(rideId) {
    if (rideId == null) return;
    const id = String(rideId);

    setSkippedRideIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setCompletedRideIds((prev) => prev.filter((existingId) => existingId !== id));
    setReportedRideIssueIds((prev) => prev.filter((existingId) => existingId !== id));

    if (activeRideId === id) {
      setCurrentActivity(null);
    }
  }

  function handleReportRideIssue(ride) {
    if (!ride?.id) return;

    const id = String(ride.id);

    setReportedRideIssueIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setCompletedRideIds((prev) => prev.filter((existingId) => existingId !== id));
    setSkippedRideIds((prev) => prev.filter((existingId) => existingId !== id));

    if (activeRideId === id) {
      setCurrentActivity(null);
    }
  }

  function handleCancelCurrentActivity() {
    setCurrentActivity(null);
  }

  function handleResetRecs() {
    setCompletedRideIds([]);
    setSkippedRideIds([]);
    setReportedRideIssueIds([]);
    setCurrentActivity(null);
  }

  function renderRideActions(ride) {
    if (!ride?.id) return null;

    const isActiveRide = activeRideId === String(ride.id);

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
          onClick={() => handleInLine(ride)}
          disabled={isActiveRide}
          style={{
            ...actionButton,
            color: isActiveRide ? "#94a3b8" : "#6d28d9",
            borderColor: isActiveRide ? "#e2e8f0" : "#ddd6fe",
            cursor: isActiveRide ? "not-allowed" : "pointer",
          }}
        >
          {isActiveRide ? "In Line Now" : "In Line"}
        </button>

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

        <button
          onClick={() => handleReportRideIssue(ride)}
          style={{
            ...actionButton,
            color: "#9a3412",
            borderColor: "#fed7aa",
          }}
        >
          Report Issue
        </button>
      </div>
    );
  }

  function renderWhileYouWaitCard() {
    const items = whileYouWaitContent?.whileWaiting || [];

    if (!items.length) {
      return null;
    }

    return (
      <section
        style={{
          ...card,
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
        }}
      >
        <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>
          WHILE YOU WAIT
        </div>

        <h3 style={{ margin: "5px 0 10px", fontSize: 20 }}>
          Little details to make the line better
        </h3>

        <div style={{ display: "grid", gap: 10 }}>
          {items.slice(0, 3).map((item, idx) => (
            <div
              key={`${item.title}-${idx}`}
              style={{
                padding: 12,
                borderRadius: 16,
                border: "1px solid #dbeafe",
                background: "rgba(255,255,255,.75)",
              }}
            >
              <strong>{item.title}</strong>
              <p style={{ margin: "6px 0 0", color: "#334155" }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>
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
        weatherMode,
        recommendations,
        conversationHistory: nextChat.slice(-6),
        completedRideIds,
        skippedRideIds,
        reportedRideIssueIds,
        currentLand,
        currentActivity,
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
  const hiddenRideCount =
    completedRideIds.length +
    skippedRideIds.length +
    reportedRideIssueIds.length +
    (currentActivity ? 1 : 0);

  const primaryRecommendation =
    recommendations.bestMove ||
    recommendations.backup ||
    recommendations.worthTheWalk ||
    recommendations.planAhead ||
    recommendations.waitOnThis;

  const hasAnyRecommendation = Boolean(primaryRecommendation);

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

          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            Live wait data can occasionally lag the official park app during ride
            reopenings or weather delays. Refresh before walking across the park
            for a headliner.
          </p>

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
            {buildWeatherDisplay(weather)}
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

        {currentActivity?.type === "in_line" && (
          <section
            style={{
              ...card,
              border: "1px solid #c4b5fd",
              background: "#f5f3ff",
            }}
          >
            <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 900 }}>
              CURRENTLY IN LINE
            </div>

            <h3 style={{ margin: "5px 0", fontSize: 20 }}>
              {currentActivity.rideName}
            </h3>

            <p style={{ margin: "0 0 8px", color: "#475569" }}>
              {currentActivity.postedWaitAtStart != null
                ? `Posted wait when you joined: ${currentActivity.postedWaitAtStart} min`
                : "You marked this as your current line."}
              {currentActivity.startedAt
                ? ` · Started around ${formatActivityStartTime(currentActivity.startedAt)}`
                : ""}
            </p>

            <p style={{ margin: "0 0 12px", color: "#334155" }}>
              I’ll stop recommending this against itself while you’re waiting. Mark it
              done when you finish, or cancel if you leave the line.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => handleDone(currentActivity.rideId)}
                style={{ ...button, color: "#166534", borderColor: "#bbf7d0" }}
              >
                ✓ Mark Done
              </button>

              <button
                onClick={handleCancelCurrentActivity}
                style={{ ...button, color: "#64748b" }}
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {renderWhileYouWaitCard()}

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

          {reportedRideIssueIds.length > 0 && (
            <div
              style={{
                padding: 12,
                borderRadius: 16,
                border: "1px solid #fed7aa",
                background: "#fff7ed",
                marginBottom: 12,
              }}
            >
              <strong>Ride issue reported</strong>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                I’ll avoid recommending reported rides for now. Use reset to bring
                them back once things look normal.
              </p>
            </div>
          )}

          {hiddenRideCount > 0 && (
            <button
              onClick={handleResetRecs}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                fontSize: 12,
                textDecoration: "underline",
                cursor: "pointer",
                marginBottom: 12,
                padding: 0,
              }}
            >
              Reset recommendations ({hiddenRideCount} hidden)
            </button>
          )}

          {hasAnyRecommendation ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 18,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                }}
              >
                <div style={{ fontSize: 12, color: "#166534", fontWeight: 900 }}>
                  BEST MOVE
                </div>
                <h4 style={{ margin: "4px 0", fontSize: 20 }}>
                  {primaryRecommendation.name}
                </h4>
                <p style={{ margin: 0, color: "#166534", fontWeight: 800 }}>
                  {primaryRecommendation.waitTime} min wait
                </p>
                <p style={{ margin: "8px 0 0", color: "#334155" }}>
                  Why: {primaryRecommendation.reason || "best available option based on current conditions"}.
                </p>
                {renderRideActions(primaryRecommendation)}
              </div>

              {recommendations.backup && recommendations.backup.id !== primaryRecommendation?.id && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>
                    SMART BACKUP
                  </div>
                  <h4 style={{ margin: "4px 0", fontSize: 18 }}>
                    {recommendations.backup.name}
                  </h4>
                  <p style={{ margin: 0, color: "#1d4ed8", fontWeight: 800 }}>
                    {recommendations.backup.waitTime} min wait
                  </p>
                  <p style={{ margin: "8px 0 0", color: "#334155" }}>
                    Why: {recommendations.backup.reason}.
                  </p>
                  {renderRideActions(recommendations.backup)}
                </div>
              )}

              {recommendations.worthTheWalk && recommendations.worthTheWalk.id !== primaryRecommendation?.id && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid #ddd6fe",
                    background: "#f5f3ff",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 900 }}>
                    WORTH THE WALK
                  </div>
                  <h4 style={{ margin: "4px 0", fontSize: 18 }}>
                    {recommendations.worthTheWalk.name}
                  </h4>
                  <p style={{ margin: 0, color: "#6d28d9", fontWeight: 800 }}>
                    {recommendations.worthTheWalk.waitTime} min wait
                  </p>
                  <p style={{ margin: "8px 0 0", color: "#334155" }}>
                    Not nearby, but the current wait is strong enough that it may be worth crossing over for.
                  </p>
                  {renderRideActions(recommendations.worthTheWalk)}
                </div>
              )}

              {recommendations.planAhead && recommendations.planAhead.id !== primaryRecommendation?.id && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#991b1b", fontWeight: 900 }}>
                    PLAN AHEAD
                  </div>
                  <h4 style={{ margin: "4px 0", fontSize: 18 }}>
                    {recommendations.planAhead.name}
                  </h4>
                  <p style={{ margin: 0, color: "#991b1b", fontWeight: 800 }}>
                    {recommendations.planAhead.waitTime} min wait
                  </p>
                  <p style={{ margin: "8px 0 0", color: "#334155" }}>
                    {recommendations.planAhead.planAheadReason ||
                      "This ride usually needs a strategy. Consider Lightning Lane, rope drop, late night, or watching for a rare dip."}
                  </p>
                  {renderRideActions(recommendations.planAhead)}
                </div>
              )}

              {recommendations.waitOnThis && recommendations.waitOnThis.id !== primaryRecommendation?.id && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid #fed7aa",
                    background: "#fff7ed",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>
                    WAIT ON THIS
                  </div>
                  <h4 style={{ margin: "4px 0", fontSize: 18 }}>
                    {recommendations.waitOnThis.name}
                  </h4>
                  <p style={{ margin: 0, color: "#9a3412", fontWeight: 800 }}>
                    {recommendations.waitOnThis.waitTime} min wait
                  </p>
                  <p style={{ margin: "8px 0 0", color: "#334155" }}>
                    This wait is higher than this ride is usually worth. Check again later when crowds shift.
                  </p>
                  {renderRideActions(recommendations.waitOnThis)}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: 14,
                borderRadius: 18,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <strong>No strong recommendation right now.</strong>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                Refresh wait data, reset hidden rides, or use this as a good
                moment for a nearby indoor break, snack, restroom stop, or
                quick regroup.
              </p>
            </div>
          )}
        </section>

        <section style={card}>
          <h3 style={{ marginTop: 0 }}>Wait Times</h3>

          <div style={{ display: "grid", gap: 10 }}>
            {sortedRides.map((ride) => (
              <div
                key={ride.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 12,
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                }}
              >
                <div>
                  <strong>{ride.name}</strong>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {ride.land} · {ride.isOpen ? "Open" : "Closed"}
                  </div>
                </div>

                <div style={{ fontWeight: 900 }}>{ride.waitTime} min</div>
              </div>
            ))}
          </div>
        </section>

        <section style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MessageCircle size={18} />
            <h3 style={{ margin: 0 }}>AI Park Assistant</h3>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {chat.length === 0 && (
              <p style={{ color: "#64748b" }}>
                Ask what to ride next, how to handle weather, or how to plan your
                afternoon.
              </p>
            )}

            {chat.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  background: msg.role === "user" ? "#e0f2fe" : "#f1f5f9",
                }}
              >
                <strong>{msg.role === "user" ? "You" : "ParkPlan AI"}: </strong>
                {msg.content}
              </div>
            ))}
          </div>

          <form
            onSubmit={handleChatSubmit}
            style={{ display: "flex", gap: 8, marginTop: 12 }}
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask ParkPlan AI..."
              style={{
                flex: 1,
                border: "1px solid #cbd5e1",
                borderRadius: 999,
                padding: "10px 12px",
              }}
            />
            <button style={button} disabled={chatLoading}>
              <Send size={14} /> {chatLoading ? "..." : "Send"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default App;
