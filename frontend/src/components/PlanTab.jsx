import React from "react";
import { colors } from "../theme";


const START_STRATEGY_OPTIONS = [
  { value: "rope_drop", label: "Rope drop", helper: "Arrive early and protect the first big move." },
  { value: "moderate_morning", label: "Moderate morning", helper: "Start steady without forcing a pre-dawn sprint." },
  { value: "late_start", label: "Late start", helper: "Accept a slower start and protect energy." },
  { value: "evening_only", label: "Evening only", helper: "Build around a shorter, cooler park window." },
];

const BREAK_PREFERENCE_OPTIONS = [
  { value: "no_break", label: "No formal break", helper: "Stay in the park and use smaller resets." },
  { value: "resort_return", label: "Resort return", helper: "Plan a real mid-day escape when realistic." },
  { value: "in_park_rest", label: "In-park rest", helper: "Use AC, shade, food, and seated shows." },
  { value: "kids_nap_window", label: "Kids nap window", helper: "Protect a real rest window for younger kids." },
];

const DINING_STYLE_OPTIONS = [
  { value: "quick_service", label: "Quick service", helper: "Keep meals flexible and low friction." },
  { value: "table_service_planned", label: "Table service planned", helper: "Anchor the day around a planned meal." },
  { value: "mixed", label: "Mixed", helper: "Use one planned meal and flexible snacks." },
  { value: "snack_through_day", label: "Snack through the day", helper: "Avoid heavy meal stops when possible." },
];

const SHOWS_IMPORTANCE_OPTIONS = [
  { value: "low", label: "Low", helper: "Rides and flow matter more than shows." },
  { value: "medium", label: "Medium", helper: "Use shows when they help the day." },
  { value: "high", label: "High", helper: "Protect parades, shows, and character moments." },
];

const NIGHTTIME_IMPORTANCE_OPTIONS = [
  { value: "must_see_fireworks", label: "Must see nighttime show", helper: "Plan energy and exit strategy around it." },
  { value: "if_we_re_still_here", label: "If we’re still here", helper: "Keep it optional based on family energy." },
  { value: "kids_will_be_done", label: "Kids will be done", helper: "Do not build the day around a late finish." },
];

const PAID_QUEUE_OPTIONS = [
  { value: "undecided", label: "Undecided", helper: "Keep options open for now." },
  { value: "avoid_paid", label: "Avoid paid access", helper: "Only suggest free strategies unless the day is at risk." },
  { value: "open_to_paid", label: "Open if it protects the day", helper: "Use paid access when it prevents stress." },
  { value: "use_paid", label: "Plan around paid access", helper: "Treat Lightning Lane / Express Pass as part of the strategy." },
];

function getSelectedHelper(options, value) {
  return options.find((option) => option.value === value)?.helper || "";
}

function PlanPreferenceSelect({
  id,
  label,
  value,
  options,
  onChange,
}) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "grid",
        gap: 7,
        padding: 12,
        borderRadius: 18,
        background: "rgba(255,255,255,0.82)",
        border: `1px solid ${colors.cardBorder}`,
        boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
      }}
    >
      <span
        style={{
          color: colors.text,
          fontSize: 13,
          fontWeight: 950,
        }}
      >
        {label}
      </span>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          padding: "10px 11px",
          fontWeight: 850,
          background: "white",
          color: colors.text,
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <span
        style={{
          color: colors.muted,
          fontSize: 12,
          lineHeight: 1.35,
        }}
      >
        {getSelectedHelper(options, value)}
      </span>
    </label>
  );
}

function getMustDoTypeLabel(type) {
  const labels = {
    ride: "Ride",
    show: "Show",
    character: "Character",
    experience: "Experience",
  };

  return labels[type] || "Experience";
}

function getMustDoKey(experience = {}) {
  return `${experience.parkId || ""}:${experience.id || ""}`;
}

function MustDoMomentsSection({
  card,
  activePark,
  tripPlan,
  mustDoExperienceOptions = [],
  onToggleMustDoExperience,
}) {
  const selectedExperiences = Array.isArray(tripPlan?.mustDoExperiences)
    ? tripPlan.mustDoExperiences
    : [];

  const selectedKeys = new Set(selectedExperiences.map(getMustDoKey));
  const selectedForActivePark = selectedExperiences.filter(
    (experience) => experience.parkId === activePark
  );
  const otherParkSelections = selectedExperiences.filter(
    (experience) => experience.parkId !== activePark
  );

  return (
    <section
      style={{
        ...card,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 92% 0%, rgba(251, 113, 133, 0.18) 0%, rgba(251, 113, 133, 0.05) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #FFF1F2 100%)",
        border: "1px solid rgba(251, 113, 133, 0.20)",
        boxShadow: "0 14px 34px rgba(251, 113, 133, 0.08)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 112,
          height: 112,
          borderRadius: "999px",
          right: -44,
          top: -46,
          background: "rgba(124, 58, 237, 0.09)",
        }}
      />

      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            flexWrap: "wrap",
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
                background: colors.coralSoft,
                color: "#E11D48",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: 0.7,
                marginBottom: 9,
              }}
            >
              MUST-DO MOMENTS
            </div>

            <h3
              style={{
                margin: 0,
                color: colors.text,
                fontSize: 24,
                letterSpacing: -0.4,
                lineHeight: 1.15,
              }}
            >
              What would your family be disappointed to miss?
            </h3>

            <p
              style={{
                margin: "8px 0 0",
                color: colors.muted,
                fontSize: 13,
                lineHeight: 1.45,
                maxWidth: 660,
              }}
            >
              Pick the rides, shows, and experiences TOHI should protect. This becomes
              especially valuable during rope drop, cooler mornings, low-wait windows,
              and final-chance evening decisions.
            </p>
          </div>

          <span
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.78)",
              border: `1px solid ${colors.cardBorder}`,
              color: colors.text,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {selectedExperiences.length} selected
          </span>
        </div>

        {mustDoExperienceOptions.length === 0 ? (
          <div
            style={{
              marginTop: 14,
              padding: 13,
              borderRadius: 18,
              background: "rgba(255,255,255,0.82)",
              border: `1px solid ${colors.cardBorder}`,
              color: colors.muted,
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            Select a park and let wait data load, then TOHI can show available
            experiences for must-do planning.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
              marginTop: 14,
            }}
          >
            {mustDoExperienceOptions.map((experience) => {
              const key = getMustDoKey(experience);
              const selected = selectedKeys.has(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleMustDoExperience(experience)}
                  style={{
                    display: "grid",
                    gap: 6,
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 18,
                    background: selected ? colors.coralSoft : "rgba(255,255,255,0.82)",
                    border: selected
                      ? "1px solid rgba(225, 29, 72, 0.28)"
                      : `1px solid ${colors.cardBorder}`,
                    boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
                    color: colors.text,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontWeight: 950, fontSize: 13 }}>
                    {selected ? "✓ " : ""}
                    {experience.name}
                  </span>

                  <span style={{ color: colors.muted, fontSize: 12 }}>
                    {getMustDoTypeLabel(experience.type)}
                    {experience.land ? ` · ${experience.land}` : ""}
                    {experience.waitTime != null ? ` · ${experience.waitTime} min` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selectedExperiences.length > 0 && (
          <div
            style={{
              marginTop: 14,
              padding: 13,
              borderRadius: 18,
              background: "rgba(255,255,255,0.82)",
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            <strong style={{ color: colors.text }}>Protected moments</strong>

            {selectedForActivePark.length > 0 && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: colors.muted,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                Current park: {selectedForActivePark.map((item) => item.name).join(", ")}
              </p>
            )}

            {otherParkSelections.length > 0 && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: colors.muted,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                Other parks saved: {otherParkSelections.map((item) => item.name).join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}



export function PlanTab({
  card,
  button,
  hasPersonalizedAccess,
  profileCompletion,
  timeContext,
  packingChecklist,
  dayGamePlan = [],
  tripPlan = { preferences: {}, mustDoExperiences: [] },
  activePark,
  mustDoExperienceOptions = [],
  onUpdateTripPreferences,
  onToggleMustDoExperience,
  setActiveScreen,
}) {
  const preferences = tripPlan?.preferences || {};

  return (
    <>
              <section
                style={{
                  ...card,
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 92% 0%, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.06) 34%, transparent 58%), linear-gradient(150deg, #FFFFFF 0%, #FFF7ED 48%, #FEF3C7 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.24)",
                  borderRadius: 28,
                  boxShadow: "0 18px 44px rgba(245, 158, 11, 0.12)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 112,
                    height: 112,
                    borderRadius: "999px",
                    right: -44,
                    bottom: -48,
                    background: "rgba(124, 58, 237, 0.10)",
                  }}
                />

                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 9px",
                      borderRadius: 999,
                      background: "rgba(245, 158, 11, 0.14)",
                      color: "#92400E",
                      fontSize: 11,
                      fontWeight: 950,
                      letterSpacing: 0.7,
                      marginBottom: 10,
                    }}
                  >
                    ✨ TRIP RHYTHM
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      color: colors.text,
                      fontSize: 27,
                      letterSpacing: -0.6,
                      lineHeight: 1.15,
                    }}
                  >
                    Your calm trip plan
                  </h2>

                  <p
                    style={{
                      margin: "9px 0 0",
                      color: colors.muted,
                      fontSize: 14,
                      lineHeight: 1.5,
                      maxWidth: 620,
                    }}
                  >
                    Keep the day simple, realistic, and flexible. This is where TOHI
                    will help shape the trip before the park and protect family energy
                    once you are there.
                  </p>

                  <button
                    type="button"
                    onClick={() => setActiveScreen("family_profile")}
                    style={{
                      ...button,
                      marginTop: 15,
                      background:
                        "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
                      color: "white",
                      borderColor: "rgba(124, 58, 237, 0.28)",
                      boxShadow: "0 12px 24px rgba(124, 58, 237, 0.18)",
                    }}
                  >
                    {profileCompletion.isComplete ? "Review Trip Setup" : "Finish Trip Setup"}
                  </button>
                </div>
              </section>

              <section
                style={{
                  ...card,
                  background:
                    "linear-gradient(145deg, #FFFFFF 0%, #FFF9F1 100%)",
                  border: `1px solid ${colors.cardBorder}`,
                  boxShadow: "0 12px 30px rgba(28, 25, 23, 0.07)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: colors.amberSoft,
                    color: "#92400E",
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: 0.7,
                    marginBottom: 8,
                  }}
                >
                  PLANNING STATUS
                </div>

                <p
                  style={{
                    margin: 0,
                    color: colors.text,
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.4,
                  }}
                >
                  {timeContext.summary}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 12,
                  }}
                >
                  <span
                    style={{
                      padding: "6px 9px",
                      borderRadius: 999,
                      background: colors.purpleSoft,
                      color: colors.purpleDeep,
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    Mode: {timeContext.planningMode.replace(/_/g, " ")}
                  </span>

                  <span
                    style={{
                      padding: "6px 9px",
                      borderRadius: 999,
                      background: hasPersonalizedAccess ? colors.successSoft : colors.coralSoft,
                      color: hasPersonalizedAccess ? colors.success : "#E11D48",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    AI: {hasPersonalizedAccess ? "available" : "locked"}
                  </span>
                </div>
              </section>

              <section
                style={{
                  ...card,
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 92% 0%, rgba(124, 58, 237, 0.18) 0%, rgba(124, 58, 237, 0.05) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.18)",
                  boxShadow: "0 14px 34px rgba(124, 58, 237, 0.08)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 112,
                    height: 112,
                    borderRadius: "999px",
                    right: -44,
                    top: -46,
                    background: "rgba(245, 158, 11, 0.12)",
                  }}
                />

                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 9px",
                      borderRadius: 999,
                      background: "rgba(124, 58, 237, 0.10)",
                      color: colors.purpleDeep,
                      fontSize: 11,
                      fontWeight: 950,
                      letterSpacing: 0.7,
                      marginBottom: 9,
                    }}
                  >
                    PLAN TUNE
                  </div>

                  <h3
                    style={{
                      margin: 0,
                      color: colors.text,
                      fontSize: 24,
                      letterSpacing: -0.4,
                      lineHeight: 1.15,
                    }}
                  >
                    Tell TOHI how this day should feel.
                  </h3>

                  <p
                    style={{
                      margin: "8px 0 0",
                      color: colors.muted,
                      fontSize: 13,
                      lineHeight: 1.45,
                      maxWidth: 640,
                    }}
                  >
                    These choices stay separate from family setup. They shape the trip
                    plan without forcing every future visit to work the same way.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    <PlanPreferenceSelect
                      id="start-strategy"
                      label="Start strategy"
                      value={preferences.startStrategy}
                      options={START_STRATEGY_OPTIONS}
                      onChange={(value) => onUpdateTripPreferences({ startStrategy: value })}
                    />

                    <PlanPreferenceSelect
                      id="break-preference"
                      label="Break style"
                      value={preferences.breakPreference}
                      options={BREAK_PREFERENCE_OPTIONS}
                      onChange={(value) => onUpdateTripPreferences({ breakPreference: value })}
                    />

                    <PlanPreferenceSelect
                      id="dining-style"
                      label="Food rhythm"
                      value={preferences.diningStyle}
                      options={DINING_STYLE_OPTIONS}
                      onChange={(value) => onUpdateTripPreferences({ diningStyle: value })}
                    />

                    <PlanPreferenceSelect
                      id="shows-importance"
                      label="Shows / parades"
                      value={preferences.showsImportance}
                      options={SHOWS_IMPORTANCE_OPTIONS}
                      onChange={(value) => onUpdateTripPreferences({ showsImportance: value })}
                    />

                    <PlanPreferenceSelect
                      id="nighttime-importance"
                      label="Nighttime plan"
                      value={preferences.nighttimeImportance}
                      options={NIGHTTIME_IMPORTANCE_OPTIONS}
                      onChange={(value) => onUpdateTripPreferences({ nighttimeImportance: value })}
                    />

                    <PlanPreferenceSelect
                      id="paid-queue-strategy"
                      label="Paid queue strategy"
                      value={preferences.paidQueueStrategy}
                      options={PAID_QUEUE_OPTIONS}
                      onChange={(value) => onUpdateTripPreferences({ paidQueueStrategy: value })}
                    />
                  </div>
                </div>
              </section>

              <MustDoMomentsSection
                card={card}
                activePark={activePark}
                tripPlan={tripPlan}
                mustDoExperienceOptions={mustDoExperienceOptions}
                onToggleMustDoExperience={onToggleMustDoExperience}
              />

              <section
                style={{
                  ...card,
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 92% 0%, rgba(14, 165, 233, 0.18) 0%, rgba(14, 165, 233, 0.05) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%)",
                  border: "1px solid rgba(14, 165, 233, 0.20)",
                  boxShadow: "0 14px 34px rgba(14, 165, 233, 0.08)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 112,
                    height: 112,
                    borderRadius: "999px",
                    right: -44,
                    top: -46,
                    background: "rgba(124, 58, 237, 0.09)",
                  }}
                />

                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
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
                          background: colors.skySoft,
                          color: "#0369A1",
                          fontSize: 11,
                          fontWeight: 950,
                          letterSpacing: 0.7,
                          marginBottom: 9,
                        }}
                      >
                        DAY GAME PLAN
                      </div>

                      <h3
                        style={{
                          margin: 0,
                          color: colors.text,
                          fontSize: 24,
                          letterSpacing: -0.4,
                          lineHeight: 1.15,
                        }}
                      >
                        A flexible rhythm for the day.
                      </h3>

                      <p
                        style={{
                          margin: "8px 0 0",
                          color: colors.muted,
                          fontSize: 13,
                          lineHeight: 1.45,
                          maxWidth: 650,
                        }}
                      >
                        This is not a rigid itinerary. TOHI turns your family setup,
                        Plan Tune choices, weather, and park context into anchor moments
                        that protect the day from getting chaotic.
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "7px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.78)",
                        border: `1px solid ${colors.cardBorder}`,
                        color: colors.text,
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      {dayGamePlan.length} anchors
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {dayGamePlan.map((item) => {
                      const priorityStyles = {
                        must: { bg: colors.coralSoft, color: "#E11D48" },
                        should: { bg: colors.amberSoft, color: "#92400E" },
                        optional: { bg: colors.skySoft, color: "#0369A1" },
                      };

                      const styleForPriority =
                        priorityStyles[item.priority] || priorityStyles.optional;

                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: 13,
                            borderRadius: 18,
                            background: "rgba(255,255,255,0.84)",
                            border: `1px solid ${colors.cardBorder}`,
                            boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              alignItems: "flex-start",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  color: colors.purpleDeep,
                                  fontSize: 11,
                                  fontWeight: 950,
                                  letterSpacing: 0.6,
                                  marginBottom: 5,
                                }}
                              >
                                {item.order}. {item.eyebrow}
                              </div>

                              <strong style={{ color: colors.text, fontSize: 15 }}>
                                {item.title}
                              </strong>

                              <p
                                style={{
                                  margin: "6px 0 0",
                                  color: colors.muted,
                                  fontSize: 13,
                                  lineHeight: 1.42,
                                }}
                              >
                                {item.body}
                              </p>

                              {item.detail && (
                                <p
                                  style={{
                                    margin: "6px 0 0",
                                    color: colors.text,
                                    fontSize: 12,
                                    lineHeight: 1.38,
                                    fontWeight: 750,
                                  }}
                                >
                                  {item.detail}
                                </p>
                              )}
                            </div>

                            <span
                              style={{
                                flexShrink: 0,
                                padding: "5px 8px",
                                borderRadius: 999,
                                background: styleForPriority.bg,
                                color: styleForPriority.color,
                                fontSize: 11,
                                fontWeight: 950,
                              }}
                            >
                              {item.priorityLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section
                style={{
                  ...card,
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 92% 0%, rgba(5, 150, 105, 0.16) 0%, rgba(5, 150, 105, 0.04) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #ECFDF5 100%)",
                  border: "1px solid rgba(5, 150, 105, 0.20)",
                  boxShadow: "0 14px 34px rgba(5, 150, 105, 0.08)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 112,
                    height: 112,
                    borderRadius: "999px",
                    right: -42,
                    top: -48,
                    background: "rgba(124, 58, 237, 0.09)",
                  }}
                />

                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
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
                          background: colors.successSoft,
                          color: colors.success,
                          fontSize: 11,
                          fontWeight: 950,
                          letterSpacing: 0.7,
                          marginBottom: 9,
                        }}
                      >
                        PACKING CHECKLIST
                      </div>

                      <h3
                        style={{
                          margin: 0,
                          color: colors.text,
                          fontSize: 24,
                          letterSpacing: -0.4,
                          lineHeight: 1.15,
                        }}
                      >
                        Bring the stuff that protects the day.
                      </h3>

                      <p
                        style={{
                          margin: "8px 0 0",
                          color: colors.muted,
                          fontSize: 13,
                          lineHeight: 1.45,
                          maxWidth: 620,
                        }}
                      >
                        This first Plan Ahead tool is deterministic: TOHI looks at your
                        family setup, comfort settings, weather, and park context without
                        making up a plan.
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "7px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.78)",
                        border: `1px solid ${colors.cardBorder}`,
                        color: colors.text,
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      {packingChecklist.length} items
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {packingChecklist.map((item) => {
                      const priorityStyles = {
                        must: { label: "Must pack", bg: colors.coralSoft, color: "#E11D48" },
                        should: { label: "Should pack", bg: colors.amberSoft, color: "#92400E" },
                        nice_to_have: { label: "Nice to have", bg: colors.skySoft, color: "#0369A1" },
                      };

                      const styleForPriority =
                        priorityStyles[item.priority] || priorityStyles.nice_to_have;

                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: 13,
                            borderRadius: 18,
                            background: "rgba(255,255,255,0.82)",
                            border: `1px solid ${colors.cardBorder}`,
                            boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
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
                              <strong style={{ color: colors.text }}>{item.label}</strong>
                              <p
                                style={{
                                  margin: "5px 0 0",
                                  color: colors.muted,
                                  fontSize: 13,
                                  lineHeight: 1.4,
                                }}
                              >
                                {item.reason}
                              </p>
                            </div>

                            <span
                              style={{
                                flexShrink: 0,
                                padding: "5px 8px",
                                borderRadius: 999,
                                background: styleForPriority.bg,
                                color: styleForPriority.color,
                                fontSize: 11,
                                fontWeight: 950,
                              }}
                            >
                              {styleForPriority.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section
                style={{
                  ...card,
                  background:
                    "linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.18)",
                  boxShadow: "0 12px 30px rgba(124, 58, 237, 0.08)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: "rgba(124, 58, 237, 0.10)",
                    color: colors.purpleDeep,
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: 0.7,
                    marginBottom: 10,
                  }}
                >
                  COMING NEXT
                </div>

                <div style={{ display: "grid", gap: 9 }}>
                  {[
                    ["Save / regenerate plan", "Let families refresh the deterministic plan as park context changes."],
                    ["AI explanation layer", "Let TOHI explain the plan without inventing unsupported details."],
                    ["Official schedule awareness", "Tie shows, parades, and nighttime entertainment to live schedule checks."],
                    ["Rope-drop early window logic", "Use cooler, lower-wait mornings to protect the right must-dos."],
                  ].map(([title, text]) => (
                    <div
                      key={title}
                      style={{
                        padding: 12,
                        borderRadius: 18,
                        background: "rgba(255, 255, 255, 0.78)",
                        border: `1px solid ${colors.cardBorder}`,
                      }}
                    >
                      <strong style={{ color: colors.text }}>{title}</strong>
                      <p
                        style={{
                          margin: "5px 0 0",
                          color: colors.muted,
                          fontSize: 13,
                          lineHeight: 1.4,
                        }}
                      >
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            
    </>
  );
}

export default PlanTab;
