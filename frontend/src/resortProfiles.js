/**
 * Regression: resort-break realism.
 *
 * This protects TOHI from treating every Disney resort as an equally realistic
 * midday reset. The data source is frontend/src/resortProfiles.js.
 *
 * Key trust rule:
 * Pop Century is realistic for EPCOT / Hollywood Studios via Skyliner,
 * but it is NOT a quick Magic Kingdom nap/lunch break.
 */

import {
  DISNEY_RESORT_PROFILES,
  getResortProfile,
  getResortOptions,
} from "../resortProfiles";

/* -------------------------------------------------------------------------- */
/* Test-local classifier                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Returns one of: "realistic" | "planned" | "inconvenient" | "unknown"
 *
 * realistic:
 * - walking
 * - walking_to_ttc for Magic Kingdom
 * - direct monorail to MK/EPCOT
 * - direct Skyliner to EPCOT/Hollywood
 * - direct water taxi from a same-area resort
 *
 * planned:
 * - bus-only to one of the resort's nearest parks
 * - monorail transfer
 *
 * inconvenient:
 * - bus-only and not one of the resort's nearest parks
 */
function classifyBreakRealism(resort, parkId) {
  if (!resort || !parkId) return "unknown";

  const modes = resort.directAccess?.[parkId] || [];
  const nearest = resort.nearestParks || [];

  if (modes.includes("walking")) return "realistic";

  if (modes.includes("walking_to_ttc") && parkId === "magic_kingdom") {
    return "realistic";
  }

  if (modes.includes("monorail")) {
    if (parkId === "magic_kingdom" || parkId === "epcot") {
      return "realistic";
    }
  }

  if (modes.includes("skyliner")) {
    if (parkId === "epcot" || parkId === "hollywood") {
      return "realistic";
    }
  }

  if (modes.includes("water_taxi") && nearest.includes(parkId)) {
    return "realistic";
  }

  if (modes.includes("monorail_transfer")) {
    return "planned";
  }

  const isBusOnly = modes.length > 0 && modes.every((mode) => mode === "bus");

  if (isBusOnly) {
    return nearest.includes(parkId) ? "planned" : "inconvenient";
  }

  return "inconvenient";
}

/* -------------------------------------------------------------------------- */
/* Magic Kingdom                                                              */
/* -------------------------------------------------------------------------- */

describe("Magic Kingdom resort-break realism", () => {
  test("monorail / walking resorts are realistic from Magic Kingdom", () => {
    for (const id of ["contemporary", "grand_floridian", "polynesian"]) {
      const resort = getResortProfile(id);
      expect(classifyBreakRealism(resort, "magic_kingdom")).toBe("realistic");
    }
  });

  test("Wilderness Lodge is realistic from Magic Kingdom by water taxi", () => {
    const resort = getResortProfile("wilderness_lodge");
    expect(classifyBreakRealism(resort, "magic_kingdom")).toBe("realistic");
  });

  test("Skyliner resorts are not realistic quick breaks from Magic Kingdom", () => {
    for (const id of ["pop_century", "art_of_animation", "caribbean_beach", "riviera"]) {
      const resort = getResortProfile(id);
      expect(classifyBreakRealism(resort, "magic_kingdom")).not.toBe("realistic");
    }
  });

  test("Pop Century Magic Kingdom strategy explicitly warns against quick-break logic", () => {
    const resort = getResortProfile("pop_century");

    expect(resort.breakStrategy.magic_kingdom).toMatch(
      /not.*quick|do not suggest|skyliner does not help/i
    );
  });

  test("Disney Springs area resorts are inconvenient from Magic Kingdom", () => {
    for (const id of [
      "port_orleans_french_quarter",
      "port_orleans_riverside",
      "old_key_west",
      "saratoga_springs",
    ]) {
      const resort = getResortProfile(id);
      expect(classifyBreakRealism(resort, "magic_kingdom")).toBe("inconvenient");
    }
  });

  test("Animal Kingdom area resorts are inconvenient from Magic Kingdom", () => {
    for (const id of [
      "animal_kingdom_lodge",
      "all_star_movies",
      "all_star_music",
      "all_star_sports",
    ]) {
      const resort = getResortProfile(id);
      expect(classifyBreakRealism(resort, "magic_kingdom")).toBe("inconvenient");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* EPCOT                                                                      */
/* -------------------------------------------------------------------------- */

describe("EPCOT resort-break realism", () => {
  test("EPCOT area walking resorts are realistic from EPCOT", () => {
    for (const id of ["beach_club", "yacht_club", "boardwalk"]) {
      const resort = getResortProfile(id);
      expect(classifyBreakRealism(resort, "epcot")).toBe("realistic");
    }
  });

  test("Skyliner resorts are realistic from EPCOT", () => {
    for (const id of ["riviera", "caribbean_beach", "pop_century", "art_of_animation"]) {
      const resort = getResortProfile(id);
      expect(classifyBreakRealism(resort, "epcot")).toBe("realistic");
    }
  });

  test("Magic Kingdom monorail resorts are planned, not quick, from EPCOT", () => {
    for (const id of ["contemporary", "grand_floridian", "polynesian"]) {
      const resort = getResortProfile(id);
      expect(classifyBreakRealism(resort, "epcot")).toBe("planned");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Hollywood Studios                                                          */
/* -------------------------------------------------------------------------- */

describe("Hollywood Studios resort-break realism", () => {
  test("EPCOT / Hollywood walking and boat resorts are realistic from Hollywood", () => {
    for (const id of ["beach_club", "yacht_club", "boardwalk"]) {
      const resort = getResortProfile(id);
      expect(classifyBreakRealism(resort, "hollywood")).toBe("realistic");
    }
  });

  test("Skyliner resorts are realistic from Hollywood", () => {
    for (const id of ["riviera", "caribbean_beach", "pop_century", "art_of_animation"]) {
      const resort = getResortProfile(id);
      expect(classifyBreakRealism(resort, "hollywood")).toBe("realistic");
    }
  });

  test("Magic Kingdom area resorts are not realistic quick breaks from Hollywood", () => {
    for (const id of ["contemporary", "grand_floridian", "polynesian", "wilderness_lodge"]) {
      const resort = getResortProfile(id);
      expect(classifyBreakRealism(resort, "hollywood")).not.toBe("realistic");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Animal Kingdom                                                             */
/* -------------------------------------------------------------------------- */

describe("Animal Kingdom resort-break realism", () => {
  test("Animal Kingdom Lodge is planned from Animal Kingdom, not instant", () => {
    const resort = getResortProfile("animal_kingdom_lodge");
    expect(classifyBreakRealism(resort, "animal_kingdom")).toBe("planned");
  });

  test("All-Star resorts are planned from Animal Kingdom", () => {
    for (const id of ["all_star_movies", "all_star_music", "all_star_sports"]) {
      const resort = getResortProfile(id);
      expect(classifyBreakRealism(resort, "animal_kingdom")).toBe("planned");
    }
  });

  test("Skyliner resorts are not realistic from Animal Kingdom", () => {
    for (const id of ["pop_century", "art_of_animation", "caribbean_beach", "riviera"]) {
      const resort = getResortProfile(id);

      expect(classifyBreakRealism(resort, "animal_kingdom")).not.toBe("realistic");
      expect(resort.directAccess.animal_kingdom).not.toContain("skyliner");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Data integrity                                                             */
/* -------------------------------------------------------------------------- */

describe("resortProfiles data integrity", () => {
  const requiredParks = ["magic_kingdom", "epcot", "hollywood", "animal_kingdom"];

  test("every resort has a breakStrategy entry for all four Disney parks", () => {
    for (const resort of DISNEY_RESORT_PROFILES) {
      for (const park of requiredParks) {
        expect(resort.breakStrategy[park]).toBeTruthy();
        expect(typeof resort.breakStrategy[park]).toBe("string");
      }
    }
  });

  test("every resort has a directAccess entry for all four Disney parks", () => {
    for (const resort of DISNEY_RESORT_PROFILES) {
      for (const park of requiredParks) {
        expect(Array.isArray(resort.directAccess[park])).toBe(true);
        expect(resort.directAccess[park].length).toBeGreaterThan(0);
      }
    }
  });

  test("no resort claims Skyliner access to Magic Kingdom or Animal Kingdom", () => {
    for (const resort of DISNEY_RESORT_PROFILES) {
      expect(resort.directAccess.magic_kingdom).not.toContain("skyliner");
      expect(resort.directAccess.animal_kingdom).not.toContain("skyliner");
    }
  });

  test("no resort claims walking access to a park outside its nearest park area", () => {
    for (const resort of DISNEY_RESORT_PROFILES) {
      for (const park of requiredParks) {
        if (
          resort.directAccess[park].includes("walking") &&
          !resort.nearestParks.includes(park)
        ) {
          throw new Error(
            `${resort.id} claims walking access to ${park} but ${park} is not in nearestParks ${JSON.stringify(
              resort.nearestParks
            )}`
          );
        }
      }
    }
  });

  test("every resort has a unique id", () => {
    const ids = DISNEY_RESORT_PROFILES.map((resort) => resort.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("coordinates are inside the Walt Disney World bounding box", () => {
    for (const resort of DISNEY_RESORT_PROFILES) {
      expect(resort.coordinates.lat).toBeGreaterThan(28.3);
      expect(resort.coordinates.lat).toBeLessThan(28.45);
      expect(resort.coordinates.lng).toBeGreaterThan(-81.65);
      expect(resort.coordinates.lng).toBeLessThan(-81.5);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Public helpers                                                             */
/* -------------------------------------------------------------------------- */

describe("resortProfiles public helpers", () => {
  test("getResortProfile returns the right resort by id", () => {
    expect(getResortProfile("contemporary")?.id).toBe("contemporary");
    expect(getResortProfile("pop_century")?.id).toBe("pop_century");
  });

  test("getResortProfile returns null for null, empty, or unknown id", () => {
    expect(getResortProfile(null)).toBeNull();
    expect(getResortProfile("")).toBeNull();
    expect(getResortProfile("nonexistent_resort")).toBeNull();
  });

  test("getResortOptions returns one entry per resort with value, label, and areaLabel", () => {
    const options = getResortOptions();

    expect(options.length).toBe(DISNEY_RESORT_PROFILES.length);

    for (const option of options) {
      expect(typeof option.value).toBe("string");
      expect(typeof option.label).toBe("string");
      expect(typeof option.areaLabel).toBe("string");
    }
  });
});
