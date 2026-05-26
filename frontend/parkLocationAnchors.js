/**
 * ParkPlan AI — Park Location Anchors
 *
 * V1 location data for optional GPS / "Use My Location".
 * These are attraction/area anchor points, not exact land borders.
 */

const LAND_LABELS = {
  main_street: "Main Street / near entrance, shops, castle hub",
  adventureland: "Adventureland / near Pirates, Jungle Cruise, Aladdin",
  frontierland: "Frontierland / near Big Thunder, Tiana’s, Country Bears",
  liberty_square: "Liberty Square / near Haunted Mansion, Hall of Presidents",
  fantasyland:
    "Fantasyland / near Peter Pan, Small World, Seven Dwarfs, Little Mermaid",
  tomorrowland:
    "Tomorrowland / near Space Mountain, TRON, Buzz, PeopleMover",
};

const MAGIC_KINGDOM_ANCHORS = [
  { id: "wdwr", name: "Walt Disney World Railroad", landKey: "main_street", type: "Ride", lat: 28.4166, lng: -81.5813 },
  { id: "msv", name: "Main Street Vehicles", landKey: "main_street", type: "Ride", lat: 28.4174, lng: -81.5814 },

  { id: "potc", name: "Pirates of the Caribbean", landKey: "adventureland", type: "Ride", lat: 28.4181, lng: -81.5833 },
  { id: "jc", name: "Jungle Cruise", landKey: "adventureland", type: "Ride", lat: 28.4182, lng: -81.5822 },
  { id: "sft", name: "Swiss Family Treehouse", landKey: "adventureland", type: "Walk-Through", lat: 28.4184, lng: -81.5818 },
  { id: "mca", name: "The Magic Carpets of Aladdin", landKey: "adventureland", type: "Ride", lat: 28.418, lng: -81.5826 },
  { id: "etr", name: "Walt Disney's Enchanted Tiki Room", landKey: "adventureland", type: "Show", lat: 28.418, lng: -81.5819 },

  { id: "btmr", name: "Big Thunder Mountain Railroad", landKey: "frontierland", type: "Ride", lat: 28.4193, lng: -81.5847 },
  { id: "tba", name: "Tiana's Bayou Adventure", landKey: "frontierland", type: "Ride", lat: 28.4184, lng: -81.5851 },
  { id: "cbmj", name: "Country Bear Musical Jamboree", landKey: "frontierland", type: "Show", lat: 28.4189, lng: -81.5839 },
  { id: "tsi", name: "Tom Sawyer Island", landKey: "frontierland", type: "Walk-Through", lat: 28.4194, lng: -81.5837 },

  { id: "hm", name: "Haunted Mansion", landKey: "liberty_square", type: "Ride", lat: 28.4211, lng: -81.5828 },
  { id: "hop", name: "The Hall of Presidents", landKey: "liberty_square", type: "Show", lat: 28.4199, lng: -81.5824 },
  { id: "lsr", name: "Liberty Square Riverboat", landKey: "liberty_square", type: "Ride", lat: 28.4202, lng: -81.5827 },

  { id: "sdmt", name: "Seven Dwarfs Mine Train", landKey: "fantasyland", type: "Ride", lat: 28.4206, lng: -81.5802 },
  { id: "ppf", name: "Peter Pan's Flight", landKey: "fantasyland", type: "Ride", lat: 28.4205, lng: -81.5815 },
  { id: "iasw", name: "it's a small world", landKey: "fantasyland", type: "Ride", lat: 28.4209, lng: -81.5821 },
  { id: "dtfe", name: "Dumbo the Flying Elephant", landKey: "fantasyland", type: "Ride", lat: 28.4214, lng: -81.5786 },
  { id: "pcrc", name: "Prince Charming Regal Carrousel", landKey: "fantasyland", type: "Ride", lat: 28.4204, lng: -81.581 },
  { id: "mp3d", name: "Mickey's PhilharMagic", landKey: "fantasyland", type: "Show", lat: 28.4203, lng: -81.5814 },
  { id: "etwb", name: "Enchanted Tales with Belle", landKey: "fantasyland", type: "Interactive", lat: 28.4215, lng: -81.5806 },
  { id: "mawp", name: "The Many Adventures of Winnie the Pooh", landKey: "fantasyland", type: "Ride", lat: 28.4199, lng: -81.5802 },
  { id: "mtp", name: "Mad Tea Party", landKey: "fantasyland", type: "Ride", lat: 28.4202, lng: -81.5791 },
  { id: "tlm", name: "Under the Sea ~ Journey of The Little Mermaid", landKey: "fantasyland", type: "Ride", lat: 28.4213, lng: -81.5797 },
  { id: "tbs", name: "The Barnstormer", landKey: "fantasyland", type: "Ride", lat: 28.421, lng: -81.5781 },

  { id: "sm", name: "Space Mountain", landKey: "tomorrowland", type: "Ride", lat: 28.4191, lng: -81.5771 },
  { id: "tron", name: "TRON Lightcycle / Run", landKey: "tomorrowland", type: "Ride", lat: 28.4222, lng: -81.5776 },
  { id: "blsrs", name: "Buzz Lightyear's Space Ranger Spin", landKey: "tomorrowland", type: "Ride", lat: 28.4187, lng: -81.5788 },
  { id: "ts", name: "Tomorrowland Speedway", landKey: "tomorrowland", type: "Ride", lat: 28.4196, lng: -81.5781 },
  { id: "ao", name: "Astro Orbiter", landKey: "tomorrowland", type: "Ride", lat: 28.4187, lng: -81.578 },
  { id: "ttapm", name: "Tomorrowland Transit Authority PeopleMover", landKey: "tomorrowland", type: "Ride", lat: 28.4187, lng: -81.578 },
  { id: "cop", name: "Walt Disney's Carousel of Progress", landKey: "tomorrowland", type: "Show", lat: 28.4178, lng: -81.5772 },
  { id: "milf", name: "Monsters, Inc. Laugh Floor", landKey: "tomorrowland", type: "Show", lat: 28.4182, lng: -81.5785 },
];

function buildZones(anchors) {
  return anchors.reduce((zones, anchor) => {
    const { landKey, ...cleanAnchor } = anchor;

    if (!zones[landKey]) {
      zones[landKey] = {
        label: LAND_LABELS[landKey] || landKey,
        radiusMeters: 375,
        anchors: [],
      };
    }

    zones[landKey].anchors.push(cleanAnchor);
    return zones;
  }, {});
}

export const PARK_LOCATION_ANCHORS = {
  magic_kingdom: buildZones(MAGIC_KINGDOM_ANCHORS),
};

export function getLocationZonesForPark(parkId) {
  return PARK_LOCATION_ANCHORS[parkId] || {};
}
