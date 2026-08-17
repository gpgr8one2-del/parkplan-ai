/**
 * Onboarding Step 2 structure and mobile sizing.
 *
 * Two defects are pinned here.
 *
 * STRUCTURE: the Step 2 navigation wrapper is a flex row, and two real content
 * panels — "What would make this trip feel like a win?" (must-dos) and "How
 * should TOHI shape the day?" (start/break/dining/shows/nighttime/paid queue) —
 * were accidentally nested inside it as flex children between Back and Next.
 * Those panels were deliberately moved into setup by c2b7b39 and feed TOHI's
 * planning, packing, must-do and AI context, so they stay; only their placement
 * is corrected.
 *
 * SIZING: at 375px a <select>'s min-content width is set by its longest <option>,
 * and a number input carries a default intrinsic width. Those floors propagated
 * up through the display:grid labels and forced panels wider than their cards.
 * The repair is real sizing constraints, not masking.
 *
 * These tests render the REAL OnboardingFlow through react-dom/server and inspect
 * real markup, so structure is proven rather than assumed. Layout measurement
 * itself needs a browser and is reported separately; what is asserted here is the
 * DOM nesting plus the presence of every sizing rule the measured fix depends on,
 * which is what a future edit could silently undo.
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

const MUST_DO_HEADING = "What would make this trip feel like a win?";
const DAY_SHAPE_HEADING = "How should TOHI shape the day?";

const BASE_PROFILE = {
  adultCount: 2,
  childCount: 1,
  children: [{ id: "child_1", label: "Child 1", age: 6, heightInches: 42 }],
  thrillTolerance: "mixed",
  pace: "balanced",
  heatSensitivity: "high",
  stormTolerance: "indoor_only",
  priorities: ["low_stress"],
  tripContext: {
    parkSelectionIds: ["magic_kingdom"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "magic_kingdom",
  },
  resortContext: { stayingOnProperty: "unknown", resortId: "", transportationMode: "unknown" },
};

const MUST_DO_OPTIONS = [
  {
    id: "129",
    name: "Seven Dwarfs Mine Train",
    displayName: "Seven Dwarfs Mine Train",
    parkId: "magic_kingdom",
    parkLabel: "Magic Kingdom",
    type: "ride",
  },
];

const noop = () => {};
const styleStub = {};

function render(step = 2, extra = {}) {
  const summary = buildFamilyProfileSummary(BASE_PROFILE);
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
      mustDoExperienceOptions: MUST_DO_OPTIONS,
      onUpdateTripPreferences: noop,
      onToggleMustDoExperience: noop,
      ...extra,
    })
  );
}

function decode(html) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Walk the markup and return the substring of the element that starts at
 * `openIndex`, balanced across nested tags of the same name. Used to ask "is X a
 * descendant of Y" from a string without a DOM.
 */
function elementSlice(markup, openIndex, tagName) {
  const openTag = new RegExp(`<${tagName}(\\s|>)`, "g");
  const closeTag = new RegExp(`</${tagName}>`, "g");
  let depth = 0;
  let cursor = openIndex;

  while (cursor < markup.length) {
    openTag.lastIndex = cursor;
    closeTag.lastIndex = cursor;
    const nextOpen = openTag.exec(markup);
    const nextClose = closeTag.exec(markup);

    if (!nextClose) return markup.slice(openIndex);

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      cursor = nextOpen.index + 1;
    } else {
      depth -= 1;
      cursor = nextClose.index + 1;
      if (depth === 0) return markup.slice(openIndex, nextClose.index + `</${tagName}>`.length);
    }
  }

  return markup.slice(openIndex);
}

// The Back/Next navigation row: the flex row whose first control is Back.
function navigationRowSlice(markup) {
  const backIndex = markup.indexOf(">Back</button>");
  expect(backIndex).toBeGreaterThan(-1);

  // Walk backwards to the nearest opening <div that is the flex row.
  const before = markup.slice(0, backIndex);
  const rowOpen = before.lastIndexOf('<div style="display:flex');
  expect(rowOpen).toBeGreaterThan(-1);

  return elementSlice(markup, rowOpen, "div");
}

describe("onboarding Step 2 structure", () => {
  test("both planning panels still render — they were not removed", () => {
    const markup = decode(render(2));

    expect(markup).toContain(MUST_DO_HEADING);
    expect(markup).toContain(DAY_SHAPE_HEADING);
  });

  test("the must-do panel is NOT a descendant of the Back/Next navigation row", () => {
    const markup = decode(render(2));
    const nav = navigationRowSlice(markup);

    expect(nav).not.toContain(MUST_DO_HEADING);
  });

  test("the day-shape panel is NOT a descendant of the Back/Next navigation row", () => {
    const markup = decode(render(2));
    const nav = navigationRowSlice(markup);

    expect(nav).not.toContain(DAY_SHAPE_HEADING);
  });

  test("the navigation row contains only Back and Next", () => {
    const markup = decode(render(2));
    const nav = navigationRowSlice(markup);

    const buttons = nav.match(/<button/g) || [];
    expect(buttons.length).toBe(2);

    expect(nav).toContain(">Back</button>");
    expect(nav).toMatch(/Next: Where You[^<]*Staying<\/button>/);

    // No form controls or content panels smuggled in alongside them.
    expect(nav).not.toContain("<select");
    expect(nav).not.toContain("<input");
    expect(nav).not.toContain("<textarea");
  });

  test("both panels precede the navigation row, keeping a sensible order", () => {
    const markup = decode(render(2));

    const mustDo = markup.indexOf(MUST_DO_HEADING);
    const dayShape = markup.indexOf(DAY_SHAPE_HEADING);
    const back = markup.indexOf(">Back</button>");

    expect(mustDo).toBeLessThan(dayShape);
    expect(dayShape).toBeLessThan(back);
  });

  test("every Step 2 control and callback survives the move", () => {
    const markup = decode(render(2));

    // Comfort selects
    ["Ride comfort", "Heat and fatigue", "Water rides", "Storm comfort"].forEach((label) => {
      expect(markup).toContain(label);
    });
    expect(markup).toContain("How much walking works for your group?");

    // Mobility checkboxes
    expect(markup).toContain("We’ll use a stroller");
    expect(markup).toContain("Someone will use a wheelchair, ECV/scooter, or similar mobility support");
    expect((markup.match(/type="checkbox"/g) || []).length).toBe(2);

    // Priorities
    FAMILY_PRIORITY_OPTIONS.forEach((option) => {
      expect(markup).toContain(option.label);
    });

    // Must-do option from the real option list
    expect(markup).toContain("Seven Dwarfs Mine Train");

    // Day-shape selects
    ["How do you like to start?", "Break rhythm", "Food rhythm", "Shows and parades", "Nighttime plan", "Paid queue comfort"].forEach(
      (label) => {
        expect(markup).toContain(label);
      }
    );
  });

  test("the stale Plan Ahead promise is gone and the replacement is truthful", () => {
    const markup = decode(render(2));

    // Those controls are directly above now, so the old note was simply wrong.
    expect(markup).not.toContain("We’ll ask about rope drop");
    expect(markup).not.toContain("later in Plan Ahead");

    expect(markup).toContain("You can revisit every answer later from the");
    expect(markup).toContain("Profile tab");
  });
});

describe("onboarding mobile sizing rules", () => {
  // These pin the specific constraints the measured 375px fix depends on. Each one
  // was necessary: removing any single one re-widens a panel past its card.
  test("form controls can shrink to their card", () => {
    const markup = render(2);

    // inputStyle is shared by every select, input and textarea on this screen.
    const selectMatch = markup.match(/<select style="([^"]*)"/);
    expect(selectMatch).toBeTruthy();

    const style = selectMatch[1];
    expect(style).toContain("width:100%");
    expect(style).toContain("max-width:100%");
    expect(style).toContain("min-width:0");
    expect(style).toContain("box-sizing:border-box");
  });

  test("grid-item labels can shrink below their content's min-content width", () => {
    const markup = render(2);

    // fieldLabelStyle is display:grid, so it is a grid item as well as a container
    // and needs min-width:0 of its own.
    const labelMatch = markup.match(/<label style="display:grid[^"]*"/);
    expect(labelMatch).toBeTruthy();
    expect(labelMatch[0]).toContain("min-width:0");
  });

  test("section panels can shrink to the step grid", () => {
    const markup = render(2);

    // sectionPanel's own signature: the translucent white background. The blue
    // summary card above shares the padding/radius but is a different element.
    const panels =
      markup.match(/<div style="padding:14px;[^"]*background:rgba\(255,255,255,0\.78\)[^"]*"/g) || [];

    expect(panels.length).toBeGreaterThan(0);
    panels.forEach((panel) => {
      expect(panel).toContain("min-width:0");
      expect(panel).toContain("box-sizing:border-box");
    });
  });

  test("two-column grids use minmax(0, 1fr) so columns can actually divide the width", () => {
    const step1 = render(1);

    // "1fr" is minmax(auto, 1fr); the auto minimum is min-content, which a pair of
    // number inputs floored at ~307-335px inside a 289px card.
    expect(step1).toContain("grid-template-columns:minmax(0, 1fr) minmax(0, 1fr)");
    expect(step1).not.toContain("grid-template-columns:1fr 1fr");
  });

  test("no overflow masking was introduced on the panels or controls", () => {
    [1, 2, 3].forEach((step) => {
      const markup = render(step);

      // The one pre-existing overflow:hidden belongs to the hero, which clips its
      // own absolutely-positioned decorative circles and did so before this phase.
      // It is asserted rather than ignored, so a new one would be caught.
      const hidden = markup.match(/overflow:hidden/g) || [];
      expect(hidden.length).toBe(1);

      const heroMatch = markup.match(/<div style="position:relative;overflow:hidden[^"]*"/);
      expect(heroMatch).toBeTruthy();

      // Nothing this phase touched hides overflow: not the panels, not the
      // controls, not the labels.
      const panels =
        markup.match(/<div style="padding:14px;[^"]*background:rgba\(255,255,255,0\.78\)[^"]*"/g) || [];
      panels.forEach((panel) => expect(panel).not.toContain("overflow"));

      (markup.match(/<select style="[^"]*"/g) || []).forEach((sel) =>
        expect(sel).not.toContain("overflow")
      );
      (markup.match(/<label style="display:grid[^"]*"/g) || []).forEach((label) =>
        expect(label).not.toContain("overflow")
      );
    });
  });
});
