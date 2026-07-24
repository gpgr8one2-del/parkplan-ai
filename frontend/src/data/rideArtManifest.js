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

import tronDay from "../assets/rideArt/11527-tron-lightcycle-run_day.webp";
import tronNight from "../assets/rideArt/11527-tron-lightcycle-run_night.webp";
import littleMermaidDay from "../assets/rideArt/127-under-the-sea-journey-of-the-little-mermaid_day.webp";
import littleMermaidNight from "../assets/rideArt/127-under-the-sea-journey-of-the-little-mermaid_night.webp";
import sevenDwarfsDay from "../assets/rideArt/129-seven-dwarfs-mine-train_day.webp";
import sevenDwarfsNight from "../assets/rideArt/129-seven-dwarfs-mine-train_night.webp";
import bigThunderDay from "../assets/rideArt/130-big-thunder-mountain-railroad_day.webp";
import bigThunderNight from "../assets/rideArt/130-big-thunder-mountain-railroad_night.webp";
import buzzDay from "../assets/rideArt/131-buzz-lightyears-space-ranger-spin_day.webp";
import buzzNight from "../assets/rideArt/131-buzz-lightyears-space-ranger-spin_night.webp";
import dumboDay from "../assets/rideArt/132-dumbo-the-flying-elephant_day.webp";
import dumboNight from "../assets/rideArt/132-dumbo-the-flying-elephant_night.webp";
import smallWorldDay from "../assets/rideArt/133-its-a-small-world_day.webp";
import smallWorldNight from "../assets/rideArt/133-its-a-small-world_night.webp";
import jungleCruiseDay from "../assets/rideArt/134-jungle-cruise_day.webp";
import jungleCruiseNight from "../assets/rideArt/134-jungle-cruise_night.webp";
import madTeaPartyDay from "../assets/rideArt/135-mad-tea-party_day.webp";
import madTeaPartyNight from "../assets/rideArt/135-mad-tea-party_night.webp";
import peterPanDay from "../assets/rideArt/136-peter-pans-flight_day.webp";
import peterPanNight from "../assets/rideArt/136-peter-pans-flight_night.webp";
import winnieThePoohDay from "../assets/rideArt/142-many-adventures-of-winnie-the-pooh_day.webp";
import winnieThePoohNight from "../assets/rideArt/142-many-adventures-of-winnie-the-pooh_night.webp";
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
    "11527": {
      day: {
        src: tronDay,
        alt: "Illustration of the TRON Lightcycle / Run canopy and coaster",
      },
      night: {
        src: tronNight,
        alt: "Illustration of the TRON Lightcycle / Run canopy lit at night",
      },
    },
    "127": {
      day: {
        src: littleMermaidDay,
        alt: "Illustration of a clamshell ride vehicle in Under the Sea – Journey of The Little Mermaid",
      },
      night: {
        src: littleMermaidNight,
        alt: "Illustration of a clamshell ride vehicle in a nighttime Under the Sea – Journey of The Little Mermaid scene",
      },
    },
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
    "130": {
      day: {
        src: bigThunderDay,
        alt: "Illustration of a Big Thunder Mountain Railroad train on the mountain",
      },
      night: {
        src: bigThunderNight,
        alt: "Illustration of Big Thunder Mountain Railroad at night",
      },
    },
    "131": {
      day: {
        src: buzzDay,
        alt: "Illustration of a Buzz Lightyear’s Space Ranger Spin ride vehicle",
      },
      night: {
        src: buzzNight,
        alt: "Illustration of a Buzz Lightyear’s Space Ranger Spin ride vehicle at night",
      },
    },
    "132": {
      day: {
        src: dumboDay,
        alt: "Illustration of a Dumbo the Flying Elephant ride vehicle above the carousel",
      },
      night: {
        src: dumboNight,
        alt: "Illustration of a Dumbo the Flying Elephant ride vehicle at night",
      },
    },
    "133": {
      day: {
        src: smallWorldDay,
        alt: "Illustration of the “it’s a small world” clock facade and boats",
      },
      night: {
        src: smallWorldNight,
        alt: "Illustration of the “it’s a small world” clock facade at night",
      },
    },
    "134": {
      day: {
        src: jungleCruiseDay,
        alt: "Illustration of a Jungle Cruise riverboat passing elephants",
      },
      night: {
        src: jungleCruiseNight,
        alt: "Illustration of a Jungle Cruise riverboat at night",
      },
    },
    "135": {
      day: {
        src: madTeaPartyDay,
        alt: "Illustration of a Mad Tea Party spinning teacup and teapot centerpiece",
      },
      night: {
        src: madTeaPartyNight,
        alt: "Illustration of a Mad Tea Party spinning teacup at night",
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
    "142": {
      day: {
        src: winnieThePoohDay,
        alt: "Illustration of a honey pot ride vehicle in The Many Adventures of Winnie the Pooh",
      },
      night: {
        src: winnieThePoohNight,
        alt: "Illustration of a honey pot ride vehicle in a nighttime Hundred Acre Wood scene",
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
