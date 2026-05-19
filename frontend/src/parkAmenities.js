/**
 * ParkPlan AI — Park Amenities
 *
 * Park-level helper data:
 * water stops, bottle refill stations, AC breaks, restrooms, first aid, etc.
 *
 * V1 focus:
 * - Land-aware free water recommendations
 * - Bottle refill station suggestions
 * - Heat/hydration support for Magic Kingdom, EPCOT, and Hollywood Studios
 */

export const PARK_AMENITIES = {
  magic_kingdom: {
    waterByLand: {
      main_street: {
        quickService: [
          {
            name: "Casey's Corner",
            note: "Often has a self-service water station or pre-poured cups at the counter.",
          },
          {
            name: "Main Street Bakery",
            note: "Ask for a free cup of water. You can request a larger size.",
          },
        ],
        bottleRefill: [],
      },

      adventureland: {
        quickService: [
          {
            name: "Sunshine Tree Terrace",
            note: "Ask for free cups of water at the service window.",
          },
          {
            name: "Tortuga Tavern",
            note: "Useful when open seasonally.",
          },
        ],
        bottleRefill: [],
      },

      frontierland: {
        quickService: [
          {
            name: "Pecos Bill Tall Tale Inn and Cafe",
            note: "Reliable for multiple cups during busy hours.",
          },
          {
            name: "Westward Ho",
            note: "Quick stop near the wooden walkway.",
          },
        ],
        bottleRefill: [],
      },

      liberty_square: {
        quickService: [
          {
            name: "Columbia Harbour House",
            note: "Multiple counters usually make this a quick water stop.",
          },
          {
            name: "Sleepy Hollow",
            note: "Good quick cup near the castle hub.",
          },
        ],
        bottleRefill: [],
      },

      fantasyland: {
        quickService: [
          {
            name: "Gaston's Tavern",
            note: "Often a quick water stop without a long wait.",
          },
          {
            name: "Pinocchio Village Haus",
            note: "Good indoor option with a bottle refill station.",
          },
          {
            name: "The Friar's Nook",
            note: "Convenient walk-up window near the carousel.",
          },
        ],
        bottleRefill: [
          {
            name: "Pinocchio Village Haus",
            note: "Bottle refill station inside the dining room.",
          },
        ],
      },

      tomorrowland: {
        quickService: [
          {
            name: "Cosmic Ray's Starlight Café",
            note: "Indoor location with multiple counters for ice water.",
          },
          {
            name: "The Lunching Pad",
            note: "Located under the PeopleMover. Ask at the window.",
          },
          {
            name: "Auntie Gravity's Galactic Goodies",
            note: "Convenient if you are deeper in Tomorrowland.",
          },
        ],
        bottleRefill: [
          {
            name: "TRON Plaza",
            note: "Bottle refill station near the restrooms outside the attraction.",
          },
          {
            name: "Cosmic Ray's Starlight Café",
            note: "Bottle refill station inside the restaurant.",
          },
        ],
      },
    },
  },

  epcot: {
    waterByLand: {
      world_celebration: {
        quickService: [
          {
            name: "Connections Café & Eatery",
            note: "Ask for free ice water at the Starbucks side or Disney quick-service side. Eatery side also has self-serve beverage fountains.",
          },
        ],
        bottleRefill: [
          {
            name: "Central Plaza / front restroom areas",
            note: "Look for newer fountains and bottle-filler stations near main restroom areas.",
          },
        ],
      },

      world_discovery: {
        quickService: [
          {
            name: "Cool Wash / Refreshment Station",
            note: "Near Test Track. When open, ask at the counter for a cup of ice water.",
          },
          {
            name: "Odyssey Pavilion",
            note: "Between World Discovery and Mexico. If a festival counter is operating, ask for ice water there.",
          },
          {
            name: "Connections Café & Eatery",
            note: "Reliable nearby fallback toward World Celebration for free ice water and self-serve fountains.",
          },
        ],
        bottleRefill: [],
      },

      world_nature: {
        quickService: [
          {
            name: "Sunshine Seasons",
            note: "Lower level inside The Land. Great self-serve beverage stations for ice water or refilling bottles.",
          },
          {
            name: "The Land fruit cart",
            note: "Outside The Land pavilion entrance. Ask the cast member at the register for a cup of ice water.",
          },
        ],
        bottleRefill: [
          {
            name: "The Seas pavilion",
            note: "Water fountains and bottle refill stations are located near the restrooms inside the pavilion.",
          },
          {
            name: "Journey of Water",
            note: "Dedicated drinking fountains and bottle refill stations are built into the walkthrough trail area.",
          },
        ],
      },

      world_showcase_west: {
        quickService: [
          {
            name: "Les Halles Boulangerie-Patisserie",
            note: "At the back of the France pavilion. Ask at the register for a cup of water.",
          },
          {
            name: "Crêpes À Emporter",
            note: "Walk-up window in France where you can ask for water.",
          },
          {
            name: "Yorkshire County Fish Shop",
            note: "United Kingdom walk-up window. Often a strong stop for larger cups of ice water.",
          },
          {
            name: "Refreshment Port",
            note: "Near Canada. Walk up and request a complimentary cup of ice water.",
          },
          {
            name: "Joffrey's near Canada",
            note: "You can ask for ice water, though lines may be longer.",
          },
        ],
        bottleRefill: [
          {
            name: "World Showcase restroom areas",
            note: "Many newer water fountains around World Showcase have bottle-filler sensors.",
          },
        ],
      },

      world_showcase_center: {
        quickService: [
          {
            name: "Regal Eagle Smokehouse",
            note: "Excellent option in American Adventure. Indoor seating area has large self-serve beverage stations for ice and water.",
          },
          {
            name: "Fife & Drum Tavern",
            note: "Outdoor kiosk facing the lagoon at American Adventure. Ask for ice water.",
          },
          {
            name: "Katsura Grill",
            note: "Up the hill in Japan. Ask for ice water at the registers.",
          },
          {
            name: "Spice Road Table",
            note: "Morocco area. On hot days, a self-serve water dispenser may be set near the host stand or entrance.",
          },
          {
            name: "Tangierine Café / Flavors of the Medina",
            note: "When operating as an indoor festival space, ask for water at the counter.",
          },
          {
            name: "Sommerfest",
            note: "Germany quick-service window toward the back of the pavilion. Ask the cashier for water.",
          },
          {
            name: "Gelateria Toscana",
            note: "Italy service window. You can ask for a cup of water.",
          },
        ],
        bottleRefill: [
          {
            name: "World Showcase restroom areas",
            note: "Check the newer fountains outside main restroom areas for bottle-filler sensors.",
          },
        ],
      },

      world_showcase_east: {
        quickService: [
          {
            name: "La Cantina de San Angel",
            note: "Mexico lagoon-side quick-service. Ask at the counter or beverage pick-up window.",
          },
          {
            name: "Kringla Bakeri og Kafe",
            note: "Norway bakery. Walk through the queue and ask at the register for a cup.",
          },
          {
            name: "Lotus Blossom Café",
            note: "China quick-service. Often one of the easiest spots for pre-poured ice water with lids and straws.",
          },
          {
            name: "Refreshment Outpost",
            note: "Between China and Germany. Walk-up counter service that can provide cups of ice water.",
          },
        ],
        bottleRefill: [
          {
            name: "World Showcase restroom areas",
            note: "Many restroom-area fountains have been upgraded with bottle-filler sensors.",
          },
        ],
      },
    },
  },

  hollywood: {
    waterByLand: {
      hollywood_boulevard: {
        quickService: [
          {
            name: "The Trolley Car Café",
            note: "Starbucks-style location near the front. Ask for a free cup of ice water, but expect longer lines during morning rush.",
          },
          {
            name: "ABC Commissary",
            note: "Reliable nearby quick-service option with indoor AC seating and ice water available at the counter.",
          },
        ],
        bottleRefill: [
          {
            name: "Front-of-park restroom areas",
            note: "Check newer fountains near main restroom areas for bottle refill stations.",
          },
        ],
      },

      sunset_boulevard: {
        quickService: [
          {
            name: "Sunset Ranch Market",
            note: "Outdoor quick-service area near Tower of Terror and Rock 'n' Roller Coaster. Ask at open windows for ice water.",
          },
          {
            name: "Rosie's All-American Café",
            note: "Walk-up window in Sunset Ranch Market. Good water stop if you are near Tower or Rock 'n' Roller Coaster.",
          },
          {
            name: "Catalina Eddie's",
            note: "Another Sunset Ranch Market window where you can request ice water when open.",
          },
        ],
        bottleRefill: [],
      },

      echo_lake: {
        quickService: [
          {
            name: "Backlot Express",
            note: "Excellent indoor AC reset near Star Tours with quick-service counters for free ice water.",
          },
          {
            name: "Dockside Diner",
            note: "Walk-up option near Echo Lake. Ask at the window for ice water when open.",
          },
        ],
        bottleRefill: [
          {
            name: "Echo Lake restroom areas",
            note: "Check nearby restroom-area fountains for refill options.",
          },
        ],
      },

      grand_avenue: {
        quickService: [
          {
            name: "PizzeRizzo",
            note: "Indoor seating and quick-service counters make this a useful AC and water reset near Muppet*Vision.",
          },
          {
            name: "BaseLine Tap House",
            note: "Good shaded Grand Avenue stop. Ask for water at the counter/bar area when open.",
          },
        ],
        bottleRefill: [],
      },

      star_wars_galaxys_edge: {
        quickService: [
          {
            name: "Docking Bay 7 Food and Cargo",
            note: "Best Galaxy's Edge water and AC reset. Ask at the counter for ice water and use the indoor seating if available.",
          },
          {
            name: "Ronto Roasters",
            note: "Walk-up counter where you can request water when open, but seating/AC is more limited.",
          },
          {
            name: "Milk Stand",
            note: "Walk-up beverage window. You can ask for water, but lines may not make it the fastest option.",
          },
        ],
        bottleRefill: [
          {
            name: "Galaxy's Edge restroom areas",
            note: "Look for bottle refill stations near the land's restroom areas, especially useful because the land gets hot.",
          },
        ],
      },

      toy_story_land: {
        quickService: [
          {
            name: "Woody's Lunch Box",
            note: "Main Toy Story Land quick-service window. Ask for ice water, but lines and outdoor heat can make this less ideal at peak times.",
          },
        ],
        bottleRefill: [
          {
            name: "Toy Story Land restroom area",
            note: "Use restroom-area fountains/refill stations when available. This land is exposed, so refill before staying too long.",
          },
        ],
      },

      animation_courtyard: {
        quickService: [
          {
            name: "The Market",
            note: "Small nearby stand when open. Ask for water at the register.",
          },
          {
            name: "ABC Commissary",
            note: "Nearby fallback with indoor AC seating and counter-service water.",
          },
        ],
        bottleRefill: [
          {
            name: "Animation Courtyard restroom areas",
            note: "Check restroom-area fountains for bottle refill options.",
          },
        ],
      },

      commissary_lane: {
        quickService: [
          {
            name: "ABC Commissary",
            note: "One of the strongest Hollywood Studios hydration resets: indoor AC seating, quick-service counters, and easy access from Commissary Lane.",
          },
          {
            name: "Sci-Fi Dine-In Theater Restaurant",
            note: "Table-service option nearby. Not a quick water stop, but useful if you already have a reservation and need a full AC break.",
          },
        ],
        bottleRefill: [],
      },
    },
  },
};

export function getWaterOptionsForLand(parkId, land) {
  const park = PARK_AMENITIES[parkId];

  if (!park) {
    return {
      quickService: [],
      bottleRefill: [],
    };
  }

  if (!land || land === "not_sure") {
    if (parkId === "epcot") {
      return {
        quickService: [
          PARK_AMENITIES.epcot.waterByLand.world_celebration.quickService[0],
          PARK_AMENITIES.epcot.waterByLand.world_nature.quickService[0],
          PARK_AMENITIES.epcot.waterByLand.world_showcase_center.quickService[0],
        ],
        bottleRefill: [
          PARK_AMENITIES.epcot.waterByLand.world_nature.bottleRefill[0],
          PARK_AMENITIES.epcot.waterByLand.world_nature.bottleRefill[1],
        ],
      };
    }

    if (parkId === "magic_kingdom") {
      return {
        quickService: [
          PARK_AMENITIES.magic_kingdom.waterByLand.main_street.quickService[0],
          PARK_AMENITIES.magic_kingdom.waterByLand.tomorrowland.quickService[0],
          PARK_AMENITIES.magic_kingdom.waterByLand.liberty_square.quickService[0],
        ],
        bottleRefill: [],
      };
    }

    if (parkId === "hollywood") {
      return {
        quickService: [
          PARK_AMENITIES.hollywood.waterByLand.commissary_lane.quickService[0],
          PARK_AMENITIES.hollywood.waterByLand.echo_lake.quickService[0],
          PARK_AMENITIES.hollywood.waterByLand.star_wars_galaxys_edge.quickService[0],
        ],
        bottleRefill: [
          PARK_AMENITIES.hollywood.waterByLand.star_wars_galaxys_edge.bottleRefill[0],
          PARK_AMENITIES.hollywood.waterByLand.toy_story_land.bottleRefill[0],
        ],
      };
    }

    return {
      quickService: [],
      bottleRefill: [],
    };
  }

  return (
    park.waterByLand?.[land] || {
      quickService: [],
      bottleRefill: [],
    }
  );
}
