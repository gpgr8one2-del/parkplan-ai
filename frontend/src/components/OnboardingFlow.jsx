import React from "react"; 
import { getResortProfile } from "../resortProfiles";
import { colors } from "../theme";

const BETA_DISABLED_PARK_IDS = new Set([
  "universal_sf",
  "islands",
  "epic_universe",
]);

function isTripParkSelectable(parkId) {
  return !BETA_DISABLED_PARK_IDS.has(parkId);
}

function getTripParkStatusLabel(parkId) {
  return BETA_DISABLED_PARK_IDS.has(parkId) ? "Coming soon" : "";
}

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

function getExperienceKey(experience = {}) {
  return String(experience.id || experience.name || experience.displayName || "");
}

/* -------------------------------------------------------------------------- */
/* Setup summary labels — presentation only                                   */
/* -------------------------------------------------------------------------- */

// The summary used to print the stored ids straight through, so a guest who
// chose "A mix of gentle and exciting" read back "mixed". These maps mirror the
// EXACT <option> text of the controls further down this same screen, so the
// summary reads back the answer as it was offered. A focused test asserts each
// entry still matches its option, which is what keeps the two from drifting.
//
// Stored values, defaults, normalization and completion rules are untouched.
//
// Ride comfort and Walking are word-for-word identical to the Profile tab's
// labels. Heat and Storms differ on purpose: Profile uses shortened variants
// that suit its tighter rows, while this screen echoes the full option text a
// guest just read. Both are truthful; each matches its own surface.
const SUMMARY_THRILL_LABELS = {
  low: "Mostly gentle rides",
  mixed: "A mix of gentle and exciting",
  high: "Big thrills are a priority",
};

const SUMMARY_WALKING_LABELS = {
  leisurely: "Keep choices nearby",
  balanced: "A balanced amount of walking",
  energetic: "Comfortable covering more ground",
};

const SUMMARY_HEAT_LABELS = {
  high: "We need breaks before things fall apart",
  medium: "Watch it and suggest breaks when smart",
  low: "We usually handle heat pretty well",
};

const SUMMARY_STORM_LABELS = {
  indoor_only: "Indoor-only if storms are nearby",
  brief_outdoor_ok: "Brief outdoor walks are okay",
  we_handle_it: "We handle weather pretty well",
};

const SUMMARY_NOT_SET = "Not set";

// Anything missing, blank or unrecognised resolves to "Not set" rather than
// leaking an id. hasOwnProperty keeps inherited keys such as "constructor" from
// resolving to a function.
function getSummaryLabel(labelMap, value) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!key) return SUMMARY_NOT_SET;
  return Object.prototype.hasOwnProperty.call(labelMap, key)
    ? labelMap[key]
    : SUMMARY_NOT_SET;
}

export function OnboardingFlow({
  familyProfileSummary,
  activePark,
  familyProfileStep,
  familyProfile,
  isProfileIncomplete,
  setActiveScreen,
  setFamilyProfileStep,
  setDevPreviewFullApp,
  profileCompletion,
  updateFamilyProfile,
  handleAdultCountChange,
  handleChildCountChange,
  handleChildChange,
  handlePriorityToggle,
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
  tripPlan = { preferences: {}, mustDoExperiences: [] },
  mustDoExperienceOptions = [],
  onUpdateTripPreferences,
  onToggleMustDoExperience,
}) {
  const summary = familyProfileSummary;
  const tripContext = familyProfile.tripContext || {};
  const resortContext = familyProfile.resortContext || {};
  const mobilityAccessibility = familyProfile.mobilityAccessibility || {};

  const selectedParkIds = Array.isArray(tripContext.parkSelectionIds)
    ? tripContext.parkSelectionIds
    : Array.isArray(tripContext.selectedParks)
    ? tripContext.selectedParks
    : [];

  const firstParkId = tripContext.firstParkId || tripContext.firstPark || selectedParkIds[0] || "";
  const mostImportantParkId =
    tripContext.mostImportantParkId || tripContext.priorityPark || selectedParkIds[0] || "";

  const shortestHeightText =
    summary.shortestHeightInches != null
      ? `${summary.shortestHeightInches} in shortest child rider`
      : summary.childCount > 0
      ? "child height not set yet"
      : "no child height needed";

  const selectedParksText = selectedParkIds.length
    ? selectedParkIds.map((parkId) => getParkLabel(parkId)).join(", ")
    : "not set";

  const selectableParkOptions = DISNEY_PARK_OPTIONS.map((option) => ({
    ...option,
    isDisabled: !isTripParkSelectable(option.value),
    statusLabel: getTripParkStatusLabel(option.value),
  }));

  const selectedEnabledParkOptions = selectableParkOptions.filter(
    (park) => selectedParkIds.includes(park.value) && !park.isDisabled
  );

  const tripPreferences = tripPlan?.preferences || {};
  const selectedMustDoExperiences = Array.isArray(tripPlan?.mustDoExperiences)
    ? tripPlan.mustDoExperiences
    : [];
  const selectedMustDoKeys = new Set(selectedMustDoExperiences.map((experience) => getExperienceKey(experience)));
  const profileMustDoOptions = Array.isArray(mustDoExperienceOptions) ? mustDoExperienceOptions : [];
  const selectedMustDoCount = selectedMustDoExperiences.length;
  const profileMustDoOptionGroups = profileMustDoOptions.reduce((groups, experience) => {
    const parkId = experience?.parkId || "unknown";
    const existingGroup = groups.find((group) => group.parkId === parkId);

    if (existingGroup) {
      existingGroup.options.push(experience);
      return groups;
    }

    groups.push({
      parkId,
      parkLabel: experience?.parkLabel || getParkLabel(parkId),
      options: [experience],
    });

    return groups;
  }, []);


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
      ? "Start with only the essentials: who is going, which parks matter, and how many park days you have."
      : familyProfileStep === 2
      ? "A few quick choices so TOHI knows what your family will actually enjoy and what it should keep in mind."
      : "Resort context helps TOHI avoid bad transportation and break advice.";

  function updateTripContext(patch) {
    updateFamilyProfile({
      tripContext: {
        ...tripContext,
        ...patch,
      },
    });
  }

  function updateMobilityAccessibility(patch) {
    updateFamilyProfile({
      mobilityAccessibility: {
        ...mobilityAccessibility,
        ...patch,
      },
    });
  }

  function handleParkSelectionToggle(parkValue) {
    if (!isTripParkSelectable(parkValue)) {
      trackAppEvent("profile_park_selection_blocked", {
        source: "profile_setup",
        metadata: {
          blockedPark: parkValue,
          status: "coming_soon",
        },
      });
      return;
    }

    const parks = new Set(selectedParkIds);

    if (parks.has(parkValue)) {
      parks.delete(parkValue);
    } else {
      parks.add(parkValue);
    }

    const nextParkSelectionIds = Array.from(parks);
    const fallbackPark = nextParkSelectionIds[0] || "";

    const nextFirstParkId = nextParkSelectionIds.includes(firstParkId)
      ? firstParkId
      : fallbackPark;

    const nextMostImportantParkId = nextParkSelectionIds.includes(mostImportantParkId)
      ? mostImportantParkId
      : fallbackPark;

    updateTripContext({
      parkSelectionIds: nextParkSelectionIds,
      firstParkId: nextFirstParkId,
      mostImportantParkId: nextMostImportantParkId,

      // Compatibility aliases. Keep for one cycle until every reader is migrated.
      selectedParks: nextParkSelectionIds,
      firstPark: nextFirstParkId,
      priorityPark: nextMostImportantParkId,
    });
  }

  function setFirstPark(nextParkId) {
    updateTripContext({
      firstParkId: nextParkId,
      firstPark: nextParkId,
    });
  }

  function setMostImportantPark(nextParkId) {
    updateTripContext({
      mostImportantParkId: nextParkId,
      priorityPark: nextParkId,
    });
  }

  function getScheduleParkSelectionIds(schedule = []) {
    const ids = [];

    schedule.forEach((day) => {
      if (day?.primaryParkId && !ids.includes(day.primaryParkId)) {
        ids.push(day.primaryParkId);
      }

      if (day?.secondaryParkId && !ids.includes(day.secondaryParkId)) {
        ids.push(day.secondaryParkId);
      }
    });

    return ids;
  }

  function updateParkDaySchedule(updatedSchedule = []) {
    const nextParkSelectionIds = getScheduleParkSelectionIds(updatedSchedule);
    const nextFirstParkId = updatedSchedule.find((day) => day?.primaryParkId)?.primaryParkId || nextParkSelectionIds[0] || "";
    const nextMostImportantParkId = nextParkSelectionIds.includes(mostImportantParkId)
      ? mostImportantParkId
      : nextFirstParkId;

    updateTripContext({
      parkDaySchedule: updatedSchedule,
      parkSelectionIds: nextParkSelectionIds,
      selectedParks: nextParkSelectionIds,
      firstParkId: nextFirstParkId,
      firstPark: nextFirstParkId,
      mostImportantParkId: nextMostImportantParkId,
      priorityPark: nextMostImportantParkId,
    });
  }

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
              { step: 2, label: "Comfort" },
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
              Parks: {selectedParksText}
            </p>
            <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12 }}>
              First park: {getParkLabel(firstParkId)} · Priority park:{" "}
              {getParkLabel(mostImportantParkId)} · {summary.tripAccessStatus.message}
            </p>
            {/* Stacked rather than inline: the full option text is far too long
                to read as one run-on sentence at 375px. A definition list also
                ties each value to its own label. "Pace" is now "Walking",
                matching what the control actually asks. */}
            <dl
              style={{
                margin: "10px 0 0",
                display: "grid",
                gap: 8,
              }}
            >
              {[
                ["Ride comfort", getSummaryLabel(SUMMARY_THRILL_LABELS, summary.thrillTolerance)],
                ["Walking", getSummaryLabel(SUMMARY_WALKING_LABELS, summary.pace)],
                ["Heat", getSummaryLabel(SUMMARY_HEAT_LABELS, summary.heatSensitivity)],
                ["Storms", getSummaryLabel(SUMMARY_STORM_LABELS, summary.stormTolerance)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "grid", gap: 2 }}>
                  <dt
                    style={{
                      color: colors.muted,
                      fontSize: 10.5,
                      fontWeight: 900,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      color: value === SUMMARY_NOT_SET ? colors.muted : colors.text,
                      fontSize: 12.5,
                      fontWeight: value === SUMMARY_NOT_SET ? 700 : 800,
                      fontStyle: value === SUMMARY_NOT_SET ? "italic" : "normal",
                      lineHeight: 1.35,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {familyProfileStep === 1 && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={sectionPanel}>
                <strong>Who’s in your group?</strong>
                {/* Narrowed: "avoid rides they cannot ride" claimed a complete
                    eligibility determination. TOHI compares a saved height against
                    a posted ride-height requirement, and ages inform family fit. */}
                <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                  Adults do not need height entry. Children’s heights help TOHI check
                  posted ride-height requirements, while ages help it judge what may
                  suit the family.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <label htmlFor="adult-count" style={fieldLabelStyle}>
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

                  <label htmlFor="child-count" style={fieldLabelStyle}>
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

              <div style={sectionPanel}>
                <strong>What should TOHI call you?</strong>
                <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                  Optional. Use a first name or nickname only if it would make the app feel more personal.
                </p>

                <label htmlFor="preferred-name" style={fieldLabelStyle}>
                  First name or nickname
                  <input
                    id="preferred-name"
                    type="text"
                    value={familyProfile.preferredName || ""}
                    onChange={(e) =>
                      updateFamilyProfile({
                        preferredName: e.target.value,
                      })
                    }
                    placeholder="ex: Gabe"
                    maxLength={40}
                    style={inputStyle}
                  />
                </label>
              </div>

              <div style={sectionPanel}>
                <strong>Trip dates and parks</strong>
                <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                  Dates help TOHI understand whether this is pre-trip planning or an
                  active park day. Park days tell us how much pressure the plan has.
                </p>

                <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <label style={fieldLabelStyle}>
                      Trip start date
                      <input
                        type="date"
                        value={tripContext.tripStartDate || ""}
                        onChange={(e) =>
                          updateTripContext({
                            tripStartDate: e.target.value,
                            tripEndDate:
                              tripContext.tripEndDate && tripContext.tripEndDate < e.target.value
                                ? e.target.value
                                : tripContext.tripEndDate,
                          })
                        }
                        style={inputStyle}
                      />
                    </label>

                    <label style={fieldLabelStyle}>
                      Trip end date
                      <input
                        type="date"
                        value={tripContext.tripEndDate || ""}
                        min={tripContext.tripStartDate || undefined}
                        onChange={(e) =>
                          updateTripContext({
                            tripEndDate: e.target.value,
                          })
                        }
                        style={inputStyle}
                      />
                    </label>
                  </div>

                  <label style={fieldLabelStyle}>
                    Park days
                    <select
                      value={tripContext.parkDays || 1}
                      onChange={(e) =>
                        updateTripContext({
                          parkDays: e.target.value,
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

                  <label style={fieldLabelStyle}>
                    Park Hopper?
                    <select
                      value={tripContext.parkHopper || "unknown"}
                      onChange={(e) =>
                        updateTripContext({
                          parkHopper: e.target.value,
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

                {summary.tripContext.parkDaySchedule.length > 0 && (
                  <div
                    style={{
                      ...sectionPanel,
                      marginTop: 12,
                      background: "rgba(255,255,255,0.68)",
                    }}
                  >
                    <strong>What park are you doing each day?</strong>
                    <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                      This helps TOHI think about the right park when building your plan. You can adjust this later.
                    </p>

                    <div style={{ display: "grid", gap: 8 }}>
                      {summary.tripContext.parkDaySchedule.map((dayEntry, dayIndex) => {
                        const dayDateLabel = dayEntry.date
                          ? new Date(`${dayEntry.date}T12:00:00`).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })
                          : "";

                        const dayLabel = dayDateLabel
                          ? `Day ${dayEntry.dayNumber} · ${dayDateLabel}`
                          : `Day ${dayEntry.dayNumber}`;

                        return (
                          <div
                            key={dayEntry.dayNumber}
                            style={{
                              display: "grid",
                              gap: 8,
                              padding: 11,
                              borderRadius: 16,
                              border: `1px solid ${colors.cardBorder}`,
                              background: "rgba(255,255,255,0.72)",
                            }}
                          >
                            <strong style={{ color: colors.text, fontSize: 13 }}>{dayLabel}</strong>

                            <label style={fieldLabelStyle}>
                              Primary park
                              <select
                                value={dayEntry.primaryParkId || ""}
                                onChange={(e) => {
                                  const nextPrimaryParkId = e.target.value;
                                  const updatedSchedule = summary.tripContext.parkDaySchedule.map(
                                    (day, index) =>
                                      index === dayIndex
                                        ? {
                                            ...day,
                                            primaryParkId: nextPrimaryParkId,
                                            secondaryParkId:
                                              day.secondaryParkId === nextPrimaryParkId
                                                ? ""
                                                : day.secondaryParkId,
                                          }
                                        : day
                                  );

                                  updateParkDaySchedule(updatedSchedule);
                                }}
                                style={inputStyle}
                              >
                                <option value="">Not sure yet</option>
                                {selectableParkOptions
                                  .filter((park) => !park.isDisabled)
                                  .map((park) => (
                                    <option key={park.value} value={park.value}>
                                      {park.label}
                                    </option>
                                  ))}
                              </select>
                            </label>

                            <label style={fieldLabelStyle}>
                              Second park / park hopper optional
                              <select
                                value={dayEntry.secondaryParkId || ""}
                                onChange={(e) => {
                                  const updatedSchedule = summary.tripContext.parkDaySchedule.map(
                                    (day, index) =>
                                      index === dayIndex
                                        ? { ...day, secondaryParkId: e.target.value }
                                        : day
                                  );

                                  updateParkDaySchedule(updatedSchedule);
                                }}
                                style={inputStyle}
                              >
                                <option value="">No second park</option>
                                {selectableParkOptions
                                  .filter(
                                    (park) =>
                                      !park.isDisabled && park.value !== dayEntry.primaryParkId
                                  )
                                  .map((park) => (
                                    <option key={park.value} value={park.value}>
                                      {park.label}
                                    </option>
                                  ))}
                              </select>
                            </label>

                            <p style={{ margin: 0, color: colors.muted, fontSize: 12, lineHeight: 1.35 }}>
                              Use this only if you expect to hop later. TOHI will show it as context for now.
                            </p>
                          </div>
                        );
                      })}
                    </div>
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
                Next: Family Comfort
              </button>
            </div>
          )}

          {familyProfileStep === 2 && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={sectionPanel}>
                <strong>What matters most today?</strong>
                {/* Input honesty: the previous copy claimed every answer here
                    directly affected safety and what TOHI avoids recommending.
                    Some of these inputs shape packing guidance only, so the
                    section now describes the real range of effect. */}
                <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                  These details help shape recommendations, pacing, and packing guidance.
                </p>

                <div style={{ display: "grid", gap: 10 }}>
                  <label style={fieldLabelStyle}>
                    Ride comfort
                    <select
                      value={familyProfile.thrillTolerance || ""}
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

                  {/* Input honesty: presentation only. "Family pace" described a
                      vague mood; what this control actually drives is how strongly
                      the engine favors nearby choices, via the walkingTolerance
                      alias below. The stored values, the handler and the alias
                      mapping are deliberately untouched. The helper sits outside
                      the label so it stays visible without being absorbed into the
                      select's accessible name. */}
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={fieldLabelStyle}>
                      How much walking works for your group?
                      <select
                        value={familyProfile.pace || "balanced"}
                        onChange={(e) =>
                          updateFamilyProfile({
                            pace: e.target.value,

                            // Compatibility alias. rideRecommendations.js still reads this.
                            walkingTolerance:
                              e.target.value === "leisurely"
                                ? "low"
                                : e.target.value === "energetic"
                                ? "high"
                                : "medium",
                          })
                        }
                        style={inputStyle}
                      >
                        <option value="leisurely">Keep choices nearby</option>
                        <option value="balanced">A balanced amount of walking</option>
                        <option value="energetic">Comfortable covering more ground</option>
                      </select>
                    </label>

                    <p style={{ margin: 0, color: colors.muted, fontSize: 12, lineHeight: 1.4 }}>
                      This helps TOHI decide how strongly to favor nearby choices.
                    </p>
                  </div>

                  <label style={fieldLabelStyle}>
                    Heat and fatigue
                    <select
                      value={familyProfile.heatSensitivity || ""}
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

                  <label style={fieldLabelStyle}>
                    Water rides
                    <select
                      value={familyProfile.waterRidePreference || "okay_with_warning"}
                      onChange={(e) =>
                        updateFamilyProfile({
                          waterRidePreference: e.target.value,
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="avoid">Avoid getting wet</option>
                      <option value="okay_with_warning">Okay if TOHI warns us first</option>
                      <option value="love">We love water rides</option>
                    </select>
                  </label>

                  <label style={fieldLabelStyle}>
                    Storm comfort
                    <select
                      value={familyProfile.stormTolerance || "brief_outdoor_ok"}
                      onChange={(e) =>
                        updateFamilyProfile({
                          stormTolerance: e.target.value,
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="indoor_only">Indoor-only if storms are nearby</option>
                      <option value="brief_outdoor_ok">Brief outdoor walks are okay</option>
                      <option value="we_handle_it">We handle weather pretty well</option>
                    </select>
                  </label>
                </div>
              </div>

              <div style={sectionPanel}>
                {/* Input honesty: these two booleans reach packing guidance only.
                    They do not currently change attraction eligibility, routing,
                    transfer requirements, or recommendation distance, so the copy
                    no longer implies they do, and it points at the walking control
                    that genuinely drives distance. The stored fields and handlers
                    are unchanged; no device schema is introduced here. */}
                <strong>Stroller &amp; mobility equipment</strong>
                <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                  These details support packing and park logistics. Walking distance is
                  guided by the choice above.
                </p>

                <div style={{ display: "grid", gap: 8 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      fontSize: 13,
                      fontWeight: 850,
                      color: colors.text,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(mobilityAccessibility.usesStroller)}
                      onChange={(e) =>
                        updateMobilityAccessibility({
                          usesStroller: e.target.checked,
                        })
                      }
                    />
                    We’ll use a stroller
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      fontSize: 13,
                      fontWeight: 850,
                      color: colors.text,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(mobilityAccessibility.usesWheelchair)}
                      onChange={(e) =>
                        updateMobilityAccessibility({
                          usesWheelchair: e.target.checked,
                        })
                      }
                    />
                    Someone will use a wheelchair, ECV/scooter, or similar mobility support
                  </label>

                  {/* Input honesty: the free-text "Mobility notes" field is removed
                      from collection. Nothing read it, and its placeholder invited
                      guests to describe real constraints TOHI then ignored. Only
                      collection and transmission are removed here — mobilityNotes
                      stays in DEFAULT_FAMILY_PROFILE and in normalizeFamilyProfile,
                      so values already saved on a device keep surviving
                      normalization untouched. */}
                </div>
              </div>

              <div style={sectionPanel}>
                <strong>What matters most this trip?</strong>
                <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                  Pick the moments TOHI should keep in mind. You can choose more than one.
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
                We’ll ask about rope drop, meals, paid queue strategy, shows, and
                deeper planning later in Plan Ahead. That keeps setup fast while
                still giving TOHI enough context to avoid bad recommendations.
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setFamilyProfileStep(1)}
                  style={{ ...button, color: colors.muted }}
                >
                  Back
                </button>


                <div style={sectionPanel}>
                  <strong>What would make this trip feel like a win?</strong>
                  <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13, lineHeight: 1.45 }}>
                    Pick the rides, shows, or experiences TOHI should keep in view. This is not a checklist — it helps TOHI make room for what matters while still adapting to weather, waits, location, and family energy.
                  </p>

                  {selectedMustDoCount > 0 && (
                    <p style={{ margin: "0 0 10px", color: colors.purpleDeep, fontSize: 12.5, fontWeight: 850 }}>
                      {selectedMustDoCount} saved as trip priorities.
                    </p>
                  )}

                  {profileMustDoOptions.length > 0 ? (
                    <div style={{ display: "grid", gap: 12 }}>
                      {profileMustDoOptionGroups.map((group) => (
                        <div key={group.parkId} style={{ display: "grid", gap: 8 }}>
                          <div
                            style={{
                              color: colors.purpleDeep,
                              fontSize: 11,
                              fontWeight: 950,
                              letterSpacing: 0.7,
                              textTransform: "uppercase",
                            }}
                          >
                            {group.parkLabel}
                          </div>

                          {group.options.map((experience) => {
                            const isSelected = selectedMustDoKeys.has(getExperienceKey(experience));
                            const label = experience.displayName || experience.name || "Experience";

                            return (
                              <button
                                key={getExperienceKey(experience)}
                                type="button"
                                onClick={() => onToggleMustDoExperience?.(experience)}
                                style={{
                                  ...button,
                                  justifyContent: "space-between",
                                  textAlign: "left",
                                  gap: 10,
                                  background: isSelected
                                    ? "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)"
                                    : "rgba(255,255,255,0.86)",
                                  color: isSelected ? "white" : colors.text,
                                  borderColor: isSelected ? colors.purpleDeep : colors.cardBorder,
                                }}
                              >
                                <span>{isSelected ? `✓ ${label}` : label}</span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 850,
                                    opacity: isSelected ? 0.9 : 0.62,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {isSelected ? "Selected" : "Add"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: colors.muted, fontSize: 12.5 }}>
                      Choose your park days first, then TOHI can show must-do options for each selected park here.
                    </p>
                  )}
                </div>

                <div style={sectionPanel}>
                  <strong>How should TOHI shape the day?</strong>
                  <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13, lineHeight: 1.45 }}>
                    These are gentle defaults, not hard rules. TOHI will still adjust around weather, waits, location, and how the family is doing.
                  </p>

                  <div style={{ display: "grid", gap: 10 }}>
                    <label style={fieldLabelStyle}>
                      How do you like to start?
                      <select
                        value={tripPreferences.startStrategy || ""}
                        onChange={(e) => onUpdateTripPreferences?.({ startStrategy: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">Let TOHI keep it flexible</option>
                        {START_STRATEGY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={fieldLabelStyle}>
                      Break rhythm
                      <select
                        value={tripPreferences.breakPreference || ""}
                        onChange={(e) => onUpdateTripPreferences?.({ breakPreference: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">Let TOHI read the day</option>
                        {BREAK_PREFERENCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={fieldLabelStyle}>
                      Food rhythm
                      <select
                        value={tripPreferences.diningStyle || ""}
                        onChange={(e) => onUpdateTripPreferences?.({ diningStyle: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">Keep meals flexible</option>
                        {DINING_STYLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={fieldLabelStyle}>
                      Shows and parades
                      <select
                        value={tripPreferences.showsImportance || ""}
                        onChange={(e) => onUpdateTripPreferences?.({ showsImportance: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">Fit them in if they make sense</option>
                        {SHOWS_IMPORTANCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={fieldLabelStyle}>
                      Nighttime plan
                      <select
                        value={tripPreferences.nighttimeImportance || ""}
                        onChange={(e) => onUpdateTripPreferences?.({ nighttimeImportance: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">Decide based on energy</option>
                        {NIGHTTIME_IMPORTANCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={fieldLabelStyle}>
                      Paid queue comfort
                      <select
                        value={tripPreferences.paidQueueStrategy || ""}
                        onChange={(e) => onUpdateTripPreferences?.({ paidQueueStrategy: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">Only if it helps the day</option>
                        {PAID_QUEUE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

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
              <div style={sectionPanel}>
                <strong>Trip context</strong>
                <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                  Resort context helps TOHI give realistic break, rope-drop, and
                  transportation advice.
                </p>

                <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                  <label style={fieldLabelStyle}>
                    Staying on Disney property?
                    <select
                      value={resortContext.stayingOnProperty || "unknown"}
                      onChange={(e) => {
                        const stayingOnProperty = e.target.value;

                        updateFamilyProfile({
                          resortContext: {
                            ...resortContext,
                            stayingOnProperty,
                            resortId:
                              stayingOnProperty === "yes"
                                ? resortContext.resortId
                                : "",
                            resortName:
                              stayingOnProperty === "yes"
                                ? resortContext.resortName
                                : "",
                            offPropertyHotelName:
                              stayingOnProperty === "no"
                                ? resortContext.offPropertyHotelName
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

                  {resortContext.stayingOnProperty === "yes" && (
                    <>
                      <label style={fieldLabelStyle}>
                        Disney resort
                        <select
                          value={resortContext.resortId || ""}
                          onChange={(e) => {
                            const resortId = e.target.value;
                            const selectedResort = getResortProfile(resortId);

                            updateFamilyProfile({
                              resortContext: {
                                ...resortContext,
                                stayingOnProperty: "yes",
                                resortId,
                                resortName: selectedResort?.name || "",
                              },
                            });
                          }}
                          style={inputStyle}
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

                  {resortContext.stayingOnProperty === "no" && (
                    <label style={fieldLabelStyle}>
                      Off-property hotel name
                      <input
                        value={resortContext.offPropertyHotelName || ""}
                        onChange={(e) =>
                          updateFamilyProfile({
                            resortContext: {
                              ...resortContext,
                              offPropertyHotelName: e.target.value,
                            },
                          })
                        }
                        placeholder="ex: hotel name or area"
                        style={inputStyle}
                      />
                    </label>
                  )}

                  <label style={fieldLabelStyle}>
                    Main transportation today
                    <select
                      value={resortContext.transportationMode || "unknown"}
                      onChange={(e) =>
                        updateFamilyProfile({
                          resortContext: {
                            ...resortContext,
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
