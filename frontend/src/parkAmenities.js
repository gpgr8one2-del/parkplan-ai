/**
 * ParkPlan AI — Park Amenities
 *
 * Park-level helper data:
 * water stops, bottle refill stations, AC breaks, restrooms, first aid, etc.
 *
 * V1 focus:
 * Magic Kingdom water recommendations by land.
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
};

export function getWaterOptionsForLand(parkId, land) {
  const park = PARK_AMENITIES[parkId];

  if (!park || !land || land === "not_sure") {
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
