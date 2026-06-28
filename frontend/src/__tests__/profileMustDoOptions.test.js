import { getParkRides } from "../rideMetadata";
import { PARKS } from "../data/parkAreas";
import { shouldShowRideInWaitList } from "../attractionDisplayFilters";

function normalizeTripParkId(parkId) {
  if (parkId === "hollywood_studios" || parkId === "disney_hollywood_studios") {
    return "hollywood";
  }

  return parkId;
}

function buildProfileMustDoExperienceOptions({ familyProfile = {}, planningPark = "magic_kingdom", getParkLabel }) {
  const tripContext = familyProfile?.tripContext || {};
  const selectedParkIds = Array.isArray(tripContext.parkSelectionIds)
    ? tripContext.parkSelectionIds
    : Array.isArray(tripContext.selectedParks)
    ? tripContext.selectedParks
    : [];

  const validParkIds = new Set(PARKS.map((park) => park.id));
  const tripParkIds = selectedParkIds
    .map((parkId) => normalizeTripParkId(parkId))
    .filter(
      (parkId, index, list) =>
        typeof parkId === "string" &&
        parkId.trim() &&
        validParkIds.has(parkId) &&
        list.indexOf(parkId) === index
    );

  const fallbackParkId =
    normalizeTripParkId(planningPark) ||
    normalizeTripParkId(tripContext.firstParkId) ||
    normalizeTripParkId(tripContext.firstPark) ||
    "magic_kingdom";

  const optionParkIds = tripParkIds.length > 0 ? tripParkIds : [fallbackParkId].filter((parkId) => validParkIds.has(parkId));

  return optionParkIds.flatMap((parkId) => {
    const parkLabel = getParkLabel(parkId);

    return getParkRides(parkId)
      .map(([id, meta]) => ({
        id,
        name: meta?.displayName || meta?.name || id,
        displayName: meta?.displayName || meta?.name || id,
        parkId,
        parkLabel,
        type: meta?.type || meta?.category || "experience",
      }))
      .filter((experience) => shouldShowRideInWaitList(parkId, experience));
  });
}

describe("Profile must-do options", () => {
  test("include options across all selected trip parks", () => {
    const options = buildProfileMustDoExperienceOptions({
      familyProfile: {
        tripContext: {
          parkSelectionIds: ["magic_kingdom", "epcot", "hollywood", "animal_kingdom"],
        },
      },
      planningPark: "magic_kingdom",
      getParkLabel: (parkId) => parkId,
    });

    const parkIds = new Set(options.map((option) => option.parkId));

    expect(parkIds.has("magic_kingdom")).toBe(true);
    expect(parkIds.has("epcot")).toBe(true);
    expect(parkIds.has("hollywood")).toBe(true);
    expect(parkIds.has("animal_kingdom")).toBe(true);
  });

  test("normalizes old Hollywood Studios park ids", () => {
    const options = buildProfileMustDoExperienceOptions({
      familyProfile: {
        tripContext: {
          parkSelectionIds: ["hollywood_studios"],
        },
      },
      planningPark: "magic_kingdom",
      getParkLabel: (parkId) => parkId,
    });

    expect(options.length).toBeGreaterThan(0);
    expect(new Set(options.map((option) => option.parkId))).toEqual(new Set(["hollywood"]));
  });

  test("falls back to the planning park when no trip parks are selected yet", () => {
    const options = buildProfileMustDoExperienceOptions({
      familyProfile: { tripContext: { parkSelectionIds: [] } },
      planningPark: "epcot",
      getParkLabel: (parkId) => parkId,
    });

    expect(options.length).toBeGreaterThan(0);
    expect(new Set(options.map((option) => option.parkId))).toEqual(new Set(["epcot"]));
  });
});
