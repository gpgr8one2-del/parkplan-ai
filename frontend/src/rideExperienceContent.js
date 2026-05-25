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
  epcot: {
    // ---------- World Celebration ----------
    "Spaceship Earth": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Spaceship Earth weighs about 16 million pounds and is built as a structural sphere within a sphere.",
        },
        {
          title: "Queue Detail",
          text: "The outside is covered in 11,324 aluminum-composite panels. The drainage system funnels rainwater through the structure instead of letting it pour off the sides.",
        },
        {
          title: "Hidden Mickey",
          text: "In the Renaissance scene, look behind the sleeping monk on the left. The inkwells and ink stains form a Hidden Mickey.",
        },
        {
          title: "Ask Your Group",
          text: "If you could time travel to one scene in this ride, which one would you pick?",
        },
      ],
    },

    // ---------- World Discovery ----------
    "Guardians of the Galaxy: Cosmic Rewind": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Cosmic Rewind is Disney’s first Omnicoaster. The vehicles can rotate to point you toward the action while moving along the track.",
        },
        {
          title: "Queue Detail",
          text: "The Galaxarium has a long cinematic loop about Xandar and Earth. Watch for nods to classic EPCOT architecture in the Wonders of Xandar pavilion model.",
        },
        {
          title: "Look For This",
          text: "In the Xandar Gallery, the broadcast segments include real Walt Disney Imagineers playing themselves.",
        },
        {
          title: "Ask Your Group",
          text: "Which song are you hoping to get?",
        },
      ],
    },

    "Test Track": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Test Track reaches up to 65 mph, making it the fastest ride at Walt Disney World.",
        },
        {
          title: "Queue Detail",
          text: "The queue is themed as a futuristic design studio where guests create a concept vehicle focused on capability, efficiency, responsiveness, and power.",
        },
        {
          title: "Hidden Mickey",
          text: "Watch the digital blueprint screens in the design studio. Engine or wheel diagrams can align into a Mickey shape.",
        },
        {
          title: "Ask Your Group",
          text: "Would your group build a car for speed, comfort, style, or chaos?",
        },
      ],
    },

    "Mission: SPACE": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The Orange Team version uses a real centrifuge system and can generate more than twice Earth’s gravity.",
        },
        {
          title: "Queue Detail",
          text: "The queue features a 35-foot Lunar Rover replica on loan from the Smithsonian Institution.",
        },
        {
          title: "Hidden Mickey",
          text: "In the simulation training area, look at the large moon mural. One crater is shaped like Mickey.",
        },
        {
          title: "Ask Your Group",
          text: "Green Team or Orange Team: who is brave and who is playing it safe?",
        },
      ],
    },

    // ---------- World Nature ----------
    "Soarin' Around the World": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The ride system was first modeled by Imagineer Mark Sumner using an old Erector Set.",
        },
        {
          title: "Queue Detail",
          text: "The queue includes Soarin’ Challenge, an interactive trivia game about geography, culture, and aviation.",
        },
        {
          title: "Hidden Mickey",
          text: "Near the finale over EPCOT, a firework briefly forms a giant Mickey head in the sky.",
        },
        {
          title: "Ask Your Group",
          text: "Which destination would you want to actually visit?",
        },
      ],
    },

    "Living with the Land": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The greenhouses are real working research facilities and produce thousands of crops each year.",
        },
        {
          title: "Queue Detail",
          text: "Look for quotes about agriculture, conservation, and the Earth along the queue walls.",
        },
        {
          title: "Hidden Mickey",
          text: "In the aquaculture section, look at the mesh tubes used to sort fish. Some are shaped like Mickey heads.",
        },
        {
          title: "Ask Your Group",
          text: "Would your group rather grow giant vegetables or work in the fish farm?",
        },
      ],
    },

    "The Seas with Nemo & Friends": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The aquarium at the end holds about 5.7 million gallons of water, making it one of the largest man-made ocean environments in the world.",
        },
        {
          title: "Queue Detail",
          text: "The queue transitions from a sunny beach, under a boardwalk, and then deeper underwater.",
        },
        {
          title: "Hidden Mickey",
          text: "In the underwater cavern section, look for three round stones grouped together in the coral walls.",
        },
        {
          title: "Ask Your Group",
          text: "Which sea creature would you want to see after the ride?",
        },
      ],
    },

    "Journey of Water, Inspired by Moana": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Journey of Water is a walkthrough attraction with interactive water elements that respond to guest movement.",
        },
        {
          title: "Look For This",
          text: "The trail includes design plaques about the water cycle, including rain, stream, wetland, spring, lake, river, and ocean.",
        },
        {
          title: "Hidden Detail",
          text: "Look closely at the rock carvings. Characters like Moana, Maui, Heihei, and Pua appear throughout the trail.",
        },
        {
          title: "Ask Your Group",
          text: "Are you touching every water effect or trying to stay dry?",
        },
      ],
    },

    // ---------- World Showcase West ----------
    "Remy's Ratatouille Adventure": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Remy’s is a trackless ride that uses positioning technology, 3D projections, heat, and water effects to make you feel rat-sized.",
        },
        {
          title: "Queue Detail",
          text: "The queue takes you over the rooftops of Paris. In the artist loft, watch the paintings on the easels change digitally.",
        },
        {
          title: "Hidden Mickey",
          text: "In the artist loft area, look up at the exposed wooden rafters. Knots and curves in the wood form a Mickey profile.",
        },
        {
          title: "Ask Your Group",
          text: "Would you trust Remy to cook dinner for your family?",
        },
      ],
    },

    // ---------- World Showcase East ----------
    "Frozen Ever After": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "Frozen Ever After uses the same basic track layout and ride system as Maelstrom, the Norway ride that operated from 1988 to 2014.",
        },
        {
          title: "Queue Detail",
          text: "In Wandering Oaken’s Trading Post and Sauna, watch the sauna window. Oaken occasionally clears the steam and waves.",
        },
        {
          title: "Hidden Mickey",
          text: "In Oaken’s Trading Post, look at the cluttered shelves. A small wooden block set is stacked into a Mickey silhouette.",
        },
        {
          title: "Ask Your Group",
          text: "Who is your group most like today: Anna, Elsa, Olaf, Kristoff, or Sven?",
        },
      ],
    },

    "Gran Fiesta Tour Starring The Three Caballeros": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The final concert scene uses real Audio-Animatronics of Donald, José, and Panchito that were originally used in Mickey Mouse Revue.",
        },
        {
          title: "Queue Detail",
          text: "The queue sits inside the twilight atmosphere of the Mexico pavilion, surrounded by folk art, carvings, and pottery displays.",
        },
        {
          title: "Hidden Mickey",
          text: "In the boat scene where Donald takes photos, look at the boat to his left. Three hanging paper lanterns form a Hidden Mickey.",
        },
        {
          title: "Ask Your Group",
          text: "Who would be the most likely to lose Donald Duck in Mexico?",
        },
      ],
    },

    // ---------- EPCOT General ----------
    "EPCOT": {
      whileWaiting: [
        {
          title: "Did You Know?",
          text: "EPCOT was originally imagined by Walt Disney as the Experimental Prototype Community of Tomorrow, a functioning futuristic city concept.",
        },
        {
          title: "Look For This",
          text: "Many EPCOT queues shift visually from present-day materials and lighting into a more futuristic tone as you move deeper inside.",
        },
      ],
    },
  },
  hollywood: {
    // ---------- Hollywood Boulevard ----------
    "Mickey & Minnie's Runaway Railway": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "This is the first ride-through attraction in Disney history starring Mickey and Minnie.",
        },
        {
          title: "Queue Detail",
          text: "The queue is the lobby of the El CapiTOON Theater and features the “Mickey Through the Ears” exhibit. Look for spoof movie posters and the concession cash register total of $19.28, a nod to Mickey’s debut year.",
        },
        {
          title: "Hidden Mickey",
          text: "Before you board the train, look up at the wooden ceiling beams. Knots and wood grain can form a Hidden Mickey.",
        },
        {
          title: "Ask Your Group",
          text: "If you could jump into any cartoon world for one day, which one would you choose and what is the first thing you would do?",
        },
      ],
    },

    // ---------- Sunset Boulevard ----------
    "The Twilight Zone Tower of Terror": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The tower is 199 feet tall. Imagineers kept it just under 200 feet to avoid needing a flashing aviation light that would ruin the spooky 1939 hotel look.",
        },
        {
          title: "Queue Detail",
          text: "The lobby is staged as if everyone vanished suddenly on Halloween night in 1939. Look for old suitcases, antiques, and the abandoned Mahjong game.",
        },
        {
          title: "Hidden Mickey",
          text: "In the library pre-show, watch the little girl entering the elevator. The vintage doll she holds is a Mickey plush.",
        },
        {
          title: "Ask Your Group",
          text: "If you managed a haunted hotel, what silly or spooky rule would every guest have to follow?",
        },
      ],
    },

    "Rock 'n' Roller Coaster Starring Aerosmith": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "This indoor launch coaster accelerates from 0 to nearly 60 mph in just a few seconds, making the launch the star of the ride.",
        },
        {
          title: "Queue Detail",
          text: "You enter G-Force Records and move through a rock-and-roll recording studio setup before being sent to the super-stretch limo.",
        },
        {
          title: "Look For This",
          text: "Watch the recording studio props, posters, cables, and music gear. The queue is packed with rock-tour details.",
        },
        {
          title: "Ask Your Group",
          text: "If your family started a rock band today, what would the band name be, and who would play which instrument?",
        },
      ],
    },

    "Rock 'n' Roller Coaster Starring The Muppets": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The Electric Mayhem takes over this high-speed launch coaster with a Muppets rock-show twist.",
        },
        {
          title: "Queue Detail",
          text: "You step into G-Force Records with Muppet-style recording studio chaos, music gear, and audio-engineer penguin energy.",
        },
        {
          title: "Look For This",
          text: "Near the end, watch for Statler and Waldorf-style heckling energy. This ride practically begs for jokes in the unload area.",
        },
        {
          title: "Ask Your Group",
          text: "If your family started a rock band today, what would the band name be, and who would play which instrument?",
        },
      ],
    },

    // ---------- Toy Story Land ----------
    "Slinky Dog Dash": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The story is that Andy built a “Dash & Dodge Mega Coaster Kit” in his backyard and put Slinky Dog on the track instead of the train from the box.",
        },
        {
          title: "Queue Detail",
          text: "Everything is oversized because you are toy-sized. Look for huge glue bottles, coloring books, and Andy’s hand-drawn coaster plans on notebook paper.",
        },
        {
          title: "Hidden Mickey",
          text: "In the loading area, look closely at Andy’s giant hand-drawn mural. A classic Mickey shape is hidden in the fluffy clouds.",
        },
        {
          title: "Ask Your Group",
          text: "If your favorite toy came to life when you left the room, what kind of mischief would it get into?",
        },
      ],
    },

    "Toy Story Mania!": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The ride uses 3D carnival games with synchronized effects like air blasts and water sprays.",
        },
        {
          title: "Queue Detail",
          text: "The Mr. Potato Head figure in the queue can joke with guests and even remove his own ear.",
        },
        {
          title: "Look For This",
          text: "Look around at the oversized vintage board games and toy details. The scale is part of the joke because you are toy-sized.",
        },
        {
          title: "Ask Your Group",
          text: "Which carnival game are you best at: ring toss, balloon pop, or water gun race?",
        },
      ],
    },

    "Alien Swirling Saucers": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The ride is themed as a toy playset Andy won at Pizza Planet.",
        },
        {
          title: "Queue Detail",
          text: "Look for oversized space blasters, toy packaging, and little green alien details around the queue.",
        },
        {
          title: "Hidden Mickey",
          text: "Check the metal grating and fencing around the ride. Some geometric shapes repeat into Mickey-like silhouettes.",
        },
        {
          title: "Ask Your Group",
          text: "If friendly green aliens abducted you, what Earth snack would you offer to prove we come in peace?",
        },
      ],
    },

    // ---------- Star Wars: Galaxy's Edge ----------
    "Star Wars: Rise of the Resistance": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "This attraction blends multiple ride systems into one experience, including walk-through moments, a motion simulator, a trackless dark ride, and a drop sequence.",
        },
        {
          title: "Queue Detail",
          text: "You move through a secret Resistance base carved into Batuu’s ancient stone. Look for flight suits, blaster racks, rock tunnels, and communication equipment.",
        },
        {
          title: "Hidden Mickey",
          text: "In the cave areas before the first pre-show, look at the glowing consoles. Three round dials can line up like a Mickey head.",
        },
        {
          title: "Ask Your Group",
          text: "If you were a Resistance pilot, what would you name your spaceship and what would your call sign be?",
        },
      ],
    },

    "Millennium Falcon: Smugglers Run": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The Millennium Falcon outside the attraction is built life-size to match the ship from the films.",
        },
        {
          title: "Queue Detail",
          text: "You walk through Ohnaka Transport Solutions and eventually wait in the Falcon’s main hold, complete with the Dejarik holochess table.",
        },
        {
          title: "Hidden Mickey",
          text: "In the Hondo Ohnaka pre-show room, look at the cargo crates behind him. A faint oil stain can resemble a Mickey head.",
        },
        {
          title: "Ask Your Group",
          text: "Would you rather be the Pilot steering, the Gunner shooting, or the Engineer fixing the ship?",
        },
      ],
    },

    // ---------- Echo Lake ----------
    "Star Tours – The Adventures Continue": {
      whileWaiting: [
        {
          title: "Quick Backstory",
          text: "The ride uses randomized scene combinations, so it is rare to get the exact same flight twice.",
        },
        {
          title: "Queue Detail",
          text: "You walk through a busy spaceport terminal. Watch the baggage scanner for funny items like Buzz Lightyear toys and Mickey ears.",
        },
        {
          title: "Hidden Mickey",
          text: "Before entering the main building, look up into the tree branches in the outdoor queue. Some branches can twist into a Mickey shape.",
        },
        {
          title: "Ask Your Group",
          text: "If you could vacation on any alien planet, where would you go and what one thing would you pack?",
        },
      ],
    },
  },
};

function normalizeRideExperienceName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/&/g, "and")
    .replace(/\bstarring\b/g, "")
    .replace(/\bpresented by .+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getRideExperienceAliases(normalizedName) {
  const aliases = new Set([normalizedName]);

  // Live feeds sometimes include legal marks, subtitles, or slightly different
  // branding than our curated content keys. These aliases keep While You Wait
  // content from disappearing during real park use.
  if (normalizedName.includes("tower of terror")) {
    aliases.add("the twilight zone tower of terror");
    aliases.add("tower of terror");
  }

  if (
    normalizedName.includes("rock n roller coaster") ||
    normalizedName.includes("rock and roller coaster")
  ) {
    aliases.add("rock n roller coaster aerosmith");
    aliases.add("rock n roller coaster");
    aliases.add("rock and roller coaster");
  }

  if (normalizedName.includes("mickey") && normalizedName.includes("runaway railway")) {
    aliases.add("mickey and minnies runaway railway");
    aliases.add("mickey minnies runaway railway");
  }

  if (normalizedName.includes("rise of the resistance")) {
    aliases.add("star wars rise of the resistance");
    aliases.add("rise of the resistance");
  }

  if (normalizedName.includes("millennium falcon") || normalizedName.includes("smugglers run")) {
    aliases.add("millennium falcon smugglers run");
    aliases.add("smugglers run");
  }

  if (normalizedName.includes("star tours")) {
    aliases.add("star tours the adventures continue");
    aliases.add("star tours");
  }

  if (normalizedName.includes("frozen") && normalizedName.includes("sing along")) {
    aliases.add("for the first time in forever a frozen sing along celebration");
    aliases.add("frozen sing along celebration");
  }

  if (normalizedName.includes("little mermaid") || normalizedName.includes("under the sea")) {
    aliases.add("under the sea journey of the little mermaid");
    aliases.add("journey of the little mermaid");
  }

  if (normalizedName.includes("its a small world") || normalizedName.includes("small world")) {
    aliases.add("its a small world");
    aliases.add("small world");
  }

  if (normalizedName.includes("tianas bayou adventure")) {
    aliases.add("tianas bayou adventure");
  }

  if (normalizedName.includes("tron")) {
    aliases.add("tron lightcycle run");
  }

  return aliases;
}

export function getRideExperienceContent(parkId, rideName) {
  const parkContent = RIDE_EXPERIENCE_CONTENT[parkId];
  if (!parkContent || !rideName) return null;

  // Fast path for exact matches.
  if (parkContent[rideName]) return parkContent[rideName];

  const normalizedRideName = normalizeRideExperienceName(rideName);
  const rideAliases = getRideExperienceAliases(normalizedRideName);

  const matchedKey = Object.keys(parkContent).find((contentKey) => {
    const normalizedContentKey = normalizeRideExperienceName(contentKey);
    const contentAliases = getRideExperienceAliases(normalizedContentKey);

    if (rideAliases.has(normalizedContentKey)) return true;

    for (const alias of rideAliases) {
      if (contentAliases.has(alias)) return true;

      // Helpful for live-feed names with extra branding or legal marks.
      if (
        alias.length >= 8 &&
        normalizedContentKey.length >= 8 &&
        (alias.includes(normalizedContentKey) ||
          normalizedContentKey.includes(alias))
      ) {
        return true;
      }
    }

    return false;
  });

  return matchedKey ? parkContent[matchedKey] : null;
}
