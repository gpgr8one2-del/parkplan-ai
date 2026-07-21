// Exact ride-ID artwork manifest (61C-1A).
//
// Bundled bitmap art for individually approved attractions only. Keys are the
// canonical park ID plus the exact string ride ID from rideMetadata — never
// attraction names, aliases, or array positions. This manifest is separate
// from parkArtwork.js, which holds abstract park/area metadata.
//
// Lookup is strict: an unknown park, unknown ride, or missing asset returns
// null so the card falls back to its text-led layout. There is no park-level,
// area-level, or name-based fallback, and no remote URLs.

import sevenDwarfsDay from "../assets/rideArt/129-seven-dwarfs-mine-train_day.webp";
import sevenDwarfsNight from "../assets/rideArt/129-seven-dwarfs-mine-train_night.webp";
import peterPanDay from "../assets/rideArt/136-peter-pans-flight_day.webp";
import peterPanNight from "../assets/rideArt/136-peter-pans-flight_night.webp";
import hauntedMansionDay from "../assets/rideArt/140-haunted-mansion_day.webp";
import hauntedMansionNight from "../assets/rideArt/140-haunted-mansion_night.webp";
import tianaDay from "../assets/rideArt/13630-tianas-bayou-adventure_day.webp";
import tianaNight from "../assets/rideArt/13630-tianas-bayou-adventure_night.webp";
import piratesDay from "../assets/rideArt/137-pirates-of-the-caribbean_day.webp";
import piratesNight from "../assets/rideArt/137-pirates-of-the-caribbean_night.webp";
import spaceMountainDay from "../assets/rideArt/138-space-mountain_day.webp";
import spaceMountainNight from "../assets/rideArt/138-space-mountain_night.webp";

export const RIDE_ART_MANIFEST = {
  magic_kingdom: {
    "129": {
      day: {
        src: sevenDwarfsDay,
        alt: "Illustration of the Seven Dwarfs Mine Train coaster hill",
      },
      night: {
        src: sevenDwarfsNight,
        alt: "Illustration of the Seven Dwarfs Mine Train coaster hill at night",
      },
    },
    "136": {
      day: {
        src: peterPanDay,
        alt: "Illustration of a Peter Pan’s Flight pirate ship over London",
      },
      night: {
        src: peterPanNight,
        alt: "Illustration of a Peter Pan’s Flight pirate ship over London at night",
      },
    },
    "140": {
      day: {
        src: hauntedMansionDay,
        alt: "Illustration of the Haunted Mansion",
      },
      night: {
        src: hauntedMansionNight,
        alt: "Illustration of the Haunted Mansion at night",
      },
    },
    "13630": {
      day: {
        src: tianaDay,
        alt: "Illustration of Tiana’s Bayou Adventure",
      },
      night: {
        src: tianaNight,
        alt: "Illustration of Tiana’s Bayou Adventure at night",
      },
    },
    "137": {
      day: {
        src: piratesDay,
        alt: "Illustration of the Pirates of the Caribbean entrance",
      },
      night: {
        src: piratesNight,
        alt: "Illustration of the Pirates of the Caribbean entrance at night",
      },
    },
    "138": {
      day: {
        src: spaceMountainDay,
        alt: "Illustration of Space Mountain",
      },
      night: {
        src: spaceMountainNight,
        alt: "Illustration of Space Mountain at night",
      },
    },
  },
};

export function getRideArtwork(parkId, rideId, night = false) {
  if (parkId == null || rideId == null) return null;
  const parkArt = RIDE_ART_MANIFEST[parkId];
  if (!parkArt) return null;
  const rideArt = parkArt[String(rideId)];
  if (!rideArt) return null;
  return (night ? rideArt.night : rideArt.day) || null;
}

export default RIDE_ART_MANIFEST;
