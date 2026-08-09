// Home artwork manifest (62B-1B).
//
// Bundled park and weather illustrations for the Home tab. Keys are the
// canonical park identifiers and the six approved weather families — never
// filenames, aliases, or array positions. This manifest is deliberately
// separate from rideArtManifest.js: ride art is keyed by exact ride ID and
// cropped 4:5 portrait, whereas Home art is keyed by park/family and composed
// 2:1 wide for the hero plus a square selector crop.
//
// Assets are declared as bundled imports rather than path strings. Nothing
// imports this manifest yet, so the bundler does not verify these imports
// today; homeArtHarness.cjs verifies that every one resolves to a real
// repository asset, and bundler verification begins once the manifest is
// consumed.
//
// alt is intentionally "" on every entry. Home artwork is decorative: when
// these images are integrated, the park name and the current weather condition
// will be rendered as visible, accessible text beside them, so descriptive alt
// would produce duplicate screen-reader announcements.
//
// Data only — two named exports and nothing else. No lookup helpers, no
// weather-code interpretation, no weather-to-family resolution, no
// park-selection behavior, no fallback, and no default export. Phase 62B-2
// decides the integration API after inspecting HomeTab's actual needs; in
// particular this phase deliberately does not commit the app to a boolean
// night parameter.

import magicKingdomDay from "../assets/homeArt/parks/magic-kingdom-day.jpg";
import magicKingdomNight from "../assets/homeArt/parks/magic-kingdom-night.jpg";
import epcotDay from "../assets/homeArt/parks/epcot-day.jpg";
import epcotNight from "../assets/homeArt/parks/epcot-night.jpg";
import hollywoodStudiosDay from "../assets/homeArt/parks/hollywood-studios-day.jpg";
import hollywoodStudiosNight from "../assets/homeArt/parks/hollywood-studios-night.jpg";
import animalKingdomDay from "../assets/homeArt/parks/animal-kingdom-day.jpg";
import animalKingdomNight from "../assets/homeArt/parks/animal-kingdom-night.jpg";

import weatherClearDay from "../assets/homeArt/weather/weather-clear-day.png";
import weatherClearNight from "../assets/homeArt/weather/weather-clear-night.png";
import weatherPartlyCloudyDay from "../assets/homeArt/weather/weather-partly-cloudy-day.png";
import weatherPartlyCloudyNight from "../assets/homeArt/weather/weather-partly-cloudy-night.png";
import weatherCloudyFogDay from "../assets/homeArt/weather/weather-cloudy-fog-day.png";
import weatherCloudyFogNight from "../assets/homeArt/weather/weather-cloudy-fog-night.png";
import weatherRainDay from "../assets/homeArt/weather/weather-rain-day.png";
import weatherRainNight from "../assets/homeArt/weather/weather-rain-night.png";
import weatherStormDay from "../assets/homeArt/weather/weather-storm-day.png";
import weatherStormNight from "../assets/homeArt/weather/weather-storm-night.png";
import weatherHeatDay from "../assets/homeArt/weather/weather-heat-day.png";
import weatherHeatNight from "../assets/homeArt/weather/weather-heat-night.png";

export const HOME_PARK_ART = {
  magicKingdom: {
    day: { src: magicKingdomDay, alt: "" },
    night: { src: magicKingdomNight, alt: "" },
  },
  epcot: {
    day: { src: epcotDay, alt: "" },
    night: { src: epcotNight, alt: "" },
  },
  hollywoodStudios: {
    day: { src: hollywoodStudiosDay, alt: "" },
    night: { src: hollywoodStudiosNight, alt: "" },
  },
  animalKingdom: {
    day: { src: animalKingdomDay, alt: "" },
    night: { src: animalKingdomNight, alt: "" },
  },
};

export const HOME_WEATHER_ART = {
  clear: {
    day: { src: weatherClearDay, alt: "" },
    night: { src: weatherClearNight, alt: "" },
  },
  partlyCloudy: {
    day: { src: weatherPartlyCloudyDay, alt: "" },
    night: { src: weatherPartlyCloudyNight, alt: "" },
  },
  cloudyFog: {
    day: { src: weatherCloudyFogDay, alt: "" },
    night: { src: weatherCloudyFogNight, alt: "" },
  },
  rain: {
    day: { src: weatherRainDay, alt: "" },
    night: { src: weatherRainNight, alt: "" },
  },
  storm: {
    day: { src: weatherStormDay, alt: "" },
    night: { src: weatherStormNight, alt: "" },
  },
  heat: {
    day: { src: weatherHeatDay, alt: "" },
    night: { src: weatherHeatNight, alt: "" },
  },
};
