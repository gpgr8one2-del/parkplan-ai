/**
 * Focused Profile screen tests.
 *
 * These render the REAL App and switch to the REAL Profile tab, then assert on
 * real rendered DOM. Nothing about the Profile markup is re-implemented here.
 *
 * Why a full App render: Profile is still an inline branch of App.jsx rather than
 * an extracted component, so this is the only way to exercise the real screen.
 * `../api` is mocked so the test performs no network work; every other module,
 * including the real familyProfile normalizer and summary builder, runs for real.
 *
 * Scope note: Profile is a read-only summary. Its one product action opens the
 * existing setup flow. These tests therefore pin what the screen COMMUNICATES and
 * that it stays read-only — they deliberately assert no editing behaviour, because
 * adding editing to Profile was not part of this phase.
 *
 * Clock note: Profile now follows the shared shell-night decision, which reads
 * the local hour. Every test below therefore runs under an EXPLICITLY controlled
 * clock rather than whatever time the suite happens to run at. Without that, the
 * day assertions would pass all afternoon and fail after 18:00 — a suite that
 * only breaks in the evening is worse than no suite at all.
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import App from "../App";

// React 19 only recognises act() when the environment declares itself an act
// environment. Create React App's Jest setup does not set this, which is what
// produced the "current testing environment is not configured to support act(...)"
// output on every render. Setting the documented flag fixes the cause; nothing
// here silences console.error, so a real React warning would still surface.
global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../api", () => ({
  fetchParkData: jest.fn(() => Promise.resolve({ rides: [], lands: [] })),
  fetchWeather: jest.fn(() => Promise.resolve(null)),
  sendChatMessage: jest.fn(() => Promise.resolve({ reply: "" })),
  sendTohiPickReview: jest.fn(() => Promise.resolve(null)),
  trackEvent: jest.fn(),
}));

const COMPLETE_PROFILE = {
  system: "disney_wdw",
  isSetupComplete: true,
  preferredName: "Gabe",
  adultCount: 2,
  childCount: 2,
  children: [
    { id: "child_1", label: "Child 1", age: 5, heightInches: 40 },
    { id: "child_2", label: "Child 2", age: 8, heightInches: 52 },
  ],
  thrillTolerance: "mixed",
  pace: "leisurely",
  heatSensitivity: "high",
  waterRidePreference: "avoid",
  stormTolerance: "indoor_only",
  mobilityAccessibility: {
    usesStroller: true,
    usesWheelchair: false,
    mobilityNotes: "",
  },
  priorities: ["low_stress", "characters"],
  tripContext: {
    tripStartDate: "2026-05-08",
    tripEndDate: "2026-05-10",
    parkDays: 3,
    parkSelectionIds: ["magic_kingdom", "epcot"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "epcot",
    parkHopper: "yes",
  },
  resortContext: {
    stayingOnProperty: "yes",
    resortId: "grand_floridian",
    resortName: "Disney’s Grand Floridian Resort & Spa",
    offPropertyHotelName: "",
    transportationMode: "monorail",
  },
};

let container = null;
let root = null;

// The shared theme runtime treats 06:00–17:59 as day and 18:00–05:59 as night,
// so these two are comfortably inside their bands rather than on a boundary.
const CONTROLLED_DAY = new Date(2026, 4, 8, 13, 0, 0);
const CONTROLLED_NIGHT = new Date(2026, 4, 8, 21, 0, 0);

// Freeze the clock at a chosen local time. Only the time source is controlled;
// nothing about the theme decision itself is stubbed, so these tests exercise
// the real shellNight derivation rather than a test-only shortcut.
function setClock(when) {
  jest.useFakeTimers("modern");
  jest.setSystemTime(when);
}

// jsdom normalises an inline hex colour to its rgb() form, so assertions are
// written the way the DOM actually reports them rather than the way the source
// spells them.
function rgb(hex) {
  const value = hex.replace("#", "");
  return `rgb(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(
    value.slice(4, 6),
    16
  )})`;
}

// jsdom's CSS parser does not understand linear-gradient, so it DROPS any
// inline `background` holding one — the setup hero, the missing-information
// alert, the priority chips and the page itself all lose their fill here and
// render with no background at all.
//
// That is a limitation of this environment, not of the screen, and it is why
// gradients are pinned two other ways instead: appShellNightHarness.cjs checks
// both the day literal and the night token at the source, and the 375px browser
// captures show them rendering for real. Everything asserted below is a solid
// colour, a border, or a shadow — values jsdom does report faithfully.
const NIGHT_NAVY = [rgb("#0F172A"), rgb("#111A33"), rgb("#131C36"), rgb("#132139")];
const NIGHT_TEXT_TOKENS = [
  rgb("#F5F3FF"),
  rgb("#B6C2E2"),
  rgb("#C4B5FD"),
  rgb("#7DD3FC"),
  rgb("#FCD34D"),
  rgb("#6EE7B7"),
];

// Collect every fill jsdom actually reports for the rendered subtree, so a pale
// card can be detected structurally rather than by guessing at hex spellings.
function renderedFills(scope) {
  return Array.from(scope.querySelectorAll("*"))
    .map((node) => `${node.style.background} ${node.style.backgroundColor}`.trim())
    .filter(Boolean);
}

// A fill counts as "pale" when every channel is high — the bright-white or cream
// card that must never be left floating on the dark shell.
function paleFills(scope) {
  return renderedFills(scope).filter((value) =>
    [...value.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)].some(
      (match) => Number(match[1]) >= 200 && Number(match[2]) >= 200 && Number(match[3]) >= 200
    )
  );
}

function seedProfile(profile) {
  window.localStorage.setItem("parkplan.familyProfile", JSON.stringify(profile));
}

async function renderAppOnProfileTab() {
  root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(App));
  });

  // BottomTabs renders through a portal into document.body, so the tab button is
  // found there rather than inside the container.
  const profileTab = Array.from(document.body.querySelectorAll("nav button")).find(
    (node) => node.textContent.trim() === "Profile"
  );

  expect(profileTab).toBeTruthy();

  await act(async () => {
    profileTab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  return profileTab;
}

function profileText() {
  return container.textContent || "";
}

beforeEach(() => {
  window.localStorage.clear();
  root = null;
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root.unmount();
    });
    root = null;
  }
  container.remove();
  container = null;
  window.localStorage.clear();
  jest.useRealTimers();
});

describe("Profile screen", () => {
  // Every test in this block asserts the approved DAY presentation, so the
  // clock is pinned to daytime rather than inherited from the wall clock.
  beforeEach(() => {
    setClock(CONTROLLED_DAY);
  });

  test("reaches the Profile tab and groups the setup into named sections", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const text = profileText();

    // Grouped structure, not a flat settings list.
    expect(text).toContain("Your family setup");
    expect(text).toContain("Trip details");
    expect(text).toContain("Who's going");
    expect(text).toContain("Comfort & pace");
    expect(text).toContain("What matters most");
    expect(text).toContain("Packing & day comfort");
  });

  test("group titles are real headings, so the screen is navigable by heading", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const headings = Array.from(container.querySelectorAll("h2, h3")).map((node) =>
      node.textContent.trim()
    );

    expect(headings).toContain("Your family setup");
    expect(headings).toContain("Trip details");
    expect(headings).toContain("Who's going");
    expect(headings).toContain("Comfort & pace");
    expect(headings).toContain("What matters most");
    expect(headings).toContain("Packing & day comfort");
  });

  test("every label/value pair is programmatically associated via a definition list", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const lists = container.querySelectorAll("dl");
    expect(lists.length).toBeGreaterThan(0);

    // Each dt has a matching dd, so a screen reader never reads an orphan label.
    lists.forEach((list) => {
      expect(list.querySelectorAll("dt").length).toBe(list.querySelectorAll("dd").length);
      expect(list.querySelectorAll("dt").length).toBeGreaterThan(0);
    });
  });

  test("stored ids are shown as plain language, never as raw internal values", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const text = profileText();

    expect(text).toContain("Keep choices nearby"); // pace: leisurely
    expect(text).toContain("Indoor when storms are near"); // stormTolerance: indoor_only
    expect(text).toContain("Breaks before things fall apart"); // heatSensitivity: high
    expect(text).toContain("A mix of gentle and exciting"); // thrillTolerance: mixed
    expect(text).toContain("Avoid getting wet"); // waterRidePreference: avoid
    expect(text).toContain("Monorail"); // transportationMode: monorail

    // The raw ids themselves must not leak into product copy.
    expect(text).not.toContain("indoor_only");
    expect(text).not.toContain("brief_outdoor_ok");
    expect(text).not.toContain("water_taxi");
    expect(text).not.toContain("okay_with_warning");
    expect(text).not.toMatch(/\bleisurely\b/);
  });

  test("explains how the decision-driving answers are used", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const text = profileText();

    expect(text).toContain("Decides how strongly TOHI favors nearby choices.");
    expect(text).toContain("TOHI leans toward indoor picks");
    expect(text).toContain("TOHI checks posted ride-height requirements against this.");
  });

  test("limits the height claim to posted ride-height requirements", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const text = profileText();

    expect(text).toContain("Saved heights help TOHI check posted ride-height requirements");
    expect(text).toContain("Ages help it judge what may suit the family");
    expect(text).toContain("TOHI checks posted ride-height requirements against this.");
  });

  test("never claims to determine ride eligibility, availability, or accessibility from height", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const text = profileText();

    // TOHI compares a saved height against a posted requirement. It does not
    // decide comprehensive eligibility, and it does not decide accessibility.
    // Earlier drafts of this screen overstated all three, so each is pinned.
    expect(text).not.toContain("Ages and heights are how TOHI keeps rides");
    expect(text).not.toContain("decide which rides your group is eligible for");
    expect(text).not.toContain("checks every height rule");
    expect(text).not.toContain("should be available");
    expect(text).not.toContain("whole-family options");
    expect(text).not.toContain("still need filtering");

    // The one permitted use of these words is the packing group's disclaimer,
    // which denies the claim rather than making it.
    const eligibilityMentions = text.split("eligibility").length - 1;
    expect(eligibilityMentions).toBe(1);
    expect(text).toContain("They do not change ride eligibility");
  });

  test("keeps each height-band summary limited to posted requirements", async () => {
    const bands = [
      [34, "Many height-gated rides post a requirement above this."],
      [40, "Some height-gated rides post a requirement above this."],
      [50, "Many height-gated rides may fit this height."],
    ];

    for (const [heightInches, expected] of bands) {
      window.localStorage.clear();
      seedProfile({
        ...COMPLETE_PROFILE,
        children: [{ id: "child_1", label: "Child 1", age: 6, heightInches }],
        childCount: 1,
      });
      await renderAppOnProfileTab();

      const text = profileText();
      expect(text).toContain(expected);
      expect(text).toContain("TOHI still checks each posted requirement.");

      await act(async () => {
        root.unmount();
      });
      root = null;
      container.innerHTML = "";
    }
  });

  test("describes ride comfort as a lean, not a hard exclusion", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const text = profileText();

    expect(text).toContain("Nudges bigger thrills up or down your list");
    expect(text).toContain("It does not rule rides out");

    // Thrill comfort adjusts standing; it never removes a ride outright.
    expect(text).not.toContain("Keeps rides that would not suit your group off the list");
  });

  test("explains the real water-ride behaviour for each stored value", async () => {
    const cases = [
      ["avoid", "TOHI pushes rides that soak you down your list."],
      ["love", "TOHI gives rides that soak you a nudge up your list."],
      ["yes", "TOHI gives rides that soak you a nudge up your list."],
      ["okay_with_warning", "TOHI adds a heads-up on the card before a ride that can soak you."],
      ["depends", "TOHI treats rides that soak you like any other option."],
    ];

    for (const [waterRidePreference, expected] of cases) {
      window.localStorage.clear();
      seedProfile({ ...COMPLETE_PROFILE, waterRidePreference });
      await renderAppOnProfileTab();

      expect(profileText()).toContain(expected);

      await act(async () => {
        root.unmount();
      });
      root = null;
      container.innerHTML = "";
    }
  });

  test('a legacy stored "yes" displays as the love answer, not as unset', async () => {
    // normalizeFamilyProfile still accepts a stored "yes" and the engine still
    // honours it, so an older profile must not read as unanswered.
    seedProfile({ ...COMPLETE_PROFILE, waterRidePreference: "yes" });
    await renderAppOnProfileTab();

    const text = profileText();
    const waterSection = text.slice(text.indexOf("Water rides"));

    expect(waterSection).toContain("We love water rides");
    expect(waterSection.slice(0, 60)).not.toContain("Not set");
  });

  test("frames mobility as packing and comfort, and makes no accessibility or ADA claim", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const text = profileText();

    expect(text).toContain("Packing & day comfort");
    expect(text).toContain("They do not change ride eligibility");
    expect(text).toContain("Confirm attraction access and transfer details");

    // No claim that TOHI determines eligibility or guarantees access.
    expect(text).not.toMatch(/ADA eligib/i);
    expect(text).not.toMatch(/guarantee/i);
    expect(text).not.toMatch(/wheelchair accessible/i);
  });

  test("keeps the storm-comfort answer visible now that it affects recommendations", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    expect(profileText()).toContain("Storm comfort");
  });

  test("shows an explicit unset state rather than a blank gap", async () => {
    seedProfile({
      ...COMPLETE_PROFILE,
      isSetupComplete: true,
      tripContext: {
        ...COMPLETE_PROFILE.tripContext,
        parkHopper: "unknown",
      },
      resortContext: {
        stayingOnProperty: "unknown",
        resortId: "",
        resortName: "",
        offPropertyHotelName: "",
        transportationMode: "unknown",
      },
    });
    await renderAppOnProfileTab();

    expect(profileText()).toContain("Not set");
  });

  test("surfaces the outstanding setup items when the profile is incomplete", async () => {
    // Children with no ages or heights, and no comfort answers: genuinely incomplete.
    seedProfile({
      adultCount: 2,
      childCount: 1,
      children: [{ id: "child_1", label: "Child 1", age: "", heightInches: "" }],
      priorities: [],
      tripContext: { parkSelectionIds: ["magic_kingdom"], firstParkId: "magic_kingdom" },
      resortContext: { stayingOnProperty: "unknown" },
    });

    // An incomplete profile opens onboarding first; leave it and return to the tabs.
    root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(App));
    });

    const exitSetup = Array.from(container.querySelectorAll("button")).find((node) =>
      node.textContent.includes("View basic waits")
    );
    expect(exitSetup).toBeTruthy();

    await act(async () => {
      exitSetup.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const profileTab = Array.from(document.body.querySelectorAll("nav button")).find(
      (node) => node.textContent.trim() === "Profile"
    );
    await act(async () => {
      profileTab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const text = profileText();
    expect(text).toContain("SETUP NEEDED");
    expect(text).toContain("Still needed before TOHI can personalize");
    expect(text).toContain("Finish setup");
  });

  test("stays read-only: the only product control opens the existing setup flow", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    // No editing surface was introduced on Profile in this phase.
    expect(container.querySelectorAll("input").length).toBe(0);
    expect(container.querySelectorAll("select").length).toBe(0);
    expect(container.querySelectorAll("textarea").length).toBe(0);

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent.trim()).toBe("Review setup");

    // And it really opens setup rather than editing in place.
    await act(async () => {
      buttons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(profileText()).toContain("Build your family’s park plan");
  });

  test("the primary action meets a 48px touch-target minimum", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const cta = Array.from(container.querySelectorAll("button")).find((node) =>
      node.textContent.includes("Review setup")
    );

    expect(cta).toBeTruthy();
    expect(parseFloat(cta.style.minHeight)).toBeGreaterThanOrEqual(48);
  });

  test("keeps the approved day presentation during the day", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const markup = container.innerHTML.toLowerCase();

    // Day parity, at the rendered-style level. Profile now HAS a night
    // presentation, so the point is no longer that navy does not exist — it is
    // that navy must not reach a daytime render. Every night token stays absent
    // while the shared flag is false.
    [...NIGHT_NAVY, ...NIGHT_TEXT_TOKENS].forEach((nightToken) => {
      expect(markup).not.toContain(nightToken);
    });
  });

  test("the approved day values are still rendered, not merely un-darkened", async () => {
    // The complement of the check above. Absence of night proves nothing on its
    // own — a Profile rendered with no colours at all would pass it. This pins
    // the specific day values the approved design renders.
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const markup = container.innerHTML.toLowerCase();

    // grouped card fill, sky and purple eyebrows, success pill, day text
    expect(markup).toContain(rgb("#FFFFFF"));
    expect(markup).toContain(rgb("#0369A1"));
    expect(markup).toContain("rgba(124, 58, 237, 0.1)");
    expect(markup).toContain(rgb("#046A4E"));
    expect(markup).toContain(rgb("#241C15")); // colors.text
    expect(markup).toContain(rgb("#7A6F63")); // colors.muted
    expect(markup).toContain(rgb("#FFF9F1")); // child rows
    // jsdom normalises a standalone colour property to rgb() but leaves a hex
    // inside the `border` shorthand as written, so this one is matched as a hex.
    expect(markup).toContain("1px solid #eadcc8"); // child row borders

    // day borders and shadows on the hero and the grouped cards
    expect(markup).toContain("rgba(124, 58, 237, 0.22)");
    expect(markup).toContain("0 16px 38px rgba(91, 33, 182, 0.10)");
    expect(markup).toContain("0 10px 28px rgba(28, 25, 23, 0.06)");

    // and the shell itself is the day page
    const main = container.querySelector("main");
    expect(main.style.backgroundColor.toLowerCase()).not.toBe(rgb("#0F172A"));
  });

  test("keeps clearance for the fixed bottom navigation", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    // The nav is fixed and portalled; the scroll container keeps padding for it.
    const nav = document.body.querySelector("nav[aria-label='Primary']");
    expect(nav).toBeTruthy();
    expect(nav.style.position).toBe("fixed");

    const shell = container.querySelector("main > div");
    expect(parseFloat(shell.style.paddingBottom)).toBeGreaterThanOrEqual(80);
  });
});

describe("Profile screen at night", () => {
  // Profile joined the converted-tab set, so during the night band it receives
  // the same dark shell as Home, Waits, Plan and TOHI. The clock is pinned to
  // night for every test here.
  beforeEach(() => {
    setClock(CONTROLLED_NIGHT);
  });

  test("Profile receives the dark shell", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const main = container.querySelector("main");
    expect(main).toBeTruthy();
    // The page gradient is dropped by jsdom (see the note beside NIGHT_NAVY);
    // the navy backgroundColor beneath it is reported and is what this pins.
    expect(main.style.backgroundColor.toLowerCase()).toBe(rgb("#0F172A"));
  });

  test("every Profile surface uses an intentional night token", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const markup = container.innerHTML.toLowerCase();

    // Surface-by-surface, each keyed to the phase's list rather than to a single
    // file-wide positive, so a missed surface fails by name.
    // setup hero — its gradient is unobservable here, so its border and shadow
    // stand in for it; the gradient itself is pinned at the source and on screen.
    expect(markup).toContain("rgba(139, 92, 246, 0.40)");
    expect(markup).toContain("0 16px 38px rgba(2, 6, 23, 0.50)");
    // complete status pill (this profile is complete)
    expect(markup).toContain("rgba(6, 78, 59, 0.55)");
    expect(markup).toContain(rgb("#6EE7B7"));
    // grouped card surfaces and their shadow
    expect(markup).toContain(rgb("#131C36"));
    expect(markup).toContain("0 10px 28px rgba(2, 6, 23, 0.45)");
    // section eyebrow chips — purple, sky and amber identities all survive
    expect(markup).toContain(rgb("#C4B5FD"));
    expect(markup).toContain(rgb("#7DD3FC"));
    expect(markup).toContain(rgb("#FCD34D"));
    expect(markup).toContain("rgba(76, 29, 149, 0.48)");
    expect(markup).toContain("rgba(12, 74, 110, 0.55)");
    expect(markup).toContain("rgba(120, 53, 15, 0.52)");
    // labels, values and hints
    expect(markup).toContain(rgb("#F5F3FF"));
    expect(markup).toContain(rgb("#B6C2E2"));
    // child rows sit on a deeper nested surface
    expect(markup).toContain(rgb("#0F172A"));
    expect(markup).toContain("rgba(99, 102, 241, 0.28)");
    // priority chips
    expect(markup).toContain("rgba(139, 92, 246, 0.50)");
    // primary action
    expect(markup).toContain("rgba(139, 92, 246, 0.52)");
    expect(markup).toContain("0 12px 24px rgba(2, 6, 23, 0.50)");
  });

  test('the "Not set" state stays legible rather than disappearing into the card', async () => {
    seedProfile({
      ...COMPLETE_PROFILE,
      tripContext: { ...COMPLETE_PROFILE.tripContext, parkHopper: "unknown" },
      resortContext: {
        stayingOnProperty: "unknown",
        resortId: "",
        resortName: "",
        offPropertyHotelName: "",
        transportationMode: "unknown",
      },
    });
    await renderAppOnProfileTab();

    expect(profileText()).toContain("Not set");

    const unset = Array.from(container.querySelectorAll("dd")).find(
      (node) => node.textContent.trim() === "Not set"
    );
    expect(unset).toBeTruthy();
    // The night muted token, not a day grey and not the card fill.
    expect(unset.style.color.toLowerCase()).toBe("rgb(182, 194, 226)");
    expect(unset.style.fontStyle).toBe("italic");
  });

  test("each height-message state gets its own night treatment", async () => {
    const bands = [
      [34, "rgba(76, 5, 25, 0.58)", "rgb(253, 164, 175)"],
      [40, "rgba(120, 53, 15, 0.52)", "rgb(252, 211, 77)"],
      [50, "rgba(6, 78, 59, 0.55)", "rgb(110, 231, 183)"],
    ];

    for (const [heightInches, expectedBackground, expectedColor] of bands) {
      window.localStorage.clear();
      seedProfile({
        ...COMPLETE_PROFILE,
        children: [{ id: "child_1", label: "Child 1", age: 6, heightInches }],
        childCount: 1,
      });
      await renderAppOnProfileTab();

      const note = Array.from(container.querySelectorAll("p")).find((node) =>
        node.textContent.includes("TOHI still checks each posted requirement.")
      );
      expect(note).toBeTruthy();
      expect(note.style.background.toLowerCase()).toBe(expectedBackground);
      expect(note.style.color.toLowerCase()).toBe(expectedColor);

      await act(async () => {
        root.unmount();
      });
      root = null;
      container.innerHTML = "";
    }
  });

  test("the incomplete profile shows its missing-information alert in night tokens", async () => {
    seedProfile({
      adultCount: 2,
      childCount: 1,
      children: [{ id: "child_1", label: "Child 1", age: "", heightInches: "" }],
      priorities: [],
      tripContext: { parkSelectionIds: ["magic_kingdom"], firstParkId: "magic_kingdom" },
      resortContext: { stayingOnProperty: "unknown" },
    });

    root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(App));
    });

    const exitSetup = Array.from(container.querySelectorAll("button")).find((node) =>
      node.textContent.includes("View basic waits")
    );
    await act(async () => {
      exitSetup.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const profileTab = Array.from(document.body.querySelectorAll("nav button")).find(
      (node) => node.textContent.trim() === "Profile"
    );
    await act(async () => {
      profileTab.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const text = profileText();
    expect(text).toContain("SETUP NEEDED");
    expect(text).toContain("Still needed before TOHI can personalize");

    const alertHeading = Array.from(container.querySelectorAll("h3")).find((node) =>
      node.textContent.includes("Still needed before TOHI can personalize")
    );
    expect(alertHeading).toBeTruthy();
    expect(alertHeading.style.color.toLowerCase()).toBe("rgb(252, 211, 77)");

    // The alert's own gradient is unobservable here, so its border and shadow
    // stand in for it (the gradient is pinned at the source and on screen).
    const alertCard = alertHeading.closest("section");
    expect(alertCard.style.border.toLowerCase()).toContain("rgba(252, 211, 77, 0.34)");
    expect(alertCard.style.boxShadow.toLowerCase()).toBe("0 10px 28px rgba(2, 6, 23, 0.45)");
    expect(alertCard.style.background).toBe("");

    // and the "setup needed" pill carries the night amber, not the day amber
    const markup = container.innerHTML.toLowerCase();
    expect(markup).toContain("rgba(120, 53, 15, 0.52)");
    expect(markup).not.toContain(rgb("#FEF3C7"));
    // no pale card is left anywhere on the incomplete night screen either
    expect(paleFills(container)).toEqual([]);
  });

  test("no day-only white or cream card fill survives on the night shell", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    // Structural rather than string-matched: every fill jsdom reports for the
    // subtree is inspected, and any one whose channels are all high — a white or
    // cream card — fails. A pale fill written as rgb(), rgba() or a hex literal
    // is caught the same way.
    expect(paleFills(container)).toEqual([]);

    // The specific day fills that used to be here, named so a regression reads
    // clearly rather than as an anonymous colour.
    const markup = container.innerHTML.toLowerCase();
    [rgb("#FFFFFF"), rgb("#FFF9F1"), rgb("#FEF3C7"), rgb("#D1FAE5"), rgb("#FEE2E2")].forEach(
      (fill) => expect(markup).not.toContain(fill)
    );
  });

  test("the bottom navigation changes with Profile in the same render", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    // One shared decision drives both, so the page and the navigation can never
    // disagree: a dark Profile with a cream navigation is the bug this pins.
    const main = container.querySelector("main");
    expect(main.style.backgroundColor.toLowerCase()).toBe(rgb("#0F172A"));

    const nav = document.body.querySelector("nav[aria-label='Primary']");
    expect(nav).toBeTruthy();
    const navMarkup = nav.outerHTML.toLowerCase();
    expect(navMarkup).toContain("rgba(15, 23, 42, 0.96)");
    expect(navMarkup).not.toContain("rgba(255, 249, 241, 0.98)");
  });

  test("Review setup keeps the night presentation when opened from Profile", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const cta = Array.from(container.querySelectorAll("button")).find((node) =>
      node.textContent.includes("Review setup")
    );
    expect(cta).toBeTruthy();

    await act(async () => {
      cta.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Onboarding really opened...
    expect(profileText()).toContain("Build your family’s park plan");

    // ...and it receives the same time-derived presentation as Profile even
    // though onboarding is a separate activeScreen rather than a bottom tab.
    const main = container.querySelector("main");
    expect(main.style.backgroundColor.toLowerCase()).toBe(rgb("#0F172A"));

    const markup = container.innerHTML.toLowerCase();
    [rgb("#131C36"), rgb("#111A33"), rgb("#F5F3FF"), rgb("#B6C2E2")].forEach(
      (nightToken) => expect(markup).toContain(nightToken)
    );
    expect(paleFills(container)).toEqual([]);
  });

  test("night is presentation only: content, structure and read-only shape are unchanged", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const text = profileText();

    // Same groups, same order, same wording as the day screen.
    ["Your family setup", "Trip details", "Who's going", "Comfort & pace", "What matters most", "Packing & day comfort"].forEach(
      (title) => expect(text).toContain(title)
    );

    // Same plain-language values, no raw ids.
    expect(text).toContain("Keep choices nearby");
    expect(text).toContain("Indoor when storms are near");
    expect(text).not.toContain("indoor_only");

    // Same accessibility structure.
    const lists = container.querySelectorAll("dl");
    expect(lists.length).toBeGreaterThan(0);
    lists.forEach((list) => {
      expect(list.querySelectorAll("dt").length).toBe(list.querySelectorAll("dd").length);
    });
    const headings = Array.from(container.querySelectorAll("h2, h3")).map((node) =>
      node.textContent.trim()
    );
    expect(headings).toContain("Trip details");

    // Same read-only shape and same single action.
    expect(container.querySelectorAll("input").length).toBe(0);
    expect(container.querySelectorAll("select").length).toBe(0);
    expect(container.querySelectorAll("textarea").length).toBe(0);

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent.trim()).toBe("Review setup");
    expect(parseFloat(buttons[0].style.minHeight)).toBeGreaterThanOrEqual(48);
  });

  test("keeps clearance for the fixed bottom navigation at night", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const shell = container.querySelector("main > div");
    expect(parseFloat(shell.style.paddingBottom)).toBeGreaterThanOrEqual(80);
  });
});
