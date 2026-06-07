import React, { useState } from "react";
import { colors } from "../theme";

const START_STRATEGY_OPTIONS = [
  { value: "rope_drop", label: "Rope drop", helper: "Arrive early and make room for the first big move." },
  { value: "moderate_morning", label: "Moderate morning", helper: "Start steady without forcing a pre-dawn sprint." },
  { value: "late_start", label: "Late start", helper: "Accept a slower start and keep energy in the day." },
  { value: "evening_only", label: "Evening only", helper: "Build around a shorter, cooler park window." },
];

const BREAK_PREFERENCE_OPTIONS = [
  { value: "no_break", label: "No formal break", helper: "Stay in the park and use smaller resets." },
  { value: "resort_return", label: "Resort return", helper: "Plan a real mid-day escape when realistic." },
  { value: "in_park_rest", label: "In-park rest", helper: "Use AC, shade, food, and seated shows." },
  { value: "kids_nap_window", label: "Kids nap window", helper: "Make room for a real rest window for younger kids." },
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
  { value: "high", label: "High", helper: "Make room for parades, shows, and character moments." },
];

const NIGHTTIME_IMPORTANCE_OPTIONS = [
  { value: "must_see_fireworks", label: "Must see nighttime show", helper: "Plan energy and exit strategy around it." },
  { value: "if_we_re_still_here", label: "If we’re still here", helper: "Keep it optional based on family energy." },
  { value: "kids_will_be_done", label: "Kids will be done", helper: "Do not build the day around a late finish." },
];

const PAID_QUEUE_OPTIONS = [
  { value: "undecided", label: "Undecided", helper: "Keep options open for now." },
  { value: "avoid_paid", label: "Avoid paid access", helper: "Only suggest free strategies unless the day is at risk." },
  { value: "open_to_paid", label: "Open if it keeps the day easier", helper: "Use paid access when it keeps the day easier." },
  { value: "use_paid", label: "Plan around paid access", helper: "Treat paid queue access as part of the strategy." },
];

const PRIORITY_STYLES = {
  must: { bg: colors.coralSoft, color: "#E11D48", label: "High priority" },
  should: { bg: colors.amberSoft, color: "#92400E", label: "Smart move" },
  optional: { bg: colors.skySoft, color: "#0369A1", label: "Flexible" },
};

const PACKING_PRIORITY_STYLES = {
  must: { bg: colors.coralSoft, color: "#E11D48", label: "Must" },
  should: { bg: colors.amberSoft, color: "#92400E", label: "Should" },
  nice_to_have: { bg: colors.skySoft, color: "#0369A1", label: "Nice" },
};

function getSelectedHelper(options, value) {
  return options.find((option) => option.value === value)?.helper || "";
}

function SectionBadge({ children, background, color }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 9px",
        borderRadius: 999,
        background,
        color,
        fontSize: 11,
        fontWeight: 950,
        letterSpacing: 0.7,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}


function CollapseButton({ isOpen, openLabel = "See more", closeLabel = "Collapse", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${colors.cardBorder}`,
        background: "rgba(255,255,255,0.82)",
        color: colors.text,
        borderRadius: 999,
        padding: "7px 10px",
        fontSize: 12,
        fontWeight: 900,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {isOpen ? `▲ ${closeLabel}` : `▶ ${openLabel}`}
    </button>
  );
}

function PlanPreferenceSelect({ id, label, value, options, onChange }) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "grid",
        gap: 6,
        padding: 10,
        borderRadius: 16,
        background: "rgba(255,255,255,0.78)",
        border: `1px solid ${colors.cardBorder}`,
      }}
    >
      <span style={{ color: colors.text, fontSize: 12, fontWeight: 950 }}>
        {label}
      </span>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 13,
          padding: "9px 10px",
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

      <span style={{ color: colors.muted, fontSize: 11, lineHeight: 1.3 }}>
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



function getFirstNameLabel(preferredName) {
  return String(preferredName || "").trim();
}

function getMorningGreeting(preferredName) {
  const name = getFirstNameLabel(preferredName);
  return name ? `Good morning, ${name}. Here’s today.` : "Good morning. Here’s today.";
}

function getStartPlanAnchor(dayGamePlan = []) {
  return (
    dayGamePlan.find((item) => item?.id === "start_plan") ||
    dayGamePlan.find((item) => item?.eyebrow === "START PLAN") ||
    dayGamePlan[0] ||
    null
  );
}

function getMeaningfulWeatherNote(weatherMode = {}) {
  const mode = String(weatherMode?.mode || "normal").toLowerCase();

  if (!mode || mode === "normal") return "";

  if (mode === "storm") {
    return "Storms may shape the day — favor indoor, covered, or easy-to-reach choices until things settle.";
  }

  if (mode === "rain") {
    return "Rain may affect outdoor rides and longer walks, so keep the first move flexible.";
  }

  if (mode === "extreme_heat") {
    return "Heat builds fast today — plan your reset earlier than feels necessary.";
  }

  if (mode === "hot") {
    return "It is warm enough to plan water, shade, and AC before everyone feels done.";
  }

  if (mode === "warm") {
    return "A quick water stop early can keep the morning smoother.";
  }

  return weatherMode?.message || "";
}

function getPriorityPreview(tripPlan = {}, planningPark) {
  const allPriorities = Array.isArray(tripPlan?.mustDoExperiences)
    ? tripPlan.mustDoExperiences
    : [];

  const inPlanningPark = allPriorities.filter(
    (experience) => experience?.parkId === planningPark
  );

  const visible = (inPlanningPark.length ? inPlanningPark : allPriorities)
    .map((experience) => experience?.name)
    .filter(Boolean)
    .slice(0, 3);

  if (!visible.length) {
    return {
      text: "No priorities selected yet.",
      empty: true,
    };
  }

  return {
    text: `TOHI is making room for: ${visible.join(", ")}.`,
    empty: false,
  };
}


function formatTransportationModeLabel(mode) {
  const labels = {
    bus: "bus",
    walking: "walking path",
    monorail: "monorail",
    water_taxi: "boat",
    skyliner: "Skyliner",
    skyliner_via_epcot: "Skyliner",
    walking_to_ttc: "walk to TTC",
    monorail_transfer: "monorail transfer",
    rideshare: "rideshare",
    drive: "driving",
    car: "driving",
    unknown: "transportation",
  };

  return labels[mode] || String(mode || "transportation").replace(/_/g, " ");
}

function formatTransportationModes(modes = []) {
  const labels = Array.from(
    new Set((modes || []).map(formatTransportationModeLabel).filter(Boolean))
  );

  if (!labels.length) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} or ${labels[1]}`;

  return `${labels.slice(0, -1).join(", ")}, or ${labels[labels.length - 1]}`;
}

function getResortDisplayName(familyProfile = {}) {
  return (
    familyProfile?.resortProfile?.name ||
    familyProfile?.resortContext?.resortName ||
    familyProfile?.resortContext?.offPropertyHotelName ||
    ""
  );
}

function buildTransportationBriefing({
  familyProfile = {},
  planningPark,
  planningParkLabel,
  planTabState = {},
  tripPlan = {},
} = {}) {
  const resortContext = familyProfile?.resortContext || {};
  const resortProfile = familyProfile?.resortProfile || null;
  const parkLabel = planningParkLabel || "the park";
  const resortName = getResortDisplayName(familyProfile);
  const startStrategy = tripPlan?.preferences?.startStrategy || "moderate_morning";
  const isRopeDropStyle = startStrategy === "rope_drop";
  const openLabel = planTabState?.parkOpenLabel || "";
  const directModes = resortProfile?.directAccess?.[planningPark] || [];
  const resortTransportModes = Array.isArray(resortProfile?.transportation)
    ? resortProfile.transportation
    : [];
  const selectedMode = resortContext?.transportationMode;
  const selectedModeLabel =
    selectedMode && selectedMode !== "unknown" ? formatTransportationModeLabel(selectedMode) : "";
  const directModeLabel = formatTransportationModes(directModes);
  const resortModeLabel =
    directModeLabel || selectedModeLabel || formatTransportationModes(resortTransportModes);
  const stayingOnProperty = resortContext?.stayingOnProperty === "yes";
  const stayingOffProperty = resortContext?.stayingOnProperty === "no";

  if (stayingOnProperty && resortName && directModeLabel) {
    const morningContext = isRopeDropStyle
      ? "If rope drop matters today, earlier is safer because resort transportation and entry points can stack up before open."
      : "You do not need a perfect departure, but give yourself buffer for morning transportation and entry.";

    return {
      title: `${directModeLabel} from ${resortName}.`,
      detail: openLabel
        ? `${parkLabel} opens around ${openLabel}. ${morningContext}`
        : morningContext,
    };
  }

  if (stayingOnProperty && resortName) {
    const modeText = resortModeLabel ? `Use ${resortModeLabel}` : "Use resort transportation";
    const morningContext = isRopeDropStyle
      ? "Build in extra buffer for the first transportation wave and the park entry line."
      : "Give yourself some cushion so the first move does not feel rushed.";

    return {
      title: `${modeText} from ${resortName}.`,
      detail: openLabel
        ? `${parkLabel} opens around ${openLabel}. ${morningContext}`
        : morningContext,
    };
  }

  if (stayingOffProperty) {
    const hotelOrArea = resortContext?.offPropertyHotelName || "your hotel or area";
    const drivingContext = isRopeDropStyle
      ? "Parking, trams, security, and the walk in can all add time before open."
      : "Parking and getting through the entrance can still take longer than it feels like it should.";

    return {
      title: `Plan the drive from ${hotelOrArea}.`,
      detail: openLabel
        ? `${parkLabel} opens around ${openLabel}. ${drivingContext}`
        : drivingContext,
    };
  }

  if (resortName) {
    return {
      title: `Check the route from ${resortName}.`,
      detail: "TOHI has your stay in the profile, but transportation details are not clear enough yet to give a stronger morning read.",
    };
  }

  return {
    title: "Check your route before you leave.",
    detail: openLabel
      ? `${parkLabel} opens around ${openLabel}. Leave room for parking, security, and getting to the first area of the park.`
      : "Leave room for transportation, security, and getting to the first area of the park.",
  };
}


function MorningBriefingCard({
  card,
  preferredName,
  familyProfile = {},
  dayGamePlan = [],
  weatherMode = {},
  tripPlan = {},
  planningPark,
  planningParkLabel,
  planTabState = {},
}) {
  const startPlan = getStartPlanAnchor(dayGamePlan);
  const weatherNote = getMeaningfulWeatherNote(weatherMode);
  const priorityPreview = getPriorityPreview(tripPlan, planningPark);
  const transportationBriefing = buildTransportationBriefing({
    familyProfile,
    planningPark,
    planningParkLabel,
    planTabState,
    tripPlan,
  });

  return (
    <section
      style={{
        ...card,
        padding: 18,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 92% 0%, rgba(251, 113, 133, 0.20) 0%, rgba(251, 113, 133, 0.05) 35%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 54%, #FEF3C7 100%)",
        border: "1px solid rgba(245, 158, 11, 0.26)",
        boxShadow: "0 16px 38px rgba(245, 158, 11, 0.12)",
      }}
    >
      <div style={{ position: "relative" }}>
        <SectionBadge background={colors.amberSoft} color="#92400E">
          MORNING BRIEFING
        </SectionBadge>

        <h2
          style={{
            margin: 0,
            color: colors.text,
            fontSize: 25,
            letterSpacing: -0.55,
            lineHeight: 1.12,
          }}
        >
          {getMorningGreeting(preferredName)}
        </h2>

        <div style={{ display: "grid", gap: 10, marginTop: 13 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 18,
              background: "rgba(255,255,255,0.84)",
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            <div
              style={{
                color: "#92400E",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: 0.55,
              }}
            >
              FIRST MOVE
            </div>

            <strong
              style={{
                display: "block",
                marginTop: 4,
                color: colors.text,
                fontSize: 15,
                lineHeight: 1.28,
              }}
            >
              {startPlan?.title || `Start with one clear move at ${planningParkLabel || "the park"}.`}
            </strong>

            {startPlan?.body && (
              <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12.5, lineHeight: 1.38 }}>
                {startPlan.body}
              </p>
            )}
          </div>

          {transportationBriefing && (
            <div
              style={{
                padding: 12,
                borderRadius: 18,
                background: "rgba(255,255,255,0.72)",
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div
                style={{
                  color: "#5B21B6",
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 0.55,
                }}
              >
                GETTING THERE
              </div>

              <strong
                style={{
                  display: "block",
                  marginTop: 4,
                  color: colors.text,
                  fontSize: 14,
                  lineHeight: 1.28,
                }}
              >
                {transportationBriefing.title}
              </strong>

              <p style={{ margin: "5px 0 0", color: colors.muted, fontSize: 12.5, lineHeight: 1.38 }}>
                {transportationBriefing.detail}
              </p>
            </div>
          )}

          {weatherNote && (
            <div
              style={{
                padding: 12,
                borderRadius: 18,
                background: "rgba(255,255,255,0.72)",
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div
                style={{
                  color: "#0369A1",
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 0.55,
                }}
              >
                WEATHER NOTE
              </div>

              <p style={{ margin: "4px 0 0", color: colors.text, fontSize: 13, lineHeight: 1.38 }}>
                {weatherNote}
              </p>
            </div>
          )}

          <div
            style={{
              padding: 12,
              borderRadius: 18,
              background: "rgba(255,255,255,0.72)",
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            <div
              style={{
                color: "#E11D48",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: 0.55,
              }}
            >
              YOUR PRIORITIES
            </div>

            <p style={{ margin: "4px 0 0", color: colors.text, fontSize: 13, lineHeight: 1.38 }}>
              {priorityPreview.text}
            </p>

            {priorityPreview.empty && (
              <p style={{ margin: "5px 0 0", color: colors.muted, fontSize: 12, lineHeight: 1.35 }}>
                Add a few before the trip so the morning plan knows what would make the day feel like a win.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


function PlanningStatusCard({
  card,
  timeContext = {},
  planTabState = {},
  hasPersonalizedAccess,
  profileCompletion,
  setActiveScreen,
  button,
}) {
  return (
    <section
      style={{
        ...card,
        padding: 13,
        background: "linear-gradient(145deg, #FFFFFF 0%, #FFF9F1 100%)",
        border: `1px solid ${colors.cardBorder}`,
        boxShadow: "0 10px 24px rgba(28, 25, 23, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 220, flex: "1 1 300px" }}>
          <SectionBadge background={colors.amberSoft} color="#92400E">
            TRIP STATUS
          </SectionBadge>
          <p
            style={{
              margin: 0,
              color: colors.text,
              fontWeight: 900,
              fontSize: 15,
              lineHeight: 1.4,
            }}
          >
            {timeContext.summary}
          </p>

          {planTabState?.headline && (
            <p
              style={{
                margin: "7px 0 0",
                color: colors.text,
                fontSize: 13,
                lineHeight: 1.38,
                fontWeight: 850,
              }}
            >
              {planTabState.headline}{" "}
              <span style={{ color: colors.muted, fontWeight: 700 }}>
                {planTabState.detail}
              </span>
            </p>
          )}

          <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12, lineHeight: 1.35 }}>
            {hasPersonalizedAccess
              ? "Your setup is active. TOHI is using your family profile and trip tune in this plan."
              : "Finish setup when you are ready for a plan that fits your family."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveScreen("family_profile")}
          style={{
            ...button,
            background: profileCompletion.isComplete ? "rgba(255,255,255,0.82)" : colors.purpleDeep,
            color: profileCompletion.isComplete ? colors.text : "white",
            borderColor: profileCompletion.isComplete ? colors.cardBorder : colors.purpleDeep,
          }}
        >
          {profileCompletion.isComplete ? "Review setup" : "Finish setup"}
        </button>
      </div>
    </section>
  );
}


function DayGamePlanSection({ card, dayGamePlan = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const firstAnchor = dayGamePlan[0];
  const preview = firstAnchor?.title
    ? `${firstAnchor.eyebrow ? `${firstAnchor.eyebrow}: ` : ""}${firstAnchor.title}`
    : "Tap to see the strategy behind the day.";

  return (
    <section
      style={{
        ...card,
        position: "relative",
        overflow: "hidden",
        padding: 18,
        background:
          "radial-gradient(circle at 92% 0%, rgba(14, 165, 233, 0.20) 0%, rgba(14, 165, 233, 0.05) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%)",
        border: "1px solid rgba(14, 165, 233, 0.22)",
        boxShadow: "0 16px 38px rgba(14, 165, 233, 0.10)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 124,
          height: 124,
          borderRadius: "999px",
          right: -50,
          top: -54,
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
          <div style={{ minWidth: 220, flex: "1 1 320px" }}>
            <SectionBadge background={colors.skySoft} color="#0369A1">
              DAY STRATEGY
            </SectionBadge>

            <h2
              style={{
                margin: 0,
                color: colors.text,
                fontSize: 24,
                letterSpacing: -0.55,
                lineHeight: 1.12,
              }}
            >
              Today’s plan at a glance
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color: colors.muted,
                fontSize: 14,
                lineHeight: 1.45,
                maxWidth: 660,
              }}
            >
              {preview}
            </p>
          </div>

          <CollapseButton
            isOpen={isOpen}
            openLabel="See full plan"
            closeLabel="Collapse"
            onClick={() => setIsOpen((current) => !current)}
          />
        </div>

        {isOpen && (
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {dayGamePlan.map((item) => {
              const styleForPriority =
                PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.optional;

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
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#0369A1",
                          fontSize: 11,
                          fontWeight: 950,
                          letterSpacing: 0.55,
                        }}
                      >
                        {item.eyebrow}
                      </div>
                      <strong
                        style={{
                          display: "block",
                          marginTop: 3,
                          color: colors.text,
                          fontSize: 15,
                          lineHeight: 1.25,
                        }}
                      >
                        {item.title}
                      </strong>
                      <p
                        style={{
                          margin: "6px 0 0",
                          color: colors.text,
                          fontSize: 13,
                          lineHeight: 1.38,
                        }}
                      >
                        {item.body}
                      </p>
                      {item.detail && (
                        <p
                          style={{
                            margin: "6px 0 0",
                            color: colors.muted,
                            fontSize: 12,
                            lineHeight: 1.35,
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
                      {item.priorityLabel || styleForPriority.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function PlanningParkSelector({
  planningPark,
  planningParkLabel,
  activePark,
  parkOptions = [],
  onPlanningParkChange,
}) {
  const activeParkLabel = parkOptions.find((park) => park.id === activePark)?.name || activePark;
  const hasSeparateLivePark = activePark && planningPark && activePark !== planningPark;

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 18,
        background: "rgba(255,255,255,0.78)",
        border: `1px solid ${colors.cardBorder}`,
        display: "grid",
        gap: 8,
      }}
    >
      <label
        htmlFor="planning-park-select"
        style={{
          display: "grid",
          gap: 6,
          color: colors.text,
          fontSize: 12,
          fontWeight: 950,
        }}
      >
        Planning for
        <select
          id="planning-park-select"
          value={planningPark}
          onChange={(event) => onPlanningParkChange?.(event.target.value)}
          style={{
            width: "100%",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 14,
            padding: "10px 11px",
            fontWeight: 900,
            background: "white",
            color: colors.text,
          }}
        >
          {parkOptions.map((park) => (
            <option key={park.id} value={park.id}>
              {park.name}
            </option>
          ))}
        </select>
      </label>

      <p style={{ margin: 0, color: colors.muted, fontSize: 12, lineHeight: 1.35 }}>
        Must-dos below are for {planningParkLabel || "this planning park"}.
        {hasSeparateLivePark
          ? ` Home is still showing ${activeParkLabel || "your current park"} for live waits.`
          : " Change this without changing your live park on Home."}
      </p>
    </div>
  );
}


function MustDoMomentsSection({
  card,
  activePark,
  planningPark,
  planningParkLabel,
  parkOptions = [],
  onPlanningParkChange,
  tripPlan,
  mustDoExperienceOptions = [],
  onToggleMustDoExperience,
}) {
  const selectedExperiences = Array.isArray(tripPlan?.mustDoExperiences)
    ? tripPlan.mustDoExperiences
    : [];

  const selectedKeys = new Set(selectedExperiences.map(getMustDoKey));
  const selectedForPlanningPark = selectedExperiences.filter(
    (experience) => experience.parkId === planningPark
  );
  const otherParkSelections = selectedExperiences.filter(
    (experience) => experience.parkId !== planningPark
  );

  return (
    <section
      style={{
        ...card,
        padding: 14,
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, #FFF1F2 100%)",
        border: "1px solid rgba(251, 113, 133, 0.18)",
        boxShadow: "0 10px 24px rgba(251, 113, 133, 0.06)",
      }}
    >
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
          <SectionBadge background={colors.coralSoft} color="#E11D48">
            YOUR PRIORITIES
          </SectionBadge>
          <h3 style={{ margin: 0, color: colors.text, fontSize: 22, letterSpacing: -0.35 }}>
            What should the day have room for?
          </h3>
          <p style={{ margin: "7px 0 0", color: colors.muted, fontSize: 13, lineHeight: 1.4 }}>
            Pick the rides, shows, and experiences TOHI should keep in mind for {planningParkLabel || "this park"}.
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

      <PlanningParkSelector
        planningPark={planningPark}
        planningParkLabel={planningParkLabel}
        activePark={activePark}
        parkOptions={parkOptions}
        onPlanningParkChange={onPlanningParkChange}
      />

      {selectedExperiences.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          {selectedExperiences.slice(0, 8).map((experience) => (
            <button
              key={getMustDoKey(experience)}
              type="button"
              onClick={() => onToggleMustDoExperience(experience)}
              style={{
                border: "1px solid rgba(225, 29, 72, 0.24)",
                borderRadius: 999,
                background: colors.coralSoft,
                color: "#9F1239",
                padding: "7px 9px",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="Tap to remove"
            >
              ✓ {experience.name}
            </button>
          ))}

          {selectedExperiences.length > 8 && (
            <span
              style={{
                borderRadius: 999,
                background: "rgba(255,255,255,0.78)",
                border: `1px solid ${colors.cardBorder}`,
                color: colors.muted,
                padding: "7px 9px",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              +{selectedExperiences.length - 8} more
            </span>
          )}
        </div>
      )}

      {mustDoExperienceOptions.length === 0 ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 16,
            background: "rgba(255,255,255,0.82)",
            border: `1px solid ${colors.cardBorder}`,
            color: colors.muted,
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          Choose a planning park above, then TOHI can show available experiences
          for that park.
        </div>
      ) : (
        <details style={{ marginTop: 12 }}>
          <summary
            style={{
              cursor: "pointer",
              color: colors.text,
              fontSize: 13,
              fontWeight: 950,
              padding: "10px 12px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.78)",
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            Add or edit priorities
          </summary>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 8,
              marginTop: 10,
              maxHeight: 360,
              overflow: "auto",
              paddingRight: 2,
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
                    gap: 5,
                    textAlign: "left",
                    padding: 10,
                    borderRadius: 16,
                    background: selected ? colors.coralSoft : "rgba(255,255,255,0.82)",
                    border: selected
                      ? "1px solid rgba(225, 29, 72, 0.28)"
                      : `1px solid ${colors.cardBorder}`,
                    color: colors.text,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontWeight: 950, fontSize: 12 }}>
                    {selected ? "✓ " : ""}
                    {experience.name}
                  </span>

                  <span style={{ color: colors.muted, fontSize: 11 }}>
                    {getMustDoTypeLabel(experience.type)}
                    {experience.land ? ` · ${experience.land}` : ""}
                    {experience.waitTime != null ? ` · ${experience.waitTime} min` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </details>
      )}

      {(selectedForPlanningPark.length > 0 || otherParkSelections.length > 0) && (
        <p style={{ margin: "10px 0 0", color: colors.muted, fontSize: 12, lineHeight: 1.35 }}>
          {selectedForPlanningPark.length} in {planningParkLabel || "this park"}
          {otherParkSelections.length > 0 ? ` · ${otherParkSelections.length} across your other park days` : ""}
        </p>
      )}
    </section>
  );
}


function PlanTuneSection({ card, preferences = {}, onUpdateTripPreferences }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      style={{
        ...card,
        padding: 14,
        background: "linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 100%)",
        border: "1px solid rgba(124, 58, 237, 0.16)",
        boxShadow: "0 10px 24px rgba(124, 58, 237, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 220, flex: "1 1 300px" }}>
          <SectionBadge background="rgba(124, 58, 237, 0.10)" color={colors.purpleDeep}>
            PLAN TUNE
          </SectionBadge>

          <h3 style={{ margin: 0, color: colors.text, fontSize: 22, letterSpacing: -0.35 }}>
            Fine-tune the day
          </h3>
          <p style={{ margin: "7px 0 0", color: colors.muted, fontSize: 13, lineHeight: 1.4 }}>
            These are the controls behind the strategy. Open them only when the way you want
            the day to feel changes.
          </p>
        </div>

        <CollapseButton
          isOpen={isOpen}
          openLabel="Edit controls"
          closeLabel="Hide controls"
          onClick={() => setIsOpen((current) => !current)}
        />
      </div>

      {isOpen && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 9,
            marginTop: 12,
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
      )}
    </section>
  );
}

function formatPlanFreshnessAge(ageMinutes) {
  if (ageMinutes == null) return "";

  if (ageMinutes < 60) {
    return `${ageMinutes} min ago`;
  }

  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;

  return minutes ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
}


function PlanNudgesSection({
  card,
  button,
  planNudges = [],
  onRefreshTripPlanContext,
}) {
  if (!Array.isArray(planNudges) || planNudges.length === 0) return null;

  return (
    <section
      style={{
        ...card,
        padding: 15,
        background:
          "radial-gradient(circle at 95% 0%, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0.04) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 100%)",
        border: "1px solid rgba(245, 158, 11, 0.24)",
        boxShadow: "0 14px 30px rgba(245, 158, 11, 0.08)",
      }}
    >
      <SectionBadge background={colors.amberSoft} color="#92400E">
        TOHI NUDGES
      </SectionBadge>

      <h3 style={{ margin: 0, color: colors.text, fontSize: 19, letterSpacing: -0.25 }}>
        Worth noticing right now
      </h3>

      <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 13, lineHeight: 1.4 }}>
        Small course-corrections based on your setup, weather, timing, and plan freshness.
      </p>

      <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
        {planNudges.map((nudge) => (
          <div
            key={nudge.id}
            style={{
              padding: 12,
              borderRadius: 17,
              background: "rgba(255,255,255,0.82)",
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 220, flex: "1 1 260px" }}>
                <div
                  style={{
                    color: colors.purpleDeep,
                    fontSize: 10,
                    fontWeight: 950,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {nudge.eyebrow || "TOHI NUDGE"}
                </div>

                <div
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: 950,
                    lineHeight: 1.25,
                  }}
                >
                  {nudge.title}
                </div>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: colors.muted,
                    fontSize: 12.5,
                    lineHeight: 1.38,
                    fontWeight: 650,
                  }}
                >
                  {nudge.body}
                </p>
              </div>

              {nudge.action === "refresh_plan" && (
                <button
                  type="button"
                  onClick={onRefreshTripPlanContext}
                  style={{
                    ...button,
                    padding: "7px 10px",
                    fontSize: 12,
                    background: colors.purpleDeep,
                    color: "white",
                    borderColor: colors.purpleDeep,
                    flexShrink: 0,
                  }}
                >
                  {nudge.actionLabel || "Refresh plan"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


function PlanFreshnessNotice({ card, button, planFreshness, onRefreshTripPlanContext }) {
  if (!planFreshness?.isStale) return null;

  const ageLabel = formatPlanFreshnessAge(planFreshness.ageMinutes);

  return (
    <section
      style={{
        ...card,
        padding: 13,
        background:
          planFreshness.severity === "attention"
            ? "linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 100%)"
            : "linear-gradient(145deg, #FFFFFF 0%, #F0F9FF 100%)",
        border:
          planFreshness.severity === "attention"
            ? "1px solid rgba(245, 158, 11, 0.28)"
            : "1px solid rgba(14, 165, 233, 0.22)",
        boxShadow: "0 10px 24px rgba(28, 25, 23, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 220, flex: "1 1 260px" }}>
          <SectionBadge
            background={planFreshness.severity === "attention" ? colors.amberSoft : colors.skySoft}
            color={planFreshness.severity === "attention" ? "#92400E" : "#0369A1"}
          >
            PLAN CHECK
          </SectionBadge>

          <h3 style={{ margin: 0, color: colors.text, fontSize: 18, letterSpacing: -0.25 }}>
            {planFreshness.title || "Plan may need a quick refresh"}
          </h3>

          <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 13, lineHeight: 1.4 }}>
            {planFreshness.message || "Your timing, weather, or setup changed since this plan was refreshed."}
            {ageLabel ? ` Last refreshed ${ageLabel}.` : ""}
          </p>

          {Array.isArray(planFreshness.reasons) && planFreshness.reasons.length > 0 && (
            <div style={{ display: "grid", gap: 5, marginTop: 9 }}>
              {planFreshness.reasons.slice(0, 3).map((reason) => (
                <div
                  key={reason}
                  style={{
                    color: colors.text,
                    fontSize: 12,
                    lineHeight: 1.35,
                    fontWeight: 750,
                  }}
                >
                  • {reason}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRefreshTripPlanContext}
          style={{
            ...button,
            background: colors.purpleDeep,
            color: "white",
            borderColor: colors.purpleDeep,
            flexShrink: 0,
          }}
        >
          Refresh plan
        </button>
      </div>
    </section>
  );
}



function PackingPreviewSection({ card, packingChecklist = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const previewItems = packingChecklist.slice(0, 2).map((item) => item.label).filter(Boolean);
  const previewText = previewItems.length
    ? previewItems.join(" · ")
    : "The items most likely to matter for this park day.";

  return (
    <section
      style={{
        ...card,
        padding: 14,
        background: "linear-gradient(145deg, #FFFFFF 0%, #ECFDF5 100%)",
        border: "1px solid rgba(5, 150, 105, 0.18)",
        boxShadow: "0 10px 24px rgba(5, 150, 105, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 220, flex: "1 1 300px" }}>
          <SectionBadge background={colors.successSoft} color={colors.success}>
            WHAT TO PACK
          </SectionBadge>
          <h3 style={{ margin: 0, color: colors.text, fontSize: 22, letterSpacing: -0.35 }}>
            Quick bag check for today
          </h3>
          <p style={{ margin: "7px 0 0", color: colors.muted, fontSize: 13, lineHeight: 1.4 }}>
            {previewText}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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

          <CollapseButton
            isOpen={isOpen}
            openLabel="See bag"
            closeLabel="Hide bag"
            onClick={() => setIsOpen((current) => !current)}
          />
        </div>
      </div>

      {isOpen && (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {packingChecklist.map((item) => {
            const styleForPriority =
              PACKING_PRIORITY_STYLES[item.priority] || PACKING_PRIORITY_STYLES.nice_to_have;

            return (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "start",
                  padding: 11,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.82)",
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <div>
                  <strong style={{ color: colors.text, fontSize: 13 }}>{item.label}</strong>
                  <p
                    style={{
                      margin: "4px 0 0",
                      color: colors.muted,
                      fontSize: 12,
                      lineHeight: 1.35,
                    }}
                  >
                    {item.reason}
                  </p>
                </div>

                <span
                  style={{
                    padding: "5px 8px",
                    borderRadius: 999,
                    background: styleForPriority.bg,
                    color: styleForPriority.color,
                    fontSize: 11,
                    fontWeight: 950,
                    whiteSpace: "nowrap",
                  }}
                >
                  {styleForPriority.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}


export function PlanTab({
  card,
  button,
  hasPersonalizedAccess,
  profileCompletion,
  timeContext,
  planTabState,
  preferredName,
  familyProfile,
  weatherMode,
  packingChecklist,
  dayGamePlan = [],
  planNudges = [],
  tripPlanFreshness,
  onRefreshTripPlanContext,
  tripPlan = { preferences: {}, mustDoExperiences: [] },
  activePark,
  planningPark,
  planningParkLabel,
  parkOptions = [],
  onPlanningParkChange,
  mustDoExperienceOptions = [],
  onUpdateTripPreferences,
  onToggleMustDoExperience,
  setActiveScreen,
}) {
  const preferences = tripPlan?.preferences || {};
  const showMorningBriefing = planTabState?.mode === "morning_of";

  return (
    <>
      <section
        style={{
          ...card,
          padding: 16,
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 92% 0%, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0.05) 34%, transparent 58%), linear-gradient(150deg, #FFFFFF 0%, #FFF7ED 48%, #FEF3C7 100%)",
          border: "1px solid rgba(245, 158, 11, 0.20)",
          borderRadius: 28,
          boxShadow: "0 14px 34px rgba(245, 158, 11, 0.09)",
        }}
      >
        <div style={{ position: "relative" }}>
          <SectionBadge background="rgba(245, 158, 11, 0.14)" color="#92400E">
            ✨ TRIP RHYTHM
          </SectionBadge>

          <h2
            style={{
              margin: 0,
              color: colors.text,
              fontSize: 27,
              letterSpacing: -0.6,
              lineHeight: 1.12,
            }}
          >
            Your calm trip plan
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              color: colors.muted,
              fontSize: 14,
              lineHeight: 1.45,
              maxWidth: 640,
            }}
          >
            A simple strategy for making room for what matters without turning
            the park day into a checklist.
          </p>
        </div>
      </section>

      {showMorningBriefing && (
        <MorningBriefingCard
          card={card}
          preferredName={preferredName}
          familyProfile={familyProfile}
          dayGamePlan={dayGamePlan}
          weatherMode={weatherMode}
          tripPlan={tripPlan}
          planningPark={planningPark}
          planningParkLabel={planningParkLabel}
          planTabState={planTabState}
        />
      )}

      <PlanningStatusCard
        card={card}
        button={button}
        timeContext={timeContext}
        planTabState={planTabState}
        hasPersonalizedAccess={hasPersonalizedAccess}
        profileCompletion={profileCompletion}
        setActiveScreen={setActiveScreen}
      />

      <PlanFreshnessNotice
        card={card}
        button={button}
        planFreshness={tripPlanFreshness}
        onRefreshTripPlanContext={onRefreshTripPlanContext}
      />

      <MustDoMomentsSection
        card={card}
        activePark={activePark}
        planningPark={planningPark}
        planningParkLabel={planningParkLabel}
        parkOptions={parkOptions}
        onPlanningParkChange={onPlanningParkChange}
        tripPlan={tripPlan}
        mustDoExperienceOptions={mustDoExperienceOptions}
        onToggleMustDoExperience={onToggleMustDoExperience}
      />

      <PlanNudgesSection
        card={card}
        button={button}
        planNudges={planNudges}
        onRefreshTripPlanContext={onRefreshTripPlanContext}
      />

      <DayGamePlanSection card={card} dayGamePlan={dayGamePlan} />

      <PlanTuneSection
        card={card}
        preferences={preferences}
        onUpdateTripPreferences={onUpdateTripPreferences}
      />

      <PackingPreviewSection card={card} packingChecklist={packingChecklist} />
    </>
  );
}

export default PlanTab;
