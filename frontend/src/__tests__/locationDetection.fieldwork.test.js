import { detectNearestLocationZone } from "../utils/locationDetection";

describe("fieldwork location detection anchors", () => {
  test("Magic Kingdom: Pirates queue resolves to Adventureland, not Frontierland", () => {
    const zone = detectNearestLocationZone({
      parkId: "magic_kingdom",
      lat: 28.4180,
      lng: -81.5836,
    });

    expect(zone?.landKey).toBe("adventureland");
    expect(["high", "medium"]).toContain(zone?.confidence);
  });

  test("Magic Kingdom: Main Street center resolves to Main Street", () => {
    const zone = detectNearestLocationZone({
      parkId: "magic_kingdom",
      lat: 28.4178,
      lng: -81.5812,
    });

    expect(zone?.landKey).toBe("main_street");
    expect(["high", "medium"]).toContain(zone?.confidence);
  });

  test("Hollywood Studios: Rise queue resolves to Galaxy's Edge, not Toy Story Land", () => {
    const zone = detectNearestLocationZone({
      parkId: "hollywood",
      lat: 28.3538,
      lng: -81.5612,
    });

    expect(zone?.landKey).toBe("star_wars_galaxys_edge");
    expect(["high", "medium"]).toContain(zone?.confidence);
  });

  test("Hollywood Studios: Toy Story Land center resolves to Toy Story Land, not Echo Lake", () => {
    const zone = detectNearestLocationZone({
      parkId: "hollywood",
      lat: 28.3558,
      lng: -81.5591,
    });

    expect(zone?.landKey).toBe("toy_story_land");
    expect(["high", "medium"]).toContain(zone?.confidence);
  });

  test("Animal Kingdom: entrance resolves to Oasis", () => {
    const zone = detectNearestLocationZone({
      parkId: "animal_kingdom",
      lat: 28.3576,
      lng: -81.5907,
    });

    expect(zone?.landKey).toBe("oasis");
    expect(["high", "medium"]).toContain(zone?.confidence);
  });

  test("Animal Kingdom: walking toward Pandora resolves to Pandora", () => {
    const zone = detectNearestLocationZone({
      parkId: "animal_kingdom",
      lat: 28.3566,
      lng: -81.5924,
    });

    expect(zone?.landKey).toBe("pandora");
    expect(["high", "medium"]).toContain(zone?.confidence);
  });
});
