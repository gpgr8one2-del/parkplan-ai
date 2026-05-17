/**
 * ParkPlan AI — Ride Experience Content
 *
 * Curated "While You Wait" content shown when a guest marks a ride as In Line.
 *
 * Keep this deterministic and human-reviewed.
 * Do NOT generate ride facts directly with AI in V1.
 */

export const RIDE_EXPERIENCE_CONTENT = {
  magic_kingdom: {
    // ---------- Adventureland ----------
    "Pirates of the Caribbean": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Pirates was not part of Magic Kingdom on opening day. Disney originally thought Florida guests were too close to the real Caribbean to care, but guest demand changed that fast.",
        },
        {
          title: "Look For This",
          text: "In the dungeon area, look for two skeletons playing chess. The board was designed so the game is stuck in a permanent stalemate.",
        },
        {
          title: "Hidden Mickey",
          text: "Near the end of the ride before unload, look closely at the iron locks on the jail cell doors.",
        },
        {
          title: "Ask Your Group",
          text: "Would you rather be a pirate captain, a treasure hunter, or the person trying to escape the jail scene?",
        },
      ],
    },

    "Jungle Cruise": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The river water is dyed a muddy green-brown so you cannot see the ride track or how shallow the water really is.",
        },
        {
          title: "Queue Detail",
          text: "Check the shipping crates in the queue. Many are addressed to historical figures or Disney Imagineers.",
        },
        {
          title: "Listen For This",
          text: "The queue radio broadcast features a DJ named Albert Awster, a nod to the attraction’s classic voice style.",
        },
        {
          title: "Ask Your Group",
          text: "Who in your group would make the best Jungle Cruise skipper?",
        },
      ],
    },

    "The Magic Carpets of Aladdin": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The golden spitting camels originally appeared in an Aladdin parade at Disney-MGM Studios before moving to Magic Kingdom.",
        },
        {
          title: "Look For This",
          text: "Around the ride, look for colorful jewels built into the surrounding metalwork.",
        },
        {
          title: "Hidden Mickey",
          text: "Look down near the ride perimeter. Some of the metal grates include a Mickey silhouette.",
        },
        {
          title: "Ask Your Group",
          text: "Who is brave enough to sit where the camel can splash them?",
        },
      ],
    },

    "Walt Disney's Enchanted Tiki Room": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "This classic show helped define Disney’s use of Audio-Animatronics in theme park attractions.",
        },
        {
          title: "Family Prompt",
          text: "Have everyone pick which bird or flower they think has the most personality.",
        },
      ],
    },

    // ---------- Frontierland ----------
    "Big Thunder Mountain Railroad": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Big Thunder uses authentic antique mining equipment sourced from real ghost towns in the American West.",
        },
        {
          title: "Queue Detail",
          text: "The interactive queue is themed as the Big Thunder Mining Company. Look for crates, ledgers, and pun-filled names.",
        },
        {
          title: "Hidden Mickey",
          text: "Before the loading platform, look near the ground behind fencing for three rusted gears arranged like a Mickey head.",
        },
        {
          title: "Ask Your Group",
          text: "Which row do you think feels wildest: front, middle, or back?",
        },
      ],
    },

    "Tiana's Bayou Adventure": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The story takes place after The Princess and the Frog and follows Tiana’s Foods inside a repurposed salt mine.",
        },
        {
          title: "Queue Detail",
          text: "Look for portraits and details tied to Tiana’s father, James, including references to his World War I service.",
        },
        {
          title: "Look For This",
          text: "Watch for the new swamp critters and detailed bayou scenes throughout the attraction.",
        },
        {
          title: "Ask Your Group",
          text: "Would you rather work in Tiana’s kitchen, join the band, or explore the bayou?",
        },
      ],
    },

    "Country Bear Musical Jamboree": {
      whileWaiting: [
        {
          title: "Why It Helps",
          text: "This is a strong low-stress break because it gets your group seated, inside, and out of the heat or rain.",
        },
        {
          title: "Ask Your Group",
          text: "Which bear looks like they would be the most fun at a family party?",
        },
      ],
    },

    // ---------- Liberty Square ----------
    "Haunted Mansion": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Unlike Disneyland’s elevator-style stretching room, the Magic Kingdom stretching room expands upward while guests stay in place.",
        },
        {
          title: "Queue Detail",
          text: "In the interactive graveyard queue, read the Dread family bust epitaphs to piece together a murder mystery.",
        },
        {
          title: "Look For This",
          text: "Near the turnstiles, look down for the bride’s wedding ring embedded in the pavement.",
        },
        {
          title: "Hidden Mickey",
          text: "In the ballroom scene, look at the dining table. Plates are often arranged into a Hidden Mickey.",
        },
        {
          title: "Ask Your Group",
          text: "Would you rather live in the Haunted Mansion for one night or be a Jungle Cruise skipper for one day?",
        },
      ],
    },

    "The Hall of Presidents": {
      whileWaiting: [
        {
          title: "Why It Helps",
          text: "This is one of the best long AC breaks in Magic Kingdom when your group needs to sit and reset.",
        },
        {
          title: "Family Prompt",
          text: "Have everyone pick whether they want a quick rest, a snack next, or one more ride after this.",
        },
      ],
    },

    // ---------- Fantasyland ----------
    "Peter Pan's Flight": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The ride uses a suspended track above the vehicles, which creates the feeling of flying over London.",
        },
        {
          title: "Queue Detail",
          text: "The queue winds through the Darling family home and includes interactive effects with Peter Pan’s shadow.",
        },
        {
          title: "Hidden Mickey",
          text: "In the interactive nursery queue, look at the tree bark for a Mickey shape etched into the wood.",
        },
        {
          title: "Ask Your Group",
          text: "Would you rather fly over London, Never Land, or Skull Rock?",
        },
      ],
    },

    "Seven Dwarfs Mine Train": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The mine carts use a special swinging suspension system, letting the vehicles sway side to side through turns.",
        },
        {
          title: "Queue Detail",
          text: "If multiple guests spin the jewel barrels at the same time, look up. You may trigger an animation of Snow White and the Dwarfs dancing.",
        },
        {
          title: "Hidden Mickey",
          text: "Inside the mine on the second lift hill, watch the shadows on the wall. A Mickey shadow may appear among the Dwarfs.",
        },
        {
          title: "Ask Your Group",
          text: "Which dwarf would be the best ride buddy?",
        },
      ],
    },

    "\"it's a small world\"": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The ride’s geometric visual style comes from legendary Disney artist Mary Blair.",
        },
        {
          title: "Queue Detail",
          text: "Every 15 minutes, the clock tower doors open and a parade of wooden dolls appears.",
        },
        {
          title: "Hidden Mickey",
          text: "In the Africa scene, look for purple vines hanging from the ceiling. One cluster forms a Mickey head.",
        },
        {
          title: "Ask Your Group",
          text: "Which room do you think will get the song stuck in your head the most?",
        },
      ],
    },

    "The Many Adventures of Winnie the Pooh": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "This attraction replaced Mr. Toad’s Wild Ride, which caused a major fan reaction in the late 1990s.",
        },
        {
          title: "Queue Detail",
          text: "The interactive queue includes honey walls where kids can swipe to reveal characters hidden underneath.",
        },
        {
          title: "Hidden Detail",
          text: "In Owl’s House, look for a portrait of Mr. Toad handing the deed to Owl.",
        },
        {
          title: "Ask Your Group",
          text: "Who are you most like today: Pooh, Tigger, Piglet, or Eeyore?",
        },
      ],
    },

    "Under the Sea - Journey of The Little Mermaid": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The Ursula figure is huge, measuring about 7.5 feet tall and 12 feet wide.",
        },
        {
          title: "Queue Detail",
          text: "The queue winds through nautical wreckage and tide pools with interactive crab-sorting details.",
        },
        {
          title: "Hidden Mickey",
          text: "In the queue rockwork, look for a classic Steamboat Willie Mickey profile carved into the stone.",
        },
        {
          title: "Ask Your Group",
          text: "Would you rather live under the sea or in Prince Eric’s castle?",
        },
      ],
    },

    "Dumbo the Flying Elephant": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Dumbo originally had one spinner. In 2012, Disney added a second spinner so the ride could handle more families.",
        },
        {
          title: "Queue Detail",
          text: "The queue includes a large air-conditioned circus tent playground where kids can play while waiting.",
        },
        {
          title: "Hidden Mickey",
          text: "Look down in the queue area for peanut shells embedded in the concrete. Some overlap into Mickey shapes.",
        },
        {
          title: "Ask Your Group",
          text: "Who wants to fly high and who wants to stay low?",
        },
      ],
    },

    "Mad Tea Party": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The ride uses a planetary gear system with 18 teacups on smaller turntables sitting on one larger turntable.",
        },
        {
          title: "Look For This",
          text: "Look for the Dormouse popping out of the giant teapot.",
        },
        {
          title: "Ask Your Group",
          text: "Who is spinning the cup, and who is begging them to stop?",
        },
      ],
    },

    "Prince Charming Regal Carrousel": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The carrousel is an antique built in 1917 by the Philadelphia Toboggan Company.",
        },
        {
          title: "Queue Detail",
          text: "Look up at the canopy. It includes hand-painted scenes telling the story of Cinderella.",
        },
        {
          title: "Look For This",
          text: "Cinderella’s Horse is said to be the one with a golden ribbon tied around its tail.",
        },
        {
          title: "Ask Your Group",
          text: "Would you pick the fanciest horse, the fastest-looking horse, or the calmest one?",
        },
      ],
    },

    "Mickey's PhilharMagic": {
      whileWaiting: [
        {
          title: "Why It Helps",
          text: "This is a high-capacity indoor show, which makes it a great reset when everyone needs AC and a seat.",
        },
        {
          title: "Ask Your Group",
          text: "Which Disney song would you want to hear blasted in a giant theater?",
        },
      ],
    },

    "The Barnstormer": {
      whileWaiting: [
        {
          title: "Family Prompt",
          text: "This is a short kid-friendly coaster. Ask your group if they want a tiny thrill now or want to save their energy for something bigger.",
        },
      ],
    },

    // ---------- Tomorrowland ----------
    "Space Mountain": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "When it opened in 1975, Space Mountain was the first roller coaster in the world controlled entirely by computers.",
        },
        {
          title: "Queue Detail",
          text: "Look for references to Starport Seventy-Five, a nod to the year the attraction opened.",
        },
        {
          title: "Hidden Mickey",
          text: "On the exit moving walkway, check the space luggage diorama for a travel sticker shaped like Mickey.",
        },
        {
          title: "Ask Your Group",
          text: "Does riding in the dark make a coaster better or scarier?",
        },
      ],
    },

    "TRON Lightcycle / Run": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "TRON reaches nearly 60 mph, making it one of the fastest coasters at any Disney theme park.",
        },
        {
          title: "Queue Detail",
          text: "The queue uses a digitizing effect that makes it feel like you are being uploaded into the Grid.",
        },
        {
          title: "Look For This",
          text: "Watch the glowing circuit patterns in the preshow area.",
        },
        {
          title: "Ask Your Group",
          text: "Team Blue or Team Orange?",
        },
      ],
    },

    "Tomorrowland Transit Authority PeopleMover": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The PeopleMover is powered by linear synchronous motors. The vehicles themselves do not have motors.",
        },
        {
          title: "Look For This",
          text: "During the ride, you pass Walt Disney’s original Progress City model, an early concept tied to EPCOT.",
        },
        {
          title: "Hidden Mickey",
          text: "Inside the Progress City diorama, look at the futuristic woman getting her hair done. Her belt buckle is shaped like Mickey.",
        },
        {
          title: "Ask Your Group",
          text: "Is this a ride, a break, or both?",
        },
      ],
    },

    "Buzz Lightyear's Space Ranger Spin": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Buzz’s face in the queue uses an early form of projection mapping instead of fully mechanical facial movement.",
        },
        {
          title: "Queue Detail",
          text: "Look for the giant View-Master disks and oversized battery models.",
        },
        {
          title: "Hidden Mickey",
          text: "In the queue murals, look for the Pollution Planet. One continent is shaped like a Mickey head.",
        },
        {
          title: "Ask Your Group",
          text: "Who is going for max points, and who is just spinning the vehicle?",
        },
      ],
    },

    "Astro Orbiter": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Astro Orbiter was originally known as Star Jets, and its height makes it feel more intense than similar spinner rides.",
        },
        {
          title: "Queue Detail",
          text: "This is the only Magic Kingdom ride where guests take an elevator up to the loading platform.",
        },
        {
          title: "Ask Your Group",
          text: "Would you rather ride high above Tomorrowland or stay closer to the ground?",
        },
      ],
    },

    "Tomorrowland Speedway": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The cars use 9-horsepower Honda engines and top out around 7 mph.",
        },
        {
          title: "Queue Detail",
          text: "The queue is themed like the Indianapolis Motor Speedway, including a scoring pylon and Yard of Bricks detail.",
        },
        {
          title: "Ask Your Group",
          text: "Who is the best driver in your group, and who should not be trusted with the wheel?",
        },
      ],
    },

    "Monsters Inc. Laugh Floor": {
      whileWaiting: [
        {
          title: "Why It Helps",
          text: "This is a strong indoor recovery pick because it gives everyone AC, seats, and something funny without a big commitment.",
        },
        {
          title: "Ask Your Group",
          text: "Who in your group is most likely to get picked on by the monsters?",
        },
      ],
    },
  },
};

export function getRideExperienceContent(parkId, rideName) {
  const parkContent = RIDE_EXPERIENCE_CONTENT[parkId];
  if (!parkContent || !rideName) return null;

  return parkContent[rideName] || null;
}
