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
      ? "A few quick choices so TOHI knows what your family will actually enjoy and what it should protect."
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
            <p style={{ margin: "6px 0 0", color: colors.muted, fontSize: 12 }}>
              Ride comfort: {summary.thrillTolerance || "not set"} · Pace:{" "}
              {summary.pace || "not set"} · Heat: {summary.heatSensitivity || "not set"} ·
              Storms: {summary.stormTolerance || "not set"}
            </p>
          </div>

          {familyProfileStep === 1 && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={sectionPanel}>
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

                <p style={{ margin: "12px 0 8px", color: colors.muted, fontSize: 13, fontWeight: 900 }}>
                  Which parks are part of this trip?
                </p>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selectableParkOptions.map((option) => {
                    const selected = selectedParkIds.includes(option.value);
                    const disabled = option.isDisabled;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={disabled}
                        aria-disabled={disabled}
                        onClick={() => handleParkSelectionToggle(option.value)}
                        style={{
                          ...actionButton,
                          background: selected ? "#0f172a" : disabled ? "#f8fafc" : "white",
                          color: selected ? "white" : disabled ? "#94a3b8" : "#0f172a",
                          borderColor: selected ? "#0f172a" : disabled ? "#e2e8f0" : "#cbd5e1",
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.72 : 1,
                        }}
                      >
                        {option.label}
                        {disabled ? " · Coming soon" : ""}
                      </button>
                    );
                  })}
                </div>

                {selectedParkIds.length > 0 && (
                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    <label style={fieldLabelStyle}>
                      Which park do you want to do first?
                      <select
                        value={firstParkId}
                        onChange={(e) => setFirstPark(e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">Not sure yet</option>
                        {selectedEnabledParkOptions.map((park) => (
                          <option key={park.value} value={park.value}>
                            {park.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={fieldLabelStyle}>
                      Main priority park
                      <select
                        value={mostImportantParkId}
                        onChange={(e) => setMostImportantPark(e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">Not sure yet</option>
                        {selectedEnabledParkOptions.map((park) => (
                          <option key={park.value} value={park.value}>
                            {park.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                {selectedParkIds.length > 0 && summary.tripContext.parkDaySchedule.length > 0 && (
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

                                  updateTripContext({ parkDaySchedule: updatedSchedule });
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

                                  updateTripContext({ parkDaySchedule: updatedSchedule });
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
                <strong>What should TOHI protect?</strong>
                <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                  Keep this quick. These choices directly affect safety, trust, pacing,
                  and what TOHI should avoid recommending.
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

                  <label style={fieldLabelStyle}>
                    Family pace
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
                      <option value="leisurely">Leisurely — keep walking low when possible</option>
                      <option value="balanced">Balanced — some walking is okay</option>
                      <option value="energetic">Energetic — we are fine covering ground</option>
                    </select>
                  </label>

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
                <strong>Mobility and accessibility</strong>
                <p style={{ margin: "5px 0 10px", color: colors.muted, fontSize: 13 }}>
                  This keeps TOHI from recommending exhausting moves that look good on
                  paper but are rough in the real park.
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
                    We use a stroller
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
                    Someone uses a wheelchair, scooter, or mobility support
                  </label>

                  <label style={fieldLabelStyle}>
                    Mobility notes optional
                    <textarea
                      value={mobilityAccessibility.mobilityNotes || ""}
                      onChange={(e) =>
                        updateMobilityAccessibility({
                          mobilityNotes: e.target.value,
                        })
                      }
                      placeholder="ex: avoid long backtracking, stroller naps around 2 PM, needs shaded breaks"
                      rows={3}
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                        fontFamily:
                          "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
                      }}
                    />
                  </label>
                </div>
              </div>

              <div style={sectionPanel}>
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
