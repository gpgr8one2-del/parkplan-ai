import React, { useState } from "react";
import { colors } from "../theme";

// 61A presentation-only palette. PlanTab swaps this before its children
// render; day mode keeps the existing styles untouched (shell is null).
const PLAN_TAB_DAY_PALETTE = {
  isNight: false,
  text: colors.text,
  muted: colors.muted,
  shell: null,
  chip: null,
  chipBorder: null,
};

const PLAN_TAB_NIGHT_PALETTE = {
  isNight: true,
  text: "#F5F3FF",
  muted: "#B6C2E2",
  shell: {
    background: "#131C36",
    border: "1px solid rgba(139, 92, 246, 0.30)",
    boxShadow: "0 10px 24px rgba(2, 6, 23, 0.40)",
  },
  chip: "rgba(15, 23, 42, 0.72)",
  chipBorder: "rgba(99, 102, 241, 0.30)",
};



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


// Night chips keep their semantic accent but move to dark translucent
// surfaces with readable light accents. Day chips are untouched.
const NIGHT_CHIP_ACCENTS = {
  "#E11D48": "#FDA4AF",
  "#92400E": "#FCD34D",
  "#0369A1": "#7DD3FC",
  "#059669": "#6EE7B7",
  "#7C3AED": "#C4B5FD",
  "#5B21B6": "#C4B5FD",
};

function getChipAccent(color, palette) {
  if (!palette?.isNight) return color;
  return NIGHT_CHIP_ACCENTS[color] || "#C7D2FE";
}

function getChipSurface(background, palette) {
  return palette?.isNight ? palette.chip : background;
}

function getSelectedHelper(options, value) {
  return options.find((option) => option.value === value)?.helper || "";
}

function SectionBadge({ palette = PLAN_TAB_DAY_PALETTE, children, background, color }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 9px",
        borderRadius: 999,
        background: getChipSurface(background, palette),
        border: palette?.isNight ? `1px solid ${palette.chipBorder}` : "none",
        color: getChipAccent(color, palette),
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


function CollapseButton({ palette = PLAN_TAB_DAY_PALETTE, isOpen, openLabel = "See more", closeLabel = "Collapse", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${palette.chipBorder || colors.cardBorder}`,
        background: palette.chip || "rgba(255,255,255,0.82)",
        color: palette.text,
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

function PlanPreferenceSelect({ palette = PLAN_TAB_DAY_PALETTE, id, label, value, options, onChange }) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "grid",
        gap: 6,
        padding: 10,
        borderRadius: 16,
        background: palette.chip || "rgba(255,255,255,0.78)",
        border: `1px solid ${colors.cardBorder}`,
      }}
    >
      <span style={{ color: palette.text, fontSize: 12, fontWeight: 950 }}>
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
          background: palette.chip || "white",
          color: palette.text,
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <span style={{ color: palette.muted, fontSize: 11, lineHeight: 1.3 }}>
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
  const rawDirectAccess = resortProfile?.directAccess?.[planningPark];
  const resortTransportModes = Array.isArray(resortProfile?.transportation)
    ? resortProfile.transportation
    : [];
  const directModes = Array.isArray(rawDirectAccess)
    ? rawDirectAccess
    : rawDirectAccess === true
    ? resortTransportModes
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
        ? `${parkLabel} is listed as opening around ${openLabel} — confirm in the official Disney app before you leave. ${morningContext}`
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
        ? `${parkLabel} is listed as opening around ${openLabel} — confirm in the official Disney app before you leave. ${morningContext}`
        : morningContext,
    };
  }

  if (stayingOffProperty) {
    const hotelOrArea = resortContext?.offPropertyHotelName || "your hotel or area";
    const drivingContext = isRopeDropStyle
      ? "Parking, trams, security, and the walk in can all add time before open."
      : "Parking and getting through the entrance can still take longer than it feels like it should.";

    return {
      title: `Plan the trip from ${hotelOrArea}.`,
      detail: openLabel
        ? `${parkLabel} is listed as opening around ${openLabel} — confirm in the official Disney app before you leave. ${drivingContext}`
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
      ? `${parkLabel} is listed as opening around ${openLabel} — confirm in the official Disney app before you leave. Leave room for parking, security, and getting to the first area of the park.`
      : "Leave room for transportation, security, and getting to the first area of the park.",
  };
}


function MorningBriefingCard({ palette = PLAN_TAB_DAY_PALETTE,
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
              ...(palette.shell || {}),
      }}
    >
      <div style={{ position: "relative" }}>
        <SectionBadge palette={palette} background={colors.amberSoft} color="#92400E">
          MORNING BRIEFING
        </SectionBadge>

        <h2
          style={{
            margin: 0,
            color: palette.text,
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
              background: palette.chip || "rgba(255,255,255,0.84)",
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
                color: palette.text,
                fontSize: 15,
                lineHeight: 1.28,
              }}
            >
              {startPlan?.title || `Start with one clear move at ${planningParkLabel || "the park"}.`}
            </strong>

            {startPlan?.body && (
              <p style={{ margin: "6px 0 0", color: palette.muted, fontSize: 12.5, lineHeight: 1.38 }}>
                {startPlan.body}
              </p>
            )}
          </div>

          {transportationBriefing && (
            <div
              style={{
                padding: 12,
                borderRadius: 18,
                background: palette.chip || "rgba(255,255,255,0.72)",
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
                  color: palette.text,
                  fontSize: 14,
                  lineHeight: 1.28,
                }}
              >
                {transportationBriefing.title}
              </strong>

              <p style={{ margin: "5px 0 0", color: palette.muted, fontSize: 12.5, lineHeight: 1.38 }}>
                {transportationBriefing.detail}
              </p>
            </div>
          )}

          {weatherNote && (
            <div
              style={{
                padding: 12,
                borderRadius: 18,
                background: palette.chip || "rgba(255,255,255,0.72)",
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

              <p style={{ margin: "4px 0 0", color: palette.text, fontSize: 13, lineHeight: 1.38 }}>
                {weatherNote}
              </p>
            </div>
          )}

          <div
            style={{
              padding: 12,
              borderRadius: 18,
              background: palette.chip || "rgba(255,255,255,0.72)",
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

            <p style={{ margin: "4px 0 0", color: palette.text, fontSize: 13, lineHeight: 1.38 }}>
              {priorityPreview.text}
            </p>

            {priorityPreview.empty && (
              <p style={{ margin: "5px 0 0", color: palette.muted, fontSize: 12, lineHeight: 1.35 }}>
                Add a few before the trip so the morning plan knows what would make the day feel like a win.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


function PlanningStatusCard({ palette = PLAN_TAB_DAY_PALETTE,
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
              ...(palette.shell || {}),
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
          <SectionBadge palette={palette} background={colors.amberSoft} color="#92400E">
            TRIP STATUS
          </SectionBadge>
          <p
            style={{
              margin: 0,
              color: palette.text,
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
                color: palette.text,
                fontSize: 13,
                lineHeight: 1.38,
                fontWeight: 850,
              }}
            >
              {planTabState.headline}{" "}
              <span style={{ color: palette.muted, fontWeight: 700 }}>
                {planTabState.detail}
              </span>
            </p>
          )}

          <p style={{ margin: "6px 0 0", color: palette.muted, fontSize: 12, lineHeight: 1.35 }}>
            {hasPersonalizedAccess
              ? "Your setup is active. This plan is using your family details, priorities, and day style."
              : "Finish setup when you are ready for a plan that fits your family."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveScreen("family_profile")}
          style={{
            ...button,
            background: profileCompletion.isComplete ? "rgba(255,255,255,0.82)" : colors.purpleDeep,
            color: profileCompletion.isComplete ? palette.text : "white",
            borderColor: profileCompletion.isComplete ? colors.cardBorder : colors.purpleDeep,
          }}
        >
          {profileCompletion.isComplete ? "Review setup" : "Finish setup"}
        </button>
      </div>
    </section>
  );
}


function TodayParkPlanCard({ palette = PLAN_TAB_DAY_PALETTE,
  card,
  scheduledParkForToday,
  todayPlannedParkLabel,
  planningParkLabel,
  scheduledSecondaryParkLabel,
}) {
  if (!scheduledParkForToday?.parkId) return null;

  return (
    <section
      style={{
        ...card,
        padding: 13,
        background: "linear-gradient(145deg, #FFFFFF 0%, #F5F3FF 100%)",
        border: "1px solid rgba(124, 58, 237, 0.18)",
        boxShadow: "0 10px 24px rgba(91, 33, 182, 0.06)",
              ...(palette.shell || {}),
      }}
    >
      <SectionBadge palette={palette} background="rgba(124, 58, 237, 0.10)" color={colors.purpleDeep}>
        TODAY&apos;S PARK PLAN
      </SectionBadge>

      <strong
        style={{
          display: "block",
          marginTop: 2,
          color: palette.text,
          fontSize: 15,
          lineHeight: 1.35,
        }}
      >
        Today&apos;s plan: {todayPlannedParkLabel || planningParkLabel || "the park"}.
      </strong>

      <p style={{ margin: "6px 0 0", color: palette.muted, fontSize: 12.5, lineHeight: 1.4 }}>
        {scheduledSecondaryParkLabel
          ? `Second park: ${scheduledSecondaryParkLabel}. For now, treat this as context; Right Now still follows the live park you choose.`
          : "This is the park TOHI is using for today’s planning view."}
      </p>
    </section>
  );
}


function ParkDayScheduleStatusCard({ palette = PLAN_TAB_DAY_PALETTE, card, parkDayScheduleStatus = {}, planningParkLabel = "" }) {
  const status = parkDayScheduleStatus?.status || "";

  if (!status || status === "active_today") return null;

  const fallbackLabel = parkDayScheduleStatus?.fallbackParkLabel || planningParkLabel || "your profile fallback park";
  const hasDateRange = parkDayScheduleStatus?.firstScheduleDate || parkDayScheduleStatus?.lastScheduleDate;

  return (
    <section
      style={{
        ...card,
        padding: 13,
        background: "linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 100%)",
        border: "1px solid rgba(245, 158, 11, 0.22)",
        boxShadow: "0 10px 24px rgba(245, 158, 11, 0.06)",
              ...(palette.shell || {}),
      }}
    >
      <SectionBadge palette={palette} background={colors.amberSoft} color="#92400E">
        PARK SCHEDULE STATUS
      </SectionBadge>

      <strong
        style={{
          display: "block",
          marginTop: 2,
          color: palette.text,
          fontSize: 15,
          lineHeight: 1.35,
        }}
      >
        {parkDayScheduleStatus.label || "Using your profile park."}
      </strong>

      <p style={{ margin: "6px 0 0", color: palette.text, fontSize: 12.5, lineHeight: 1.4 }}>
        {parkDayScheduleStatus.guidance || `TOHI is using ${fallbackLabel} for the planning view.`}
      </p>

      {hasDateRange && (
        <p style={{ margin: "6px 0 0", color: palette.muted, fontSize: 12, lineHeight: 1.35 }}>
          Saved schedule: {parkDayScheduleStatus.firstScheduleDate || "—"} to {parkDayScheduleStatus.lastScheduleDate || "—"}.
        </p>
      )}
    </section>
  );
}

function ParkHopperTimingCard({ palette = PLAN_TAB_DAY_PALETTE, card, parkHopperContext = {} }) {
  if (!parkHopperContext?.hasSecondPark) return null;

  const mustDoCount = Number(parkHopperContext?.secondParkMustDos?.count || 0);
  const mustDoLabel = parkHopperContext?.secondParkMustDos?.label || "";
  const hasSecondParkMustDos = mustDoCount > 0;
  const secondaryParkLabel = parkHopperContext?.secondaryParkLabel || "the second park";

  return (
    <section
      style={{
        ...card,
        padding: 13,
        background: "linear-gradient(145deg, #FFFFFF 0%, #ECFEFF 100%)",
        border: "1px solid rgba(56, 189, 248, 0.24)",
        boxShadow: "0 10px 24px rgba(14, 165, 233, 0.06)",
              ...(palette.shell || {}),
      }}
    >
      <SectionBadge palette={palette} background="rgba(56, 189, 248, 0.14)" color="#0369A1">
        PARK HOPPER CONTEXT
      </SectionBadge>

      <strong
        style={{
          display: "block",
          marginTop: 2,
          color: palette.text,
          fontSize: 15,
          lineHeight: 1.35,
        }}
      >
        {parkHopperContext.label || "Second park timing"}
      </strong>

      <p style={{ margin: "6px 0 0", color: palette.text, fontSize: 12.5, lineHeight: 1.4 }}>
        {parkHopperContext.guidance}
      </p>

      <div
        style={{
          marginTop: 9,
          padding: 10,
          borderRadius: 16,
          background: palette.chip || "rgba(255,255,255,0.72)",
          border: `1px solid ${colors.cardBorder}`,
        }}
      >
        <strong style={{ display: "block", color: palette.text, fontSize: 12.5, lineHeight: 1.3 }}>
          {hasSecondParkMustDos
            ? `${secondaryParkLabel} has ${mustDoCount} must-do${mustDoCount === 1 ? "" : "s"}.`
            : `No ${secondaryParkLabel} must-dos saved yet.`}
        </strong>

        <p style={{ margin: "5px 0 0", color: palette.muted, fontSize: 12, lineHeight: 1.35 }}>
          {hasSecondParkMustDos
            ? `TOHI should treat ${mustDoLabel} as a reason the second park may matter, not as a reason to rush the hop.`
            : "Treat the hop as flexible until something in the second park is marked important."}
        </p>
      </div>

      <p style={{ margin: "7px 0 0", color: palette.muted, fontSize: 12, lineHeight: 1.35 }}>
        {parkHopperContext.shouldConsiderSecondPark
          ? "This is a context signal, not an automatic recommendation to leave."
          : "TOHI is intentionally not pushing the hop yet."}
      </p>
    </section>
  );
}

function LiveParkContextCard({ palette = PLAN_TAB_DAY_PALETTE, card, liveParkContext = {} }) {
  if (!liveParkContext?.showNotice) return null;

  return (
    <section
      style={{
        ...card,
        padding: 13,
        background: "linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 100%)",
        border: "1px solid rgba(245, 158, 11, 0.24)",
        boxShadow: "0 10px 24px rgba(245, 158, 11, 0.06)",
              ...(palette.shell || {}),
      }}
    >
      <SectionBadge palette={palette} background={colors.amberSoft} color="#92400E">
        LIVE PARK CONTEXT
      </SectionBadge>

      <strong
        style={{
          display: "block",
          marginTop: 2,
          color: palette.text,
          fontSize: 15,
          lineHeight: 1.35,
        }}
      >
        {liveParkContext.label || "Live park view"}
      </strong>

      <p style={{ margin: "6px 0 0", color: palette.text, fontSize: 12.5, lineHeight: 1.4 }}>
        {liveParkContext.guidance}
      </p>

      <p style={{ margin: "7px 0 0", color: palette.muted, fontSize: 12, lineHeight: 1.35 }}>
        This explains the view only. It does not automatically switch parks or change recommendation scoring.
      </p>
    </section>
  );
}

function getPlanItemById(dayGamePlan = [], id) {
  return dayGamePlan.find((item) => item?.id === id) || null;
}

function getRollingGamePlanWindow({ dayGamePlan = [], timeContext = {}, planTabState = {} } = {}) {
  const getItems = (ids = []) => ids.map((id) => getPlanItemById(dayGamePlan, id)).filter(Boolean);
  const totalMinutes = Number(timeContext?.orlandoTotalMinutes);

  if (!dayGamePlan.length) {
    return {
      label: "Day strategy",
      description: "TOHI will show the right part of the plan once the day strategy is ready.",
      items: [],
    };
  }

  if (planTabState?.mode === "morning_of" || planTabState?.isBeforeParkOpen) {
    return {
      label: "Before park open",
      description: "Start with the first move. The full day is still available when you want it.",
      items: getItems(["start_plan"]),
    };
  }

  if (planTabState?.mode === "pre_trip") {
    return {
      label: "Planning preview",
      description: "Start with the opening idea, then open the full plan when you want the deeper view.",
      items: getItems(["start_plan"]),
    };
  }

  if (!Number.isFinite(totalMinutes)) {
    return {
      label: "Current window",
      description: "Here is the closest useful part of the plan right now.",
      items: getItems(["start_plan", "morning_priority"]),
    };
  }

  if (totalMinutes < 11 * 60) {
    return {
      label: "Opening window",
      description: "Use the early part of the day for the first clear win, then stop forcing it.",
      items: getItems(["start_plan", "morning_priority"]),
    };
  }

  if (totalMinutes < 13 * 60) {
    return {
      label: "Late morning",
      description: "Shift from chasing the opening rush to keeping the day steady.",
      items: getItems(["morning_priority", "midday_reset"]),
    };
  }

  if (totalMinutes < 15 * 60) {
    return {
      label: "Midday window",
      description: "This is where pacing matters more than squeezing in one more far-away ride.",
      items: getItems(["midday_reset", "weather_strategy"]),
    };
  }

  if (totalMinutes < 17 * 60) {
    return {
      label: "Afternoon window",
      description: "Keep the day flexible and set up the evening instead of burning everyone out now.",
      items: getItems(["weather_strategy", "evening_pivot"]),
    };
  }

  return {
    label: "Evening window",
    description: "Use the last part of the day for what still matters, without turning it into a sprint.",
    items: getItems(["evening_pivot", "must_do_priorities"]),
  };
}

function DayGamePlanItemCard({ palette = PLAN_TAB_DAY_PALETTE, item }) {
  const styleForPriority =
    PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.optional;

  return (
    <div
      key={item.id}
      style={{
        padding: 13,
        borderRadius: 18,
        background: palette.chip || "rgba(255,255,255,0.84)",
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
              color: palette.text,
              fontSize: 15,
              lineHeight: 1.25,
            }}
          >
            {item.title}
          </strong>
          <p
            style={{
              margin: "6px 0 0",
              color: palette.text,
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
                color: palette.muted,
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
            background: getChipSurface(styleForPriority.bg, palette),
            border: palette?.isNight ? `1px solid ${palette.chipBorder}` : "none",
            color: getChipAccent(styleForPriority.color, palette),
            fontSize: 11,
            fontWeight: 950,
          }}
        >
          {item.priorityLabel || styleForPriority.label}
        </span>
      </div>
    </div>
  );
}

function DayGamePlanRow({ palette = PLAN_TAB_DAY_PALETTE, item }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        padding: "7px 11px",
        borderRadius: 12,
        background: palette.chip || "rgba(255,255,255,0.55)",
        border: "1px solid " + colors.cardBorder,
      }}
    >
      <span
        style={{
          color: "#0369A1",
          fontSize: 10,
          fontWeight: 950,
          letterSpacing: 0.5,
          flexShrink: 0,
        }}
      >
        {item.eyebrow}
      </span>
      <span style={{ color: palette.muted, fontSize: 12.5, lineHeight: 1.3 }}>
        {item.title}
      </span>
    </div>
  );
}

function ActivityRecapSection({ palette = PLAN_TAB_DAY_PALETTE, card, activityLog = [] }) {
  if (!activityLog.length) return null;

  const now = new Date();
  const isSameLocalDay = (value) => {
    if (!value) return false;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const todayEntries = activityLog.filter((entry) =>
    isSameLocalDay(entry.completedAt)
  );

  if (!todayEntries.length) return null;

  const count = todayEntries.length;
  const recent = [...todayEntries].reverse().slice(0, 5);
  const extra = count - recent.length;
  const countLabel =
    count === 1 ? "1 attraction so far" : count + " attractions so far";

  return (
    <section style={{ ...card, padding: 16, ...(palette.shell || {}) }}>
      <SectionBadge palette={palette} background={colors.skySoft} color="#0369A1">
        TODAY SO FAR
      </SectionBadge>

      <p
        style={{
          margin: "0 0 10px",
          color: palette.text,
          fontSize: 15,
          fontWeight: 800,
        }}
      >
        {countLabel}
      </p>

      <div style={{ display: "grid", gap: 6 }}>
        {recent.map((entry, i) => (
          <div
            key={i}
            style={{
              color: palette.muted,
              fontSize: 13,
              lineHeight: 1.3,
            }}
          >
            · {entry.rideName || entry.rideId}
          </div>
        ))}

        {extra > 0 && (
          <div
            style={{
              color: palette.muted,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            +{extra} more
          </div>
        )}
      </div>
    </section>
  );
}

function DayGamePlanSection({ palette = PLAN_TAB_DAY_PALETTE, card, dayGamePlan = [], timeContext = {}, planTabState = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const rollingWindow = getRollingGamePlanWindow({ dayGamePlan, timeContext, planTabState });
  const visibleItems = rollingWindow.items.length ? rollingWindow.items : dayGamePlan.slice(0, 1);
  const isInParkView = planTabState?.mode === "in_park";
  const activeIds = new Set(visibleItems.map((item) => item.id));
  const preview = visibleItems[0]?.title
    ? `${rollingWindow.label}: ${visibleItems.map((item) => item.title).join(" · ")}`
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
              ...(palette.shell || {}),
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
            <SectionBadge palette={palette} background={colors.skySoft} color="#0369A1">
              DAY STRATEGY
            </SectionBadge>

            <h2
              style={{
                margin: 0,
                color: palette.text,
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
                color: palette.muted,
                fontSize: 14,
                lineHeight: 1.45,
                maxWidth: 660,
              }}
            >
              {preview}
            </p>
          </div>

          {isInParkView && (
          <CollapseButton palette={palette}
            isOpen={isOpen}
            openLabel="See full plan"
            closeLabel="Hide full plan"
            onClick={() => setIsOpen((current) => !current)}
          />
          )}
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 18,
            background: palette.chip || "rgba(255,255,255,0.72)",
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
            {rollingWindow.label.toUpperCase()}
          </div>

          <p style={{ margin: "4px 0 0", color: palette.muted, fontSize: 12.5, lineHeight: 1.38 }}>
            {rollingWindow.description}
          </p>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {isInParkView ? visibleItems.map((item) => (
            <DayGamePlanItemCard palette={palette} key={`rolling-${item.id}`} item={item} />
          ))
            : dayGamePlan.map((item) =>
                activeIds.has(item.id) ? (
                  <DayGamePlanItemCard palette={palette} key={`full-${item.id}`} item={item} />
                ) : (
                  <DayGamePlanRow palette={palette} key={`row-${item.id}`} item={item} />
                )
              )}
        </div>

        {isInParkView && isOpen && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                color: palette.muted,
                fontSize: 12,
                fontWeight: 950,
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              FULL DAY PLAN
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {dayGamePlan.map((item) => (
                <DayGamePlanItemCard palette={palette} key={`full-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PlanningParkSelector({
  planningPark,
  planningParkLabel,
}) {
  const activeParkLabel = parkOptions.find((park) => park.id === activePark)?.name || activePark;
  const hasSeparateLivePark = activePark && planningPark && activePark !== planningPark;

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 18,
        background: palette.chip || "rgba(255,255,255,0.78)",
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
          color: palette.text,
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
            color: palette.text,
          }}
        >
          {parkOptions.map((park) => (
            <option key={park.id} value={park.id}>
              {park.name}
            </option>
          ))}
        </select>
      </label>

      <p style={{ margin: 0, color: palette.muted, fontSize: 12, lineHeight: 1.35 }}>
        Must-dos below are for {planningParkLabel || "this planning park"}.
        {hasSeparateLivePark
          ? ` Home is still showing ${activeParkLabel || "your current park"} for live waits.`
          : " Change this without changing your live park on Home."}
      </p>
    </div>
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


function PlanFreshnessNotice({ palette = PLAN_TAB_DAY_PALETTE, card, button, planFreshness, onRefreshTripPlanContext }) {
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
              ...(palette.shell || {}),
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
          <SectionBadge palette={palette}
            background={planFreshness.severity === "attention" ? colors.amberSoft : colors.skySoft}
            color={planFreshness.severity === "attention" ? "#92400E" : "#0369A1"}
          >
            PLAN CHECK
          </SectionBadge>

          <h3 style={{ margin: 0, color: palette.text, fontSize: 18, letterSpacing: -0.25 }}>
            {planFreshness.title || "Plan may need a quick refresh"}
          </h3>

          <p style={{ margin: "6px 0 0", color: palette.muted, fontSize: 13, lineHeight: 1.4 }}>
            {planFreshness.message || "Your timing, weather, or setup changed since this plan was refreshed."}
            {ageLabel ? ` Last refreshed ${ageLabel}.` : ""}
          </p>

          {Array.isArray(planFreshness.reasons) && planFreshness.reasons.length > 0 && (
            <div style={{ display: "grid", gap: 5, marginTop: 9 }}>
              {planFreshness.reasons.slice(0, 3).map((reason) => (
                <div
                  key={reason}
                  style={{
                    color: palette.text,
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



function PackingPreviewSection({ palette = PLAN_TAB_DAY_PALETTE, card, packingChecklist = [] }) {
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
              ...(palette.shell || {}),
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
          <SectionBadge palette={palette} background={colors.successSoft} color={colors.success}>
            WHAT TO PACK
          </SectionBadge>
          <h3 style={{ margin: 0, color: palette.text, fontSize: 22, letterSpacing: -0.35 }}>
            Quick bag check for today
          </h3>
          <p style={{ margin: "7px 0 0", color: palette.muted, fontSize: 13, lineHeight: 1.4 }}>
            {previewText}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              background: palette.chip || "rgba(255,255,255,0.78)",
              border: `1px solid ${colors.cardBorder}`,
              color: palette.text,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {packingChecklist.length} items
          </span>

          <CollapseButton palette={palette}
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
                  background: palette.chip || "rgba(255,255,255,0.82)",
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <div>
                  <strong style={{ color: palette.text, fontSize: 13 }}>{item.label}</strong>
                  <p
                    style={{
                      margin: "4px 0 0",
                      color: palette.muted,
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
                    background: getChipSurface(styleForPriority.bg, palette),
                    border: palette?.isNight ? `1px solid ${palette.chipBorder}` : "none",
                    color: getChipAccent(styleForPriority.color, palette),
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


function buttonLikeLinkStyle(palette = PLAN_TAB_DAY_PALETTE) {
  return {
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 999,
    background: "rgba(255,255,255,0.86)",
    color: palette.text,
    padding: "8px 11px",
    fontSize: 12,
    fontWeight: 950,
    cursor: "pointer",
  };
}


function PlanDetailsSection({ palette = PLAN_TAB_DAY_PALETTE, card, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      style={{
        ...card,
        padding: 15,
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92))",
        border: `1px solid ${colors.cardBorder}`,
              ...(palette.shell || {}),
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
          <SectionBadge palette={palette} background={colors.skySoft} color="#0369A1">
            PLAN DETAILS
          </SectionBadge>

          <strong
            style={{
              display: "block",
              color: palette.text,
              fontSize: 16,
              lineHeight: 1.25,
            }}
          >
            Schedule, park context, and setup notes
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              color: palette.muted,
              fontSize: 13,
              lineHeight: 1.42,
            }}
          >
            The action plan stays above. Open this when you want the supporting details behind it.
          </p>
        </div>

        <CollapseButton palette={palette}
          isOpen={isOpen}
          openLabel="Show details"
          closeLabel="Hide details"
          onClick={() => setIsOpen((current) => !current)}
        />
      </div>

      {isOpen && (
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {children}
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
  activityLog = [],
  preferredName,
  familyProfile,
  weatherMode,
  packingChecklist,
  dayGamePlan = [],
  tripPlanFreshness,
  onRefreshTripPlanContext,
  tripPlan = { preferences: {}, mustDoExperiences: [] },
  planningPark,
  planningParkLabel,
  scheduledParkForToday = null,
  todayPlannedParkLabel = "",
  scheduledSecondaryParkLabel = "",
  parkDayScheduleStatus = {},
  parkHopperContext = {},
  liveParkContext = {},
  setActiveScreen,
  night = false,
}) {
  // Presentation-only: a local palette value threaded to children as a prop.
  const palette = night ? PLAN_TAB_NIGHT_PALETTE : PLAN_TAB_DAY_PALETTE;

  const isInParkView = planTabState?.mode === "in_park";
  const showMorningBriefing = planTabState?.mode === "morning_of";

  return (
    <>
      {showMorningBriefing && (
        <MorningBriefingCard palette={palette}
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

      <DayGamePlanSection palette={palette}
        card={card}
        dayGamePlan={dayGamePlan}
        timeContext={timeContext}
        planTabState={planTabState}
      />
      {isInParkView && (
        <ActivityRecapSection palette={palette} card={card} activityLog={activityLog} />
      )}

      {!isInParkView && <PackingPreviewSection palette={palette} card={card} packingChecklist={packingChecklist} />}

      <PlanFreshnessNotice palette={palette}
        card={card}
        button={button}
        planFreshness={tripPlanFreshness}
        onRefreshTripPlanContext={onRefreshTripPlanContext}
      />

      <PlanDetailsSection palette={palette} card={card}>
        <PlanningStatusCard palette={palette}
          card={card}
          button={button}
          timeContext={timeContext}
          planTabState={planTabState}
          hasPersonalizedAccess={hasPersonalizedAccess}
          profileCompletion={profileCompletion}
          setActiveScreen={setActiveScreen}
        />

        <TodayParkPlanCard palette={palette}
          card={card}
          scheduledParkForToday={scheduledParkForToday}
          todayPlannedParkLabel={todayPlannedParkLabel}
          planningParkLabel={planningParkLabel}
          scheduledSecondaryParkLabel={scheduledSecondaryParkLabel}
        />

        <ParkDayScheduleStatusCard palette={palette}
          card={card}
          parkDayScheduleStatus={parkDayScheduleStatus}
          planningParkLabel={planningParkLabel}
        />

        <LiveParkContextCard palette={palette} card={card} liveParkContext={liveParkContext} />

        <ParkHopperTimingCard palette={palette} card={card} parkHopperContext={parkHopperContext} />
      </PlanDetailsSection>

    </>
  );
}

export default PlanTab;
