import React from "react";
import { getResortProfile } from "../resortProfiles";
import { colors } from "../theme";

export function OnboardingFlow({
  familyProfileSummary,
  activePark,
    familyProfileStep,
    familyProfile,
    isProfileIncomplete,
    setActiveScreen,
    setFamilyProfileStep,
    setDevPreviewFullApp,
    devPreviewFullApp,
    profileCompletion,
    updateFamilyProfile,
    handleAdultCountChange,
    handleChildCountChange,
    handleChildChange,
    handlePriorityToggle,
    handleSelectedParkToggle,
    handleFamilyProfileDone,
    trackAppEvent,
    getDisneyAgeClass,
    getDisneyAgeLabel,
    getParkLabel,
    page,
    shell,
    card,
    button,
    actionButton,
    premiumHeroCard,
    premiumBadge,
    DISNEY_PARK_OPTIONS,
    FAMILY_PRIORITY_OPTIONS,
    DEV_ALLOW_FULL_APP_WITHOUT_PROFILE,
    resortOptions,
}) {
      const summary = familyProfileSummary;
      const shortestHeightText =
        summary.shortestHeightInches != null
          ? `${summary.shortestHeightInches} in shortest child rider`
          : summary.childCount > 0
          ? "child height not set yet"
          : "no child height needed";

      const setupPage = {
        ...page,
        background:
          "radial-gradient(circle at 18% 0%, rgba(124, 58, 237, 0.12) 0%, rgba(124, 58, 237, 0.03) 28%, transparent 48%), radial-gradient(circle at 88% 8%, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.05) 30%, transparent 52%), linear-gradient(180deg, #FFF4E6 0%, #FFF9F1 52%, #F3E8FF 100%)",
      };

      const setupHero = {
        ...premiumHeroCard,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 92% 2%, rgba(124, 58, 237, 0.26) 0%, rgba(124, 58, 237, 0.07) 34%, transparent 58%), radial-gradient(circle at 8% 0%, rgba(245, 158, 11, 0.26) 0%, rgba(245, 158, 11, 0.08) 36%, transparent 62%), linear-gradient(150deg, #FFFFFF 0%, #FFF7ED 48%, #F3E8FF 100%)",
        border: "1px solid rgba(124, 58, 237, 0.18)",
        borderRadius: 32,
        boxShadow: "0 22px 58px rgba(91, 33, 182, 0.15)",
      };

      const setupCard = {
        ...card,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, #FFF9F1 100%)",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 28,
        boxShadow: "0 18px 44px rgba(28, 25, 23, 0.09)",
      };

      const inputStyle = {
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 15,
        padding: "10px 12px",
        fontWeight: 800,
        background: "rgba(255,255,255,0.92)",
        color: colors.text,
        boxShadow: "0 6px 14px rgba(28, 25, 23, 0.04)",
      };

      const fieldLabelStyle = {
        display: "grid",
        gap: 6,
        fontSize: 13,
        fontWeight: 900,
        color: colors.text,
      };

      const smallMutedStyle = {
        color: colors.muted,
        fontSize: 13,
        lineHeight: 1.45,
      };

      const sectionPanel = {
        padding: 14,
        borderRadius: 20,
        border: `1px solid ${colors.cardBorder}`,
        background: "rgba(255,255,255,0.78)",
        boxShadow: "0 8px 20px rgba(28, 25, 23, 0.05)",
      };

      const primaryButtonStyle = {
        ...button,
        background: "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
        color: "white",
        borderColor: "rgba(124, 58, 237, 0.28)",
        boxShadow: "0 12px 24px rgba(124, 58, 237, 0.18)",
      };

      const stepTitle =
        familyProfileStep === 1
          ? "Quick trip setup"
          : familyProfileStep === 2
          ? "Family comfort"
          : "Resort and travel details";

      const stepDescription =
        familyProfileStep === 1
          ? "Start with only the essentials: who is going, how many days, and which parks matter."
          : familyProfileStep === 2
          ? "A few quick choices so TOHI knows what your family will actually enjoy."
          : "Resort context helps ParkPlan avoid bad transportation and break advice.";

      return (
        <main style={setupPage}>
          <div style={shell}>
            <header style={{ padding: "18px 0" }}>
              <button
                type="button"
                onClick={() => setActiveScreen("main")}
                style={{
                  ...button,
                  marginBottom: 12,
                  color: colors.muted,
                  background: "rgba(255,255,255,0.76)",
                  borderColor: colors.cardBorder,
                }}
              >
                ← View basic waits
              </button>

              <div style={setupHero}>
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 132,
                    height: 132,
                    borderRadius: "999px",
                    right: -48,
                    bottom: -52,
                    background: "rgba(56, 189, 248, 0.14)",
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 96,
                    height: 96,
                    borderRadius: "999px",
                    left: -42,
                    top: -38,
                    background: "rgba(251, 113, 133, 0.12)",
                  }}
                />
                <div style={{ position: "relative" }}>
                <span
                  style={{
                    ...premiumBadge,
                    background: "rgba(124, 58, 237, 0.12)",
                    border: "1px solid rgba(124, 58, 237, 0.18)",
                    color: colors.purpleDeep,
                  }}
                >
                  ✨ TOHI Trip Setup
                </span>
                <h1 style={{ fontSize: 34, margin: "10px 0 0", letterSpacing: -1 }}>
                  Build your family’s park plan
                </h1>
                <p style={{ color: colors.muted, marginTop: 8, lineHeight: 1.5 }}>
                  Every family does the parks differently. Tell TOHI who’s going,
                  where you’re staying, and what kind of day you want — then we’ll
                  help you make smarter, calmer choices in the park.
                </p>

                {isProfileIncomplete && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 13,
                      borderRadius: 18,
                      background: colors.amberSoft,
                      border: "1px solid rgba(245, 158, 11, 0.28)",
                      color: "#92400E",
                      fontSize: 13,
                      fontWeight: 850,
                      lineHeight: 1.45,
                    }}
                  >
                    Finish setup to unlock personalized recommendations, AI guidance,
                    height-aware filtering, and day-of family flow.
                  </div>
                )}
                </div>
              </div>
            </header>

            <section style={setupCard}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[
                  { step: 1, label: "Trip" },
                  { step: 2, label: "Style" },
                  { step: 3, label: "Stay" },
                ].map((item) => (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => {
                      trackAppEvent("profile_step_selected", {
                        source: "profile_setup",
                        metadata: {
                          fromStep: familyProfileStep,
                          toStep: item.step,
                        },
                      });
                      setFamilyProfileStep(item.step);
                    }}
                    style={{
                      ...button,
                      flex: 1,
                      background:
                        familyProfileStep === item.step
                          ? "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)"
                          : "rgba(255,255,255,0.82)",
                      color: familyProfileStep === item.step ? "white" : colors.text,
                      borderColor:
                        familyProfileStep === item.step
                          ? "rgba(124, 58, 237, 0.28)"
                          : colors.cardBorder,
                      borderRadius: 16,
                      boxShadow:
                        familyProfileStep === item.step
                          ? "0 10px 20px rgba(124, 58, 237, 0.16)"
                          : "none",
                    }}
                  >
                    {item.step}. {item.label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 20,
                  border: "1px solid rgba(56, 189, 248, 0.26)",
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,0.88) 0%, #E0F2FE 100%)",
                  marginBottom: 14,
                  boxShadow: "0 10px 24px rgba(2, 132, 199, 0.08)",
                }}
              >
                <strong>{stepTitle}</strong>
                <p style={{ margin: "6px 0 0", color: colors.text, fontSize: 13 }}>
                  {stepDescription}
                </p>
                <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12 }}>
                  {summary.partySize} guests · {summary.ageSummary.under3Count} under 3 ·{" "}
                  {summary.ageSummary.childCount} Disney child ·{" "}
                  {summary.ageSummary.disneyAdultCount} Disney adult · {shortestHeightText}
                </p>
                <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12 }}>
                  First park: {getParkLabel(summary.tripContext.firstPark)} · Priority park:{" "}
                  {getParkLabel(summary.tripContext.priorityPark)} · {summary.tripAccessStatus.message}
                </p>
                <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12 }}>
                  Ride comfort: {summary.thrillTolerance || "not set"} ·
                  Walking: {summary.walkingTolerance || "not set"} ·
                  Heat: {summary.heatSensitivity || "not set"}
                </p>
              </div>

              {familyProfileStep === 1 && (
                <div style={{ display: "grid", gap: 14 }}>
                  <div>
                    <strong>Who’s in your group?</strong>
                    <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                      Adults do not need height entry. We only need children’s ages and
                      heights so TOHI can avoid rides they cannot ride.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <label
                        htmlFor="adult-count"
                        style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}
                      >
                        Adults
                        <select
                          id="adult-count"
                          value={familyProfile.adultCount}
                          onChange={(e) => handleAdultCountChange(e.target.value)}
                          style={inputStyle}
                        >
                          {Array.from({ length: 12 }, (_, index) => index + 1).map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label
                        htmlFor="child-count"
                        style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}
                      >
                        Children
                        <select
                          id="child-count"
                          value={familyProfile.childCount}
                          onChange={(e) => handleChildCountChange(e.target.value)}
                          style={inputStyle}
                        >
                          {Array.from({ length: 13 }, (_, index) => index).map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {familyProfile.childCount > 0 ? (
                      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                        {familyProfile.children.map((child, index) => {
                          const ageClass = getDisneyAgeClass(child.age);

                          return (
                            <div
                              key={child.id}
                              style={{
                                padding: 13,
                                borderRadius: 18,
                                border: `1px solid ${colors.cardBorder}`,
                                background: "rgba(255,255,255,0.84)",
                                boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
                              }}
                            >
                              <strong style={{ display: "block", marginBottom: 8 }}>
                                Child {index + 1}
                              </strong>

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: 8,
                                }}
                              >
                                <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800 }}>
                                  Age
                                  <input
                                    type="number"
                                    min="0"
                                    max="17"
                                    value={child.age}
                                    onChange={(e) => handleChildChange(index, "age", e.target.value)}
                                    placeholder="ex: 7"
                          style={inputStyle}
                                  />
                                </label>

                                <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800 }}>
                                  Height in inches
                                  <input
                                    type="number"
                                    min="0"
                                    max="72"
                                    value={child.heightInches}
                                    onChange={(e) =>
                                      handleChildChange(index, "heightInches", e.target.value)
                                    }
                                    placeholder="ex: 42"
                          style={inputStyle}
                                  />
                                </label>
                              </div>

                              <p style={{ margin: "8px 0 0", color: colors.muted, fontSize: 12 }}>
                                {getDisneyAgeLabel(ageClass)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          borderRadius: 16,
                          border: `1px solid ${colors.successSoft}`,
                          background: colors.successSoft,
                        }}
                      >
                        <strong>Adults-only group</strong>
                        <p style={{ margin: "6px 0 0", color: colors.text, fontSize: 13 }}>
                          No child heights needed. TOHI will not apply child-height
                          restrictions unless you add children later.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <strong>Trip length and parks</strong>
                    <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                      Dates help control when AI chat should be available later and let
                      TOHI understand whether this is pre-trip planning or an active park day.
                    </p>

                    <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                        }}
                      >
                        <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                          Trip start date
                          <input
                            type="date"
                            value={familyProfile.tripContext.tripStartDate}
                            onChange={(e) =>
                              updateFamilyProfile({
                                tripContext: {
                                  ...familyProfile.tripContext,
                                  tripStartDate: e.target.value,
                                  tripEndDate:
                                    familyProfile.tripContext.tripEndDate &&
                                    familyProfile.tripContext.tripEndDate < e.target.value
                                      ? e.target.value
                                      : familyProfile.tripContext.tripEndDate,
                                },
                              })
                            }
                          style={inputStyle}
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                          Trip end date
                          <input
                            type="date"
                            value={familyProfile.tripContext.tripEndDate}
                            min={familyProfile.tripContext.tripStartDate || undefined}
                            onChange={(e) =>
                              updateFamilyProfile({
                                tripContext: {
                                  ...familyProfile.tripContext,
                                  tripEndDate: e.target.value,
                                },
                              })
                            }
                          style={inputStyle}
                          />
                        </label>
                      </div>

                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Total trip length
                        <select
                          value={familyProfile.tripContext.tripLengthDays}
                          onChange={(e) =>
                            updateFamilyProfile({
                              tripContext: {
                                ...familyProfile.tripContext,
                                tripLengthDays: e.target.value,
                              },
                            })
                          }
                          style={inputStyle}
                        >
                          {Array.from({ length: 14 }, (_, index) => index + 1).map((days) => (
                            <option key={days} value={days}>
                              {days} {days === 1 ? "day" : "days"}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Park days
                        <select
                          value={familyProfile.tripContext.parkDays}
                          onChange={(e) =>
                            updateFamilyProfile({
                              tripContext: {
                                ...familyProfile.tripContext,
                                parkDays: e.target.value,
                              },
                            })
                          }
                          style={inputStyle}
                        >
                          {Array.from({ length: 14 }, (_, index) => index + 1).map((days) => (
                            <option key={days} value={days}>
                              {days} {days === 1 ? "park day" : "park days"}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Park Hopper?
                        <select
                          value={familyProfile.tripContext.parkHopper}
                          onChange={(e) =>
                            updateFamilyProfile({
                              tripContext: {
                                ...familyProfile.tripContext,
                                parkHopper: e.target.value,
                              },
                            })
                          }
                          style={inputStyle}
                        >
                          <option value="unknown">Not sure yet</option>
                          <option value="no">No — one park per day</option>
                          <option value="yes">Yes — planning to park hop</option>
                        </select>
                      </label>
                    </div>

                    <p style={{ margin: "12px 0 8px", color: colors.muted, fontSize: 13, fontWeight: 900 }}>
                      Which parks are part of this trip?
                    </p>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {DISNEY_PARK_OPTIONS.map((option) => {
                        const selected = familyProfile.tripContext.selectedParks.includes(option.value);

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelectedParkToggle(option.value)}
                            style={{
                              ...actionButton,
                              background: selected ? "#0f172a" : "white",
                              color: selected ? "white" : "#0f172a",
                              borderColor: selected ? "#0f172a" : "#cbd5e1",
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {familyProfile.tripContext.selectedParks.length > 0 && (
                      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                        <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                          Which park do you want to do first?
                          <select
                            value={familyProfile.tripContext.firstPark || ""}
                            onChange={(e) =>
                              updateFamilyProfile({
                                tripContext: {
                                  ...familyProfile.tripContext,
                                  firstPark: e.target.value,
                                },
                              })
                            }
                          style={inputStyle}
                          >
                            <option value="">Not sure yet</option>
                            {DISNEY_PARK_OPTIONS.filter((park) =>
                              familyProfile.tripContext.selectedParks.includes(park.value)
                            ).map((park) => (
                              <option key={park.value} value={park.value}>
                                {park.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                          Main priority park
                          <select
                            value={familyProfile.tripContext.priorityPark || ""}
                            onChange={(e) =>
                              updateFamilyProfile({
                                tripContext: {
                                  ...familyProfile.tripContext,
                                  priorityPark: e.target.value,
                                },
                              })
                            }
                          style={inputStyle}
                          >
                            <option value="">Not sure yet</option>
                            {DISNEY_PARK_OPTIONS.filter((park) =>
                              familyProfile.tripContext.selectedParks.includes(park.value)
                            ).map((park) => (
                              <option key={park.value} value={park.value}>
                                {park.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      trackAppEvent("profile_step_next", {
                        source: "profile_setup",
                        metadata: {
                          fromStep: 1,
                          toStep: 2,
                        },
                      });
                      setFamilyProfileStep(2);
                    }}
                    style={{
                      ...button,
                      background: "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
                      color: "white",
                      justifySelf: "start",
                    }}
                  >
                    Next: Park Style
                  </button>
                </div>
              )}

              {familyProfileStep === 2 && (
                <div style={{ display: "grid", gap: 14 }}>
                  <div>
                    <strong>What should TOHI protect?</strong>
                    <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                      Keep this quick. We only need the choices that change real park-day
                      recommendations right away.
                    </p>

                    <div style={{ display: "grid", gap: 10 }}>
                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Ride comfort
                        <select
                          value={familyProfile.thrillTolerance}
                          onChange={(e) =>
                            updateFamilyProfile({
                              thrillTolerance: e.target.value,
                            })
                          }
                          style={inputStyle}
                        >
                          <option value="">Choose one</option>
                          <option value="low">Mostly gentle rides</option>
                          <option value="mixed">A mix of gentle and exciting</option>
                          <option value="high">Big thrills are a priority</option>
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Walking pace
                        <select
                          value={familyProfile.walkingTolerance}
                          onChange={(e) =>
                            updateFamilyProfile({
                              walkingTolerance: e.target.value,
                            })
                          }
                          style={inputStyle}
                        >
                          <option value="">Choose one</option>
                          <option value="low">Keep walking low when possible</option>
                          <option value="medium">Balanced walking is okay</option>
                          <option value="high">We are fine covering ground</option>
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Heat and fatigue
                        <select
                          value={familyProfile.heatSensitivity}
                          onChange={(e) =>
                            updateFamilyProfile({
                              heatSensitivity: e.target.value,
                            })
                          }
                          style={inputStyle}
                        >
                          <option value="">Choose one</option>
                          <option value="high">We need breaks before things fall apart</option>
                          <option value="medium">Watch it and suggest breaks when smart</option>
                          <option value="low">We usually handle heat pretty well</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div>
                    <strong>What matters most this trip?</strong>
                    <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                      Pick the moments TOHI should protect. You can choose more than one.
                    </p>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {FAMILY_PRIORITY_OPTIONS.map((option) => {
                        const selected = familyProfile.priorities.includes(option.value);

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handlePriorityToggle(option.value)}
                            style={{
                              ...actionButton,
                              background: selected ? "#0f172a" : "white",
                              color: selected ? "white" : "#0f172a",
                              borderColor: selected ? "#0f172a" : "#cbd5e1",
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {!familyProfile.priorities.length && (
                      <p style={{ margin: "8px 0 0", color: "#92400E", fontSize: 12, fontWeight: 800 }}>
                        Pick at least one priority so recommendations do not feel generic.
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      border: `1px solid ${colors.cardBorder}`,
                      background: colors.backgroundSoft,
                      color: colors.muted,
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    We’ll ask about rope drop, meals, breaks, and deeper planning later
                    when it actually matters. This keeps setup fast while still giving
                    TOHI enough to avoid bad recommendations.
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setFamilyProfileStep(1)}
                      style={{ ...button, color: colors.muted }}
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        trackAppEvent("profile_step_next", {
                          source: "profile_setup",
                          metadata: {
                            fromStep: 2,
                            toStep: 3,
                          },
                        });
                        setFamilyProfileStep(3);
                      }}
                      style={primaryButtonStyle}
                    >
                      Next: Where You’re Staying
                    </button>
                  </div>
                </div>
              )}

              {familyProfileStep === 3 && (
                <div style={{ display: "grid", gap: 14 }}>
                  <div>
                    <strong>Trip context</strong>
                    <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                      Resort context helps TOHI give realistic break, rope-drop, and
                      transportation advice.
                    </p>

                    <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Staying on Disney property?
                        <select
                          value={familyProfile.resortContext.stayingOnProperty}
                          onChange={(e) => {
                            const stayingOnProperty = e.target.value;

                            updateFamilyProfile({
                              resortContext: {
                                ...familyProfile.resortContext,
                                stayingOnProperty,
                                resortId:
                                  stayingOnProperty === "yes"
                                    ? familyProfile.resortContext.resortId
                                    : "",
                                resortName:
                                  stayingOnProperty === "yes"
                                    ? familyProfile.resortContext.resortName
                                    : "",
                              },
                            });
                          }}
                          style={inputStyle}
                        >
                          <option value="unknown">Not sure / skip for now</option>
                          <option value="yes">Yes, Disney resort</option>
                          <option value="no">No, off-property hotel</option>
                        </select>
                      </label>

                      {familyProfile.resortContext.stayingOnProperty === "yes" && (
                        <>
                          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                            Disney resort
                            <select
                              value={familyProfile.resortContext.resortId}
                              onChange={(e) => {
                                const resortId = e.target.value;
                                const selectedResort = getResortProfile(resortId);

                                updateFamilyProfile({
                                  resortContext: {
                                    ...familyProfile.resortContext,
                                    stayingOnProperty: "yes",
                                    resortId,
                                    resortName: selectedResort?.name || "",
                                  },
                                });
                              }}
                              style={{
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: 14,
                                padding: "10px 12px",
                                fontWeight: 800,
                                background: "white",
                              }}
                            >
                              <option value="">Select your Disney resort</option>
                              {resortOptions.map((resort) => (
                                <option key={resort.value} value={resort.value}>
                                  {resort.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          {familyProfileSummary.resortProfile && (
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 16,
                                border: `1px solid ${colors.successSoft}`,
                                background: colors.successSoft,
                              }}
                            >
                              <strong>{familyProfileSummary.resortProfile.name}</strong>
                              <p style={{ margin: "6px 0 0", color: colors.text, fontSize: 13 }}>
                                {familyProfileSummary.resortProfile.areaLabel} · Transportation:{" "}
                                {familyProfileSummary.resortProfile.transportation.join(", ")}
                              </p>

                              {familyProfileSummary.resortProfile.breakStrategy?.[activePark] && (
                                <p style={{ margin: "6px 0 0", color: colors.success, fontSize: 13 }}>
                                  Current park break note:{" "}
                                  {familyProfileSummary.resortProfile.breakStrategy[activePark]}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {familyProfile.resortContext.stayingOnProperty === "no" && (
                        <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                          Off-property hotel name
                          <input
                            value={familyProfile.resortContext.offPropertyHotelName}
                            onChange={(e) =>
                              updateFamilyProfile({
                                resortContext: {
                                  ...familyProfile.resortContext,
                                  offPropertyHotelName: e.target.value,
                                },
                              })
                            }
                            placeholder="ex: hotel name or area"
                          style={inputStyle}
                          />
                        </label>
                      )}

                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Main transportation today
                        <select
                          value={familyProfile.resortContext.transportationMode}
                          onChange={(e) =>
                            updateFamilyProfile({
                              resortContext: {
                                ...familyProfile.resortContext,
                                transportationMode: e.target.value,
                              },
                            })
                          }
                          style={inputStyle}
                        >
                          <option value="unknown">Not sure / depends</option>
                          <option value="bus">Bus</option>
                          <option value="monorail">Monorail</option>
                          <option value="skyliner">Skyliner</option>
                          <option value="boat">Boat</option>
                          <option value="walking">Walking</option>
                          <option value="car">Car / rideshare</option>
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 900 }}>
                        Lightning Lane / Single Pass preference
                        <select
                          value={familyProfile.lightningLanePreference}
                          onChange={(e) =>
                            updateFamilyProfile({ lightningLanePreference: e.target.value })
                          }
                          style={inputStyle}
                        >
                          <option value="undecided">Undecided</option>
                          <option value="avoid_paid">Avoid paid options if possible</option>
                          <option value="open_to_paid">Open if it protects the day</option>
                          <option value="use_paid">Plan around paid access</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      border: `1px solid ${colors.skySoft}`,
                      background: colors.skySoft,
                    }}
                  >
                    <strong>Disney classification reminder</strong>
                    <p style={{ margin: "6px 0 0", color: colors.text, fontSize: 13 }}>
                      Ages 0–2 are under 3 / no ticket. Ages 3–9 are Disney child.
                      Ages 10+ count as Disney adults for tickets and dining.
                    </p>
                  </div>

                  {profileCompletion.missing.length > 0 && (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        border: `1px solid ${colors.amberSoft}`,
                        background: colors.cardWarm,
                        color: "#92400E",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      Still needed: {profileCompletion.missing.join(", ")}.
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setFamilyProfileStep(2)}
                      style={{ ...button, color: colors.muted }}
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={handleFamilyProfileDone}
                      style={{
                        ...button,
                        background: profileCompletion.isComplete ? "#0f172a" : "#94a3b8",
                        color: "white",
                      }}
                    >
                      {profileCompletion.isComplete ? "Unlock My Family Plan" : "Finish Setup First"}
                    </button>

                    {DEV_ALLOW_FULL_APP_WITHOUT_PROFILE && (
                      <button
                        type="button"
                        onClick={() => {
                          trackAppEvent("dev_preview_enabled", {
                            source: "profile_setup",
                            metadata: {
                              familyProfileStep,
                              missing: profileCompletion.missing,
                            },
                          });
                          setDevPreviewFullApp(true);
                          setActiveScreen("main");
                        }}
                        style={{
                          ...button,
                          color: colors.purple,
                          borderColor: colors.purpleSoft,
                        }}
                      >
                        Dev Preview Full App
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      );
  
}

export default OnboardingFlow;
