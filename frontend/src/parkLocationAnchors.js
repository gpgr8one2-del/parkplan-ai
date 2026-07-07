/**
 * ParkPlan AI — Park Location Anchors
 *
 * V1 location data for optional GPS / "Use My Location".
 * These are attraction/area anchor points, not exact land borders.
 */

const LAND_LABELS = {
  // Magic Kingdom
  main_street: "Main Street / near entrance, shops, castle hub",
  adventureland: "Adventureland / near Pirates, Jungle Cruise, Aladdin",
  frontierland: "Frontierland / near Big Thunder, Tiana’s, Country Bears",
  liberty_square: "Liberty Square / near Haunted Mansion, Hall of Presidents",
  fantasyland:
    "Fantasyland / near Peter Pan, Small World, Seven Dwarfs, Little Mermaid",
  tomorrowland:
    "Tomorrowland / near Space Mountain, TRON, Buzz, PeopleMover",

  // EPCOT
  world_celebration:
    "World Celebration / near Spaceship Earth, Connections, Creations",
  world_discovery:
    "World Discovery / near Guardians, Test Track, Mission: SPACE",
  world_nature:
    "World Nature / near Soarin’, The Land, The Seas, Moana",
  world_showcase_west:
    "World Showcase West / near Remy, France, UK, Canada",
  world_showcase_center:
    "World Showcase Center / near America, Japan, Italy, Morocco",
  world_showcase_east:
    "World Showcase East / near Frozen, Mexico, Norway, China",

  // Hollywood Studios
  hollywood_boulevard:
    "Hollywood Boulevard / near Mickey & Minnie’s Runaway Railway",
  sunset_boulevard:
    "Sunset Boulevard / near Tower of Terror, Rock ’n’ Roller, Villains",
  echo_lake:
    "Echo Lake / near Star Tours, Frozen Sing-Along, Backlot Express",
  grand_avenue:
    "Grand Avenue / near BaseLine, Monstropolis / former Muppets area",
  star_wars_galaxys_edge:
    "Galaxy’s Edge / near Rise, Falcon, Docking Bay 7",
  toy_story_land:
    "Toy Story Land / near Slinky, Toy Story Mania, Alien Saucers",
  animation_courtyard:
    "Animation Courtyard / near Disney Junior, Little Mermaid, Mickey Mouse Clubhouse",
  commissary_lane:
    "Commissary Lane / near ABC Commissary, Sci-Fi Dine-In",

  // Animal Kingdom
  oasis:
    "Oasis / near entrance paths and Oasis trails",
  discovery_island:
    "Discovery Island / near Tree of Life, Zootopia, Nemo, Adventurers Outpost",
  pandora:
    "Pandora / near Flight of Passage, Na’vi River Journey, Satu’li",
  africa:
    "Africa / near Kilimanjaro Safaris, Festival of the Lion King, Gorilla Falls",
  asia:
    "Asia / near Expedition Everest, Kali River Rapids, Maharajah Jungle Trek",
  rafikis_planet_watch:
    "Rafiki’s Planet Watch / Bluey’s Wild World, Animation Experience, Affection Section",
  tropical_americas_construction:
    "Tropical Americas construction area / former DinoLand side",
};

const MAGIC_KINGDOM_ANCHORS = [
  { id: "wdwr", name: "Walt Disney World Railroad", landKey: "main_street", type: "Ride", lat: 28.4166, lng: -81.5813 },
  { id: "msv", name: "Main Street Vehicles", landKey: "main_street", type: "Ride", lat: 28.4174, lng: -81.5814 },
  { id: "mk_entry_tunnels", name: "Main Street entry tunnels", landKey: "main_street", type: "Entrance", lat: 28.4163, lng: -81.5812 },
  { id: "town_square", name: "Town Square / flagpole", landKey: "main_street", type: "Landmark", lat: 28.4169, lng: -81.5812 },
  { id: "main_street_center", name: "Main Street USA center corridor", landKey: "main_street", type: "Pathway", lat: 28.4178, lng: -81.5812 },
  { id: "main_street_castle_hub", name: "Main Street castle hub approach", landKey: "main_street", type: "Transition", lat: 28.4187, lng: -81.5810 },

  { id: "potc", name: "Pirates of the Caribbean", landKey: "adventureland", type: "Ride", lat: 28.4181, lng: -81.5833 },
  { id: "pirates_queue", name: "Pirates of the Caribbean queue area", landKey: "adventureland", type: "Queue", lat: 28.4180, lng: -81.5837 },
  { id: "pirates_exit_path", name: "Pirates exit / Adventureland west path", landKey: "adventureland", type: "Pathway", lat: 28.4178, lng: -81.5835 },
  { id: "jc", name: "Jungle Cruise", landKey: "adventureland", type: "Ride", lat: 28.4182, lng: -81.5822 },
  { id: "sft", name: "Swiss Family Treehouse", landKey: "adventureland", type: "Walk-Through", lat: 28.4184, lng: -81.5818 },
  { id: "mca", name: "The Magic Carpets of Aladdin", landKey: "adventureland", type: "Ride", lat: 28.418, lng: -81.5826 },
  { id: "adventureland_bazaar", name: "Adventureland bazaar / Aladdin courtyard", landKey: "adventureland", type: "Shop", lat: 28.4178, lng: -81.5823 },
  { id: "adventureland_bridge", name: "Adventureland entrance bridge", landKey: "adventureland", type: "Transition", lat: 28.4176, lng: -81.5818 },
  { id: "etr", name: "Walt Disney's Enchanted Tiki Room", landKey: "adventureland", type: "Show", lat: 28.418, lng: -81.5819 },

  { id: "btmr", name: "Big Thunder Mountain Railroad", landKey: "frontierland", type: "Ride", lat: 28.4193, lng: -81.5847 },
  { id: "tba", name: "Tiana's Bayou Adventure", landKey: "frontierland", type: "Ride", lat: 28.4184, lng: -81.5851 },
  { id: "pecos_bill_area", name: "Pecos Bill / Frontierland dining area", landKey: "frontierland", type: "Dining", lat: 28.4185, lng: -81.5841 },
  { id: "frontierland_boardwalk", name: "Frontierland river boardwalk", landKey: "frontierland", type: "Pathway", lat: 28.4190, lng: -81.5842 },
  { id: "cbmj", name: "Country Bear Musical Jamboree", landKey: "frontierland", type: "Show", lat: 28.4189, lng: -81.5839 },
  { id: "tsi", name: "Tom Sawyer Island", landKey: "frontierland", type: "Walk-Through", lat: 28.4194, lng: -81.5837 },

  { id: "hm", name: "Haunted Mansion", landKey: "liberty_square", type: "Ride", lat: 28.4211, lng: -81.5828 },
  { id: "hop", name: "The Hall of Presidents", landKey: "liberty_square", type: "Show", lat: 28.4199, lng: -81.5824 },
  { id: "lsr", name: "Liberty Square Riverboat", landKey: "liberty_square", type: "Ride", lat: 28.4202, lng: -81.5827 },

  // Border helper anchors.
  // These are not ride entrances. They help GPS clustering avoid bad land flips
  // near Small World / Peter Pan / Haunted Mansion / Riverboat.
  {
    id: "fantasyland_west_bridge",
    name: "Fantasyland West / near Peter Pan and Small World",
    landKey: "fantasyland",
    type: "Area",
    lat: 28.4207,
    lng: -81.5818,
  },
  {
    id: "fantasyland_castle_side",
    name: "Fantasyland Castle Side / near PhilharMagic and Carrousel",
    landKey: "fantasyland",
    type: "Area",
    lat: 28.42035,
    lng: -81.58125,
  },
  {
    id: "liberty_fantasy_border",
    name: "Liberty Square / Fantasyland border",
    landKey: "liberty_square",
    type: "Area",
    lat: 28.42055,
    lng: -81.58245,
  },

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
  { id: "tomorrowland_entry_bridge", name: "Tomorrowland entrance bridge / hub side", landKey: "tomorrowland", type: "Transition", lat: 28.41865, lng: -81.57965 },
  { id: "tomorrowland_buzz_monsters_corridor", name: "Buzz Lightyear / Monsters Laugh Floor corridor", landKey: "tomorrowland", type: "Area", lat: 28.41845, lng: -81.57865 },
  { id: "tomorrowland_rockettower_plaza", name: "Tomorrowland central plaza / Rockettower Plaza", landKey: "tomorrowland", type: "Area", lat: 28.41875, lng: -81.57825 },
  { id: "ts", name: "Tomorrowland Speedway", landKey: "tomorrowland", type: "Ride", lat: 28.4196, lng: -81.5781 },
  { id: "ao", name: "Astro Orbiter", landKey: "tomorrowland", type: "Ride", lat: 28.4187, lng: -81.578 },
  { id: "ttapm", name: "Tomorrowland Transit Authority PeopleMover", landKey: "tomorrowland", type: "Ride", lat: 28.4187, lng: -81.578 },
  { id: "cop", name: "Walt Disney's Carousel of Progress", landKey: "tomorrowland", type: "Show", lat: 28.4178, lng: -81.5772 },
  { id: "milf", name: "Monsters, Inc. Laugh Floor", landKey: "tomorrowland", type: "Show", lat: 28.4182, lng: -81.5785 },
];


const EPCOT_ANCHORS = [
  // World Celebration
  { id: "se", name: "Spaceship Earth", landKey: "world_celebration", type: "Ride", lat: 28.3753, lng: -81.5494 },
  { id: "cce", name: "Connections Café and Eatery", landKey: "world_celebration", type: "Dining", lat: 28.3749, lng: -81.5484 },
  { id: "cs", name: "Creations Shop", landKey: "world_celebration", type: "Shop", lat: 28.3745, lng: -81.5484 },
  { id: "jow", name: "Journey of Water", landKey: "world_celebration", type: "Walk-Through", lat: 28.3746, lng: -81.5508 },

  // World Discovery
  { id: "gotg", name: "Guardians of the Galaxy: Cosmic Rewind", landKey: "world_discovery", type: "Ride", lat: 28.3746, lng: -81.5479 },
  { id: "tt", name: "Test Track", landKey: "world_discovery", type: "Ride", lat: 28.3733, lng: -81.5477 },
  { id: "ms", name: "Mission: SPACE", landKey: "world_discovery", type: "Ride", lat: 28.3739, lng: -81.5466 },
  { id: "s220", name: "Space 220", landKey: "world_discovery", type: "Dining", lat: 28.3741, lng: -81.5461 },

  // World Nature
  { id: "soarin", name: "Soarin'", landKey: "world_nature", type: "Ride", lat: 28.3729, lng: -81.5526 },
  { id: "lwtl", name: "Living with the Land", landKey: "world_nature", type: "Ride", lat: 28.3730, lng: -81.5524 },
  { id: "tswnf", name: "The Seas with Nemo & Friends", landKey: "world_nature", type: "Ride", lat: 28.3741, lng: -81.5518 },
  { id: "jiif", name: "Journey Into Imagination With Figment", landKey: "world_nature", type: "Ride", lat: 28.3727, lng: -81.5512 },

  // World Showcase West
  { id: "rra", name: "Remy’s Ratatouille Adventure", landKey: "world_showcase_west", type: "Ride", lat: 28.3682, lng: -81.5530 },
  { id: "p_fra", name: "France Pavilion", landKey: "world_showcase_west", type: "Pavilion", lat: 28.3686, lng: -81.5528 },
  { id: "p_uk", name: "United Kingdom Pavilion", landKey: "world_showcase_west", type: "Pavilion", lat: 28.3693, lng: -81.5532 },
  { id: "p_can", name: "Canada Pavilion", landKey: "world_showcase_west", type: "Pavilion", lat: 28.3702, lng: -81.5524 },
  { id: "ig", name: "International Gateway", landKey: "world_showcase_west", type: "Entrance", lat: 28.3690, lng: -81.5516 },

  // World Showcase Center
  { id: "taa", name: "The American Adventure", landKey: "world_showcase_center", type: "Show", lat: 28.3675, lng: -81.5495 },
  { id: "p_jap", name: "Japan Pavilion", landKey: "world_showcase_center", type: "Pavilion", lat: 28.3674, lng: -81.5501 },
  { id: "p_ita", name: "Italy Pavilion", landKey: "world_showcase_center", type: "Pavilion", lat: 28.3684, lng: -81.5478 },
  { id: "p_mor", name: "Morocco Pavilion", landKey: "world_showcase_center", type: "Pavilion", lat: 28.3678, lng: -81.5514 },

  // World Showcase East
  { id: "fea", name: "Frozen Ever After", landKey: "world_showcase_east", type: "Ride", lat: 28.3708, lng: -81.5462 },
  { id: "gft", name: "Gran Fiesta Tour", landKey: "world_showcase_east", type: "Ride", lat: 28.3719, lng: -81.5469 },
  { id: "p_nor", name: "Norway Pavilion", landKey: "world_showcase_east", type: "Pavilion", lat: 28.3713, lng: -81.5469 },
  { id: "p_chn", name: "China Pavilion", landKey: "world_showcase_east", type: "Pavilion", lat: 28.3715, lng: -81.5458 },
];


const HOLLYWOOD_ANCHORS = [
  // Hollywood Boulevard
  { id: "mmrr", name: "Mickey & Minnie’s Runaway Railway", landKey: "hollywood_boulevard", type: "Ride", lat: 28.3565, lng: -81.5606 },
  { id: "ct", name: "Chinese Theatre", landKey: "hollywood_boulevard", type: "Landmark", lat: 28.3565, lng: -81.5606 },
  { id: "hse", name: "Hollywood Studios Entrance", landKey: "hollywood_boulevard", type: "Entrance", lat: 28.3575, lng: -81.5582 },

  // Sunset Boulevard
  { id: "tot", name: "Tower of Terror", landKey: "sunset_boulevard", type: "Ride", lat: 28.3601, lng: -81.5598 },
  { id: "rnrc_mup", name: "Rock 'n' Roller Coaster starring the Muppets", landKey: "sunset_boulevard", type: "Ride", lat: 28.3594, lng: -81.5607 },
  { id: "batb", name: "Beauty and the Beast Live on Stage", landKey: "sunset_boulevard", type: "Show", lat: 28.3593, lng: -81.5591 },
  { id: "villains_unfairly", name: "Disney Villains: Unfairly Ever After", landKey: "sunset_boulevard", type: "Show", lat: 28.35983, lng: -81.56061 },

  // Echo Lake
  { id: "echo_lake_center", name: "Echo Lake center path", landKey: "echo_lake", type: "Pathway", lat: 28.3571, lng: -81.5609 },
  { id: "backlot_express_area", name: "Backlot Express / Echo Lake dining area", landKey: "echo_lake", type: "Dining", lat: 28.3567, lng: -81.5618 },
  { id: "st", name: "Star Tours", landKey: "echo_lake", type: "Ride", lat: 28.3564, lng: -81.5622 },
  { id: "fsa", name: "Frozen Sing-Along", landKey: "echo_lake", type: "Show", lat: 28.3561, lng: -81.5613 },
  { id: "ble", name: "Backlot Express", landKey: "echo_lake", type: "Dining", lat: 28.3561, lng: -81.5619 },
  { id: "indy", name: "Indiana Jones Epic Stunt Spectacular", landKey: "echo_lake", type: "Show", lat: 28.3559, lng: -81.5613 },

  // Grand Avenue / Commissary Lane
  { id: "blth", name: "BaseLine Tap House", landKey: "grand_avenue", type: "Dining", lat: 28.3567, lng: -81.5623 },
  { id: "monstropolis", name: "Monstropolis Land / Former Muppets Courtyard", landKey: "grand_avenue", type: "Zone", lat: 28.3570, lng: -81.5625 },
  { id: "abc", name: "ABC Commissary", landKey: "commissary_lane", type: "Dining", lat: 28.3563, lng: -81.5611 },
  { id: "scifi", name: "Sci-Fi Dine-In Theater Restaurant", landKey: "commissary_lane", type: "Dining", lat: 28.3566, lng: -81.5613 },

  // Galaxy's Edge
  { id: "rotr", name: "Star Wars: Rise of the Resistance", landKey: "star_wars_galaxys_edge", type: "Ride", lat: 28.3540, lng: -81.5610 },
  { id: "rise_queue_area", name: "Rise of the Resistance queue area", landKey: "star_wars_galaxys_edge", type: "Queue", lat: 28.3537, lng: -81.5612 },
  { id: "batuu_resistance_forest", name: "Resistance forest / Batuu south path", landKey: "star_wars_galaxys_edge", type: "Pathway", lat: 28.3543, lng: -81.5614 },
  { id: "smr", name: "Millennium Falcon: Smugglers Run", landKey: "star_wars_galaxys_edge", type: "Ride", lat: 28.3553, lng: -81.5626 },
  { id: "falcon_courtyard", name: "Millennium Falcon courtyard", landKey: "star_wars_galaxys_edge", type: "Landmark", lat: 28.3551, lng: -81.5625 },
  { id: "db7", name: "Docking Bay 7 Food and Cargo", landKey: "star_wars_galaxys_edge", type: "Dining", lat: 28.3556, lng: -81.5621 },
  { id: "bmp", name: "Batuu Marketplace", landKey: "star_wars_galaxys_edge", type: "Shop Hub", lat: 28.3558, lng: -81.5625 },
  { id: "batuu_toy_story_transition", name: "Batuu to Toy Story Land transition", landKey: "star_wars_galaxys_edge", type: "Transition", lat: 28.3558, lng: -81.5612 },

  // Toy Story Land
  { id: "toy_story_land_entrance", name: "Toy Story Land entrance / Woody sign", landKey: "toy_story_land", type: "Entrance", lat: 28.3560, lng: -81.5600 },
  { id: "toy_story_land_center", name: "Toy Story Land central walkway", landKey: "toy_story_land", type: "Pathway", lat: 28.3558, lng: -81.5591 },
  { id: "sdd", name: "Slinky Dog Dash", landKey: "toy_story_land", type: "Ride", lat: 28.3554, lng: -81.5586 },
  { id: "slinky_queue_area", name: "Slinky Dog Dash queue area", landKey: "toy_story_land", type: "Queue", lat: 28.3552, lng: -81.5589 },
  { id: "tsm", name: "Toy Story Mania", landKey: "toy_story_land", type: "Ride", lat: 28.3562, lng: -81.5591 },
  { id: "ass", name: "Alien Swirling Saucers", landKey: "toy_story_land", type: "Ride", lat: 28.3552, lng: -81.5578 },
  { id: "wlb", name: "Woody’s Lunch Box", landKey: "toy_story_land", type: "Dining", lat: 28.3561, lng: -81.5583 },

  // Animation Courtyard
  { id: "djpd", name: "Disney Junior Play and Dance", landKey: "animation_courtyard", type: "Show", lat: 28.3566, lng: -81.5597 },
  { id: "wdp", name: "Walt Disney Presents", landKey: "animation_courtyard", type: "Exhibit", lat: 28.3564, lng: -81.5595 },
  { id: "little_mermaid_show", name: "The Little Mermaid – A Musical Adventure", landKey: "animation_courtyard", type: "Show", lat: 28.35756, lng: -81.56077 },
  { id: "mickey_mouse_clubhouse", name: "Disney Jr. Mickey Mouse Clubhouse", landKey: "animation_courtyard", type: "Show", lat: 28.35797, lng: -81.56087 },
];



const ANIMAL_KINGDOM_ANCHORS = [
  // Oasis / Entrance
  { id: "ak_entrance", name: "Animal Kingdom Entrance", landKey: "oasis", type: "Entrance", lat: 28.3578, lng: -81.5905 },
  { id: "ak_entry_touchpoints", name: "Animal Kingdom entry touchpoints", landKey: "oasis", type: "Entrance", lat: 28.3574, lng: -81.5908 },
  { id: "oasis_front_path", name: "Oasis front entry path", landKey: "oasis", type: "Pathway", lat: 28.3581, lng: -81.5906 },
  { id: "oasis_trails", name: "Oasis Trails / Oasis Exhibits", landKey: "oasis", type: "Area", lat: 28.3585, lng: -81.5904 },
  { id: "oasis_discovery_transition", name: "Oasis to Discovery Island transition", landKey: "oasis", type: "Transition", lat: 28.3589, lng: -81.5902 },

  // Discovery Island
  { id: "discovery_entry_bridge", name: "Discovery Island entry bridge", landKey: "discovery_island", type: "Transition", lat: 28.3592, lng: -81.5901 },
  { id: "tree_of_life", name: "Tree of Life", landKey: "discovery_island", type: "Landmark", lat: 28.3592, lng: -81.5900 },
  { id: "zootopia_better_zoogether", name: "Zootopia: Better Zoogether!", landKey: "discovery_island", type: "Show", lat: 28.3592, lng: -81.5900 },
  { id: "nemo_show", name: "Finding Nemo: The Big Blue... and Beyond!", landKey: "discovery_island", type: "Show", lat: 28.3578, lng: -81.5872 },
  { id: "adventurers_outpost", name: "Adventurers Outpost", landKey: "discovery_island", type: "Characters", lat: 28.3597, lng: -81.5893 },
  { id: "discovery_island_trails", name: "Discovery Island Trails", landKey: "discovery_island", type: "Walk-Through", lat: 28.3595, lng: -81.5905 },
  { id: "flame_tree_area", name: "Flame Tree Barbecue / Discovery Island food area", landKey: "discovery_island", type: "Dining", lat: 28.3587, lng: -81.5888 },

  // Pandora
  { id: "pandora_entry_bridge", name: "Pandora entry bridge", landKey: "pandora", type: "Transition", lat: 28.3570, lng: -81.5920 },
  { id: "pandora_valley_path", name: "Pandora Valley of Mo'ara path", landKey: "pandora", type: "Pathway", lat: 28.3565, lng: -81.5925 },
  { id: "fop", name: "Avatar Flight of Passage", landKey: "pandora", type: "Ride", lat: 28.3563, lng: -81.5932 },
  { id: "navi", name: "Na'vi River Journey", landKey: "pandora", type: "Ride", lat: 28.3569, lng: -81.5923 },
  { id: "satuli", name: "Satu'li Canteen", landKey: "pandora", type: "Dining", lat: 28.3562, lng: -81.5925 },
  { id: "pongu", name: "Pongu Pongu / Pandora central area", landKey: "pandora", type: "Dining", lat: 28.3566, lng: -81.5920 },

  // Africa
  { id: "safaris", name: "Kilimanjaro Safaris", landKey: "africa", type: "Ride", lat: 28.3619, lng: -81.5928 },
  { id: "fotlk", name: "Festival of the Lion King", landKey: "africa", type: "Show", lat: 28.3601, lng: -81.5932 },
  { id: "gorilla_falls", name: "Gorilla Falls Exploration Trail", landKey: "africa", type: "Walk-Through", lat: 28.3621, lng: -81.5919 },
  { id: "harambe_market", name: "Harambe Market", landKey: "africa", type: "Dining", lat: 28.3608, lng: -81.5912 },
  { id: "wildlife_express_station", name: "Wildlife Express Train Station", landKey: "africa", type: "Train", lat: 28.3612, lng: -81.5907 },

  // Asia
  { id: "everest", name: "Expedition Everest - Legend of the Forbidden Mountain", landKey: "asia", type: "Ride", lat: 28.3584, lng: -81.5843 },
  { id: "kali", name: "Kali River Rapids", landKey: "asia", type: "Ride", lat: 28.3605, lng: -81.5852 },
  { id: "maharajah", name: "Maharajah Jungle Trek", landKey: "asia", type: "Walk-Through", lat: 28.3613, lng: -81.5853 },
  { id: "feathered_friends", name: "Feathered Friends in Flight!", landKey: "asia", type: "Show", lat: 28.3598, lng: -81.5866 },
  { id: "yak_yeti", name: "Yak & Yeti / Asia central area", landKey: "asia", type: "Dining", lat: 28.3594, lng: -81.5866 },

  // Rafiki’s Planet Watch
  { id: "wildlife_express_rafiki_arrival", name: "Wildlife Express Train arrival area", landKey: "rafikis_planet_watch", type: "Train", lat: 28.3688, lng: -81.5900 },
  { id: "bluey_wild_world", name: "Bluey’s Wild World at Conservation Station", landKey: "rafikis_planet_watch", type: "Interactive", lat: 28.3703, lng: -81.5896 },
  { id: "animation_experience", name: "The Animation Experience at Conservation Station", landKey: "rafikis_planet_watch", type: "Show", lat: 28.3702, lng: -81.5896 },
  { id: "affection_section", name: "Affection Section", landKey: "rafikis_planet_watch", type: "Animal Experience", lat: 28.3696, lng: -81.5893 },

  // Tropical Americas / Former DinoLand Side
  // Kept as construction/future-area context so GPS does not misclassify this side
  // of the park, but the recommendation engine should not treat it as active ride inventory yet.
  { id: "tropical_americas_entry", name: "Tropical Americas construction area / former DinoLand entry", landKey: "tropical_americas_construction", type: "Area", lat: 28.3577, lng: -81.5882 },
  { id: "discovery_to_tropical_bridge", name: "Discovery Island to Tropical Americas bridge", landKey: "tropical_americas_construction", type: "Area", lat: 28.3584, lng: -81.5880 },
  { id: "asia_to_tropical_path", name: "Asia to Tropical Americas path", landKey: "tropical_americas_construction", type: "Area", lat: 28.3578, lng: -81.5859 },
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
  epcot: buildZones(EPCOT_ANCHORS),
  hollywood: buildZones(HOLLYWOOD_ANCHORS),
  animal_kingdom: buildZones(ANIMAL_KINGDOM_ANCHORS),
};

export function getLocationZonesForPark(parkId) {
  return PARK_LOCATION_ANCHORS[parkId] || {};
}
