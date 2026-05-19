/**
 * ParkPlan AI — Ride Metadata (V1)
 *
 * Single source of truth for ride attributes.
 *
 * Keys are queue-times.com ride IDs as strings so this file can be joined
 * directly with live wait-time data from the backend.
 *
 * New intelligence fields:
 *   waitProfile      ride-specific wait value thresholds
 *   planningProfile  how guests should think about this attraction strategically
 */

export const RIDE_METADATA = {
  magic_kingdom: {
    // ---------- Adventureland ----------
    "134": {
      displayName: "Jungle Cruise",
      land: "adventureland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 76,
      waitProfile: {
        averageWait: 45,
        goodDealUnder: 35,
        normalRange: [40, 55],
        badValueOver: 60,
        usuallyHighAllDay: true,
        strategyNote:
          "Lines peak mid-day. Best during the afternoon parade or late at night.",
      },
      planningProfile: {
        category: "plan_ahead_multi_pass",
        paidAccess: "LLMP",
        appStatus: "plan_ahead",
        strategy:
          "Secure Lightning Lane Multi Pass if this is a must-do, or watch for dips during the afternoon parade.",
      },
      tags: ["classic", "boat", "family", "plan-ahead"],
    },

    "137": {
      displayName: "Pirates of the Caribbean",
      land: "adventureland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 2,
      popularity: 78,
      waitProfile: {
        averageWait: 27,
        goodDealUnder: 20,
        normalRange: [25, 35],
        badValueOver: 45,
        usuallyHighAllDay: false,
        strategyNote:
          "High-capacity people eater. If it spikes around midday, check again later.",
      },
      planningProfile: {
        category: "wait_for_drop",
        paidAccess: "LLMP",
        appStatus: "wait_for_drop",
        strategy:
          "Great value when low. If it is high around noon, wait for late afternoon or evening.",
      },
      tags: ["classic", "boat", "family", "indoor"],
    },

    "141": {
      displayName: "The Magic Carpets of Aladdin",
      land: "adventureland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 40,
      waitProfile: {
        averageWait: 17,
        goodDealUnder: 15,
        normalRange: [15, 25],
        badValueOver: 35,
        usuallyHighAllDay: false,
        strategyNote:
          "Slow loading spinner. Skip it if the wait gets long.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now_if_low",
        strategy:
          "Use as a nearby filler only when the wait is reasonable.",
      },
      tags: ["spinner", "toddler", "family"],
    },

    "334": {
      displayName: "Walt Disney's Enchanted Tiki Room",
      land: "adventureland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 35,
      waitProfile: {
        averageWait: 11,
        goodDealUnder: 10,
        normalRange: [10, 15],
        badValueOver: 20,
        usuallyHighAllDay: false,
        strategyNote:
          "Usually just waiting for the next show. Great shaded recovery stop near Dole Whip.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "none",
        appStatus: "recovery",
        strategy:
          "Use as an AC/shade reset when nearby, especially during heat.",
      },
      tags: ["classic", "show", "recovery", "ac"],
    },

    // ---------- Fantasyland ----------
    "126": {
      displayName: "The Barnstormer",
      land: "fantasyland",
      minHeightInches: 35,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 2,
      popularity: 45,
      waitProfile: {
        averageWait: 15,
        goodDealUnder: 15,
        normalRange: [15, 25],
        badValueOver: 35,
        usuallyHighAllDay: false,
        strategyNote:
          "Very short ride. Not worth a long wait unless it is a must-do for young kids.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now_if_low",
        strategy:
          "Ride if nearby and low. Skip if it is over 25–30 minutes.",
      },
      tags: ["coaster", "kid-coaster", "family"],
    },

    "127": {
      displayName: "Under the Sea - Journey of The Little Mermaid",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 63,
      waitProfile: {
        averageWait: 16,
        goodDealUnder: 15,
        normalRange: [15, 25],
        badValueOver: 30,
        usuallyHighAllDay: false,
        strategyNote:
          "Omnimover with steady loading. A posted 20-minute wait often moves well.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now",
        strategy:
          "Good family filler when nearby, especially if you want indoor time.",
      },
      tags: ["dark-ride", "toddler", "family", "indoor"],
    },

    "128": {
      displayName: "Enchanted Tales with Belle",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 50,
      waitProfile: {
        averageWait: 28,
        goodDealUnder: 15,
        normalRange: [20, 35],
        badValueOver: 45,
        usuallyHighAllDay: false,
        strategyNote:
          "Interactive experience with lower capacity. Best before 10:30 AM or after 5 PM.",
      },
      planningProfile: {
        category: "plan_ahead_standby_only",
        paidAccess: "none",
        appStatus: "plan_ahead",
        strategy:
          "Do early or later. Avoid the mid-day family surge.",
      },
      tags: ["show", "interactive", "kids", "plan-ahead"],
    },

    "129": {
      displayName: "Seven Dwarfs Mine Train",
      land: "fantasyland",
      minHeightInches: 38,
      environment: "mixed",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 3,
      popularity: 96,
      waitProfile: {
        averageWait: 68,
        goodDealUnder: 60,
        normalRange: [65, 85],
        badValueOver: 90,
        usuallyHighAllDay: true,
        strategyNote:
          "Rarely a good deal except Early Entry, park close, or after downtime.",
      },
      planningProfile: {
        category: "plan_ahead_single_pass",
        paidAccess: "LLSP",
        appStatus: "plan_ahead",
        strategy:
          "Buy Single Pass, rope drop during Early Entry, or ride during fireworks/near park close.",
      },
      tags: ["headliner", "coaster", "family", "single-pass", "plan-ahead"],
    },

    "132": {
      displayName: "Dumbo the Flying Elephant",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 50,
      waitProfile: {
        averageWait: 14,
        goodDealUnder: 15,
        normalRange: [15, 25],
        badValueOver: 35,
        usuallyHighAllDay: false,
        strategyNote:
          "Indoor play area makes the wait less painful for kids, but still better early or late.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now_if_low",
        strategy:
          "Good young-kid option when nearby and reasonable.",
      },
      tags: ["spinner", "toddler", "family"],
    },

    "133": {
      displayName: "\"it's a small world\"",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 48,
      waitProfile: {
        averageWait: 18,
        goodDealUnder: 15,
        normalRange: [15, 25],
        badValueOver: 35,
        usuallyHighAllDay: false,
        strategyNote:
          "Massive people eater. Line can look long but usually moves continuously.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now",
        strategy:
          "Great indoor family filler, especially afternoon or evening.",
      },
      tags: ["classic", "boat", "toddler", "recovery", "indoor"],
    },

    "135": {
      displayName: "Mad Tea Party",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 2,
      popularity: 42,
      waitProfile: {
        averageWait: 10,
        goodDealUnder: 10,
        normalRange: [10, 20],
        badValueOver: 25,
        usuallyHighAllDay: false,
        strategyNote:
          "Fast loading. Easy filler during parades, fireworks, or later evening.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "LLMP",
        appStatus: "filler",
        strategy:
          "Use as a quick nearby filler if your group likes spinning.",
      },
      tags: ["spinner", "motion-sickness", "family", "filler"],
    },

    "136": {
      displayName: "Peter Pan's Flight",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 89,
      waitProfile: {
        averageWait: 52,
        goodDealUnder: 40,
        normalRange: [45, 65],
        badValueOver: 70,
        usuallyHighAllDay: true,
        strategyNote:
          "Low capacity. If it is under 40 minutes during the day, strongly consider riding.",
      },
      planningProfile: {
        category: "plan_ahead_multi_pass",
        paidAccess: "LLMP",
        appStatus: "plan_ahead",
        strategy:
          "Book Multi Pass, make it a first stop, or save for the final hour.",
      },
      tags: ["classic", "dark-ride", "family", "plan-ahead"],
    },

    "142": {
      displayName: "The Many Adventures of Winnie the Pooh",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 65,
      waitProfile: {
        averageWait: 27,
        goodDealUnder: 20,
        normalRange: [25, 35],
        badValueOver: 40,
        usuallyHighAllDay: false,
        strategyNote:
          "Peaks mid-day with families. Better early or late.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now_if_low",
        strategy:
          "Ride under 30 minutes, especially if nearby with young kids.",
      },
      tags: ["dark-ride", "toddler", "family", "indoor"],
    },

    "161": {
      displayName: "Prince Charming Regal Carrousel",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 38,
      waitProfile: {
        averageWait: 9,
        goodDealUnder: 10,
        normalRange: [10, 15],
        badValueOver: 20,
        usuallyHighAllDay: false,
        strategyNote:
          "Loads quickly. Best as a filler while passing through Fantasyland.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "none",
        appStatus: "filler",
        strategy:
          "Use as a quick gap-filler with young kids.",
      },
      tags: ["classic", "toddler", "family", "filler"],
    },

    "171": {
      displayName: "Mickey's PhilharMagic",
      land: "fantasyland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 52,
      waitProfile: {
        averageWait: 13,
        goodDealUnder: 10,
        normalRange: [10, 15],
        badValueOver: 20,
        usuallyHighAllDay: false,
        strategyNote:
          "Large theater. Usually just waiting for the next show. Excellent AC escape.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "LLMP_not_needed",
        appStatus: "recovery",
        strategy:
          "Great AC break when nearby or when the group needs to sit.",
      },
      tags: ["show", "recovery", "family", "ac"],
    },

    // ---------- Frontierland ----------
    "130": {
      displayName: "Big Thunder Mountain Railroad",
      land: "frontierland",
      minHeightInches: 40,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 3,
      popularity: 85,
      waitProfile: {
        averageWait: 36,
        goodDealUnder: 25,
        normalRange: [30, 45],
        badValueOver: 50,
        usuallyHighAllDay: false,
        strategyNote:
          "Susceptible to crowd surges. Often drops during parade or late evening.",
      },
      planningProfile: {
        category: "wait_for_drop",
        paidAccess: "LLMP",
        appStatus: "wait_for_drop",
        strategy:
          "If it spikes, check again during the parade or late evening.",
      },
      tags: ["coaster", "family", "wait-for-drop"],
    },

    "1214": {
      displayName: "Country Bear Musical Jamboree",
      land: "frontierland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 34,
      waitProfile: {
        averageWait: 13,
        goodDealUnder: 10,
        normalRange: [10, 15],
        badValueOver: 20,
        usuallyHighAllDay: false,
        strategyNote:
          "High-capacity theater. Usually just waiting for the prior show.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "none",
        appStatus: "recovery",
        strategy:
          "Use as an easy AC break in Frontierland.",
      },
      tags: ["classic", "show", "recovery", "ac"],
    },

    "13630": {
      displayName: "Tiana's Bayou Adventure",
      land: "frontierland",
      minHeightInches: 40,
      environment: "mixed",
      hasAC: false,
      getsWet: true,
      closesInRain: true,
      intensity: 3,
      popularity: 92,
      waitProfile: {
        averageWait: 33,
        goodDealUnder: 25,
        normalRange: [30, 45],
        badValueOver: 55,
        usuallyHighAllDay: true,
        strategyNote:
          "High demand, especially on warm days. Better late evening if missed earlier.",
      },
      planningProfile: {
        category: "plan_ahead_multi_pass",
        paidAccess: "LLMP",
        appStatus: "plan_ahead",
        strategy:
          "Prioritize as a top Multi Pass selection. If missed, rope drop or try late evening.",
      },
      tags: ["headliner", "water", "family", "plan-ahead"],
    },

    // ---------- Liberty Square ----------
    "140": {
      displayName: "Haunted Mansion",
      land: "liberty_square",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 2,
      popularity: 84,
      waitProfile: {
        averageWait: 34,
        goodDealUnder: 25,
        normalRange: [30, 45],
        badValueOver: 50,
        usuallyHighAllDay: false,
        strategyNote:
          "Line moves continuously. If it spikes over 45–50, check again later.",
      },
      planningProfile: {
        category: "wait_for_drop",
        paidAccess: "LLMP",
        appStatus: "wait_for_drop",
        strategy:
          "Avoid the noon to mid-afternoon surge. Usually improves later.",
      },
      tags: ["classic", "dark-ride", "spooky", "indoor"],
    },

    "356": {
      displayName: "The Hall of Presidents",
      land: "liberty_square",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 30,
      waitProfile: {
        averageWait: 14,
        goodDealUnder: 10,
        normalRange: [10, 25],
        badValueOver: 30,
        usuallyHighAllDay: false,
        strategyNote:
          "Shows run on a schedule. Time arrival around show start instead of waiting around.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "none",
        appStatus: "recovery",
        strategy:
          "Good long AC rest if you time the next show correctly.",
      },
      tags: ["show", "recovery", "ac"],
    },

    // ---------- Tomorrowland ----------
    "125": {
      displayName: "Monsters Inc. Laugh Floor",
      land: "tomorrowland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 40,
      waitProfile: {
        averageWait: 14,
        goodDealUnder: 10,
        normalRange: [10, 20],
        badValueOver: 25,
        usuallyHighAllDay: false,
        strategyNote:
          "High-capacity theater show. Usually not more than a show-cycle wait.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "LLMP_not_needed",
        appStatus: "recovery",
        strategy:
          "Good AC break in Tomorrowland when nearby.",
      },
      tags: ["show", "interactive", "recovery", "ac"],
    },

    "131": {
      displayName: "Buzz Lightyear's Space Ranger Spin",
      land: "tomorrowland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 75,
      waitProfile: {
        averageWait: 26,
        goodDealUnder: 20,
        normalRange: [25, 35],
        badValueOver: 40,
        usuallyHighAllDay: false,
        strategyNote:
          "Omnimover-style flow. Under 20 often means a quick moving queue.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now",
        strategy:
          "Good Tomorrowland move when under 30 minutes or nearby.",
      },
      tags: ["interactive", "dark-ride", "family", "indoor"],
    },

    "138": {
      displayName: "Space Mountain",
      land: "tomorrowland",
      minHeightInches: 44,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 4,
      popularity: 88,
      waitProfile: {
        averageWait: 43,
        goodDealUnder: 30,
        normalRange: [35, 50],
        badValueOver: 55,
        usuallyHighAllDay: false,
        strategyNote:
          "Peaks mid-day but clears out well in the evening.",
      },
      planningProfile: {
        category: "wait_for_drop",
        paidAccess: "LLMP",
        appStatus: "wait_for_drop",
        strategy:
          "Avoid mid-day spikes. Try after 8 PM or use Multi Pass.",
      },
      tags: ["coaster", "thrill", "dark-ride", "wait-for-drop"],
    },

    "143": {
      displayName: "Tomorrowland Speedway",
      land: "tomorrowland",
      minHeightInches: 32,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 38,
      waitProfile: {
        averageWait: 17,
        goodDealUnder: 15,
        normalRange: [15, 30],
        badValueOver: 40,
        usuallyHighAllDay: false,
        strategyNote:
          "Uncovered queue is miserable in midday heat. Better morning or after sunset.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now_if_low",
        strategy:
          "Avoid in heat unless wait is low or kids really want it.",
      },
      tags: ["family", "kids", "outdoor"],
    },

    "248": {
      displayName: "Astro Orbiter",
      land: "tomorrowland",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 2,
      popularity: 36,
      waitProfile: {
        averageWait: 23,
        goodDealUnder: 20,
        normalRange: [25, 40],
        badValueOver: 45,
        usuallyHighAllDay: true,
        strategyNote:
          "Elevator bottleneck makes the line painful. Best first hour or final hour.",
      },
      planningProfile: {
        category: "plan_ahead_standby_only",
        paidAccess: "none",
        appStatus: "plan_ahead",
        strategy:
          "Ride very early or very late. Avoid mid-day unless the wait is unusually low.",
      },
      tags: ["spinner", "family", "plan-ahead"],
    },

    "457": {
      displayName: "Walt Disney's Carousel of Progress",
      land: "tomorrowland",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 55,
      waitProfile: {
        averageWait: 6,
        goodDealUnder: 5,
        normalRange: [5, 10],
        badValueOver: 15,
        usuallyHighAllDay: false,
        strategyNote:
          "Usually just waiting for the rotating theater cycle. Excellent AC recovery.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "none",
        appStatus: "recovery",
        strategy:
          "Excellent sit-down AC break in Tomorrowland.",
      },
      tags: ["classic", "show", "recovery", "ac"],
    },

    "1190": {
      displayName: "Tomorrowland Transit Authority PeopleMover",
      land: "tomorrowland",
      minHeightInches: 0,
      environment: "mixed",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 1,
      popularity: 68,
      waitProfile: {
        averageWait: 11,
        goodDealUnder: 10,
        normalRange: [10, 15],
        badValueOver: 20,
        usuallyHighAllDay: false,
        strategyNote:
          "Usually walk-on except afternoon spikes when guests want shade and seats.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "none",
        appStatus: "recovery",
        strategy:
          "Great low-stress break. Best as a recovery/chill pick, not a default headliner.",
      },
      tags: ["classic", "relaxing", "low-wait", "recovery"],
    },

    "11527": {
      displayName: "TRON Lightcycle / Run",
      land: "tomorrowland",
      minHeightInches: 48,
      environment: "mixed",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 5,
      popularity: 98,
      waitProfile: {
        averageWait: 62,
        goodDealUnder: 45,
        normalRange: [50, 70],
        badValueOver: 75,
        usuallyHighAllDay: true,
        strategyNote:
          "High-demand premium thrill ride. Use Single Pass, rope drop, or late night.",
      },
      planningProfile: {
        category: "plan_ahead_single_pass",
        paidAccess: "LLSP",
        appStatus: "plan_ahead",
        strategy:
          "Purchase Single Pass in advance, rope drop during Early Entry, or ride near park close.",
      },
      tags: ["headliner", "coaster", "thrill", "single-pass", "plan-ahead"],
    },
   },

  // ============================================================
  // EPCOT (queue-times park ID: 5)
  // Lands from current EPCOT guidemap, with World Showcase split for better walking logic: world_celebration, world_discovery, world_nature, world_showcase_west, world_showcase_center, world_showcase_east
  // ============================================================
  epcot: {
    // ---------- World Discovery ----------
    "10916": {
      displayName: "Guardians of the Galaxy: Cosmic Rewind",
      land: "world_discovery",
      minHeightInches: 42,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 5,
      popularity: 98,
      waitProfile: {
        averageWait: 85,
        goodDealUnder: 60,
        normalRange: [75, 100],
        badValueOver: 120,
        usuallyHighAllDay: true,
        strategyNote:
          "Now that standby absorbs the full demand, this can eat a huge chunk of the day. Best in the first 30 minutes or final 45 minutes, otherwise strongly consider Single Pass.",
      },
      planningProfile: {
        category: "plan_ahead_single_pass",
        paidAccess: "LLSP",
        appStatus: "plan_ahead",
        strategy:
          "Buy Single Pass if this is a must-do, or target rope drop / the final 45 minutes of the night.",
      },
      tags: [
        "headliner",
        "coaster",
        "thrill",
        "single-pass",
        "plan-ahead",
        "indoor",
      ],
    },

    "160": {
      displayName: "Test Track",
      land: "world_discovery",
      minHeightInches: 40,
      environment: "mixed",
      hasAC: true,
      getsWet: false,
      closesInRain: true,
      intensity: 4,
      popularity: 92,
      waitProfile: {
        averageWait: 70,
        goodDealUnder: 50,
        normalRange: [60, 85],
        badValueOver: 95,
        usuallyHighAllDay: true,
        strategyNote:
          "Major draw after its reimagining and heavily weather-sensitive. Best in the first hour, or later after weather/downtime clears. Do not cross the park for it during storms.",
      },
      planningProfile: {
        category: "plan_ahead_multi_pass",
        paidAccess: "LLMP",
        appStatus: "plan_ahead",
        strategy:
          "Use Multi Pass if available, hit it in the first hour, or watch for late-day dips after downtime clears.",
      },
      tags: ["headliner", "thrill", "weather-sensitive", "plan-ahead"],
    },

    "158": {
      displayName: "Mission: SPACE",
      land: "world_discovery",
      minHeightInches: 40,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 4,
      popularity: 58,
      waitProfile: {
        averageWait: 25,
        goodDealUnder: 15,
        normalRange: [20, 35],
        badValueOver: 45,
        usuallyHighAllDay: false,
        strategyNote:
          "Demand is split between Orange and Green. It rarely deserves a long wait unless nearby or Test Track downtime sends thrill-seekers over.",
      },
      planningProfile: {
        category: "wait_for_drop",
        paidAccess: "LLMP",
        appStatus: "wait_for_drop",
        strategy:
          "Use when nearby and the group is comfortable with motion. If it spikes, wait for the crowd to shift.",
      },
      tags: ["thrill", "motion-sickness", "indoor", "ac"],
    },

    // ---------- World Celebration ----------
    "159": {
      displayName: "Spaceship Earth",
      land: "world_celebration",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 62,
      waitProfile: {
        averageWait: 20,
        goodDealUnder: 15,
        normalRange: [20, 30],
        badValueOver: 40,
        usuallyHighAllDay: false,
        strategyNote:
          "Morning entrance crowds inflate this wait because it is the first thing guests see. Walk past it early; it is usually better after 2 PM.",
      },
      planningProfile: {
        category: "wait_for_drop",
        paidAccess: "LLMP",
        appStatus: "wait_for_drop",
        strategy:
          "Avoid the early entrance surge. Use it later as an easy indoor reset near the front.",
      },
      tags: ["classic", "slow-ride", "recovery", "indoor", "ac"],
    },

    // ---------- World Nature ----------
    "151": {
      displayName: "Soarin' Around the World",
      land: "world_nature",
      minHeightInches: 40,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 2,
      popularity: 78,
      waitProfile: {
        averageWait: 35,
        goodDealUnder: 25,
        normalRange: [30, 45],
        badValueOver: 55,
        usuallyHighAllDay: false,
        strategyNote:
          "Midday lunch crowds can inflate waits inside The Land pavilion. Better before 10:30 AM or after 6 PM.",
      },
      planningProfile: {
        category: "wait_for_drop",
        paidAccess: "LLMP",
        appStatus: "wait_for_drop",
        strategy:
          "Strong indoor family pick when low. If it pushes toward 55–60 midday, come back later.",
      },
      tags: ["family", "indoor", "ac", "popular"],
    },

    "156": {
      displayName: "Living with the Land",
      land: "world_nature",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 50,
      waitProfile: {
        averageWait: 15,
        goodDealUnder: 10,
        normalRange: [10, 20],
        badValueOver: 25,
        usuallyHighAllDay: false,
        strategyNote:
          "High-capacity boat ride. It mostly spikes during lunch when guests flood The Land pavilion for food and AC.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now_if_low",
        strategy:
          "Great recovery ride when nearby. If it is over 25 minutes, check again after the lunch rush.",
      },
      tags: ["boat", "family", "recovery", "indoor", "ac"],
    },

    "153": {
      displayName: "The Seas with Nemo & Friends",
      land: "world_nature",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 48,
      waitProfile: {
        averageWait: 10,
        goodDealUnder: 10,
        normalRange: [10, 15],
        badValueOver: 25,
        usuallyHighAllDay: false,
        strategyNote:
          "Constant-loading omnimover with aquarium time after. If the line is high, explore the aquarium first and check again.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now_if_low",
        strategy:
          "Use when nearby, especially with kids or when the group needs indoor time.",
      },
      tags: ["dark-ride", "toddler", "family", "recovery", "indoor", "ac"],
    },

    "155": {
      displayName: "Journey Into Imagination With Figment",
      land: "world_celebration",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 42,
      waitProfile: {
        averageWait: 10,
        goodDealUnder: 10,
        normalRange: [10, 15],
        badValueOver: 20,
        usuallyHighAllDay: false,
        strategyNote:
          "Usually just a short walk through the queue. Not worth waiting long unless the group specifically wants Figment.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now_if_low",
        strategy:
          "Use as a quick indoor filler in World Celebration. Skip if it is oddly above 20 minutes.",
      },
      tags: ["dark-ride", "family", "filler", "indoor", "ac"],
    },


    "epcot_disney_pixar_short_film_festival": {
      displayName: "Disney & Pixar Short Film Festival",
      land: "world_celebration",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 32,
      waitProfile: {
        averageWait: 12,
        goodDealUnder: 10,
        normalRange: [10, 20],
        badValueOver: 25,
        usuallyHighAllDay: false,
        strategyNote:
          "A low-pressure indoor theater option near Journey Into Imagination. Best used as an AC reset, not a cross-park priority.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "none",
        appStatus: "recovery",
        strategy:
          "Use when nearby and the group needs a seated indoor break.",
      },
      tags: ["show", "recovery", "family", "indoor", "ac"],
    },

    "epcot_journey_of_water": {
      displayName: "Journey of Water, Inspired by Moana",
      land: "world_nature",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: true,
      closesInRain: true,
      intensity: 1,
      popularity: 38,
      waitProfile: { averageWait: 10, goodDealUnder: 10, normalRange: [10, 20], badValueOver: 25, usuallyHighAllDay: false, strategyNote: "A self-guided outdoor walkthrough. Better in mild weather or as a low-pressure filler." },
      planningProfile: { category: "filler_or_recovery", paidAccess: "none", appStatus: "filler", strategy: "Use as a nearby low-stress walkthrough. Avoid during storms or when the group needs true AC." },
      tags: ["walkthrough", "family", "water", "outdoor", "filler"],
    },

    "epcot_turtle_talk_with_crush": {
      displayName: "Turtle Talk With Crush",
      land: "world_nature",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 40,
      waitProfile: {
        averageWait: 15,
        goodDealUnder: 10,
        normalRange: [10, 20],
        badValueOver: 25,
        usuallyHighAllDay: false,
        strategyNote:
          "You are mostly waiting for the current show cycle to finish. LLMP is unnecessary here.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "LLMP_not_needed",
        appStatus: "recovery",
        strategy:
          "Use with kids or as part of a Seas pavilion reset.",
      },
      tags: ["show", "interactive", "kids", "recovery", "indoor", "ac"],
    },

    "epcot_awesome_planet": {
      displayName: "Awesome Planet",
      land: "world_nature",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 28,
      waitProfile: { averageWait: 10, goodDealUnder: 10, normalRange: [10, 15], badValueOver: 20, usuallyHighAllDay: false, strategyNote: "Usually a short theater wait inside The Land pavilion. Better as a calm recovery option than a must-do attraction." },
      planningProfile: { category: "filler_or_recovery", paidAccess: "none", appStatus: "recovery", strategy: "Use when already in The Land and the group needs AC and seats." },
      tags: ["show", "recovery", "indoor", "ac"],
    },

    // ---------- World Showcase West / Center / East ----------
    "10914": {
      displayName: "Remy's Ratatouille Adventure",
      land: "world_showcase_west",
      pavilion: "france",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 2,
      popularity: 90,
      waitProfile: {
        averageWait: 65,
        goodDealUnder: 45,
        normalRange: [55, 80],
        badValueOver: 90,
        usuallyHighAllDay: true,
        strategyNote:
          "International Gateway guests have a major rope-drop advantage. From the front entrance, use Multi Pass or check late evening.",
      },
      planningProfile: {
        category: "plan_ahead_multi_pass",
        paidAccess: "LLMP",
        appStatus: "plan_ahead",
        strategy:
          "Book Multi Pass if available, use International Gateway advantage, or check during the final hour.",
      },
      tags: [
        "headliner",
        "dark-ride",
        "trackless",
        "family",
        "plan-ahead",
        "indoor",
      ],
    },

    "2679": {
      displayName: "Frozen Ever After",
      land: "world_showcase_east",
      pavilion: "norway",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 2,
      popularity: 88,
      waitProfile: {
        averageWait: 60,
        goodDealUnder: 40,
        normalRange: [50, 70],
        badValueOver: 85,
        usuallyHighAllDay: true,
        strategyNote:
          "Slow-loading family headliner with massive appeal. Best early if already near Norway, with Multi Pass, or during the evening spectacular.",
      },
      planningProfile: {
        category: "plan_ahead_multi_pass",
        paidAccess: "LLMP",
        appStatus: "plan_ahead",
        strategy:
          "Prime Tier 1 Multi Pass candidate. If standby is under 40 and you are nearby, it is a strong move.",
      },
      tags: ["headliner", "boat", "family", "plan-ahead", "indoor"],
    },

    "epcot_gran_fiesta_tour": {
      displayName: "Gran Fiesta Tour Starring The Three Caballeros",
      land: "world_showcase_east",
      pavilion: "mexico",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 46,
      waitProfile: {
        averageWait: 10,
        goodDealUnder: 10,
        normalRange: [10, 15],
        badValueOver: 25,
        usuallyHighAllDay: false,
        strategyNote:
          "Hidden inside the Mexico pavilion. Boats load quickly, but the queue can back up into the market during the afternoon.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "none",
        appStatus: "recovery",
        strategy:
          "Use when near Mexico, especially in heat or rain. Not worth a long cross-park walk by itself.",
      },
      tags: ["boat", "family", "recovery", "indoor", "ac"],
    },

    "epcot_reflections_of_china": {
      displayName: "Reflections of China",
      land: "world_showcase_east",
      pavilion: "china",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 24,
      waitProfile: { averageWait: 12, goodDealUnder: 10, normalRange: [10, 20], badValueOver: 25, usuallyHighAllDay: false, strategyNote: "Indoor film option in the China pavilion. Good as a nearby rain or heat break." },
      planningProfile: { category: "filler_or_recovery", paidAccess: "none", appStatus: "recovery", strategy: "Use if already nearby and the group needs indoor time." },
      tags: ["show", "film", "recovery", "indoor", "ac"],
    },

    "epcot_the_american_adventure": {
      displayName: "The American Adventure",
      land: "world_showcase_center",
      pavilion: "american_adventure",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 34,
      waitProfile: { averageWait: 18, goodDealUnder: 15, normalRange: [15, 30], badValueOver: 35, usuallyHighAllDay: false, strategyNote: "A longer indoor theater show. Strong choice when the group needs a real seated reset in the middle of World Showcase." },
      planningProfile: { category: "filler_or_recovery", paidAccess: "none", appStatus: "recovery", strategy: "Use as a longer AC break, especially during peak heat or rain." },
      tags: ["show", "long-break", "recovery", "indoor", "ac"],
    },

    "epcot_beauty_and_the_beast_sing_along": {
      displayName: "Beauty and the Beast Sing-Along",
      land: "world_showcase_west",
      pavilion: "france",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 30,
      waitProfile: { averageWait: 12, goodDealUnder: 10, normalRange: [10, 20], badValueOver: 25, usuallyHighAllDay: false, strategyNote: "Indoor theater option in France. Works well as a recovery pairing near Remy." },
      planningProfile: { category: "filler_or_recovery", paidAccess: "none", appStatus: "recovery", strategy: "Use near France when your group needs AC, especially before or after Remy." },
      tags: ["show", "family", "recovery", "indoor", "ac"],
    },

    "epcot_impressions_de_france": {
      displayName: "Impressions de France",
      land: "world_showcase_west",
      pavilion: "france",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 26,
      waitProfile: { averageWait: 12, goodDealUnder: 10, normalRange: [10, 20], badValueOver: 25, usuallyHighAllDay: false, strategyNote: "Indoor theater option in France. Best as a calm reset when nearby." },
      planningProfile: { category: "filler_or_recovery", paidAccess: "none", appStatus: "recovery", strategy: "Use as a seated indoor break in the France pavilion." },
      tags: ["show", "film", "recovery", "indoor", "ac"],
    },

    "epcot_canada_far_and_wide": {
      displayName: "Canada Far and Wide in Circle-Vision 360",
      land: "world_showcase_west",
      pavilion: "canada",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 24,
      waitProfile: { averageWait: 12, goodDealUnder: 10, normalRange: [10, 20], badValueOver: 25, usuallyHighAllDay: false, strategyNote: "Indoor film option in Canada. Useful as a nearby weather escape, but not a major destination by itself." },
      planningProfile: { category: "filler_or_recovery", paidAccess: "none", appStatus: "recovery", strategy: "Use when already near Canada and the group needs a short indoor break." },
      tags: ["show", "film", "recovery", "indoor", "ac"],
    },


  },

  // ============================================================
  // Hollywood Studios (queue-times park ID: 7)
  // V1 lands: hollywood_boulevard, sunset_boulevard, echo_lake,
  // grand_avenue, star_wars_galaxys_edge, toy_story_land,
  // animation_courtyard, commissary_lane
  //
  // Keys use stable attraction names instead of guessed Queue-Times IDs.
  // rideRecommendations.js can still match by displayName/name fallback.
  // ============================================================
  hollywood: {
    "Mickey & Minnie's Runaway Railway": {
      displayName: "Mickey & Minnie's Runaway Railway",
      land: "hollywood_boulevard",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 2,
      popularity: 88,
      waitProfile: {
        averageWait: 55,
        goodDealUnder: 40,
        normalRange: [45, 65],
        badValueOver: 75,
        usuallyHighAllDay: true,
        strategyNote:
          "Central park location pulls big mid-morning crowds. Strong before 9:30 AM, during Fantasmic!, or whenever it drops under 40 minutes.",
      },
      planningProfile: {
        category: "plan_ahead_multi_pass",
        paidAccess: "LLMP",
        appStatus: "plan_ahead",
        strategy:
          "Excellent Tier 1 fallback if Slinky Dog is gone. Use Multi Pass, early morning, or evening showtime dips.",
      },
      tags: ["family", "dark-ride", "headliner", "indoor", "ac", "plan-ahead"],
    },

    "The Twilight Zone Tower of Terror": {
      displayName: "The Twilight Zone Tower of Terror",
      land: "sunset_boulevard",
      minHeightInches: 40,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 5,
      popularity: 86,
      waitProfile: {
        averageWait: 55,
        goodDealUnder: 35,
        normalRange: [45, 70],
        badValueOver: 85,
        usuallyHighAllDay: false,
        strategyNote:
          "Major thrill ride with strong demand. Good when under 35, but not worth dragging the group across the park unless the value is strong.",
      },
      planningProfile: {
        category: "wait_for_drop",
        paidAccess: "LLMP",
        appStatus: "wait_for_drop",
        strategy:
          "Use Multi Pass if it is a must-do, or watch for dips during shows and late evening.",
      },
      tags: ["thrill", "drop", "classic", "indoor", "wait-for-drop"],
    },

    "Rock 'n' Roller Coaster Starring Aerosmith": {
      displayName: "Rock 'n' Roller Coaster Starring Aerosmith",
      land: "sunset_boulevard",
      minHeightInches: 48,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 5,
      popularity: 86,
      waitProfile: {
        averageWait: 60,
        goodDealUnder: 40,
        normalRange: [50, 75],
        badValueOver: 85,
        usuallyHighAllDay: true,
        strategyNote:
          "High-demand Tier 1 thrill ride. Single Rider is available but can move painfully slowly compared with other rides.",
      },
      planningProfile: {
        category: "plan_ahead_multi_pass",
        paidAccess: "LLMP",
        appStatus: "plan_ahead",
        strategy:
          "Use Multi Pass, rope drop Sunset Boulevard, or try late evening. Do not count on Single Rider as a reliable family strategy.",
      },
      tags: ["coaster", "thrill", "inversion", "indoor", "ac", "plan-ahead"],
    },

    "Beauty and the Beast Live on Stage": {
      displayName: "Beauty and the Beast Live on Stage",
      land: "sunset_boulevard",
      minHeightInches: 0,
      environment: "covered",
      hasAC: false,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 45,
      waitProfile: {
        averageWait: 15,
        goodDealUnder: 10,
        normalRange: [10, 20],
        badValueOver: 25,
        usuallyHighAllDay: false,
        strategyNote:
          "Show-based attraction. Hollywood Studios relies on shows to absorb crowds, so use this as a seated break when showtime lines up.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "LLMP_not_needed",
        appStatus: "filler",
        strategy:
          "Good seated break on Sunset Boulevard when showtime lines up.",
      },
      tags: ["show", "family", "seated", "filler"],
    },

    "Fantasmic!": {
      displayName: "Fantasmic!",
      land: "sunset_boulevard",
      minHeightInches: 0,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 2,
      popularity: 90,
      waitProfile: {
        averageWait: 45,
        goodDealUnder: 30,
        normalRange: [35, 60],
        badValueOver: 75,
        usuallyHighAllDay: true,
        strategyNote:
          "Nighttime show. This should be planned around showtime and weather, not treated like a normal ride wait.",
      },
      planningProfile: {
        category: "plan_ahead_standby_only",
        paidAccess: "none",
        appStatus: "plan_ahead",
        strategy:
          "Plan around showtime. Arrive earlier on busy nights or if your group wants better seats.",
      },
      tags: ["show", "nighttime", "outdoor", "plan-ahead"],
    },

    "Star Tours – The Adventures Continue": {
      displayName: "Star Tours – The Adventures Continue",
      land: "echo_lake",
      minHeightInches: 40,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 3,
      popularity: 58,
      waitProfile: {
        averageWait: 15,
        goodDealUnder: 10,
        normalRange: [10, 20],
        badValueOver: 30,
        usuallyHighAllDay: false,
        strategyNote:
          "Massive-capacity simulator. You almost never need Multi Pass. Use it as an air-conditioned filler between bigger plans.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "LLMP_not_needed",
        appStatus: "recovery",
        strategy:
          "Excellent Echo Lake recovery ride when nearby. Skip if it oddly spikes over 30.",
      },
      tags: ["star-wars", "simulator", "indoor", "ac", "motion-sickness", "recovery"],
    },

    "For the First Time in Forever: A Frozen Sing-Along Celebration": {
      displayName: "For the First Time in Forever: A Frozen Sing-Along Celebration",
      land: "echo_lake",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 48,
      waitProfile: {
        averageWait: 15,
        goodDealUnder: 10,
        normalRange: [10, 20],
        badValueOver: 25,
        usuallyHighAllDay: false,
        strategyNote:
          "Usually a next-show wait. Perfect for resting feet during peak heat.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "LLMP_not_needed",
        appStatus: "recovery",
        strategy:
          "Use as a seated AC break, especially with kids or during heat/rain.",
      },
      tags: ["show", "family", "indoor", "ac", "recovery"],
    },

    "Indiana Jones Epic Stunt Spectacular": {
      displayName: "Indiana Jones Epic Stunt Spectacular",
      land: "echo_lake",
      minHeightInches: 0,
      environment: "covered",
      hasAC: false,
      getsWet: false,
      closesInRain: false,
      intensity: 2,
      popularity: 50,
      waitProfile: {
        averageWait: 15,
        goodDealUnder: 10,
        normalRange: [10, 20],
        badValueOver: 25,
        usuallyHighAllDay: false,
        strategyNote:
          "Large stunt show. Hollywood Studios uses shows to absorb crowds, so time this around showtime rather than treating it like a normal ride wait.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "LLMP_not_needed",
        appStatus: "filler",
        strategy:
          "Good seated break when showtime is close, but not a true AC reset.",
      },
      tags: ["show", "stunts", "covered", "seated", "filler"],
    },

    "Muppet*Vision 3D": {
      displayName: "Muppet*Vision 3D",
      land: "grand_avenue",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 38,
      waitProfile: {
        averageWait: 15,
        goodDealUnder: 10,
        normalRange: [10, 20],
        badValueOver: 25,
        usuallyHighAllDay: false,
        strategyNote:
          "Usually just waiting for the next show. Great AC and foot-rest option, especially during peak heat.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "LLMP_not_needed",
        appStatus: "recovery",
        strategy:
          "Use as an easy Grand Avenue AC break. Do not burn a priority strategy on it unless seating matters to your group.",
      },
      tags: ["show", "family", "indoor", "ac", "recovery"],
    },

    "Star Wars: Rise of the Resistance": {
      displayName: "Star Wars: Rise of the Resistance",
      land: "star_wars_galaxys_edge",
      minHeightInches: 40,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 4,
      popularity: 99,
      waitProfile: {
        averageWait: 85,
        goodDealUnder: 65,
        normalRange: [75, 100],
        badValueOver: 110,
        usuallyHighAllDay: true,
        strategyNote:
          "Hollywood Studios' biggest headliner. Rope drop is often a trap unless you are at the absolute front of Early Entry. It often improves significantly in the evening.",
      },
      planningProfile: {
        category: "plan_ahead_single_pass",
        paidAccess: "LLSP",
        appStatus: "plan_ahead",
        strategy:
          "Buy Single Pass if this is a must-do, or watch for evening dips after 7:30 PM. Avoid joining the giant 9 AM crowd unless you are truly at the front.",
      },
      tags: [
        "headliner",
        "star-wars",
        "trackless",
        "thrill",
        "single-pass",
        "plan-ahead",
        "indoor",
      ],
    },

    "Millennium Falcon: Smugglers Run": {
      displayName: "Millennium Falcon: Smugglers Run",
      land: "star_wars_galaxys_edge",
      minHeightInches: 38,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 3,
      popularity: 78,
      waitProfile: {
        averageWait: 60,
        goodDealUnder: 40,
        normalRange: [50, 70],
        badValueOver: 80,
        usuallyHighAllDay: true,
        strategyNote:
          "Galaxy's Edge crowds keep this high most of the day, but it can drop hard after 6 PM. Single Rider exists, but do not push it by default for families.",
      },
      planningProfile: {
        category: "plan_ahead_multi_pass",
        paidAccess: "LLMP",
        appStatus: "plan_ahead",
        strategy:
          "Use Multi Pass if your group cares about riding together, or check after 6 PM when Galaxy's Edge starts to clear.",
      },
      tags: [
        "star-wars",
        "simulator",
        "interactive",
        "indoor",
        "motion-sickness",
        "plan-ahead",
      ],
    },

    "Slinky Dog Dash": {
      displayName: "Slinky Dog Dash",
      land: "toy_story_land",
      minHeightInches: 38,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 3,
      popularity: 96,
      waitProfile: {
        averageWait: 85,
        goodDealUnder: 60,
        normalRange: [75, 95],
        badValueOver: 105,
        usuallyHighAllDay: true,
        strategyNote:
          "The most competitive Tier 1 Multi Pass in Hollywood Studios. The queue is exposed, so midday standby is brutal in heat.",
      },
      planningProfile: {
        category: "plan_ahead_multi_pass",
        paidAccess: "LLMP",
        appStatus: "plan_ahead",
        strategy:
          "Prioritize Multi Pass, ride in the first 15 minutes of Early Entry, or save for the final 30 minutes of the night. Avoid long exposed waits midday.",
      },
      tags: [
        "headliner",
        "coaster",
        "family",
        "outdoor",
        "weather-sensitive",
        "plan-ahead",
      ],
    },

    "Toy Story Mania!": {
      displayName: "Toy Story Mania!",
      land: "toy_story_land",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 2,
      popularity: 78,
      waitProfile: {
        averageWait: 50,
        goodDealUnder: 30,
        normalRange: [40, 60],
        badValueOver: 70,
        usuallyHighAllDay: false,
        strategyNote:
          "High-capacity family ride with a moving queue. If it spikes over 60 minutes midday, it usually drops later as crowds shift.",
      },
      planningProfile: {
        category: "wait_for_drop",
        paidAccess: "LLMP",
        appStatus: "wait_for_drop",
        strategy:
          "Good Toy Story Land indoor reset under 30 minutes. If it is high midday, check back later.",
      },
      tags: ["interactive", "family", "indoor", "ac", "toy-story", "wait-for-drop"],
    },

    "Alien Swirling Saucers": {
      displayName: "Alien Swirling Saucers",
      land: "toy_story_land",
      minHeightInches: 32,
      environment: "outdoor",
      hasAC: false,
      getsWet: false,
      closesInRain: true,
      intensity: 2,
      popularity: 50,
      waitProfile: {
        averageWait: 35,
        goodDealUnder: 25,
        normalRange: [30, 45],
        badValueOver: 50,
        usuallyHighAllDay: false,
        strategyNote:
          "Short outdoor spinner. Do not wait more than about 30 minutes unless your group specifically wants it or you have an immediate return.",
      },
      planningProfile: {
        category: "normal_standby",
        paidAccess: "LLMP",
        appStatus: "go_now_if_low",
        strategy:
          "Use as nearby Toy Story Land filler only when low. Avoid long waits in heat.",
      },
      tags: ["spinner", "family", "outdoor", "weather-sensitive", "filler"],
    },

    "Walt Disney Presents": {
      displayName: "Walt Disney Presents",
      land: "animation_courtyard",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 25,
      waitProfile: {
        averageWait: 10,
        goodDealUnder: 10,
        normalRange: [5, 15],
        badValueOver: 20,
        usuallyHighAllDay: false,
        strategyNote:
          "Low-pressure indoor walkthrough/exhibit. Useful as a calm AC reset, not a major destination.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "none",
        appStatus: "recovery",
        strategy:
          "Use when nearby and the group needs quiet indoor time.",
      },
      tags: ["walkthrough", "history", "recovery", "indoor", "ac"],
    },

    "Vacation Fun - An Original Animated Short with Mickey & Minnie": {
      displayName: "Vacation Fun - An Original Animated Short with Mickey & Minnie",
      land: "animation_courtyard",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 28,
      waitProfile: {
        averageWait: 10,
        goodDealUnder: 10,
        normalRange: [5, 15],
        badValueOver: 20,
        usuallyHighAllDay: false,
        strategyNote:
          "Short indoor theater option. Good for a quick AC reset when nearby.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "none",
        appStatus: "recovery",
        strategy:
          "Use as a quick indoor break, especially during heat or rain.",
      },
      tags: ["show", "family", "recovery", "indoor", "ac"],
    },

    "Disney Junior Play and Dance!": {
      displayName: "Disney Junior Play and Dance!",
      land: "animation_courtyard",
      minHeightInches: 0,
      environment: "indoor",
      hasAC: true,
      getsWet: false,
      closesInRain: false,
      intensity: 1,
      popularity: 30,
      waitProfile: {
        averageWait: 15,
        goodDealUnder: 10,
        normalRange: [10, 20],
        badValueOver: 30,
        usuallyHighAllDay: false,
        strategyNote:
          "Best for families with young kids. Useful indoor reset if the target audience fits.",
      },
      planningProfile: {
        category: "filler_or_recovery",
        paidAccess: "none",
        appStatus: "recovery",
        strategy:
          "Use with preschool-age kids or when younger guests need a safe indoor reset.",
      },
      tags: ["show", "toddlers", "kids", "indoor", "ac", "recovery"],
    },
  },

  // Future parks: animal_kingdom,
  // universal_studios, islands_of_adventure, epic_universe
};
/* -------------------------------------------------------------------------- */
/* Lookup helpers                                                             */
/* -------------------------------------------------------------------------- */

export function getRideMeta(parkId, rideIdOrName) {
  const park = RIDE_METADATA[parkId];
  if (!park) return null;

  if (rideIdOrName != null && park[rideIdOrName]) {
    return park[rideIdOrName];
  }

  const match = Object.values(park).find(
    (m) => m.displayName === rideIdOrName
  );

  return match || null;
}

export function getParkRides(parkId) {
  const park = RIDE_METADATA[parkId];
  return park ? Object.entries(park) : [];
}

/* -------------------------------------------------------------------------- */
/* Derived properties                                                         */
/* -------------------------------------------------------------------------- */

export function isKidFriendly(meta) {
  return meta.minHeightInches === 0 && meta.intensity <= 2;
}

export function isRecoveryRide(meta) {
  return meta.hasAC && meta.environment === "indoor" && meta.intensity <= 2;
}

export function isRainSafe(meta) {
  return !meta.closesInRain && !meta.getsWet;
}

export function isHeatRelief(meta) {
  return meta.hasAC || meta.getsWet;
}

export function isThrillRide(meta) {
  return meta.intensity >= 4;
}

export function isPlanAheadRide(meta) {
  return meta?.planningProfile?.appStatus === "plan_ahead";
}

export function isWaitForDropRide(meta) {
  return meta?.planningProfile?.appStatus === "wait_for_drop";
}

export function isFillerOrRecoveryRide(meta) {
  return meta?.planningProfile?.category === "filler_or_recovery";
}

export function getWaitValueStatus(meta, waitTime) {
  const profile = meta?.waitProfile;

  if (!profile || waitTime == null) {
    return {
      status: "unknown",
      label: "Unknown wait value",
      modifier: 0,
    };
  }

  const [normalLow, normalHigh] = profile.normalRange;

  if (waitTime <= profile.goodDealUnder) {
    return {
      status: "great_value",
      label: "Great value right now",
      modifier: 14,
    };
  }

  if (waitTime >= profile.badValueOver) {
    return {
      status: profile.usuallyHighAllDay ? "plan_ahead" : "bad_value",
      label: profile.usuallyHighAllDay
        ? "Usually runs high"
        : "Poor value right now",
      modifier: profile.usuallyHighAllDay ? -6 : -16,
    };
  }

  if (waitTime >= normalLow && waitTime <= normalHigh) {
    return {
      status: "normal",
      label: "Normal wait for this ride",
      modifier: profile.usuallyHighAllDay ? 0 : -4,
    };
  }

  if (waitTime < normalLow) {
    return {
      status: "good_value",
      label: "Better than usual",
      modifier: 8,
    };
  }

  if (waitTime > normalHigh) {
    return {
      status: "above_normal",
      label: "Higher than usual",
      modifier: profile.usuallyHighAllDay ? -4 : -10,
    };
  }

  return {
    status: "normal",
    label: "Normal wait for this ride",
    modifier: 0,
  };
}
