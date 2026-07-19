import React from "react";
import { MapPin } from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";
import { colors } from "../theme";
import { LAND_OPTIONS } from "../data/parkAreas";
import { TOHI_PICK_CLARIFICATION_ANSWERS } from "../utils/tohiPickClarification";

export function PlanRecommendations({
  planNight,
  planTokens,
  parkPresenceTheme,
  card,
  button,
  actionButton,
  planShowsSetupState,
  activePark,
  currentLand,
  landOptions,
  detectedLocationContext,
  locationAutoEnabled,
  locationLoading,
  locationError,
  locationMessage,
  lastAutoUpdateAt,
  lastLocationUpdateAt,
  setCurrentLand,
  setDetectedLocationContext,
  setLocationAutoEnabled,
  setLocationMessage,
  handleUseMyLocation,
  formatAutoUpdateTime,
  weather,
  weatherMode,
  familyProfileSummary,
  setActiveScreen,
  browsingAnotherPark,
  browsedParkLabel,
  confirmedActiveParkLabel,
  recommendations,
  primaryRecommendation,
  primarySlot,
  hasAnyRecommendation,
  isPreOpenRecommendationPause,
  preOpenTimeLabel,
  hiddenRideCount,
  reportedRideIssueIds,
  handleResetRecs,
  tohiPickDisplayCandidate,
  tohiPickDisplaySource,
  tohiPickClarification,
  showTohiPickClarificationQuestion,
  handleAnswerTohiPickClarification,
  renderRideActions,
  renderShowtimeInfo,
  trackAppEvent,
}) {
  return (
          <section
            style={{
              ...card,
              position: "relative",
              overflow: "hidden",
              background: planNight ? planTokens.surfaceSoft : planTokens.surfaceSoft,
              border: `1px solid ${planTokens.border}`,
              borderRadius: 22,
              boxShadow: planTokens.shadow,
            }}
          >
            <div style={{ position: "relative" }}>
              {planShowsSetupState ? (
                <>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: planTokens.eyebrowPill,
                  color: planTokens.eyebrow,
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 0.7,
                  marginBottom: 9,
                }}
              >
                {planNight ? "EVENING STRATEGY" : "DAY STRATEGY"}
              </div>

              <h3
                style={{
                  margin: 0,
                  color: planTokens.title,
                  fontSize: 24,
                  letterSpacing: -0.5,
                  lineHeight: 1.15,
                }}
              >
                What should we do next?
              </h3>

              <p
                style={{
                  margin: "7px 0 14px",
                  color: planTokens.muted,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                TOHI uses your park, weather, family setup, and live waits to guide
                your next move.
              </p>

              <div
                style={{
                  marginBottom: 12,
                  padding: 14,
                  borderRadius: 20,
                  border: `1px solid ${planTokens.border}`,
                  background: planTokens.surface,
                  boxShadow: planTokens.shadow,
                }}
              >
                <label
                  htmlFor="current-land"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 950,
                    color: planTokens.eyebrow,
                    marginBottom: 7,
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                  }}
                >
                  <MapPin size={12} /> Where are you?
                </label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <strong style={{ color: planTokens.title, fontSize: 16 }}>
                      {currentLand
                        ? LAND_OPTIONS[activePark]?.find(
                            (option) => option.value === currentLand
                          )?.label || currentLand
                        : "Choose your area"}
                    </strong>
                    {detectedLocationContext?.nearestAnchorName && (
                      <p
                        style={{
                          margin: "3px 0 0",
                          color: planTokens.muted,
                          fontSize: 12,
                          lineHeight: 1.35,
                        }}
                      >
                        Near {detectedLocationContext.nearestAnchorName}
                      </p>
                    )}
                  </div>
                  <span aria-hidden="true" style={{ color: planTokens.muted, fontSize: 16 }}>
                    ›
                  </span>
                </div>

                <select
                  id="current-land"
                  value={currentLand || ""}
                  onChange={(e) => {
                    const nextLand = e.target.value || null;

                    setCurrentLand(nextLand);
                    setDetectedLocationContext(null);
                    setLocationAutoEnabled(false);
                    setLocationMessage(
                      nextLand
                        ? "Using your selected park area. You can update it anytime."
                        : ""
                    );

                    trackAppEvent("manual_location_selected", {
                      source: "current_land_dropdown",
                      currentLand: nextLand,
                      metadata: {
                        nextLand,
                      },
                    });
                  }}
                  style={{
                    width: "100%",
                    border: `1px solid ${planTokens.borderQuiet}`,
                    borderRadius: 16,
                    padding: "11px 12px",
                    fontWeight: 850,
                    background: planNight ? "#0F172A" : colors.card,
                    color: planTokens.title,
                    boxShadow: planNight ? "none" : "0 8px 18px rgba(28, 25, 23, 0.04)",
                  }}
                >
                  <option value="">Pick your current area</option>
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
                    marginTop: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locationLoading}
                    style={{
                      ...actionButton,
                      color: planNight ? "#7DD3FC" : "#0369A1",
                      borderColor: planNight
                        ? "rgba(125, 211, 252, 0.32)"
                        : "rgba(56, 189, 248, 0.28)",
                      background: planNight
                        ? "rgba(15, 23, 42, 0.72)"
                        : "rgba(255,255,255,0.82)",
                    }}
                  >
                    <MapPin size={13} />{" "}
                    {locationLoading ? "Finding you..." : "Use My Location"}
                  </button>

                  <span style={{ color: planTokens.muted, fontSize: 12 }}>
                    Helps avoid unnecessary walking. Auto-updates while the app is open.
                  </span>
                </div>

                {(locationAutoEnabled || lastAutoUpdateAt || lastLocationUpdateAt) && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: planTokens.muted,
                      fontSize: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    {lastAutoUpdateAt
                      ? `Waits/weather updated ${formatAutoUpdateTime(lastAutoUpdateAt)}`
                      : ""}
                    {lastAutoUpdateAt && lastLocationUpdateAt ? " · " : ""}
                    {lastLocationUpdateAt
                      ? `Location updated ${formatAutoUpdateTime(lastLocationUpdateAt)}`
                      : ""}
                  </p>
                )}

                {locationMessage && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: colors.success,
                      fontSize: 12,
                      lineHeight: 1.4,
                      fontWeight: 800,
                    }}
                  >
                    {locationMessage}
                  </p>
                )}

                {locationError && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: colors.error,
                      fontSize: 12,
                      lineHeight: 1.4,
                      fontWeight: 800,
                    }}
                  >
                    {locationError}
                  </p>
                )}

                <p
                  style={{
                    margin: "8px 0 0",
                    color: colors.muted,
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  Pick the closest area. It does not need to be perfect — it just
                  helps TOHI avoid bad cross-park recommendations.
                </p>
              </div>

              <div
                style={{
                  marginBottom: 12,
                  padding: 14,
                  borderRadius: 20,
                  border: `1px solid ${planTokens.border}`,
                  background: planTokens.surface,
                  boxShadow: planTokens.shadow,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 950,
                    color: planTokens.eyebrow,
                    letterSpacing: 0.7,
                    marginBottom: 7,
                  }}
                >
                  ☀️ WEATHER + COMFORT
                </div>

                {weather?.tempF != null ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong
                      style={{
                        color: planTokens.title,
                        fontSize: 26,
                        letterSpacing: -0.5,
                      }}
                    >
                      {weather.tempF}°F
                    </strong>
                    {weather.feelsLikeF != null && (
                      <span style={{ color: planTokens.muted, fontSize: 13 }}>
                        feels like {weather.feelsLikeF}°F
                      </span>
                    )}
                    {weather.humidity != null && (
                      <span style={{ color: planTokens.muted, fontSize: 13 }}>
                        {weather.humidity}% humidity
                      </span>
                    )}
                  </div>
                ) : (
                  <strong style={{ color: planTokens.title, fontSize: 15 }}>
                    {weather?.summary || "Loading weather..."}
                  </strong>
                )}

                {weather?.tempF != null && weather?.summary && (
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: planTokens.muted,
                      fontSize: 13,
                      lineHeight: 1.4,
                    }}
                  >
                    {weather.summary}
                  </p>
                )}

                <p
                  style={{
                    margin: "7px 0 0",
                    color: planTokens.title,
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    fontWeight: 750,
                  }}
                >
                  {weatherMode?.mode && weatherMode.mode !== "normal"
                    ? weatherMode.message ||
                      `Weather mode: ${weatherMode.label || weatherMode.mode}.`
                    : "Weather looks steady. Plan around waits and family energy."}
                </p>
              </div>

              <div
                style={{
                  marginBottom: 14,
                  padding: 14,
                  borderRadius: 20,
                  border: `1px solid ${planTokens.border}`,
                  background: planTokens.surface,
                  boxShadow: planTokens.shadow,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 950,
                        color: planTokens.eyebrow,
                        letterSpacing: 0.7,
                        marginBottom: 7,
                      }}
                    >
                      👨‍👩‍👧‍👦 FAMILY CONTEXT
                    </div>

                    <strong style={{ color: planTokens.title, fontSize: 15 }}>
                      {[
                        Number(familyProfileSummary?.adultCount) > 0
                          ? `${familyProfileSummary.adultCount} adult${
                              Number(familyProfileSummary.adultCount) === 1 ? "" : "s"
                            }`
                          : null,
                        Number(familyProfileSummary?.childCount) > 0
                          ? `${familyProfileSummary.childCount} kid${
                              Number(familyProfileSummary.childCount) === 1 ? "" : "s"
                            }`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Your family setup"}
                    </strong>

                    {(familyProfileSummary?.shortestHeightInches ||
                      familyProfileSummary?.resortProfile?.name) && (
                      <p
                        style={{
                          margin: "4px 0 0",
                          color: planTokens.muted,
                          fontSize: 12.5,
                          lineHeight: 1.4,
                        }}
                      >
                        {[
                          familyProfileSummary?.shortestHeightInches
                            ? `Shortest rider ${familyProfileSummary.shortestHeightInches}"`
                            : null,
                          familyProfileSummary?.resortProfile?.name || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveScreen("family_profile")}
                    aria-label="Edit family profile"
                    style={{
                      border: `1px solid ${planTokens.borderQuiet}`,
                      borderRadius: 999,
                      background: planNight ? "rgba(30, 27, 75, 0.6)" : "rgba(255,255,255,0.85)",
                      color: planTokens.muted,
                      padding: "6px 11px",
                      fontSize: 14,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: 15,
                  borderRadius: 20,
                  border: planNight
                    ? "1px solid rgba(125, 211, 252, 0.26)"
                    : "1px solid rgba(56, 189, 248, 0.28)",
                  background: planNight ? "#111A33" : "#F4FAFF",
                }}
              >
                <strong style={{ color: planTokens.title }}>
                  Pick where you are first.
                </strong>
                <p
                  style={{
                    margin: "7px 0 0",
                    color: planTokens.muted,
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  TOHI can show wait times without your location, but personalized
                  next moves need your current park area so we do not send your
                  family on a bad walk.
                </p>
              </div>
                </>
              ) : (
                <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 12,
                  padding: "10px 12px",
                  borderRadius: 16,
                  border: `1px solid ${planTokens.border}`,
                  background: planTokens.surface,
                }}
              >
                <MapPin size={13} style={{ color: planTokens.eyebrow, flexShrink: 0 }} />

                <select
                  id="current-land"
                  aria-label="Current park area"
                  value={currentLand || ""}
                  onChange={(e) => {
                    const nextLand = e.target.value || null;

                    setCurrentLand(nextLand);
                    setDetectedLocationContext(null);
                    setLocationAutoEnabled(false);
                    setLocationMessage(
                      nextLand
                        ? "Using your selected park area. You can update it anytime."
                        : ""
                    );

                    trackAppEvent("manual_location_selected", {
                      source: "current_land_dropdown",
                      currentLand: nextLand,
                      metadata: {
                        nextLand,
                      },
                    });
                  }}
                  style={{
                    flex: "1 1 150px",
                    minWidth: 130,
                    border: `1px solid ${planTokens.borderQuiet}`,
                    borderRadius: 12,
                    padding: "8px 10px",
                    fontWeight: 800,
                    fontSize: 13,
                    background: planNight ? "#0F172A" : colors.card,
                    color: planTokens.title,
                  }}
                >
                  <option value="">Pick your current area</option>
                  {landOptions.map((land) => (
                    <option key={land.value} value={land.value}>
                      {land.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locationLoading}
                  style={{
                    ...actionButton,
                    color: planNight ? "#7DD3FC" : "#0369A1",
                    borderColor: planNight
                      ? "rgba(125, 211, 252, 0.32)"
                      : "rgba(56, 189, 248, 0.28)",
                    background: planNight
                      ? "rgba(15, 23, 42, 0.72)"
                      : "rgba(255,255,255,0.82)",
                  }}
                >
                  <MapPin size={13} />{" "}
                  {locationLoading ? "Finding you..." : "Use My Location"}
                </button>
              </div>

              {(reportedRideIssueIds.length > 0 || hiddenRideCount > 0) && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  {reportedRideIssueIds.length > 0 && (
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: 999,
                        border: planNight
                          ? "1px solid rgba(252, 211, 77, 0.28)"
                          : "1px solid rgba(245, 158, 11, 0.28)",
                        background: planNight ? "rgba(15, 23, 42, 0.72)" : colors.amberSoft,
                        color: planNight ? "#FCD34D" : "#92400E",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      Avoiding {reportedRideIssueIds.length} reported ride
                      {reportedRideIssueIds.length === 1 ? "" : "s"}
                    </div>
                  )}

                  {hiddenRideCount > 0 && (
                    <button
                      onClick={handleResetRecs}
                      style={{
                        ...actionButton,
                        color: colors.muted,
                        background: "rgba(255,255,255,0.74)",
                      }}
                    >
                      Reset hidden rides ({hiddenRideCount})
                    </button>
                  )}
                </div>
              )}

              {browsingAnotherPark && (
                <div
                  style={{
                    padding: 15,
                    marginBottom: 12,
                    borderRadius: 20,
                    border: `1px solid ${planTokens.borderQuiet}`,
                    background: planNight ? "#111A33" : "#FBF9FF",
                  }}
                >
                  <strong style={{ color: planTokens.title }}>
                    You’re browsing {browsedParkLabel} waits right now.
                  </strong>
                  <p style={{ margin: "7px 0 0", color: planTokens.muted, lineHeight: 1.45 }}>
                    These picks are still for {confirmedActiveParkLabel}, where your day
                    is anchored.
                  </p>
                </div>
              )}

              {isPreOpenRecommendationPause ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div
                    role="status"
                    aria-live="polite"
                    style={{
                      padding: 16,
                      borderRadius: 20,
                      border: `1px solid ${planTokens.borderQuiet}`,
                      background: planNight ? "#111A33" : "#FBFDFF",
                      boxShadow: planTokens.shadow,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.purple,
                        fontWeight: 950,
                        letterSpacing: 0.6,
                        marginBottom: 8,
                      }}
                    >
                      BEFORE PARK OPEN
                    </div>

                    <h4
                      style={{
                        margin: "0 0 8px",
                        fontSize: 20,
                        lineHeight: 1.15,
                        color: planTokens.title,
                        letterSpacing: -0.25,
                      }}
                    >
                      Hold the normal picks for now
                    </h4>

                    <p
                      style={{
                        margin: 0,
                        color: planTokens.muted,
                        fontSize: 14,
                        lineHeight: 1.45,
                      }}
                    >
                      {`The park is not officially open yet${
                        preOpenTimeLabel ? ` — opening is listed around ${preOpenTimeLabel}` : ""
                      }. Use this time to get near your first target, confirm today's entry rules, and let the day go live before TOHI starts calling Best Move or Smart Backup.`}
                    </p>

                    <div
                      style={{
                        marginTop: 12,
                        padding: "9px 11px",
                        borderRadius: 16,
                        border: planNight
                          ? "1px solid rgba(139, 92, 246, 0.32)"
                          : "1px solid rgba(124, 58, 237, 0.18)",
                        background: planNight
                          ? "rgba(15, 23, 42, 0.72)"
                          : "rgba(255, 255, 255, 0.72)",
                        color: planTokens.title,
                        fontSize: 13,
                        lineHeight: 1.35,
                        fontWeight: 800,
                      }}
                    >
                      Best Move, Smart Backup, Worth the Walk, and Wait On This will return once the park is open or Early Entry is active.
                    </div>
                  </div>

                  {recommendations.planAhead && (
                    <RecommendationCard night={planNight}
                      title="PLAN AHEAD"
                      ride={recommendations.planAhead}
                      reason={
                        recommendations.planAhead.planAheadReason ||
                        "This is still worth planning around while you wait for the park to open."
                      }
                      color="#991b1b"
                      borderColor="#fecaca"
                      background="#fef2f2"
                      protectReason={Boolean(
                        recommendations.planAhead.mustDoPriority ||
                          recommendations.planAhead.shouldProtectLater
                      )}
                      renderShowtimeInfo={(ride) => renderShowtimeInfo(ride, { night: planNight })}
                      renderRideActions={(ride) => renderRideActions(ride, { night: planNight, compact: true })}
                    />
                  )}
                </div>
              ) : hasAnyRecommendation ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ marginTop: 4 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "5px 10px",
                        borderRadius: 999,
                        background: planTokens.eyebrowPill,
                        color: planTokens.eyebrow,
                        fontSize: 11,
                        fontWeight: 950,
                        letterSpacing: 0.7,
                        marginBottom: 8,
                      }}
                    >
                      RECOMMENDATIONS
                    </div>

                    <h3
                      style={{
                        margin: 0,
                        color: planTokens.title,
                        fontSize: 21,
                        letterSpacing: -0.4,
                        lineHeight: 1.15,
                      }}
                    >
                      Here’s what TOHI suggests
                    </h3>

                    <p
                      style={{
                        margin: "5px 0 2px",
                        color: planTokens.muted,
                        fontSize: 13,
                        lineHeight: 1.4,
                      }}
                    >
                      Based on live waits, weather, and your family.
                    </p>
                  </div>

                  {showTohiPickClarificationQuestion && (
                    <section
                      aria-label="TOHI Pick clarification question"
                      style={{
                        padding: 16,
                        marginBottom: 14,
                        borderRadius: 22,
                        background: parkPresenceTheme.isNight
                          ? "linear-gradient(150deg, #0F172A 0%, #1E1B4B 100%)"
                          : "linear-gradient(150deg, #FFFFFF 0%, #F8F5FF 100%)",
                        border: parkPresenceTheme.isNight
                          ? "1px solid rgba(139, 92, 246, 0.45)"
                          : "1px solid rgba(124, 58, 237, 0.20)",
                        boxShadow: parkPresenceTheme.isNight
                          ? "0 12px 30px rgba(76, 29, 149, 0.30)"
                          : "0 12px 30px rgba(91, 33, 182, 0.08)",
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
                        HELP TOHI CHOOSE
                      </div>

                      <h4
                        style={{
                          margin: "0 0 6px",
                          fontSize: 19,
                          letterSpacing: -0.3,
                          color: parkPresenceTheme.isNight ? "#F5F3FF" : colors.text,
                        }}
                      >
                        What matters more right now?
                      </h4>

                      <p
                        style={{
                          margin: "0 0 12px",
                          fontSize: 13,
                          lineHeight: 1.45,
                          color: parkPresenceTheme.isNight ? "#C7D2FE" : colors.muted,
                        }}
                      >
                        Stay nearby, or walk farther for one of your must-dos?
                      </p>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() =>
                            handleAnswerTohiPickClarification(
                              TOHI_PICK_CLARIFICATION_ANSWERS.STAY_NEARBY
                            )
                          }
                          style={{
                            ...button,
                            background: colors.purpleDeep,
                            borderColor: colors.purpleDeep,
                            color: "white",
                          }}
                        >
                          Stay nearby
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleAnswerTohiPickClarification(
                              TOHI_PICK_CLARIFICATION_ANSWERS.GO_MUST_DO
                            )
                          }
                          style={{
                            ...button,
                            background: colors.purple,
                            borderColor: colors.purple,
                            color: "white",
                          }}
                        >
                          Go for the must-do
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleAnswerTohiPickClarification(
                              TOHI_PICK_CLARIFICATION_ANSWERS.NOT_RIGHT_NOW
                            )
                          }
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
                          Not right now
                        </button>
                      </div>
                    </section>
                  )}

                  {tohiPickDisplayCandidate && (
                    <div
                      aria-label="TOHI Pick recommendation"
                      style={{
                        background: planNight ? "#131C36" : planTokens.surface,
                        border: planNight
                          ? "1px solid rgba(139, 92, 246, 0.40)"
                          : "1px solid rgba(124, 58, 237, 0.22)",
                        borderRadius: 22,
                        padding: 14,
                        marginBottom: 4,
                        color: planTokens.title,
                        boxShadow: planNight
                          ? "0 12px 30px rgba(76, 29, 149, 0.35)"
                          : "0 12px 28px rgba(91, 33, 182, 0.10)",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1fr) 116px",
                          gap: 14,
                          alignItems: "stretch",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              width: "fit-content",
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(124, 58, 237, 0.18)",
                              background: "rgba(243, 232, 255, 0.78)",
                              color: colors.purpleDeep,
                              fontSize: 11,
                              fontWeight: 950,
                              letterSpacing: 0.6,
                              textTransform: "uppercase",
                              marginBottom: 10,
                            }}
                          >
                            ✨ TOHI Pick
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                              marginBottom: 7,
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                minHeight: 26,
                                padding: "5px 9px",
                                borderRadius: 999,
                                background: colors.purpleSoft,
                                color: colors.purpleDeep,
                                border: "1px solid rgba(124, 58, 237, 0.14)",
                                fontSize: 12,
                                fontWeight: 900,
                              }}
                            >
                              Best move right now
                            </span>

                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                minHeight: 26,
                                padding: "5px 9px",
                                borderRadius: 999,
                                background: planNight
                                  ? "rgba(15, 23, 42, 0.72)"
                                  : "rgba(255,255,255,0.82)",
                                color: planNight ? "#C4B5FD" : colors.text,
                                border: planNight
                                  ? "1px solid rgba(139, 92, 246, 0.36)"
                                  : `1px solid ${colors.cardBorder}`,
                                fontSize: 12,
                                fontWeight: 900,
                              }}
                            >
                              {Number.isFinite(Number(tohiPickDisplayCandidate.wait))
                                ? `${tohiPickDisplayCandidate.wait} min`
                                : "Check wait"}
                            </span>
                          </div>

                          <h3
                            style={{
                              margin: "0 0 8px",
                              fontSize: 22,
                              lineHeight: 1.1,
                              fontWeight: 950,
                              letterSpacing: -0.45,
                              color: planTokens.title,
                            }}
                          >
                            {tohiPickDisplayCandidate.name}
                          </h3>

                          <p
                            style={{
                              margin: "0 0 12px",
                              fontSize: 14,
                              lineHeight: 1.45,
                              color: planTokens.muted,
                              fontWeight: 650,
                            }}
                          >
                            {tohiPickDisplayCandidate.engineReason ||
                              "This looks like the clearest fit right now based on your family, location, waits, and the day around you."}
                          </p>

                          {tohiPickDisplayCandidate.tags?.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 7,
                                marginBottom: tohiPickDisplayCandidate.engineCaution ? 12 : 0,
                              }}
                            >
                              {tohiPickDisplayCandidate.tags.slice(0, 6).map((tag) => (
                                <span
                                  key={tag}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    minHeight: 24,
                                    padding: "5px 8px",
                                    borderRadius: 999,
                                    border: planNight
                                      ? "1px solid rgba(99, 102, 241, 0.30)"
                                      : "1px solid rgba(234, 220, 200, 0.9)",
                                    background: planNight
                                      ? "rgba(15, 23, 42, 0.72)"
                                      : "rgba(255,255,255,0.72)",
                                    color: planTokens.muted,
                                    fontSize: 11,
                                    fontWeight: 850,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {tohiPickDisplayCandidate.engineCaution && (
                            <div
                              style={{
                                marginTop: 10,
                                padding: "10px 11px",
                                borderRadius: 16,
                                border: planNight
                                  ? "1px solid rgba(252, 211, 77, 0.28)"
                                  : "1px solid rgba(245, 158, 11, 0.22)",
                                background: planNight
                                  ? "rgba(69, 26, 3, 0.45)"
                                  : colors.amberSoft,
                                color: planNight ? "#FCD34D" : "#7C2D12",
                                fontSize: 12.5,
                                lineHeight: 1.35,
                                fontWeight: 750,
                              }}
                            >
                              {tohiPickDisplayCandidate.engineCaution}
                            </div>
                          )}

                          {tohiPickDisplaySource === "clarification" &&
                            tohiPickClarification.explanation && (
                              <p
                                style={{
                                  margin: "10px 0 0",
                                  fontSize: 12.5,
                                  fontWeight: 750,
                                  color: colors.purpleDeep,
                                }}
                              >
                                {tohiPickClarification.explanation}
                              </p>
                            )}
                        </div>

                        <div
                          aria-hidden="true"
                          style={{
                            position: "relative",
                            overflow: "hidden",
                            minHeight: 132,
                            borderRadius: 20,
                            border: planNight
                              ? "1px solid rgba(139, 92, 246, 0.30)"
                              : "1px solid rgba(124, 58, 237, 0.14)",
                            background: planNight
                              ? "linear-gradient(160deg, #1E1B4B 0%, #0F172A 58%, #172554 100%)"
                              : "linear-gradient(160deg, #F3E8FF 0%, #E0F2FE 54%, #FFF7ED 100%)",
                            boxShadow: planNight
                              ? "inset 0 1px 0 rgba(139, 92, 246, 0.18)"
                              : "inset 0 1px 0 rgba(255,255,255,0.7)",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              inset: 12,
                              borderRadius: 20,
                              border: "1px solid rgba(255,255,255,0.55)",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              right: -16,
                              bottom: -18,
                              width: 88,
                              height: 88,
                              borderRadius: 999,
                              background: "rgba(124, 58, 237, 0.14)",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              left: 14,
                              top: 14,
                              color: colors.purpleDeep,
                              fontSize: 28,
                              filter: "drop-shadow(0 8px 14px rgba(91, 33, 182, 0.14))",
                            }}
                          >
                            ✨
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              left: 14,
                              right: 14,
                              bottom: 14,
                              color: colors.purpleDeep,
                              fontSize: 12,
                              fontWeight: 950,
                              lineHeight: 1.15,
                              letterSpacing: -0.1,
                            }}
                          >
                            Calmest clear move
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <RecommendationCard night={planNight}
                    title={
                      primarySlot === "backup" ? "SMART BACKUP" :
                      primarySlot === "worthTheWalk" ? "WORTH THE WALK" :
                      "BEST MOVE"
                    }
                    ride={primaryRecommendation}
                    reason={
                      primaryRecommendation.reason ||
                      "This is the clearest move right now — the wait, effort, and family fit look reasonable."
                    }
                    color="#166534"
                    borderColor="#bbf7d0"
                    background="#f0fdf4"
                    titleSize={20}
                    protectReason={Boolean(
                      primaryRecommendation.mustDoPriority ||
                        primaryRecommendation.shouldProtectLater
                    )}
                    renderShowtimeInfo={(ride) => renderShowtimeInfo(ride, { night: planNight })}
                    renderRideActions={(ride) => renderRideActions(ride, { night: planNight, compact: true })}
                  />

                  {recommendations.backup && recommendations.backup.id !== primaryRecommendation?.id && (
                    <RecommendationCard night={planNight}
                      title="SMART BACKUP"
                      ride={recommendations.backup}
                      reason={recommendations.backup.reason || "A solid nearby option if the primary move doesn't work out."}
                      color="#1d4ed8"
                      borderColor="#bfdbfe"
                      background="#eff6ff"
                      protectReason={Boolean(
                        recommendations.backup.mustDoPriority ||
                          recommendations.backup.shouldProtectLater
                      )}
                      renderShowtimeInfo={(ride) => renderShowtimeInfo(ride, { night: planNight })}
                      renderRideActions={(ride) => renderRideActions(ride, { night: planNight, compact: true })}
                    />
                  )}

                  {recommendations.worthTheWalk && recommendations.worthTheWalk.id !== primaryRecommendation?.id && (
                    <RecommendationCard night={planNight}
                      title="WORTH THE WALK"
                      ride={recommendations.worthTheWalk}
                      reason={recommendations.worthTheWalk.reason || "The wait looks reasonable enough to consider the extra walk."}
                      color="#6d28d9"
                      borderColor="#ddd6fe"
                      background="#f5f3ff"
                      protectReason={Boolean(
                        recommendations.worthTheWalk.mustDoPriority ||
                          recommendations.worthTheWalk.shouldProtectLater
                      )}
                      renderShowtimeInfo={(ride) => renderShowtimeInfo(ride, { night: planNight })}
                      renderRideActions={(ride) => renderRideActions(ride, { night: planNight, compact: true })}
                    />
                  )}

                  {recommendations.planAhead && recommendations.planAhead.id !== primaryRecommendation?.id && (
                    <RecommendationCard night={planNight}
                      title="PLAN AHEAD"
                      ride={recommendations.planAhead}
                      reason={
                        recommendations.planAhead.planAheadReason ||
                        "This ride usually needs a strategy. Consider Lightning Lane, rope drop, late night, or watching for a rare dip."
                      }
                      color="#991b1b"
                      borderColor="#fecaca"
                      background="#fef2f2"
                      protectReason={Boolean(
                        recommendations.planAhead.mustDoPriority ||
                          recommendations.planAhead.shouldProtectLater
                      )}
                      renderShowtimeInfo={(ride) => renderShowtimeInfo(ride, { night: planNight })}
                      renderRideActions={(ride) => renderRideActions(ride, { night: planNight, compact: true })}
                    />
                  )}

                  {recommendations.waitOnThis && recommendations.waitOnThis.id !== primaryRecommendation?.id && (
                    <RecommendationCard night={planNight}
                      title="WAIT ON THIS"
                      ride={recommendations.waitOnThis}
                      reason={recommendations.waitOnThis.waitOnThisReason || recommendations.waitOnThis.reason || "This may fit better later when the wait or effort drops."}
                      color="#9a3412"
                      borderColor="#fed7aa"
                      background="#fff7ed"
                      protectReason={Boolean(
                        recommendations.waitOnThis.mustDoPriority ||
                          recommendations.waitOnThis.shouldProtectLater
                      )}
                      renderShowtimeInfo={(ride) => renderShowtimeInfo(ride, { night: planNight })}
                      renderRideActions={(ride) => renderRideActions(ride, { night: planNight, compact: true })}
                    />
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: 15,
                    borderRadius: 20,
                    border: `1px solid ${planTokens.borderQuiet}`,
                    background: planNight ? "#111A33" : "#FFFDF8",
                  }}
                >
                  <strong style={{ color: planTokens.title }}>
                    No strong recommendation right now.
                  </strong>
                  <p style={{ margin: "7px 0 0", color: planTokens.muted, lineHeight: 1.45 }}>
                    Refresh wait data, reset hidden rides, or use this as a good
                    moment for a nearby indoor break, snack, restroom stop, or
                    quick regroup.
                  </p>
                </div>
              )}
                </>
              )}
            </div>
          </section>
  );
}

export default PlanRecommendations;
