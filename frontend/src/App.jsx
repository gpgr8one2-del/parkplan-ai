import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudSun, MapPin, MessageCircle, RefreshCw, Send } from "lucide-react";
import { fetchParkData, fetchWeather, sendChatMessage } from "./api";
import { FreshnessBadge } from "./components/FreshnessBadge";
import { DataStatusBanner } from "./components/DataStatusBanner";
import { getNextBestRides } from "./rideRecommendations";
import { getWeatherMode, getRecoverySuggestions } from "./utils/weatherAdvice";
import { formatCloseTimeLabel } from "./parkHours";
import { getRideExperienceContent } from "./rideExperienceContent";
import { shouldShowRideInWaitList } from "./attractionDisplayFilters";
import { getMiniGameForContext, MINI_GAME_TYPES } from "./data/miniGames/magicKingdomMiniGames";
import { detectNearestLocationZone, getCurrentPosition } from "./utils/locationDetection";

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
    {
      value: "main_street",
      label: "Main Street / near entrance, shops, castle hub",
    },
    {
      value: "adventureland",
      label: "Adventureland / near Pirates, Jungle Cruise, Aladdin",
    },
    {
      value: "frontierland",
      label: "Frontierland / near Big Thunder, Tiana’s, Country Bears",
    },
    {
      value: "liberty_square",
      label: "Liberty Square / near Haunted Mansion, Hall of Presidents",
    },
    {
      value: "fantasyland",
      label: "Fantasyland / near Peter Pan, Small World, Seven Dwarfs, Little Mermaid",
    },
    {
      value: "tomorrowland",
      label: "Tomorrowland / near Space Mountain, TRON, Buzz, PeopleMover",
    },
  ],

  epcot: [
    {
      value: "world_celebration",
      label: "World Celebration / near Spaceship Earth, Connections, Creations",
    },
    {
      value: "world_discovery",
      label: "World Discovery / near Guardians, Test Track, Mission: SPACE",
    },
    {
      value: "world_nature",
      label: "World Nature / near Soarin’, The Land, The Seas, Moana",
    },
    {
      value: "world_showcase_west",
      label: "World Showcase West / near Remy, France, UK, Canada",
    },
    {
      value: "world_showcase_center",
      label: "World Showcase Center / near America, Japan, Italy, Morocco",
    },
    {
      value: "world_showcase_east",
      label: "World Showcase East / near Frozen, Mexico, Norway, China",
    },
  ],

  hollywood: [
    {
      value: "hollywood_boulevard",
      label: "Hollywood Boulevard / near Mickey & Minnie’s Runaway Railway",
    },
    {
      value: "sunset_boulevard",
      label: "Sunset Boulevard / near Tower of Terror, Rock ’n’ Roller",
    },
    {
      value: "echo_lake",
      label: "Echo Lake / near Star Tours, Frozen Sing-Along, Backlot Express",
    },
    {
      value: "grand_avenue",
      label: "Grand Avenue / near BaseLine, ABC Commissary side",
    },
    {
      value: "star_wars_galaxys_edge",
      label: "Galaxy’s Edge / near Rise, Falcon, Docking Bay 7",
    },
    {
      value: "toy_story_land",
      label: "Toy Story Land / near Slinky, Toy Story Mania, Alien Saucers",
    },
    {
      value: "animation_courtyard",
      label: "Animation Courtyard / near Disney Junior, Walt Disney Presents area",
    },
    {
      value: "commissary_lane",
      label: "Commissary Lane / near ABC Commissary, Sci-Fi Dine-In",
    },
  ],
};

function getDefaultLandForPark(parkId) {
  return LAND_OPTIONS[parkId]?.[0]?.value || "";
}

function getSafeLandForPark(parkId, land) {
  const options = LAND_OPTIONS[parkId] || [];
  const hasLand = options.some((option) => option.value === land);

  return hasLand ? land : getDefaultLandForPark(parkId);
}

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

function getElapsedMinutesSince(isoString) {
  if (!isoString) return null;

  const startedAtMs = new Date(isoString).getTime();

  if (!Number.isFinite(startedAtMs)) {
    return null;
  }

  const elapsedMs = Date.now() - startedAtMs;

  if (elapsedMs < 0) {
    return 0;
  }

  return Math.max(0, Math.round(elapsedMs / 60000));
}

function buildCurrentActivityContext(currentActivity) {
  if (!currentActivity) return null;

  const elapsedMinutes =
    currentActivity.type === "in_line"
      ? getElapsedMinutesSince(currentActivity.startedAt)
      : null;

  return {
    ...currentActivity,
    elapsedMinutesInLine: elapsedMinutes,
    summary:
      currentActivity.type === "in_line"
        ? `User is currently in line for ${currentActivity.rideName}. Posted wait when joined: ${
            currentActivity.postedWaitAtStart ?? "unknown"
          } minutes. Elapsed time in line: ${
            elapsedMinutes ?? "unknown"
          } minutes.`
        : null,
  };
}

function buildLocalChatFallback({
  activePark,
  weatherMode,
  currentActivityContext,
}) {
  if (currentActivityContext?.type === "in_line") {
    const elapsed = currentActivityContext.elapsedMinutesInLine;
    const posted = currentActivityContext.postedWaitAtStart;
    const rideName = currentActivityContext.rideName || "this ride";
    const elapsedText =
      elapsed != null ? `you’ve already waited about ${elapsed} minutes` : "you’re already in line";
    const postedText =
      posted != null ? `the posted wait was ${posted} minutes when you joined` : "I do not have the original posted wait";

    return `I’m having trouble reaching AI chat right now, but here’s the safe ParkPlan call: since ${elapsedText} for ${rideName} and ${postedText}, don’t automatically bail unless the line has stopped, someone feels overheated, or the kids are close to a true meltdown. If the line is moving and this ride matters to your family, try to finish it, then make food, water, and AC the immediate next move.`;
  }

  if (weatherMode?.mode && weatherMode.mode !== "normal") {
    return `I’m having trouble reaching AI chat right now, but based on current weather mode, keep the plan simple: favor nearby indoor options, water, shade, food, or a seated reset before chasing a farther ride.`;
  }

  return "I’m having trouble reaching AI chat right now. Try again in a minute. If the family is tired or hot, use this as a good moment for water, AC, food, or a nearby low-stress ride before making a big walk.";
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

function formatLandLabel(parkId, land) {
  const labels = {
    magic_kingdom: {
      main_street: "Main Street, U.S.A.",
      adventureland: "Adventureland",
      frontierland: "Frontierland",
      liberty_square: "Liberty Square",
      fantasyland: "Fantasyland",
      tomorrowland: "Tomorrowland",
    },

    epcot: {
      world_celebration: "World Celebration",
      world_discovery: "World Discovery",
      world_nature: "World Nature",
      world_showcase_west: "World Showcase West / France-UK-Canada",
      world_showcase_center: "World Showcase Center / America-Japan-Italy",
      world_showcase_east: "World Showcase East / Mexico-Norway-China",
      world_showcase: "World Showcase",
      "American Adventure Pavilion": "American Adventure Pavilion",
    },

    hollywood: {
      hollywood_boulevard: "Hollywood Boulevard",
      sunset_boulevard: "Sunset Boulevard",
      echo_lake: "Echo Lake",
      grand_avenue: "Grand Avenue",
      star_wars_galaxys_edge: "Star Wars: Galaxy’s Edge",
      toy_story_land: "Toy Story Land",
      animation_courtyard: "Animation Courtyard",
      commissary_lane: "Commissary Lane",
    },
  };

  return labels[parkId]?.[land] || land || "Unknown area";
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
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationError, setLocationError] = useState("");

  const [currentLand, setCurrentLand] = useState(() => getDefaultLandForPark("magic_kingdom"));
  const [completedRideIds, setCompletedRideIds] = useState([]);
  const [skippedRideIds, setSkippedRideIds] = useState([]);
  const [reportedRideIssueIds, setReportedRideIssueIds] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [activeMiniGameType, setActiveMiniGameType] = useState("trivia");
  const [miniGameSeed, setMiniGameSeed] = useState(0);
  const [revealedTriviaAnswer, setRevealedTriviaAnswer] = useState(false);

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

    setCurrentLand(getSafeLandForPark(activePark, saved.currentLand));
    setCompletedRideIds(saved.completedRideIds || []);
    setSkippedRideIds(saved.skippedRideIds || []);
    setReportedRideIssueIds(saved.reportedRideIssueIds || []);
    setCurrentActivity(saved.currentActivity || null);
    setLocationMessage("");
    setLocationError("");

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
    return [...(parkData?.rides || [])]
      .filter((ride) => shouldShowRideInWaitList(activePark, ride))
      .sort((a, b) => (b.waitTime || 0) - (a.waitTime || 0));
  }, [parkData, activePark]);

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

  const activeMiniGame = useMemo(() => {
    if (currentActivity?.type !== "in_line") return null;

    return getMiniGameForContext({
      parkId: activePark,
      land: currentActivity.land || currentLand,
      rideName: currentActivity.rideName,
      gameType: activeMiniGameType,
      seed: miniGameSeed,
    });
  }, [
    activePark,
    activeMiniGameType,
    currentActivity,
    currentLand,
    miniGameSeed,
  ]);

  const currentActivityContext = useMemo(() => {
    return buildCurrentActivityContext(currentActivity);
  }, [currentActivity]);

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

  function handleMiniGameTypeChange(type) {
    setActiveMiniGameType(type);
    setMiniGameSeed(0);
    setRevealedTriviaAnswer(false);
  }

  function handleNextMiniGame() {
    setMiniGameSeed((prev) => prev + 1);
    setRevealedTriviaAnswer(false);
  }

  async function handleUseMyLocation() {
    setLocationLoading(true);
    setLocationMessage("");
    setLocationError("");

    try {
      const position = await getCurrentPosition();
      const detectedZone = detectNearestLocationZone({
        parkId: activePark,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      if (!detectedZone) {
        setLocationError(
          "I could not match your location to this park yet. Pick the closest area manually for now."
        );
        return;
      }

      setCurrentLand(getSafeLandForPark(activePark, detectedZone.landKey));
      setLocationMessage(
        `${detectedZone.message} ${
          detectedZone.confidence === "low"
            ? "If that does not look right, pick the closest area manually."
            : "Not right? Pick another area manually."
        }`
      );
    } catch (err) {
      const denied =
        err?.code === 1 ||
        String(err?.message || "").toLowerCase().includes("denied");

      setLocationError(
        denied
          ? "Location permission was denied. No problem — pick the closest area manually."
          : "I could not get your location right now. Pick the closest area manually."
      );
    } finally {
      setLocationLoading(false);
    }
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

  function renderLineTimeCompanion() {
    if (currentActivity?.type !== "in_line") return null;

    if (activePark !== "magic_kingdom") {
      return (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 16,
            border: "1px solid #dbeafe",
            background: "rgba(255,255,255,.75)",
          }}
        >
          <strong>Line Time Companion</strong>
          <p style={{ margin: "6px 0 0", color: "#475569" }}>
            Mini-games are starting in Magic Kingdom for this test. If your family likes it, we’ll expand it to the other parks.
          </p>
        </div>
      );
    }

    if (!activeMiniGame) return null;

    return (
      <div
        style={{
          marginTop: 14,
          padding: 12,
          borderRadius: 18,
          border: "1px solid #c4b5fd",
          background: "#faf5ff",
        }}
      >
        <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 900 }}>
          LINE TIME COMPANION
        </div>

        <h4 style={{ margin: "5px 0 6px", fontSize: 18 }}>
          A quick family game while you wait
        </h4>

        <p style={{ margin: "0 0 10px", color: "#475569", fontSize: 13 }}>
          No scores. No pressure. Just a tiny way to laugh, look around, and make the line feel shorter.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {MINI_GAME_TYPES.map((game) => (
            <button
              key={game.key}
              onClick={() => handleMiniGameTypeChange(game.key)}
              style={{
                ...actionButton,
                background: activeMiniGameType === game.key ? "#6d28d9" : "white",
                color: activeMiniGameType === game.key ? "white" : "#6d28d9",
                borderColor: "#c4b5fd",
              }}
            >
              {game.label}
            </button>
          ))}
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 16,
            border: "1px solid #ddd6fe",
            background: "white",
          }}
        >
          <strong>{activeMiniGame.title}</strong>

          {activeMiniGame.type === "trivia" && (
            <>
              <p style={{ margin: "8px 0", color: "#334155", fontWeight: 700 }}>
                {activeMiniGame.question}
              </p>

              <div style={{ display: "grid", gap: 8 }}>
                {activeMiniGame.choices.map((choice) => {
                  const isCorrect = choice === activeMiniGame.answer;

                  return (
                    <button
                      key={choice}
                      onClick={() => setRevealedTriviaAnswer(true)}
                      style={{
                        ...button,
                        borderRadius: 14,
                        textAlign: "left",
                        background:
                          revealedTriviaAnswer && isCorrect ? "#dcfce7" : "white",
                        borderColor:
                          revealedTriviaAnswer && isCorrect ? "#86efac" : "#e2e8f0",
                        color:
                          revealedTriviaAnswer && isCorrect ? "#166534" : "#0f172a",
                      }}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>

              {!revealedTriviaAnswer ? (
                <button
                  onClick={() => setRevealedTriviaAnswer(true)}
                  style={{ ...button, marginTop: 10, color: "#6d28d9" }}
                >
                  Show Answer
                </button>
              ) : (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 14,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <strong style={{ color: "#166534" }}>
                    Answer: {activeMiniGame.answer}
                  </strong>
                  <p style={{ margin: "6px 0 0", color: "#334155" }}>
                    {activeMiniGame.fact}
                  </p>
                </div>
              )}
            </>
          )}

          {activeMiniGame.type === "look_around" && (
            <>
              <p style={{ margin: "8px 0", color: "#334155", fontWeight: 700 }}>
                {activeMiniGame.task}
              </p>
              <p style={{ margin: "0 0 10px", color: "#64748b" }}>
                Hint: {activeMiniGame.hint}
              </p>
              <button style={{ ...button, color: "#166534" }}>
                Found it!
              </button>
            </>
          )}

          {activeMiniGame.type === "family_vote" && (
            <>
              <p style={{ margin: "8px 0", color: "#334155", fontWeight: 700 }}>
                {activeMiniGame.prompt}
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {activeMiniGame.options.map((option) => (
                  <button
                    key={option}
                    style={{
                      ...button,
                      borderRadius: 14,
                      textAlign: "left",
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          )}

          {activeMiniGame.type === "would_you_rather" && (
            <p style={{ margin: "8px 0", color: "#334155", fontWeight: 800 }}>
              {activeMiniGame.prompt}
            </p>
          )}

          <button
            onClick={handleNextMiniGame}
            style={{ ...button, marginTop: 12, color: "#6d28d9" }}
          >
            Give us another one
          </button>
        </div>
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
          {items.map((item, idx) => (
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

        {renderLineTimeCompanion()}
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
        locationContext: {
          type: "manual_or_gps_land",
          land: currentLand,
          locationMessage,
        },
        currentActivity: currentActivityContext,
        currentActivityContext,
        parkPlanBehaviorHints: {
          inLineDecisionRule:
            "If the user is already in line and asks whether to leave, do not give a hard leave-the-line recommendation unless safety, overheating, true meltdown risk, ride closure, or a stalled line clearly outweighs the ride value. If elapsed line time, line movement, or must-do status is missing, ask one quick clarifying question or give stay-vs-leave thresholds.",
          familyEnergyRule:
            "When kids are tired, hungry, hot, or cranky, balance ride value against family energy. Recommend food, water, AC, and resort breaks when appropriate, but respect high-value waits and sunk wait time.",
        },
      });

      setChat([...nextChat, { role: "assistant", content: res.reply }]);
    } catch {
      setChat([
        ...nextChat,
        {
          role: "assistant",
          content: buildLocalChatFallback({
            activePark,
            weatherMode,
            currentActivityContext,
          }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const landOptions = LAND_OPTIONS[activePark] || [];
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
              {currentActivityContext?.elapsedMinutesInLine != null
                ? ` · About ${currentActivityContext.elapsedMinutesInLine} min in line`
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
              What are you closest to?
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

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={locationLoading}
                style={{
                  ...actionButton,
                  color: "#1d4ed8",
                  borderColor: "#bfdbfe",
                }}
              >
                <MapPin size={13} />{" "}
                {locationLoading ? "Finding you..." : "Use My Location"}
              </button>

              <span style={{ color: "#64748b", fontSize: 12 }}>
                Optional. Used only to estimate your nearby park area.
              </span>
            </div>

            {locationMessage && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#166534",
                  fontSize: 12,
                  lineHeight: 1.4,
                  fontWeight: 700,
                }}
              >
                {locationMessage}
              </p>
            )}

            {locationError && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#b91c1c",
                  fontSize: 12,
                  lineHeight: 1.4,
                  fontWeight: 700,
                }}
              >
                {locationError}
              </p>
            )}

            <p
              style={{
                margin: "7px 0 0",
                color: "#64748b",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              Pick the closest area. It does not need to be perfect, but it helps
              avoid bad cross-park recommendations.
            </p>
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
                    {formatLandLabel(activePark, ride.land)} · {ride.isOpen ? "Open" : "Closed"}
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
