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
import ttaPeopleMoverDay from "../assets/rideArt/1190-tomorrowland-transit-authority-peoplemover_day.webp";
import ttaPeopleMoverNight from "../assets/rideArt/1190-tomorrowland-transit-authority-peoplemover_night.webp";
import barnstormerDay from "../assets/rideArt/126-the-barnstormer_day.webp";
import barnstormerNight from "../assets/rideArt/126-the-barnstormer_night.webp";
import littleMermaidDay from "../assets/rideArt/127-under-the-sea-journey-of-the-little-mermaid_day.webp";
import littleMermaidNight from "../assets/rideArt/127-under-the-sea-journey-of-the-little-mermaid_night.webp";
import enchantedTalesDay from "../assets/rideArt/128-enchanted-tales-with-belle_day.webp";
import enchantedTalesNight from "../assets/rideArt/128-enchanted-tales-with-belle_night.webp";
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
import speedwayDay from "../assets/rideArt/143-tomorrowland-speedway_day.webp";
import speedwayNight from "../assets/rideArt/143-tomorrowland-speedway_night.webp";
import astroOrbiterDay from "../assets/rideArt/248-astro-orbiter_day.webp";
import astroOrbiterNight from "../assets/rideArt/248-astro-orbiter_night.webp";
import peterPanDay from "../assets/rideArt/136-peter-pans-flight_day.webp";
import peterPanNight from "../assets/rideArt/136-peter-pans-flight_night.webp";
import winnieThePoohDay from "../assets/rideArt/142-many-adventures-of-winnie-the-pooh_day.webp";
import winnieThePoohNight from "../assets/rideArt/142-many-adventures-of-winnie-the-pooh_night.webp";
import magicCarpetsDay from "../assets/rideArt/141-magic-carpets-of-aladdin_day.webp";
import magicCarpetsNight from "../assets/rideArt/141-magic-carpets-of-aladdin_night.webp";
import regalCarrouselDay from "../assets/rideArt/161-prince-charming-regal-carrousel_day.webp";
import regalCarrouselNight from "../assets/rideArt/161-prince-charming-regal-carrousel_night.webp";
import hauntedMansionDay from "../assets/rideArt/140-haunted-mansion_day.webp";
import hauntedMansionNight from "../assets/rideArt/140-haunted-mansion_night.webp";
import tianaDay from "../assets/rideArt/13630-tianas-bayou-adventure_day.webp";
import tianaNight from "../assets/rideArt/13630-tianas-bayou-adventure_night.webp";
import piratesDay from "../assets/rideArt/137-pirates-of-the-caribbean_day.webp";
import piratesNight from "../assets/rideArt/137-pirates-of-the-caribbean_night.webp";
import spaceMountainDay from "../assets/rideArt/138-space-mountain_day.webp";
import spaceMountainNight from "../assets/rideArt/138-space-mountain_night.webp";
import guardiansDay from "../assets/rideArt/10916-guardians-of-the-galaxy-cosmic-rewind_day.webp";
import guardiansNight from "../assets/rideArt/10916-guardians-of-the-galaxy-cosmic-rewind_night.webp";
import frozenDay from "../assets/rideArt/2679-frozen-ever-after_day.webp";
import frozenNight from "../assets/rideArt/2679-frozen-ever-after_night.webp";
import remyDay from "../assets/rideArt/10914-remys-ratatouille-adventure_day.webp";
import remyNight from "../assets/rideArt/10914-remys-ratatouille-adventure_night.webp";
import soarinDay from "../assets/rideArt/151-soarin-across-america_day.webp";
import soarinNight from "../assets/rideArt/151-soarin-across-america_night.webp";
import missionSpaceDay from "../assets/rideArt/158-mission-space_day.webp";
import missionSpaceNight from "../assets/rideArt/158-mission-space_night.webp";
import testTrackDay from "../assets/rideArt/160-test-track_day.webp";
import testTrackNight from "../assets/rideArt/160-test-track_night.webp";
import figmentDay from "../assets/rideArt/155-journey-into-imagination-with-figment_day.webp";
import figmentNight from "../assets/rideArt/155-journey-into-imagination-with-figment_night.webp";
import livingWithLandDay from "../assets/rideArt/156-living-with-the-land_day.webp";
import livingWithLandNight from "../assets/rideArt/156-living-with-the-land_night.webp";
import spaceshipEarthDay from "../assets/rideArt/159-spaceship-earth_day.webp";
import spaceshipEarthNight from "../assets/rideArt/159-spaceship-earth_night.webp";
import seasNemoDay from "../assets/rideArt/153-the-seas-with-nemo-and-friends_day.webp";
import seasNemoNight from "../assets/rideArt/153-the-seas-with-nemo-and-friends_night.webp";
import riseDay from "../assets/rideArt/6369-star-wars-rise-of-the-resistance_day.webp";
import riseNight from "../assets/rideArt/6369-star-wars-rise-of-the-resistance_night.webp";
import slinkyDogDashDay from "../assets/rideArt/5476-slinky-dog-dash_day.webp";
import slinkyDogDashNight from "../assets/rideArt/5476-slinky-dog-dash_night.webp";
import runawayRailwayDay from "../assets/rideArt/6361-mickey-and-minnies-runaway-railway_day.webp";
import runawayRailwayNight from "../assets/rideArt/6361-mickey-and-minnies-runaway-railway_night.webp";
import toyStoryManiaDay from "../assets/rideArt/117-toy-story-mania_day.webp";
import toyStoryManiaNight from "../assets/rideArt/117-toy-story-mania_night.webp";
import towerOfTerrorDay from "../assets/rideArt/123-tower-of-terror_day.webp";
import towerOfTerrorNight from "../assets/rideArt/123-tower-of-terror_night.webp";
import smugglersRunDay from "../assets/rideArt/6368-millennium-falcon-smugglers-run_day.webp";
import smugglersRunNight from "../assets/rideArt/6368-millennium-falcon-smugglers-run_night.webp";
import alienSaucersDay from "../assets/rideArt/5477-alien-swirling-saucers_day.webp";
import alienSaucersNight from "../assets/rideArt/5477-alien-swirling-saucers_night.webp";
import starToursDay from "../assets/rideArt/120-star-tours-the-adventures-continue_day.webp";
import starToursNight from "../assets/rideArt/120-star-tours-the-adventures-continue_night.webp";
import rockNRollerDay from "../assets/rideArt/16342-rock-n-roller-coaster-starring-the-muppets_day.webp";
import rockNRollerNight from "../assets/rideArt/16342-rock-n-roller-coaster-starring-the-muppets_night.webp";
import flightOfPassageDay from "../assets/rideArt/4439-avatar-flight-of-passage_day.webp";
import flightOfPassageNight from "../assets/rideArt/4439-avatar-flight-of-passage_night.webp";
import naviRiverJourneyDay from "../assets/rideArt/4438-navi-river-journey_day.webp";
import naviRiverJourneyNight from "../assets/rideArt/4438-navi-river-journey_night.webp";
import kilimanjaroSafarisDay from "../assets/rideArt/113-kilimanjaro-safaris_day.webp";
import kilimanjaroSafarisNight from "../assets/rideArt/113-kilimanjaro-safaris_night.webp";
import expeditionEverestDay from "../assets/rideArt/110-expedition-everest_day.webp";
import expeditionEverestNight from "../assets/rideArt/110-expedition-everest_night.webp";
import kaliRiverRapidsDay from "../assets/rideArt/112-kali-river-rapids_day.webp";
import kaliRiverRapidsNight from "../assets/rideArt/112-kali-river-rapids_night.webp";
import wildlifeExpressTrainDay from "../assets/rideArt/655-wildlife-express-train_day.webp";
import wildlifeExpressTrainNight from "../assets/rideArt/655-wildlife-express-train_night.webp";
import zootopiaDay from "../assets/rideArt/14943-zootopia-better-zoogether_day.webp";
import zootopiaNight from "../assets/rideArt/14943-zootopia-better-zoogether_night.webp";
import blueysWildWorldDay from "../assets/rideArt/16545-blueys-wild-world-at-conservation-station_day.webp";
import blueysWildWorldNight from "../assets/rideArt/16545-blueys-wild-world-at-conservation-station_night.webp";
import gorillaFallsDay from "../assets/rideArt/651-gorilla-falls-exploration-trail_day.webp";
import gorillaFallsNight from "../assets/rideArt/651-gorilla-falls-exploration-trail_night.webp";
import findingNemoShowDay from "../assets/rideArt/10920-finding-nemo-the-big-blue-and-beyond_day.webp";
import findingNemoShowNight from "../assets/rideArt/10920-finding-nemo-the-big-blue-and-beyond_night.webp";
import festivalOfTheLionKingDay from "../assets/rideArt/657-festival-of-the-lion-king_day.webp";
import festivalOfTheLionKingNight from "../assets/rideArt/657-festival-of-the-lion-king_night.webp";

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
    "1190": {
      day: {
        src: ttaPeopleMoverDay,
        alt: "Illustration of a Tomorrowland Transit Authority PeopleMover tram on its elevated track",
      },
      night: {
        src: ttaPeopleMoverNight,
        alt: "Illustration of a Tomorrowland Transit Authority PeopleMover tram on its elevated track at night",
      },
    },
    "126": {
      day: {
        src: barnstormerDay,
        alt: "Illustration of The Barnstormer airplane coaster train beside its red barn",
      },
      night: {
        src: barnstormerNight,
        alt: "Illustration of The Barnstormer airplane coaster train beside its red barn at night",
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
    "128": {
      day: {
        src: enchantedTalesDay,
        alt: "Illustration of Maurice’s workshop and enchanted mirror in Enchanted Tales with Belle",
      },
      night: {
        src: enchantedTalesNight,
        alt: "Illustration of Maurice’s workshop and glowing enchanted mirror in Enchanted Tales with Belle at night",
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
    "143": {
      day: {
        src: speedwayDay,
        alt: "Illustration of a Tomorrowland Speedway race car on the track",
      },
      night: {
        src: speedwayNight,
        alt: "Illustration of a Tomorrowland Speedway race car on the track at night",
      },
    },
    "248": {
      day: {
        src: astroOrbiterDay,
        alt: "Illustration of Astro Orbiter rockets circling the attraction’s planetary spire",
      },
      night: {
        src: astroOrbiterNight,
        alt: "Illustration of Astro Orbiter rockets circling the attraction’s planetary spire at night",
      },
    },
    "141": {
      day: {
        src: magicCarpetsDay,
        alt: "Illustration of a flying carpet vehicle on The Magic Carpets of Aladdin above the attraction’s genie lamp",
      },
      night: {
        src: magicCarpetsNight,
        alt: "Illustration of a flying carpet vehicle on The Magic Carpets of Aladdin at night",
      },
    },
    "161": {
      day: {
        src: regalCarrouselDay,
        alt: "Illustration of a decorated horse on Prince Charming Regal Carrousel",
      },
      night: {
        src: regalCarrouselNight,
        alt: "Illustration of a decorated horse on Prince Charming Regal Carrousel at night",
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
  epcot: {
    "10916": {
      day: {
        src: guardiansDay,
        alt: "Illustration of the Starblaster sculpture outside the Guardians of the Galaxy: Cosmic Rewind attraction",
      },
      night: {
        src: guardiansNight,
        alt: "Illustration of the Starblaster sculpture outside the Guardians of the Galaxy: Cosmic Rewind attraction at night",
      },
    },
    "2679": {
      day: {
        src: frozenDay,
        alt: "Illustration of a Frozen Ever After Nordic boat in the frozen willow forest approaching the ice palace",
      },
      night: {
        src: frozenNight,
        alt: "Illustration of a Frozen Ever After Nordic boat in the frozen willow forest approaching the ice palace at night",
      },
    },
    "10914": {
      day: {
        src: remyDay,
        alt: "Illustration of a Remy’s Ratatouille Adventure rat-shaped ride vehicle inside the oversized kitchen",
      },
      night: {
        src: remyNight,
        alt: "Illustration of a Remy’s Ratatouille Adventure rat-shaped ride vehicle inside the oversized kitchen at night",
      },
    },
    "151": {
      day: {
        src: soarinDay,
        alt: "Illustration of Soarin’ hang-glider seats gliding over a canyon river vista",
      },
      night: {
        src: soarinNight,
        alt: "Illustration of Soarin’ hang-glider seats gliding over a canyon river vista at night",
      },
    },
    "158": {
      day: {
        src: missionSpaceDay,
        alt: "Illustration of the Mission: SPACE planet spheres and crescent sculpture at the attraction entrance",
      },
      night: {
        src: missionSpaceNight,
        alt: "Illustration of the Mission: SPACE planet spheres and crescent sculpture at the attraction entrance at night",
      },
    },
    "160": {
      day: {
        src: testTrackDay,
        alt: "Illustration of a Test Track vehicle on the outdoor speed loop",
      },
      night: {
        src: testTrackNight,
        alt: "Illustration of a Test Track vehicle on the outdoor speed loop at night",
      },
    },
    "155": {
      day: {
        src: figmentDay,
        alt: "Illustration of the Journey Into Imagination With Figment glass pyramids and fountains",
      },
      night: {
        src: figmentNight,
        alt: "Illustration of the Journey Into Imagination With Figment glass pyramids and fountains at night",
      },
    },
    "156": {
      day: {
        src: livingWithLandDay,
        alt: "Illustration of a Living with the Land boat cruising through the greenhouse growing area",
      },
      night: {
        src: livingWithLandNight,
        alt: "Illustration of a Living with the Land boat cruising through the greenhouse growing area at night",
      },
    },
    "159": {
      day: {
        src: spaceshipEarthDay,
        alt: "Illustration of the Spaceship Earth geodesic sphere",
      },
      night: {
        src: spaceshipEarthNight,
        alt: "Illustration of the Spaceship Earth geodesic sphere illuminated at night",
      },
    },
    "153": {
      day: {
        src: seasNemoDay,
        alt: "Illustration of a The Seas with Nemo & Friends clamshell ride vehicle in a bright sunlit underwater reef scene",
      },
      night: {
        src: seasNemoNight,
        alt: "Illustration of a The Seas with Nemo & Friends clamshell ride vehicle in a deep-blue nighttime underwater reef scene",
      },
    },
  },
  hollywood: {
    "6369": {
      day: {
        src: riseDay,
        alt: "Illustration of a Star Wars: Rise of the Resistance First Order Star Destroyer hangar bay",
      },
      night: {
        src: riseNight,
        alt: "Illustration of a Star Wars: Rise of the Resistance First Order Star Destroyer hangar bay at night",
      },
    },
    "5476": {
      day: {
        src: slinkyDogDashDay,
        alt: "Illustration of a Slinky Dog Dash coaster train winding through Toy Story Land",
      },
      night: {
        src: slinkyDogDashNight,
        alt: "Illustration of a Slinky Dog Dash coaster train winding through Toy Story Land at night",
      },
    },
    "6361": {
      day: {
        src: runawayRailwayDay,
        alt: "Illustration of the Mickey & Minnie’s Runaway Railway train in a colorful cartoon landscape",
      },
      night: {
        src: runawayRailwayNight,
        alt: "Illustration of the Mickey & Minnie’s Runaway Railway train in a colorful cartoon landscape at night",
      },
    },
    "117": {
      day: {
        src: toyStoryManiaDay,
        alt: "Illustration of a Toy Story Mania! carnival tram passing the midway game targets",
      },
      night: {
        src: toyStoryManiaNight,
        alt: "Illustration of a Toy Story Mania! carnival tram passing the midway game targets at night",
      },
    },
    "123": {
      day: {
        src: towerOfTerrorDay,
        alt: "Illustration of The Twilight Zone Tower of Terror hotel tower",
      },
      night: {
        src: towerOfTerrorNight,
        alt: "Illustration of The Twilight Zone Tower of Terror hotel tower at night",
      },
    },
    "6368": {
      day: {
        src: smugglersRunDay,
        alt: "Illustration of the Millennium Falcon: Smugglers Run starship at its Batuu docking bay",
      },
      night: {
        src: smugglersRunNight,
        alt: "Illustration of the Millennium Falcon: Smugglers Run starship at its Batuu docking bay at night",
      },
    },
    "5477": {
      day: {
        src: alienSaucersDay,
        alt: "Illustration of Alien Swirling Saucers spinning ride vehicles under the Little Green Aliens",
      },
      night: {
        src: alienSaucersNight,
        alt: "Illustration of Alien Swirling Saucers spinning ride vehicles under the Little Green Aliens at night",
      },
    },
    "120": {
      day: {
        src: starToursDay,
        alt: "Illustration of a Star Tours – The Adventures Continue StarSpeeder shuttle",
      },
      night: {
        src: starToursNight,
        alt: "Illustration of a Star Tours – The Adventures Continue StarSpeeder shuttle at night",
      },
    },
    "16342": {
      day: {
        src: rockNRollerDay,
        alt: "Illustration of the Rock ’n’ Roller Coaster Starring The Muppets stretch limo and electric guitar entrance",
      },
      night: {
        src: rockNRollerNight,
        alt: "Illustration of the Rock ’n’ Roller Coaster Starring The Muppets stretch limo and electric guitar entrance at night",
      },
    },
  },
  animal_kingdom: {
    "4439": {
      day: {
        src: flightOfPassageDay,
        alt: "Illustration of the Avatar Flight of Passage floating mountains and waterfalls over a Pandora lagoon",
      },
      night: {
        src: flightOfPassageNight,
        alt: "Illustration of the Avatar Flight of Passage floating mountains and waterfalls over a Pandora lagoon at night",
      },
    },
    "4438": {
      day: {
        src: naviRiverJourneyDay,
        alt: "Illustration of a Na’vi River Journey reed boat drifting through Pandora’s rainforest",
      },
      night: {
        src: naviRiverJourneyNight,
        alt: "Illustration of a Na’vi River Journey reed boat drifting through Pandora’s bioluminescent rainforest at night",
      },
    },
    "113": {
      day: {
        src: kilimanjaroSafarisDay,
        alt: "Illustration of a Kilimanjaro Safaris open-air truck passing a giraffe and elephants on the savanna",
      },
      night: {
        src: kilimanjaroSafarisNight,
        alt: "Illustration of a Kilimanjaro Safaris open-air truck passing a giraffe and elephants on the savanna at night",
      },
    },
    "110": {
      day: {
        src: expeditionEverestDay,
        alt: "Illustration of the Expedition Everest coaster track climbing the snow-capped Forbidden Mountain",
      },
      night: {
        src: expeditionEverestNight,
        alt: "Illustration of the Expedition Everest coaster track climbing the snow-capped Forbidden Mountain at night",
      },
    },
    "112": {
      day: {
        src: kaliRiverRapidsDay,
        alt: "Illustration of a Kali River Rapids raft spinning below a jungle waterfall and temple ruins",
      },
      night: {
        src: kaliRiverRapidsNight,
        alt: "Illustration of a Kali River Rapids raft spinning below a jungle waterfall and lantern-lit temple ruins at night",
      },
    },
    "655": {
      day: {
        src: wildlifeExpressTrainDay,
        alt: "Illustration of the Wildlife Express Train steam locomotive pulling open-air cars past its savanna station",
      },
      night: {
        src: wildlifeExpressTrainNight,
        alt: "Illustration of the Wildlife Express Train steam locomotive pulling open-air cars past its savanna station at night",
      },
    },
    "14943": {
      day: {
        src: zootopiaDay,
        alt: "Illustration of the Tree of Life, home of the Zootopia: Better Zoogether! theater, above a garden stream",
      },
      night: {
        src: zootopiaNight,
        alt: "Illustration of the Tree of Life, home of the Zootopia: Better Zoogether! theater, above a garden stream at night",
      },
    },
    "16545": {
      day: {
        src: blueysWildWorldDay,
        alt: "Illustration of the Conservation Station courtyard and animal mural, home of Bluey’s Wild World",
      },
      night: {
        src: blueysWildWorldNight,
        alt: "Illustration of the Conservation Station courtyard and animal mural, home of Bluey’s Wild World at night",
      },
    },
    "651": {
      day: {
        src: gorillaFallsDay,
        alt: "Illustration of a gorilla resting by a waterfall beside the Gorilla Falls Exploration Trail boardwalk",
      },
      night: {
        src: gorillaFallsNight,
        alt: "Illustration of a gorilla resting by a waterfall beside the Gorilla Falls Exploration Trail boardwalk at night",
      },
    },
    "10920": {
      day: {
        src: findingNemoShowDay,
        alt: "Illustration of the Finding Nemo: The Big Blue… and Beyond! stage with puppeteers guiding a ray and clownfish puppets",
      },
      night: {
        src: findingNemoShowNight,
        alt: "Illustration of the Finding Nemo: The Big Blue… and Beyond! stage with puppeteers guiding a ray and clownfish puppets at night",
      },
    },
    "657": {
      day: {
        src: festivalOfTheLionKingDay,
        alt: "Illustration of the Festival of the Lion King stage with the lion float, stilt dancers, and aerialists",
      },
      night: {
        src: festivalOfTheLionKingNight,
        alt: "Illustration of the Festival of the Lion King stage with the lion float, stilt dancers, and aerialists at night",
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
