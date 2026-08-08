import React from "react";
import { CloudSun, MapPin, RefreshCw } from "lucide-react";

import { DataStatusBanner } from "./DataStatusBanner";
import { FreshnessBadge } from "./FreshnessBadge";
import { WhileYouWaitCard } from "./WhileYouWaitCard";
import { PARKS } from "../data/parkAreas";
import { canConfirmParkPresence, selectBrowsedPark } from "../utils/parkPresence";
import { getWeatherMode } from "../utils/weatherAdvice";
import { colors } from "../theme";

// 62B-1a: Home presentation extracted verbatim from App.jsx. This component is
// presentation only — every piece of state, effect, memo, timer, storage,
// analytics, weather fetching, park-presence logic, activity logic, and handler
// stays in App.jsx, which also still decides when Home renders.
//
// These three formatters moved with the markup because Home was their only
// caller. getParkNameById stayed in App.jsx (25 call sites there) and arrives as
// a prop instead.

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

const formatElapsedInLineBadge = (elapsedMinutes) => {
  if (elapsedMinutes == null) {
    return "";
  }

  if (elapsedMinutes <= 0) {
    return " · Just joined the line";
  }

  return ` · About ${elapsedMinutes} min in line`;
};

function buildWeatherDisplay(weather, weatherMode = null) {
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

  const displayWeatherMode = weatherMode || getWeatherMode(weather);

  if (displayWeatherMode?.mode && displayWeatherMode.mode !== "normal") {
    parts.push(displayWeatherMode.label || "Weather watch");
  }

  return parts.length ? parts.join(" · ") : "Loading weather...";
}

export function HomeTab({
  // data + derived state
  activePark,
  browsedParkId,
  closeTimeLabel,
  currentActivity,
  currentActivityContext,
  error,
  homeGreeting,
  liveParkContext,
  loading,
  parkData,
  parkHopperContext,
  parkPresence,
  parkPresencePrompt,
  parkPresenceTheme,
  planningPark,
  planningParkLabel,
  planningParkSource,
  scheduledParkForToday,
  todayPlannedParkLabel,
  weather,
  weatherMode,
  whileYouWaitContent,

  // While You Wait mini-game state
  activeMiniGame,
  activeMiniGameType,
  lookAroundFound,
  revealedTriviaAnswer,
  selectedFamilyVoteOption,
  selectedTriviaChoice,

  // handlers
  getParkNameById,
  handleCancelCurrentActivity,
  handleConfirmParkPresence,
  handleDismissParkPresencePrompt,
  handleDone,
  handleSelectPark,
  loadData,
  setActivePark,
  setParkPresence,
  trackAppEvent,

  // While You Wait mini-game handlers
  handleFamilyVote,
  handleLookAroundFound,
  handleMiniGameTypeChange,
  handleNextMiniGame,
  handleTriviaChoice,
  showTriviaAnswer,

  // shared style objects
  actionButton,
  button,
  card,
}) {
  return (
    <>
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            background:
              "radial-gradient(circle at 88% 8%, rgba(124, 58, 237, 0.34) 0%, rgba(124, 58, 237, 0.12) 24%, transparent 46%), radial-gradient(circle at 8% 0%, rgba(245, 158, 11, 0.30) 0%, rgba(245, 158, 11, 0.10) 32%, transparent 58%), linear-gradient(150deg, #FFFFFF 0%, #FFF4D8 45%, #F3E8FF 100%)",
            border: "1px solid rgba(124, 58, 237, 0.16)",
            borderRadius: 32,
            padding: "26px 22px 20px",
            marginBottom: 14,
            boxShadow: "0 22px 58px rgba(91, 33, 182, 0.16)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 130,
              height: 130,
              borderRadius: "999px",
              background: "rgba(251, 113, 133, 0.18)",
              right: -42,
              bottom: -54,
              filter: "blur(2px)",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 86,
              height: 86,
              borderRadius: "999px",
              background: "rgba(56, 189, 248, 0.16)",
              right: 38,
              top: 38,
              filter: "blur(1px)",
            }}
          />

          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(124, 58, 237, 0.10)",
                color: colors.purpleDeep,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.8,
                marginBottom: 14,
              }}
            >
              ✨ TODAY&apos;S GAME PLAN
            </div>

            <img
              src="/tohi-logo.png"
              alt="TOHI"
              style={{
                display: "block",
                width: 146,
                maxWidth: "50vw",
                height: "auto",
                marginBottom: 16,
              }}
            />

            <h1
              style={{
                margin: 0,
                fontSize: 28,
                color: colors.text,
                letterSpacing: -0.6,
                lineHeight: 1.18,
                fontWeight: 900,
              }}
            >
              {homeGreeting}
            </h1>

            <p
              style={{
                margin: "9px 0 18px",
                color: colors.muted,
                fontSize: 15,
                lineHeight: 1.5,
                maxWidth: 520,
              }}
            >
              Here&apos;s what matters right now. TOHI is watching the heat, waits,
              and walking so your family can keep the day feeling good.
            </p>
          </div>

          <div
            style={{
              position: "relative",
              height: 1,
              background: "rgba(124, 58, 237, 0.14)",
              margin: "0 -22px 14px",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <MapPin size={16} style={{ color: colors.purple }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>
                {parkData?.parkName || "Choose a park"}
              </span>

              {weather?.tempF != null && (
                <span style={{ fontSize: 13, color: colors.muted }}>
                  · {weather.tempF}°F
                </span>
              )}

              {closeTimeLabel && (
                <span style={{ fontSize: 13, color: colors.muted }}>
                  · closes {closeTimeLabel}
                </span>
              )}

              <FreshnessBadge
                source={parkData?.source}
                ageMs={parkData?.ageMs}
                fetchedAt={parkData?.fetchedAt}
              />
            </div>

            <button
              style={{
                ...button,
                padding: "7px 13px",
                fontSize: 12,
                background: "rgba(255, 255, 255, 0.88)",
                boxShadow: "0 8px 18px rgba(91, 33, 182, 0.10)",
              }}
              onClick={() => loadData(true)}
              disabled={loading}
            >
              <RefreshCw size={12} /> {loading ? "Loading" : "Refresh"}
            </button>
          </div>

          {(parkData?.source || error) && (
            <div style={{ marginTop: 10 }}>
              <DataStatusBanner source={parkData?.source} />

              {error && (
                <p
                  style={{
                    color: colors.error,
                    fontWeight: 700,
                    margin: "6px 0 0",
                    fontSize: 13,
                  }}
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </section>

        <section
          style={{
            ...card,
            position: "relative",
            overflow: "hidden",
            background:
              "radial-gradient(circle at 92% 0%, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0.05) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%)",
            border: "1px solid rgba(56, 189, 248, 0.24)",
            borderRadius: 28,
            boxShadow: "0 16px 38px rgba(2, 132, 199, 0.09)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 104,
              height: 104,
              borderRadius: "999px",
              right: -42,
              bottom: -48,
              background: "rgba(124, 58, 237, 0.10)",
            }}
          />

          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: "rgba(56, 189, 248, 0.16)",
                    color: "#0369A1",
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: 0.7,
                    marginBottom: 8,
                  }}
                >
                  <CloudSun size={13} /> PARK CONDITIONS
                </div>

                <h3
                  style={{
                    margin: 0,
                    color: colors.text,
                    fontSize: 23,
                    letterSpacing: -0.4,
                    lineHeight: 1.15,
                  }}
                >
                  Weather + comfort
                </h3>
              </div>

              <FreshnessBadge
                source={weather?.source}
                ageMs={weather?.ageMs}
                fetchedAt={weather?.fetchedAt}
              />
            </div>

            <div
              style={{
                marginTop: 12,
                padding: 13,
                borderRadius: 20,
                background: "rgba(255, 255, 255, 0.82)",
                border: `1px solid ${colors.cardBorder}`,
                boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "baseline",
                }}
              >
                {weather?.tempF != null && (
                  <strong
                    style={{
                      color: "#0369A1",
                      fontSize: 28,
                      lineHeight: 1,
                      letterSpacing: -0.8,
                    }}
                  >
                    {weather.tempF}°F
                  </strong>
                )}

                {weather?.feelsLikeF != null && (
                  <span
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: 900,
                    }}
                  >
                    feels like {weather.feelsLikeF}°F
                  </span>
                )}

                {weather?.humidity != null && (
                  <span
                    style={{
                      padding: "5px 8px",
                      borderRadius: 999,
                      background: "rgba(56, 189, 248, 0.12)",
                      color: "#0369A1",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {weather.humidity}% humidity
                  </span>
                )}

                {weatherMode?.mode && weatherMode.mode !== "normal" && (
                  <span
                    style={{
                      padding: "5px 8px",
                      borderRadius: 999,
                      background: colors.amberSoft,
                      color: "#92400E",
                      fontSize: 12,
                      fontWeight: 950,
                    }}
                  >
                    {weatherMode.label || "Weather watch"}
                  </span>
                )}
              </div>

              <p
                style={{
                  margin: "8px 0 0",
                  color: colors.muted,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {weather?.summary
                  ? weather.summary
                  : buildWeatherDisplay(weather)}
              </p>
            </div>

            <p
              style={{
                margin: "10px 0 0",
                color: colors.muted,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              TOHI will favor lower-walking, indoor, shaded, or reset-friendly moves
              when heat or storms start working against the family.
            </p>

            <DataStatusBanner source={weather?.source} />
          </div>
        </section>

        {liveParkContext?.showNotice && (
          <section
            style={{
              ...card,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.97) 0%, #FFF7ED 52%, #F5F3FF 100%)",
              border: "1px solid rgba(245, 158, 11, 0.24)",
              boxShadow: "0 12px 28px rgba(245, 158, 11, 0.08)",
            }}
          >
            <div style={{ minWidth: 220, flex: "1 1 340px" }}>
              <div
                style={{
                  color: "#92400E",
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 0.65,
                  marginBottom: 5,
                }}
              >
                RIGHT NOW VIEW
              </div>

              <strong
                style={{
                  display: "block",
                  color: colors.text,
                  fontSize: 15,
                  lineHeight: 1.35,
                }}
              >
                {liveParkContext.label || `Viewing ${getParkNameById(activePark)} live waits`}
              </strong>

              <p
                style={{
                  margin: "5px 0 0",
                  color: colors.text,
                  fontSize: 12.5,
                  lineHeight: 1.4,
                }}
              >
                {liveParkContext.guidance ||
                  `You’re viewing ${getParkNameById(activePark)} live waits right now. Right Now moves are using ${getParkNameById(activePark)}.`}
              </p>

              {liveParkContext?.status === "viewing_second_park" &&
                Number(parkHopperContext?.secondParkMustDos?.count || 0) > 0 && (
                  <div
                    style={{
                      marginTop: 9,
                      padding: 10,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.72)",
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        color: colors.text,
                        fontSize: 12.5,
                        lineHeight: 1.3,
                      }}
                    >
                      Second-park priorities are loaded.
                    </strong>

                    <p
                      style={{
                        margin: "5px 0 0",
                        color: colors.muted,
                        fontSize: 12,
                        lineHeight: 1.35,
                      }}
                    >
                      Saved must-dos: {parkHopperContext.secondParkMustDos.label}. TOHI should use this as
                      context, not pressure to rush.
                    </p>
                  </div>
                )}

              {liveParkContext?.status === "viewing_different_park" && (
                <p
                  style={{
                    margin: "7px 0 0",
                    color: colors.muted,
                    fontSize: 12,
                    lineHeight: 1.35,
                  }}
                >
                  The Plan tab is still anchored to {todayPlannedParkLabel || planningParkLabel}.
                </p>
              )}
            </div>

            {planningPark && activePark !== planningPark && (
              <button
                type="button"
                onClick={() => {
                  trackAppEvent("live_park_switched_from_planned_park_notice", {
                    source: "right_now_live_park_context_notice",
                    activePark: planningPark,
                    metadata: {
                      previousActivePark: activePark,
                      nextActivePark: planningPark,
                      planningPark,
                      planningParkSource,
                      scheduledParkForToday: scheduledParkForToday?.parkId || "",
                      scheduledSecondaryParkForToday: scheduledParkForToday?.secondaryParkId || "",
                      scheduledParkPlanLabel: todayPlannedParkLabel,
                      hopperContextStatus: parkHopperContext?.status || "",
                      shouldConsiderSecondPark: Boolean(parkHopperContext?.shouldConsiderSecondPark),
                      liveParkContextStatus: liveParkContext?.status || "",
                      isLiveParkMismatch: Boolean(liveParkContext?.isLiveParkMismatch),
                      scheduledParkDayNumber: scheduledParkForToday?.dayNumber || "",
                    },
                  });

                  if (canConfirmParkPresence(parkPresence, planningPark)) {
                    handleConfirmParkPresence(planningPark);
                  } else if (parkPresence) {
                    setParkPresence((current) =>
                      current ? selectBrowsedPark(current, planningPark) : current
                    );
                  } else {
                    setActivePark(planningPark);
                  }
                }}
                style={{
                  ...button,
                  background: colors.purpleDeep,
                  borderColor: colors.purpleDeep,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                Use {planningParkLabel} waits
              </button>
            )}
          </section>
        )}

        {currentActivity?.type === "in_line" && (
          <section
            style={{
              ...card,
              border: "1px solid #c4b5fd",
              background: colors.purpleSoft,
            }}
          >
            <div style={{ fontSize: 12, color: colors.purple, fontWeight: 900 }}>
              CURRENTLY IN LINE
            </div>

            <h3 style={{ margin: "5px 0", fontSize: 20 }}>
              {currentActivity.rideName}
            </h3>

            <p style={{ margin: "0 0 8px", color: colors.muted }}>
              {currentActivity.postedWaitAtStart != null
                ? `Posted wait when you joined: ${currentActivity.postedWaitAtStart} min`
                : "You marked this as your current line."}
              {currentActivity.startedAt
                ? ` · Started around ${formatActivityStartTime(currentActivity.startedAt)}`
                : ""}
              {formatElapsedInLineBadge(currentActivityContext?.elapsedMinutesInLine)}
            </p>

            <p style={{ margin: "0 0 12px", color: colors.text }}>
              I’ll stop recommending this against itself while you’re waiting. Mark it
              done when you finish, or cancel if you leave the line.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => handleDone(currentActivity.rideId)}
                style={{ ...button, color: colors.success, borderColor: colors.successSoft }}
              >
                ✓ Mark Done
              </button>

              <button
                onClick={handleCancelCurrentActivity}
                style={{ ...button, color: colors.muted }}
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {currentActivity?.type === "in_line" && (
          <WhileYouWaitCard
            whileYouWaitContent={whileYouWaitContent}
            activeMiniGame={activeMiniGame}
            activeMiniGameType={activeMiniGameType}
            revealedTriviaAnswer={revealedTriviaAnswer}
            selectedTriviaChoice={selectedTriviaChoice}
            selectedFamilyVoteOption={selectedFamilyVoteOption}
            lookAroundFound={lookAroundFound}
            handleMiniGameTypeChange={handleMiniGameTypeChange}
            handleTriviaChoice={handleTriviaChoice}
            handleLookAroundFound={handleLookAroundFound}
            handleFamilyVote={handleFamilyVote}
            handleNextMiniGame={handleNextMiniGame}
            showTriviaAnswer={showTriviaAnswer}
            card={card}
            button={button}
            actionButton={actionButton}
          />
        )}

        {parkPresencePrompt && (
          <section
            style={{
              ...card,
              position: "relative",
              overflow: "hidden",
              background: parkPresenceTheme.isNight
                ? "linear-gradient(150deg, #0F172A 0%, #1E1B4B 100%)"
                : "linear-gradient(150deg, #FFFFFF 0%, #FFF9F1 55%, #F3E8FF 100%)",
              border: parkPresenceTheme.isNight
                ? "1px solid rgba(139, 92, 246, 0.45)"
                : "1px solid rgba(124, 58, 237, 0.20)",
              boxShadow: parkPresenceTheme.isNight
                ? "0 14px 34px rgba(76, 29, 149, 0.35)"
                : "0 14px 34px rgba(91, 33, 182, 0.10)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: 0.7,
                marginBottom: 6,
                color: parkPresenceTheme.isNight ? "#C4B5FD" : colors.purpleDeep,
              }}
            >
              PARK CHECK
            </div>

            <h3
              style={{
                margin: "0 0 6px",
                fontSize: 20,
                letterSpacing: -0.3,
                color: parkPresenceTheme.isNight ? "#F5F3FF" : colors.text,
              }}
            >
              {parkPresencePrompt.type === "detected_arrival"
                ? `Looks like you’ve arrived at ${getParkNameById(parkPresencePrompt.parkId)}`
                : `Are you at ${getParkNameById(parkPresencePrompt.parkId)} now?`}
            </h3>

            <p
              style={{
                margin: "0 0 12px",
                fontSize: 13,
                lineHeight: 1.45,
                color: parkPresenceTheme.isNight ? "#C7D2FE" : colors.muted,
              }}
            >
              {parkPresencePrompt.type === "detected_arrival"
                ? `Start using ${getParkNameById(parkPresencePrompt.parkId)} waits and recommendations?`
                : `TOHI can start using ${getParkNameById(parkPresencePrompt.parkId)} waits, weather, and recommendations.`}
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleConfirmParkPresence(parkPresencePrompt.parkId)}
                style={{
                  ...button,
                  background: colors.purpleDeep,
                  borderColor: colors.purpleDeep,
                  color: "white",
                }}
              >
                {parkPresencePrompt.type === "detected_arrival"
                  ? `I’m at ${getParkNameById(parkPresencePrompt.parkId)} now`
                  : "I’m here now"}
              </button>

              <button
                type="button"
                onClick={handleDismissParkPresencePrompt}
                style={{
                  ...button,
                  ...(parkPresenceTheme.isNight
                    ? {
                        background: "rgba(30, 27, 75, 0.6)",
                        color: "#C7D2FE",
                        borderColor: "rgba(139, 92, 246, 0.4)",
                      }
                    : { color: colors.muted }),
                }}
              >
                {parkPresencePrompt.type === "detected_arrival" ? "Not yet" : "Just checking"}
              </button>
            </div>
          </section>
        )}

        <section style={card}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {PARKS.map((park) => (
              <button
                key={park.id}
                onClick={() => handleSelectPark(park.id)}
                style={{
                  ...button,
                  background: browsedParkId === park.id ? colors.purple : colors.card,
                  color: browsedParkId === park.id ? "white" : colors.text,
                  borderColor: browsedParkId === park.id ? colors.purple : colors.cardBorder,
                  whiteSpace: "nowrap",
                }}
              >
                {park.name}
              </button>
            ))}
          </div>
        </section>
    </>
  );
}

export default HomeTab;
