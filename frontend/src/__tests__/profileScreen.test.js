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
});

describe("Profile screen", () => {
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

  test("does not adopt night styling while Profile is still day-only", async () => {
    seedProfile(COMPLETE_PROFILE);
    await renderAppOnProfileTab();

    const markup = container.innerHTML.toLowerCase();

    // The navy night palette must not appear on this tab yet.
    ["#0f172a", "#111a33", "#131c36"].forEach((navy) => {
      expect(markup).not.toContain(navy);
    });
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
