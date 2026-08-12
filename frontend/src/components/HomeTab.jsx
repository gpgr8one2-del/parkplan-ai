import React from "react";
import { CloudSun, MapPin, RefreshCw } from "lucide-react";

import { DataStatusBanner } from "./DataStatusBanner";
import { FreshnessBadge } from "./FreshnessBadge";
import { WhileYouWaitCard } from "./WhileYouWaitCard";
import { getSelectableParks } from "../data/parkAreas";
import { HOME_PARK_ART, HOME_WEATHER_ART } from "../data/homeArtManifest";
import { canConfirmParkPresence, selectBrowsedPark } from "../utils/parkPresence";
import { resolveHomeParkArtKey, resolveHomeWeatherFamily } from "../utils/homeArt";
import { getWeatherMode } from "../utils/weatherAdvice";
import { colors } from "../theme";

// 62B-2B renders the day artwork only. Home night mode arrives in a later
// phase, which will replace this constant with the app's existing theme state.
// Keeping the mode an explicit lookup key — rather than a boolean argument —
// means that switch needs no change to the resolver API.
const HOME_ART_MODE = "day";

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
  // Exact park-id mapping only. An unknown id — a Universal park, a missing
  // value, anything unmapped — returns null, and a mapped park with no entry
  // for this mode also returns null. Both land on the composed no-art hero.
  const homeParkArtKey = resolveHomeParkArtKey(activePark);
  const heroParkArt = homeParkArtKey
    ? HOME_PARK_ART[homeParkArtKey]?.[HOME_ART_MODE] || null
    : null;

  // The hero's name must come from the SAME source as its artwork. parkData is
  // the last completed fetch, so while a new park's request is in flight it
  // still holds the previous park — reading parkData?.parkName here would put
  // the old park's name over the new park's illustration. activePark changes
  // immediately, so both stay in step. parkData?.parkName remains the fallback
  // only when there is no activePark at all, where there is nothing to mismatch.
  const heroParkName = activePark
    ? getParkNameById(activePark)
    : parkData?.parkName || "Choose a park";

  // 62B-2C. The illustration family comes ONLY from the resolver. HomeTab never
  // inspects summary, weatherMode, stormMode, rainRisk, forecast data, or advice
  // text to pick artwork — those are forecast-contaminated and would put storm
  // art over a clear sky. The resolver reads current observations only.
  //
  // A null family, or a family with no entry for this mode, means no safe
  // choice exists: the illustration is omitted entirely and the readings take
  // the full width. No substituted family, no generic icon, no placeholder.
  const weatherArtFamily = resolveHomeWeatherFamily(weather);
  const weatherArt = weatherArtFamily
    ? HOME_WEATHER_ART[weatherArtFamily]?.[HOME_ART_MODE] || null
    : null;

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
              ✨ TODAY&apos;S PLAN
            </div>

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

          {/* Approved wide park hero. The artwork is decorative: the park name
              beside it carries the meaning, so the image keeps alt="". An
              unmapped park or a missing entry yields heroParkArt === null and
              renders the composed no-art hero instead — never another park's
              illustration. */}
          <div
            style={{
              position: "relative",
              marginTop: 4,
              borderRadius: 24,
              overflow: "hidden",
              aspectRatio: "2 / 1",
              border: "1px solid rgba(124, 58, 237, 0.16)",
              boxShadow: "0 14px 34px rgba(91, 33, 182, 0.14)",
              background: heroParkArt
                ? "rgba(15, 23, 42, 0.06)"
                : "linear-gradient(150deg, #F3E8FF 0%, #E0F2FE 52%, #FFF4D8 100%)",
            }}
          >
            {heroParkArt ? (
              <img
                src={heroParkArt.src}
                alt=""
                // No loading="lazy": this hero is above the fold, so deferring
                // it would delay the first thing the family sees. Only this one
                // image loads eagerly — the other park and weather assets stay
                // untouched and are not preloaded.
                decoding="async"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  display: "block",
                }}
              />
            ) : null}

            {/* Restrained scrim so overlaid text stays readable over every
                approved image, bright daytime skies included. */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(15, 23, 42, 0.58) 0%, rgba(15, 23, 42, 0.30) 38%, rgba(15, 23, 42, 0.06) 66%, rgba(15, 23, 42, 0) 100%)",
              }}
            />

            <div
              style={{
                position: "relative",
                height: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                padding: 16,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    flexWrap: "wrap",
                  }}
                >
                  <MapPin size={17} style={{ color: "#E9D5FF", flexShrink: 0 }} />
                  <span
                    style={{
                      color: "#FFFFFF",
                      fontSize: 21,
                      fontWeight: 900,
                      letterSpacing: -0.3,
                      textShadow: "0 1px 10px rgba(15, 23, 42, 0.55)",
                    }}
                  >
                    {heroParkName}
                  </span>
                </div>

                {closeTimeLabel && (
                  <div
                    style={{
                      marginTop: 4,
                      color: "rgba(255, 255, 255, 0.92)",
                      fontSize: 13,
                      fontWeight: 750,
                      textShadow: "0 1px 8px rgba(15, 23, 42, 0.55)",
                    }}
                  >
                    Closes {closeTimeLabel}
                  </div>
                )}

                <div style={{ marginTop: 9 }}>
                  <FreshnessBadge
                    source={parkData?.source}
                    ageMs={parkData?.ageMs}
                    fetchedAt={parkData?.fetchedAt}
                  />
                </div>
              </div>

              <button
                style={{
                  ...button,
                  flexShrink: 0,
                  padding: "6px 11px",
                  fontSize: 12,
                  background: "rgba(15, 23, 42, 0.55)",
                  color: "#FFFFFF",
                  borderColor: "rgba(255, 255, 255, 0.34)",
                  boxShadow: "none",
                }}
                onClick={() => loadData(true)}
                disabled={loading}
              >
                <RefreshCw size={12} /> {loading ? "Loading" : "Refresh"}
              </button>
            </div>
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

            {/* 62B-2C: the readings row carries NO card treatment of its own —
                no background, border, radius or shadow. The section above is
                the single raised weather surface; a raised row inside it read
                as a card within a card. Only spacing remains. */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {/* Readings first in source order and given the remaining width,
                  so when no illustration is available they simply fill the card
                  with no gap left behind. */}
              <div style={{ flex: "1 1 auto", minWidth: 0 }}>
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

              {/* Decorative: the temperature, humidity, mode pill and summary
                  beside it already state the condition, so the illustration
                  carries alt="". It stays smaller in visual weight than the
                  temperature, keeps its own transparent background — no white
                  frame, no tinted plate — and is never stretched or cropped. */}
              {weatherArt ? (
                <img
                  src={weatherArt.src}
                  alt=""
                  decoding="async"
                  style={{
                    flex: "0 0 auto",
                    width: 66,
                    height: 66,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : null}
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
              alignItems: "flex-start",
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
              {/* Eyebrow restyled to the pill used by the rest of the approved
                  Home hierarchy. The gate, label, guidance, status branches,
                  action and analytics below are untouched. */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 9px",
                  borderRadius: 999,
                  background: "rgba(245, 158, 11, 0.16)",
                  color: "#92400E",
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 0.65,
                  marginBottom: 8,
                }}
              >
                RIGHT NOW VIEW
              </div>

              <strong
                style={{
                  display: "block",
                  color: colors.text,
                  fontSize: 17,
                  letterSpacing: -0.2,
                  lineHeight: 1.3,
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
          {/* 62B-2D. getSelectableParks() is the single source of truth for what
              Home offers. It filters on the existing `selectable` flag, so the
              Universal parks marked coming soon can never render here as active
              buttons — previously PARKS.map put all seven on screen. No second
              park list is introduced. */}
          <div
            style={{
              display: "flex",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 4,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {getSelectableParks().map((park) => {
              // Exact mapping per park id. An unmapped park, or one whose entry
              // is missing for this mode, yields null and renders the finished
              // text-only card below — never another park's illustration.
              const selectorArtKey = resolveHomeParkArtKey(park.id);
              const selectorArt = selectorArtKey
                ? HOME_PARK_ART[selectorArtKey]?.[HOME_ART_MODE] || null
                : null;
              const isSelected = browsedParkId === park.id;

              return (
                <button
                  key={park.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectPark(park.id)}
                  style={{
                    // Sized so roughly three cards sit within a phone width and
                    // the fourth is reachable by scrolling. 112px plus padding
                    // keeps the tap target comfortably above 44px.
                    flex: "0 0 auto",
                    width: 112,
                    padding: 0,
                    borderRadius: 18,
                    overflow: "hidden",
                    cursor: "pointer",
                    textAlign: "left",
                    background: colors.card,
                    border: isSelected
                      ? `2px solid ${colors.purple}`
                      : `1px solid ${colors.cardBorder}`,
                    boxShadow: isSelected
                      ? "0 10px 22px rgba(124, 58, 237, 0.22)"
                      : "0 6px 14px rgba(28, 25, 23, 0.05)",
                  }}
                >
                  {selectorArt ? (
                    <img
                      src={selectorArt.src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{
                        display: "block",
                        width: "100%",
                        height: 62,
                        objectFit: "cover",
                        objectPosition: "center",
                      }}
                    />
                  ) : (
                    // Finished no-art card: a composed band of the same height,
                    // so the park stays selectable and the row stays even.
                    <div
                      aria-hidden="true"
                      style={{
                        height: 62,
                        background:
                          "linear-gradient(150deg, #F3E8FF 0%, #E0F2FE 60%, #FFF4D8 100%)",
                      }}
                    />
                  )}

                  <div
                    style={{
                      padding: "7px 9px 8px",
                      background: isSelected ? colors.purpleSoft : colors.card,
                      color: isSelected ? colors.purpleDeep : colors.text,
                      fontSize: 12,
                      fontWeight: 900,
                      lineHeight: 1.25,
                    }}
                  >
                    {park.name}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
    </>
  );
}

export default HomeTab;
