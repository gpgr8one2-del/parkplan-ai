/**
 * Onboarding setup-summary plain language.
 *
 * The defect this pins: the setup summary printed stored ids straight through, so
 * a guest who picked "A mix of gentle and exciting" read back "mixed", and one who
 * picked "Indoor-only if storms are nearby" read back "indoor_only".
 *
 * These tests render the REAL OnboardingFlow through react-dom/server with props
 * built from the REAL familyProfile helpers, and assert on real markup. Nothing
 * about the component is re-implemented here.
 *
 * Scope note: presentation only. The tests also pin that the underlying controls
 * still store the same ids, because relabelling a summary must not quietly change
 * what gets saved.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OnboardingFlow } from "../components/OnboardingFlow";
import {
  buildFamilyProfileSummary,
  getFamilyProfileCompletion,
  getParkLabel,
  getDisneyAgeClass,
  getDisneyAgeLabel,
  DISNEY_PARK_OPTIONS,
  FAMILY_PRIORITY_OPTIONS,
} from "../utils/familyProfile";
import { getResortOptions } from "../resortProfiles";

const BASE_PROFILE = {
  adultCount: 2,
  childCount: 1,
  children: [{ id: "child_1", label: "Child 1", age: 6, heightInches: 42 }],
  priorities: ["low_stress"],
  tripContext: {
    tripStartDate: "2026-05-08",
    tripEndDate: "2026-05-10",
    parkDays: 2,
    parkSelectionIds: ["magic_kingdom"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "magic_kingdom",
  },
  resortContext: { stayingOnProperty: "unknown", resortId: "", transportationMode: "unknown" },
};

const noop = () => {};
const styleStub = {};

function renderOnboarding(profileOverrides = {}, step = 1) {
  const raw = { ...BASE_PROFILE, ...profileOverrides };
  const summary = buildFamilyProfileSummary(raw);
  const completion = getFamilyProfileCompletion(summary);

  return renderToStaticMarkup(
    React.createElement(OnboardingFlow, {
      familyProfileSummary: summary,
      familyProfileStep: step,
      familyProfile: summary,
      isProfileIncomplete: !completion.isComplete,
      setActiveScreen: noop,
      setFamilyProfileStep: noop,
      setDevPreviewFullApp: noop,
      devPreviewFullApp: false,
      profileCompletion: completion,
      updateFamilyProfile: noop,
      handleAdultCountChange: noop,
      handleChildCountChange: noop,
      handleChildChange: noop,
      handlePriorityToggle: noop,
      handleSelectedParkToggle: noop,
      handleFamilyProfileDone: noop,
      trackAppEvent: noop,
      getDisneyAgeClass,
      getDisneyAgeLabel,
      getParkLabel,
      page: styleStub,
      shell: styleStub,
      card: styleStub,
      button: styleStub,
      actionButton: styleStub,
      premiumHeroCard: styleStub,
      premiumBadge: styleStub,
      DISNEY_PARK_OPTIONS,
      FAMILY_PRIORITY_OPTIONS,
      DEV_ALLOW_FULL_APP_WITHOUT_PROFILE: false,
      resortOptions: getResortOptions(),
      tripPlan: { preferences: {}, mustDoExperiences: [] },
      mustDoExperienceOptions: [],
      onUpdateTripPreferences: noop,
      onToggleMustDoExperience: noop,
    })
  );
}

function decode(html) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&amp;/g, "&");
}

// The summary block only — so an assertion about the summary is never satisfied
// by matching the <option> text of a control further down the same screen.
function summaryMarkup(profileOverrides = {}) {
  const markup = decode(renderOnboarding(profileOverrides));
  const start = markup.indexOf("<dl");
  const end = markup.indexOf("</dl>");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return markup.slice(start, end);
}

const CANONICAL = {
  thrillTolerance: [
    ["low", "Mostly gentle rides"],
    ["mixed", "A mix of gentle and exciting"],
    ["high", "Big thrills are a priority"],
  ],
  pace: [
    ["leisurely", "Keep choices nearby"],
    ["balanced", "A balanced amount of walking"],
    ["energetic", "Comfortable covering more ground"],
  ],
  heatSensitivity: [
    ["high", "We need breaks before things fall apart"],
    ["medium", "Watch it and suggest breaks when smart"],
    ["low", "We usually handle heat pretty well"],
  ],
  stormTolerance: [
    ["indoor_only", "Indoor-only if storms are nearby"],
    ["brief_outdoor_ok", "Brief outdoor walks are okay"],
    ["we_handle_it", "We handle weather pretty well"],
  ],
};

describe("onboarding setup summary", () => {
  test("every canonical value renders its plain-language label", () => {
    Object.entries(CANONICAL).forEach(([field, cases]) => {
      cases.forEach(([storedValue, expectedLabel]) => {
        const summary = summaryMarkup({ [field]: storedValue });
        expect(summary).toContain(expectedLabel);
      });
    });
  });

  test("no raw internal id appears in the rendered summary", () => {
    const everyStoredId = Object.values(CANONICAL).flatMap((cases) =>
      cases.map(([storedValue]) => storedValue)
    );

    // A profile carrying a real value for all four fields at once.
    const summary = summaryMarkup({
      thrillTolerance: "mixed",
      pace: "leisurely",
      heatSensitivity: "high",
      stormTolerance: "indoor_only",
    });

    everyStoredId.forEach((storedId) => {
      // "low" and "high" are substrings of ordinary words, so match them as
      // whole words to keep the assertion meaningful rather than brittle.
      expect(summary).not.toMatch(new RegExp(`\\b${storedId}\\b`));
    });
  });

  test("a missing value renders Not set, never a blank or an id", () => {
    // Ride comfort has no default: an untouched profile stores "".
    const summary = summaryMarkup({ thrillTolerance: "" });

    expect(summary).toContain("Ride comfort");
    expect(summary).toContain("Not set");
    expect(summary).not.toContain("not set");
  });

  test("an unrecognised value renders Not set rather than leaking through", () => {
    ["nonsense_value", "LOW", " ", "constructor", "toString"].forEach((value) => {
      const summary = summaryMarkup({ thrillTolerance: value });
      expect(summary).toContain("Not set");
      expect(summary).not.toContain("nonsense_value");
      expect(summary).not.toContain("function");
    });
  });

  test('the summary label reads "Walking", matching what the control asks', () => {
    const summary = summaryMarkup({ pace: "balanced" });

    expect(summary).toContain("Walking");
    expect(summary).toContain("A balanced amount of walking");
    // The old label described a vague mood rather than the walking question.
    expect(summary).not.toMatch(/>\s*Pace\s*</);
  });

  test("each label/value pair is a real definition-list row", () => {
    const summary = summaryMarkup({ pace: "balanced" });

    const dts = (summary.match(/<dt/g) || []).length;
    const dds = (summary.match(/<dd/g) || []).length;

    expect(dts).toBe(4);
    expect(dds).toBe(4);
  });

  test("the height explanation is limited to posted ride-height requirements", () => {
    const markup = decode(renderOnboarding());

    expect(markup).toContain(
      "Children’s heights help TOHI check posted ride-height requirements"
    );
    expect(markup).toContain("ages help it judge what may suit the family");

    // The old sentence claimed TOHI avoids every ride a child cannot ride.
    expect(markup).not.toContain("so TOHI can avoid rides they cannot ride");
    expect(markup).not.toContain("avoid rides they cannot ride");
  });

  test("summary labels still match the exact option text of the controls", () => {
    // This is the drift guard. The summary mirrors the option text a guest reads;
    // if an option is reworded without updating the map, the summary would start
    // showing something the screen never offered.
    const markup = decode(renderOnboarding({}, 2));

    const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    Object.values(CANONICAL)
      .flat()
      .forEach(([storedValue, expectedLabel]) => {
        // React adds selected="" to the chosen option, so allow attributes
        // between the value and the closing bracket.
        const optionPattern = new RegExp(
          `<option value="${escape(storedValue)}"[^>]*>${escape(expectedLabel)}</option>`
        );
        expect(markup).toMatch(optionPattern);
      });
  });

  test("the setup controls still store the same underlying ids", () => {
    // Relabelling the summary must not change what gets saved.
    const markup = decode(renderOnboarding({}, 2));

    Object.values(CANONICAL)
      .flat()
      .forEach(([storedValue]) => {
        expect(markup).toContain(`value="${storedValue}"`);
      });
  });

  test("a selected value is still reflected by the control, not just the summary", () => {
    const markup = decode(renderOnboarding({ stormTolerance: "we_handle_it" }, 2));

    // react-dom/server renders the chosen option as selected on the <select>.
    expect(markup).toMatch(/<select[^>]*>[\s\S]*?we_handle_it[\s\S]*?<\/select>/);
    expect(summaryMarkup({ stormTolerance: "we_handle_it" })).toContain(
      "We handle weather pretty well"
    );
  });
});
