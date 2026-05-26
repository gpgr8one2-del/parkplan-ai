/**
 * ParkPlan AI — Magic Kingdom Line Time Companion V0
 *
 * Lightweight family games for queue waits and downtime.
 * Built to create laughs, connection, and little memories without becoming a full game system.
 *
 * V0 rules:
 * - Magic Kingdom only
 * - hard-coded family-safe content
 * - no scoring, streaks, badges, accounts, or leaderboards
 * - works offline once loaded
 */

const MAGIC_KINGDOM_TRIVIA_BY_RIDE = {
  "Space Mountain": [
    {
      question: "Disney nerd check: what year did Magic Kingdom’s Space Mountain open?",
      choices: ["1971", "1975", "1982", "1994"],
      answer: "1975",
      fact:
        "Magic Kingdom’s Space Mountain opened in 1975 and was the first Space Mountain Disney built.",
    },
    {
      question: "Space Mountain is mostly famous for being what kind of coaster?",
      choices: [
        "A water coaster",
        "An indoor dark coaster",
        "A spinning coaster",
        "A wooden coaster",
      ],
      answer: "An indoor dark coaster",
      fact:
        "The darkness does a lot of the magic. The actual top speed feels much faster because you cannot see what is coming.",
    },
  ],

  "TRON Lightcycle / Run": [
    {
      question: "On TRON, what are guests riding?",
      choices: ["A banshee", "A lightcycle", "A rocket sled", "A time machine"],
      answer: "A lightcycle",
      fact:
        "The ride vehicles are designed to make you feel like you are racing on a lightcycle through the Grid.",
    },
  ],

  "Seven Dwarfs Mine Train": [
    {
      question: "What makes Seven Dwarfs Mine Train’s ride vehicles unusual?",
      choices: [
        "They float",
        "They swing side to side",
        "They spin freely",
        "They go backward",
      ],
      answer: "They swing side to side",
      fact:
        "The mine cars sway during the ride, which helps make it feel smoother and more playful than a standard coaster.",
    },
  ],

  "Peter Pan's Flight": [
    {
      question: "In Peter Pan’s Flight, what are you riding in?",
      choices: [
        "A pirate ship",
        "A flying boat",
        "A pixie-dusted pirate galleon",
        "A hot air balloon",
      ],
      answer: "A pixie-dusted pirate galleon",
      fact:
        "The ride vehicles hang from above, which helps create the feeling that you are flying over London and Never Land.",
    },
  ],

  "Pirates of the Caribbean": [
    {
      question: "Disney nerd check: did the ride Pirates of the Caribbean come before the movie?",
      choices: ["Yes", "No"],
      answer: "Yes",
      fact:
        "The original Disneyland attraction opened decades before the movie series. The ride inspired the movies, not the other way around.",
    },
    {
      question: "What kind of ride system is Pirates of the Caribbean?",
      choices: ["Boat ride", "Roller coaster", "Omnimover", "Simulator"],
      answer: "Boat ride",
      fact:
        "It is a slow-moving boat ride, which is one reason it can move a lot of guests and works well as a heat break.",
    },
  ],

  "Haunted Mansion": [
    {
      question: "What do Disney fans call the Haunted Mansion ghosts?",
      choices: ["Happy Haunts", "Spooky Buddies", "Mansion Mates", "The Boo Crew"],
      answer: "Happy Haunts",
      fact:
        "The Haunted Mansion famously has room for 999 happy haunts, but there is always room for one more.",
    },
  ],

  "Tiana's Bayou Adventure": [
    {
      question: "Tiana’s Bayou Adventure continues the story after which Disney movie?",
      choices: ["Moana", "The Princess and the Frog", "Encanto", "The Little Mermaid"],
      answer: "The Princess and the Frog",
      fact:
        "The ride follows Tiana and friends after the events of the film as they prepare for a Mardi Gras celebration.",
    },
  ],

  "Jungle Cruise": [
    {
      question: "What is the most dangerous part of the Jungle Cruise?",
      choices: [
        "The hippos",
        "The backside of water",
        "The skipper’s jokes",
        "The butterflies",
      ],
      answer: "The skipper’s jokes",
      fact:
        "Okay, the official answer is probably not the jokes, but the skippers’ terrible puns are the whole charm.",
    },
  ],
};

const MAGIC_KINGDOM_TRIVIA_BY_LAND = {
  main_street: [
    {
      question: "Main Street, U.S.A. is designed to feel like what?",
      choices: [
        "A futuristic city",
        "A small American town",
        "A movie studio",
        "A royal village",
      ],
      answer: "A small American town",
      fact:
        "Main Street is built to feel warm, welcoming, and nostalgic as you enter the park.",
    },
  ],

  adventureland: [
    {
      question: "Which snack is Adventureland famous for?",
      choices: ["Dole Whip", "Churros only", "Blue milk", "Turkey legs only"],
      answer: "Dole Whip",
      fact:
        "Dole Whip has become one of the most iconic Magic Kingdom snacks.",
    },
  ],

  frontierland: [
    {
      question: "Frontierland is themed around what kind of setting?",
      choices: ["The Old West", "Outer space", "A fairy tale village", "A movie set"],
      answer: "The Old West",
      fact:
        "Frontierland leans into rivers, mountains, mining towns, and classic western adventure.",
    },
  ],

  liberty_square: [
    {
      question: "Liberty Square is inspired by what period of American history?",
      choices: ["Colonial America", "The 1920s", "The space race", "The gold rush"],
      answer: "Colonial America",
      fact:
        "The land is full of colonial-inspired details and historical touches.",
    },
  ],

  fantasyland: [
    {
      question: "Fantasyland is home to many rides based on what?",
      choices: ["Classic Disney stories", "Sports teams", "National parks", "Superheroes"],
      answer: "Classic Disney stories",
      fact:
        "Fantasyland is built around castles, storybooks, princesses, flying ships, and classic animated worlds.",
    },
  ],

  tomorrowland: [
    {
      question: "Tomorrowland is themed around what idea?",
      choices: ["The future", "The jungle", "The Old West", "A haunted town"],
      answer: "The future",
      fact:
        "Tomorrowland has changed over time, but it is always Disney’s version of a hopeful, exciting future.",
    },
  ],
};

const LOOK_AROUND_BY_RIDE = {
  "Space Mountain": [
    {
      task: "First person to spot a planet, rocket, or spaceport-style sign gets bragging rights.",
      hint: "Look up and around the queue, not just straight ahead.",
    },
    {
      task: "Find something in the queue that looks retro-futuristic.",
      hint: "Think old-school sci-fi, not modern NASA.",
    },
  ],

  "Pirates of the Caribbean": [
    {
      task: "Spot something that looks like pirate treasure.",
      hint: "Look around the fort and loading area details.",
    },
    {
      task: "Find one skull or skeleton detail before boarding.",
      hint: "Pirates does not exactly hide them.",
    },
  ],

  "Haunted Mansion": [
    {
      task: "Find the creepiest detail in the queue and have everyone vote on it.",
      hint: "The Mansion is full of tiny weird choices.",
    },
    {
      task: "Listen for one spooky sound effect before you board.",
      hint: "Sometimes the atmosphere is doing half the work.",
    },
  ],

  "Seven Dwarfs Mine Train": [
    {
      task: "Find something that looks like a jewel, gem, or mining tool.",
      hint: "The whole area is packed with mine details.",
    },
  ],

  "Tiana's Bayou Adventure": [
    {
      task: "Look for musical or bayou details while you wait.",
      hint: "Tiana’s story is full of food, music, and celebration.",
    },
  ],
};

const LOOK_AROUND_BY_LAND = {
  main_street: [
    {
      task: "Find a window sign with a name on it and make up what job that person had.",
      hint: "Look above the shops.",
    },
    {
      task: "Spot something red, white, and blue before you reach the hub.",
      hint: "Main Street makes this one pretty easy.",
    },
  ],

  adventureland: [
    {
      task: "Find the most jungle-looking plant nearby.",
      hint: "Bonus points if someone gives it a ridiculous name.",
    },
    {
      task: "Spot something that feels like it belongs in an explorer’s camp.",
      hint: "Look at signs, props, crates, and walls.",
    },
  ],

  frontierland: [
    {
      task: "Find something that looks like it belongs in an old mining town.",
      hint: "Wood, lanterns, signs, and barrels count.",
    },
    {
      task: "Spot the most western-looking detail nearby.",
      hint: "Let the kids judge the winner.",
    },
  ],

  liberty_square: [
    {
      task: "Find something that looks old-fashioned compared with the rest of the park.",
      hint: "Signs, lanterns, buildings, and costumes count.",
    },
  ],

  fantasyland: [
    {
      task: "Find one castle, storybook, or fairy-tale detail nearby.",
      hint: "Fantasyland is basically cheating for this game.",
    },
    {
      task: "Pick which nearby building looks the most magical.",
      hint: "There are no wrong answers, but someone will argue anyway.",
    },
  ],

  tomorrowland: [
    {
      task: "Find the most futuristic-looking shape nearby.",
      hint: "Look for curves, neon, rockets, or space-age signs.",
    },
    {
      task: "Everyone pick one object that looks like it came from the future.",
      hint: "The weirdest answer wins.",
    },
  ],
};

const FAMILY_VOTE_PROMPTS = [
  {
    prompt: "Who in the group is most likely to scream the loudest on the next ride?",
    options: [
      "The brave one",
      "The dramatic one",
      "The quiet one who shocks everyone",
      "Definitely Dad",
    ],
  },
  {
    prompt: "Pick the next family vibe:",
    options: ["One more ride", "Snack mission", "AC break", "Bathroom and regroup"],
  },
  {
    prompt: "Who would survive the longest if the park turned into a Disney adventure movie?",
    options: [
      "The planner",
      "The snack person",
      "The fastest walker",
      "The kid with unlimited energy",
    ],
  },
  {
    prompt: "What does the family need most right now?",
    options: ["Water", "Shade", "A snack", "A sit-down break"],
  },
  {
    prompt: "Who is most likely to say “one more ride” even when everyone is tired?",
    options: ["Mom", "Dad", "The oldest kid", "The youngest kid"],
  },
  {
    prompt: "Which family strategy wins right now?",
    options: ["Push through", "Slow down", "Find AC", "Get a treat and reset"],
  },
];

const WOULD_YOU_RATHER_PROMPTS = [
  "Would you rather ride Space Mountain with the lights on or Haunted Mansion with the lights off?",
  "Would you rather have unlimited Dole Whip or unlimited Mickey pretzels for one park day?",
  "Would you rather be stuck on Pirates for 20 minutes or stuck on Small World for 20 minutes?",
  "Would you rather have Tinker Bell’s pixie dust or Genie’s three wishes for one day in Magic Kingdom?",
  "Would you rather sleep inside Cinderella Castle or inside the Haunted Mansion?",
  "Would you rather be able to skip one long line or instantly teleport across the park once?",
  "Would you rather ride TRON at night or Big Thunder during fireworks?",
  "Would you rather have a personal parade or a private fireworks show?",
  "Would you rather talk like a pirate all day or sing like Small World all day?",
  "Would you rather eat only park snacks all day or only quick-service meals all day?",
];

const MULTI_PARK_LINE_COMPANION_BY_RIDE = {
  epcot: {
    "Spaceship Earth": {
      trivia: [
        {
          question: "How long does Spaceship Earth take to complete its historical timeline?",
          choices: ["About 8 minutes", "About 16 minutes", "About 25 minutes", "About 40 minutes"],
          answer: "About 16 minutes",
          fact: "Spaceship Earth is about a 16-minute journey through the history of human communication.",
        },
      ],
      lookAround: [
        {
          task: "In the Renaissance scene, look for the sleeping monk who is supposed to be working.",
          hint: "Look for ink stains he accidentally left on his paper.",
        },
      ],
      familyVote: [
        {
          prompt: "Time machine vote: if we could visit one era, where are we going?",
          options: ["Ancient Egypt", "The Renaissance", "The first computers", "The future"],
        },
      ],
      wouldRather: [
        "Would you rather carve all your text messages into giant stone tablets or only communicate using a telegraph machine?",
      ],
    },

    "Guardians of the Galaxy: Cosmic Rewind": {
      trivia: [
        {
          question: "What 1980s pop song plays when you get the “Conga” track?",
          choices: ["Conga", "September", "One Way or Another", "Everybody Wants to Rule the World"],
          answer: "Conga",
          fact: "“Conga” by Gloria Estefan is one of the six possible songs you can get on Cosmic Rewind.",
        },
      ],
      lookAround: [
        {
          task: "In the Xandar Gallery, look closely at the city models.",
          hint: "Try to spot the tiny red star-shaped Nova Corps ships on the landing pads.",
        },
      ],
      familyVote: [
        {
          prompt: "If our family formed a team of intergalactic heroes, who gets each job?",
          options: ["Captain", "Pilot", "Tech genius", "The one causing all the trouble"],
        },
      ],
      wouldRather: [
        "Would you rather have a dancing Baby Groot in your backpack or a grumpy Rocket Raccoon building gadgets for you?",
      ],
    },

    "Mission: SPACE": {
      trivia: [
        {
          question: "About how far is the simulated journey from Earth to Mars?",
          choices: ["340,000 miles", "3.4 million miles", "34 million miles", "340 million miles"],
          answer: "34 million miles",
          fact: "The mission is based around a roughly 34-million-mile journey to Mars.",
        },
      ],
      lookAround: [
        {
          task: "Look at the giant spinning gravity wheel in the queue.",
          hint: "Can you spot astronaut crew uniforms hanging inside the sleeping bunks as they rotate past?",
        },
      ],
      familyVote: [
        {
          prompt: "We landed on Mars. Who gets each role?",
          options: ["First brave explorer", "Radio monitor", "Space snack captain", "Person asking to go home"],
        },
      ],
      wouldRather: [
        "Would you rather float in zero gravity trying to catch your food or wear magnetic boots to walk on the ceiling?",
      ],
    },

    "Test Track": {
      trivia: [
        {
          question: "What classic EPCOT ride used to be in the Test Track building?",
          choices: ["Horizons", "World of Motion", "Body Wars", "Maelstrom"],
          answer: "World of Motion",
          fact: "World of Motion was the classic EPCOT attraction that originally occupied this space.",
        },
      ],
      lookAround: [
        {
          task: "Look at the concept cars, digital blueprints, and wheel designs.",
          hint: "Who can spot something that looks like a Hidden Mickey?",
        },
      ],
      familyVote: [
        {
          prompt: "If we designed a family car, what ridiculous feature does it need?",
          options: ["Hot chocolate machine", "Flying mode", "Built-in nap pods", "Snack cannon"],
        },
      ],
      wouldRather: [
        "Would you rather test a car through a freezing blizzard simulator or a super-hot desert simulator?",
      ],
    },

    "Soarin' Around the World": {
      trivia: [
        {
          question: "What does the Chief Flight Attendant call Mickey Mouse ear hats?",
          choices: ["Those little beauties", "Mouse helmets", "Flying ears", "Cabin cargo"],
          answer: "Those little beauties",
          fact: "Patrick Warburton famously tells guests to store “these little beauties” in the under-seat compartment.",
        },
      ],
      lookAround: [
        {
          task: "Look up at the terminal screens showing facts about different countries.",
          hint: "First person to find a country they want to visit gets bragging rights.",
        },
      ],
      familyVote: [
        {
          prompt: "Which landmark from Soarin’ would we visit first?",
          options: ["Eiffel Tower", "Great Wall of China", "Pyramids of Egypt", "Anywhere with snacks"],
        },
      ],
      wouldRather: [
        "Would you rather fly anywhere in the world on a hang glider or magically teleport instantly?",
      ],
    },

    "Living with the Land": {
      trivia: [
        {
          question: "What happens to many fruits and vegetables grown in the greenhouses?",
          choices: ["They are thrown away", "They are served in EPCOT restaurants", "They are shipped to Magic Kingdom", "They are only for display"],
          answer: "They are served in EPCOT restaurants",
          fact: "Many crops grown in The Land are harvested and served to guests in EPCOT restaurants.",
        },
      ],
      lookAround: [
        {
          task: "In the aquaculture section, look closely at the tanks.",
          hint: "Can you spot mesh fish tubes shaped like Mickey heads?",
        },
      ],
      familyVote: [
        {
          prompt: "Deserted island vote: we can plant one fruit or vegetable forever. What are we choosing?",
          options: ["Potatoes", "Watermelon", "Tomatoes", "Corn"],
        },
      ],
      wouldRather: [
        "Would you rather grow a pumpkin the size of a minivan or a tomato plant that reaches the clouds?",
      ],
    },

    "The Seas with Nemo & Friends": {
      trivia: [
        {
          question: "How much water is in the massive aquarium at The Seas?",
          choices: ["570,000 gallons", "1.2 million gallons", "5.7 million gallons", "10 million gallons"],
          answer: "5.7 million gallons",
          fact: "The Seas aquarium holds about 5.7 million gallons of water.",
        },
      ],
      lookAround: [
        {
          task: "In the indoor queue, find the room that feels like you are under a wooden pier.",
          hint: "Look up for the bottom of a little glass-bottom boat.",
        },
      ],
      familyVote: [
        {
          prompt: "We are forming an underwater fish-tank band. Who gets each role?",
          options: ["Lead singer", "Bubble drums", "Grumpy octopus manager", "Backup dancer"],
        },
      ],
      wouldRather: [
        "Would you rather speak whale like Dory or ride the East Australian Current on a sea turtle shell?",
      ],
    },

    "Journey of Water, Inspired by Moana": {
      trivia: [
        {
          question: "What shape is the first water feature near the trail entrance?",
          choices: ["A spiral wave", "A waterfall", "A hidden Mickey", "A heart"],
          answer: "A spiral wave",
          fact: "The opening feature looks like a spiral wave, almost like the ocean waving to Moana.",
        },
      ],
      lookAround: [
        {
          task: "Look closely at the rock formations along the trail.",
          hint: "Can you find Hei Hei hidden in the stone?",
        },
      ],
      familyVote: [
        {
          prompt: "If we could control one element like Moana connects with water, what would we choose?",
          options: ["Water", "Wind", "Earth", "Fire"],
        },
      ],
      wouldRather: [
        "Would you rather sail across the ocean with Hei Hei or explore a glowing monster realm with Maui?",
      ],
    },

    "Journey into Imagination with Figment": {
      trivia: [
        {
          question: "What exactly is Figment?",
          choices: ["A purple dragon", "A tiny dinosaur", "A dream cloud", "A wizard lizard"],
          answer: "A purple dragon",
          fact: "Figment is a purple dragon created from the spark of imagination.",
        },
      ],
      lookAround: [
        {
          task: "Look at the doors for the sensory labs in the queue.",
          hint: "Can you find the Sight Lab and read the funny eye chart?",
        },
      ],
      familyVote: [
        {
          prompt: "If imagination could change one rule of the world, what should change?",
          options: ["Green sky", "Cars run on bubbles", "Dessert for breakfast", "Gravity gets a day off"],
        },
      ],
      wouldRather: [
        "Would you rather have a pet dragon that changes colors with your mood or a magical hat that creates what you imagine?",
      ],
    },

    "Gran Fiesta Tour Starring The Three Caballeros": {
      trivia: [
        {
          question: "Who are Donald Duck’s two bird friends in this ride?",
          choices: ["Panchito and José", "Lumiere and Cogsworth", "Timon and Pumbaa", "Chip and Dale"],
          answer: "Panchito and José",
          fact: "Donald’s Three Caballeros friends are Panchito the rooster and José Carioca the parrot.",
        },
      ],
      lookAround: [
        {
          task: "Look across the Mexico pavilion toward the giant pyramid.",
          hint: "Can you spot the smoking volcano under the twilight sky?",
        },
      ],
      familyVote: [
        {
          prompt: "If our family started a mariachi band, who gets which instrument?",
          options: ["Giant guitar", "Maracas", "Trumpet", "Lead singer"],
        },
      ],
      wouldRather: [
        "Would you rather travel on a flying serape or have a piñata that refills with your favorite candy every morning?",
      ],
    },

    "Frozen Ever After": {
      trivia: [
        {
          question: "What is the name of Elsa’s giant snowy ice monster?",
          choices: ["Marshmallow", "Snowball", "Frostbite", "Sven Jr."],
          answer: "Marshmallow",
          fact: "Marshmallow is the giant snow monster Elsa creates to guard her ice palace.",
        },
      ],
      lookAround: [
        {
          task: "In Wandering Oaken’s Trading Post, listen near the sauna door.",
          hint: "If you wait long enough, Oaken may wipe the steam away and wave.",
        },
      ],
      familyVote: [
        {
          prompt: "If we had Elsa’s ice magic for one day, what are we building?",
          options: ["Ice castle", "Snow slide", "Frozen snack stand", "A giant Olaf"],
        },
      ],
      wouldRather: [
        "Would you rather have a magical talking snowman best friend or a loyal reindeer like Sven?",
      ],
    },

    "Remy's Ratatouille Adventure": {
      trivia: [
        {
          question: "What is the name of the chef whose spirit guides Remy?",
          choices: ["Auguste Gusteau", "Chef Linguini", "Chef Skinner", "Chef Louis"],
          answer: "Auguste Gusteau",
          fact: "Chef Auguste Gusteau inspires Remy with the idea that anyone can cook.",
        },
      ],
      lookAround: [
        {
          task: "Look closely at the wallpaper in the indoor part of the line.",
          hint: "From far away it looks normal, but slices of cheese, grapes, and tiny rats are hidden in the pattern.",
        },
      ],
      familyVote: [
        {
          prompt: "If our family opened a Paris restaurant, who gets each job?",
          options: ["Head Chef", "Host", "Food critic", "Person eating all the bread"],
        },
      ],
      wouldRather: [
        "Would you rather be rat-sized in a giant kitchen or be a giant stomping through a miniature city?",
      ],
    },
  },

  hollywood: {
    "Mickey & Minnie's Runaway Railway": {
      trivia: [
        {
          question: "What song do Mickey and Minnie sing as they drive to the park?",
          choices: ["Nothing Can Stop Us Now", "Hot Dog", "The Best Picnic Ever", "Runaway Railway Rag"],
          answer: "Nothing Can Stop Us Now",
          fact: "“Nothing Can Stop Us Now” is the catchy theme song from the attraction.",
        },
      ],
      lookAround: [
        {
          task: "In the movie poster room, look at the classic cartoon-style posters.",
          hint: "Can you find the poster that features a hot dog?",
        },
      ],
      familyVote: [
        {
          prompt: "Ultimate picnic vote: everyone can bring one food item. What are we bringing?",
          options: ["Sandwiches", "Cookies", "Fruit", "Something chaotic"],
        },
      ],
      wouldRather: [
        "Would you rather be pulled into a bouncy cartoon world or into a superhero movie where you have to save the day?",
      ],
    },

    "The Twilight Zone Tower of Terror": {
      trivia: [
        {
          question: "What year is the Tower of Terror story set in?",
          choices: ["1929", "1939", "1955", "1971"],
          answer: "1939",
          fact: "The story is set on Halloween night in 1939, when lightning struck the hotel.",
        },
      ],
      lookAround: [
        {
          task: "In the dusty lobby, look closely at the front desk and tables.",
          hint: "Try to spot the Mahjong game or teacups with lipstick stains.",
        },
      ],
      familyVote: [
        {
          prompt: "If our family got stuck in a spooky hotel, who does what?",
          options: ["Brave leader", "Map reader", "Person hiding behind everyone", "Snack supplier"],
        },
      ],
      wouldRather: [
        "Would you rather spend one night in a haunted 1930s hotel or one night in a pitch-black forest?",
      ],
    },

    "Rock 'n' Roller Coaster Starring The Muppets": {
      trivia: [
        {
          question: "Which Muppet chicken gets a feature track singing “Born To Be Wild”?",
          choices: ["Camilla", "Gonzo", "Janice", "Miss Piggy"],
          answer: "Camilla",
          fact: "Camilla the Chicken gets the spotlight in this Muppets rock-show twist.",
        },
      ],
      lookAround: [
        {
          task: "Inside G-Force Records, look at the framed records and album covers.",
          hint: "What wacky objects or Muppet-style details replace normal rock awards?",
        },
      ],
      familyVote: [
        {
          prompt: "We are roadies for The Electric Mayhem. Who gets each job?",
          options: ["Tune guitars", "Drive the tour bus", "Eat dressing-room snacks", "Handle chaos"],
        },
      ],
      wouldRather: [
        "Would you rather perform in a heavy fuzzy Fozzie suit or be heckled by Statler and Waldorf while singing?",
      ],
    },

    "Slinky Dog Dash": {
      trivia: [
        {
          question: "Whose drawings and blueprints are taped around the Slinky Dog Dash queue?",
          choices: ["Andy’s", "Woody’s", "Buzz’s", "Jessie’s"],
          answer: "Andy’s",
          fact: "Andy drew the plans for his backyard Mega Coaster Kit.",
        },
      ],
      lookAround: [
        {
          task: "Look for Rex’s giant cardboard box.",
          hint: "Can you spot the $11.22 price tag, a nod to Toy Story’s original release date?",
        },
      ],
      familyVote: [
        {
          prompt: "If we were toy-sized, what would be the most fun in Andy’s backyard?",
          options: ["Wooden blocks", "Tinkertoys", "Bouncy green balls", "Slinky track"],
        },
      ],
      wouldRather: [
        "Would you rather ride on Slinky Dog through a giant playroom or fly on Buzz Lightyear’s back across the park?",
      ],
    },

    "Toy Story Mania!": {
      trivia: [
        {
          question: "What color are the 3D glasses for Toy Story Mania?",
          choices: ["Yellow", "Blue", "Red", "Green"],
          answer: "Yellow",
          fact: "Toy Story Mania uses yellow 3D glasses.",
        },
      ],
      lookAround: [
        {
          task: "Look way up at the ceiling in the queue.",
          hint: "Can you spot the giant Barrel of Monkeys chain hanging across the room?",
        },
      ],
      familyVote: [
        {
          prompt: "We are trapped in a toy box. Who gets each fort-building job?",
          options: ["Block stacker", "Fort defender", "Accidental destroyer", "Snack guard"],
        },
      ],
      wouldRather: [
        "Would you rather have stretchy Slinky arms or wheels for feet like a toy race car?",
      ],
    },

    "Alien Swirling Saucers": {
      trivia: [
        {
          question: "What object do the little green aliens worship?",
          choices: ["The Claw", "The Button", "The Pizza", "The Rocket"],
          answer: "The Claw",
          fact: "The aliens famously worship The Claw from Pizza Planet.",
        },
      ],
      lookAround: [
        {
          task: "Look for the giant colorful space blasters in the queue.",
          hint: "Can you find the Buzz Lightyear logo on the toy packaging?",
        },
      ],
      familyVote: [
        {
          prompt: "If The Claw picked one person in our family to visit a new galaxy, who would be most excited?",
          options: ["The brave one", "The snack packer", "The space nerd", "Absolutely not me"],
        },
      ],
      wouldRather: [
        "Would you rather eat pizza for every meal forever or only speak in the squeaky voice of a toy alien?",
      ],
    },

    "Star Wars: Rise of the Resistance": {
      trivia: [
        {
          question: "What colors are the R5 droids that drive the ride vehicle?",
          choices: ["Red, white, and black", "Blue and silver", "Green and gold", "Orange and white"],
          answer: "Red, white, and black",
          fact: "The ride vehicles are driven by red, white, and black R5-series droids.",
        },
      ],
      lookAround: [
        {
          task: "In the caves before the briefing room, look at the walls.",
          hint: "Can you spot laser burns and markings from Batuu’s old mining tunnels?",
        },
      ],
      familyVote: [
        {
          prompt: "We’ve been captured by the First Order. Who gets each escape job?",
          options: ["Mastermind", "Stormtrooper distractor", "Door hacker", "Person panicking quietly"],
        },
      ],
      wouldRather: [
        "Would you rather be an undercover spy sneaking onto a Star Destroyer or an X-Wing pilot leading a space battle?",
      ],
    },

    "Millennium Falcon: Smugglers Run": {
      trivia: [
        {
          question: "Who recruits you to fly the Millennium Falcon?",
          choices: ["Hondo Ohnaka", "Chewbacca", "Kylo Ren", "C-3PO"],
          answer: "Hondo Ohnaka",
          fact: "Hondo Ohnaka recruits your crew for a coaxium smuggling mission.",
        },
      ],
      lookAround: [
        {
          task: "Inside the Falcon’s main room, look at the Dejarik holochess table.",
          hint: "Then look up and try to spot the hidden Porg nest.",
        },
      ],
      familyVote: [
        {
          prompt: "Based on real skills, who should fly the Falcon?",
          options: ["Pilot", "Gunner", "Engineer", "Person not allowed near buttons"],
        },
      ],
      wouldRather: [
        "Would you rather owe money to Jabba the Hutt or face Darth Vader in a lightsaber duel?",
      ],
    },

    "Star Tours – The Adventures Continue": {
      trivia: [
        {
          question: "Who accidentally ends up flying your Starspeeder 1000?",
          choices: ["C-3PO", "R2-D2", "Chewbacca", "BB-8"],
          answer: "C-3PO",
          fact: "C-3PO accidentally becomes your pilot on Star Tours.",
        },
      ],
      lookAround: [
        {
          task: "In the spaceport queue, watch the baggage scanner.",
          hint: "Can you spot funny luggage like a lightsaber or Mickey ears?",
        },
      ],
      familyVote: [
        {
          prompt: "Which droid would we want at home?",
          options: ["Astromech like R2-D2", "Protocol droid like C-3PO", "Tiny rolling droid", "None, too much beeping"],
        },
      ],
      wouldRather: [
        "Would you rather have a lightsaber to slice toast or use the Force to bring the TV remote to you?",
      ],
    },
  },
};

const MULTI_PARK_FALLBACKS = {
  epcot: {
    trivia: [
      {
        question: "EPCOT is famous for blending technology, discovery, and world culture. Which vibe fits your group right now?",
        choices: ["Future stuff", "Food and countries", "Calm boat ride", "Big thrill"],
        answer: "Food and countries",
        fact: "There is no wrong answer here. EPCOT is at its best when the day has a little discovery and a little snack strategy.",
      },
    ],
    lookAround: [
      {
        task: "Pick one tiny design detail nearby that most people are walking past.",
        hint: "Signs, tile, lighting, plants, costumes, and background music all count.",
      },
    ],
    familyVote: [
      {
        prompt: "What EPCOT mode are we in right now?",
        options: ["Future explorer", "Snack hunter", "World traveler", "AC survivor"],
      },
    ],
    wouldRather: [
      "Would you rather spend a whole day exploring future technology or eating one snack from every country?",
    ],
  },

  hollywood: {
    trivia: [
      {
        question: "Hollywood Studios is built around movies, shows, and stepping into stories. What would your family star in?",
        choices: ["Cartoon short", "Space adventure", "Toy story", "Spooky hotel movie"],
        answer: "Space adventure",
        fact: "Hollywood Studios works best when you treat it like jumping between movie worlds.",
      },
    ],
    lookAround: [
      {
        task: "Find something nearby that looks like a movie set detail.",
        hint: "Posters, props, signs, fake buildings, lighting rigs, and background sounds all count.",
      },
    ],
    familyVote: [
      {
        prompt: "If our family made a movie today, what genre would it be?",
        options: ["Comedy", "Adventure", "Sci-fi", "Disaster, but funny"],
      },
    ],
    wouldRather: [
      "Would you rather be the star of a cartoon, a Star Wars mission, a toy adventure, or a spooky hotel mystery?",
    ],
  },
};

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pickFromList(list, seed = 0) {
  if (!list?.length) return null;
  return list[Math.abs(seed) % list.length];
}

function getRideSpecificList(source, rideName) {
  const normalizedRide = normalizeName(rideName);

  const directKey = Object.keys(source).find(
    (key) => normalizeName(key) === normalizedRide
  );

  if (directKey) return source[directKey];

  const looseKey = Object.keys(source).find((key) => {
    const normalizedKey = normalizeName(key);
    return (
      normalizedKey.includes(normalizedRide) ||
      normalizedRide.includes(normalizedKey)
    );
  });

  return looseKey ? source[looseKey] : [];
}

function getMultiParkRideGame({ parkId, rideName, gameType, seed = 0 }) {
  const parkContent = MULTI_PARK_LINE_COMPANION_BY_RIDE[parkId];
  if (!parkContent) return null;

  const rideContentList = getRideSpecificList(parkContent, rideName);
  const rideContent = rideContentList?.[0] || null;
  const fallbackContent = MULTI_PARK_FALLBACKS[parkId];

  if (gameType === "trivia") {
    const question = pickFromList(
      [...(rideContent?.trivia || []), ...(fallbackContent?.trivia || [])],
      seed
    );

    return question
      ? {
          type: "trivia",
          title: "Quick Trivia",
          ...question,
        }
      : null;
  }

  if (gameType === "look_around") {
    const challenge = pickFromList(
      [...(rideContent?.lookAround || []), ...(fallbackContent?.lookAround || [])],
      seed
    );

    return challenge
      ? {
          type: "look_around",
          title: "Look Around Challenge",
          ...challenge,
        }
      : null;
  }

  if (gameType === "family_vote") {
    const prompt = pickFromList(
      [...(rideContent?.familyVote || []), ...(fallbackContent?.familyVote || [])],
      seed
    );

    return prompt
      ? {
          type: "family_vote",
          title: "Family Vote",
          ...prompt,
        }
      : null;
  }

  if (gameType === "would_you_rather") {
    const prompt = pickFromList(
      [...(rideContent?.wouldRather || []), ...(fallbackContent?.wouldRather || [])],
      seed
    );

    return prompt
      ? {
          type: "would_you_rather",
          title: "Would You Rather",
          prompt,
        }
      : null;
  }

  return null;
}

export function getMiniGameForContext({
  parkId,
  land,
  rideName,
  gameType,
  seed = 0,
}) {
  if (parkId === "epcot" || parkId === "hollywood") {
    return getMultiParkRideGame({
      parkId,
      rideName,
      gameType,
      seed,
    });
  }

  if (parkId !== "magic_kingdom") return null;

  if (gameType === "trivia") {
    const rideTrivia = getRideSpecificList(MAGIC_KINGDOM_TRIVIA_BY_RIDE, rideName);
    const landTrivia = MAGIC_KINGDOM_TRIVIA_BY_LAND[land] || [];
    const fallbackTrivia = MAGIC_KINGDOM_TRIVIA_BY_LAND.fantasyland || [];
    const question = pickFromList(
      [...rideTrivia, ...landTrivia, ...fallbackTrivia],
      seed
    );

    return question
      ? {
          type: "trivia",
          title: "Quick Trivia",
          ...question,
        }
      : null;
  }

  if (gameType === "look_around") {
    const rideTasks = getRideSpecificList(LOOK_AROUND_BY_RIDE, rideName);
    const landTasks = LOOK_AROUND_BY_LAND[land] || [];
    const fallbackTasks = LOOK_AROUND_BY_LAND.fantasyland || [];
    const challenge = pickFromList(
      [...rideTasks, ...landTasks, ...fallbackTasks],
      seed
    );

    return challenge
      ? {
          type: "look_around",
          title: "Look Around Challenge",
          ...challenge,
        }
      : null;
  }

  if (gameType === "family_vote") {
    const prompt = pickFromList(FAMILY_VOTE_PROMPTS, seed);

    return prompt
      ? {
          type: "family_vote",
          title: "Family Vote",
          ...prompt,
        }
      : null;
  }

  if (gameType === "would_you_rather") {
    const prompt = pickFromList(WOULD_YOU_RATHER_PROMPTS, seed);

    return prompt
      ? {
          type: "would_you_rather",
          title: "Would You Rather",
          prompt,
        }
      : null;
  }

  return null;
}

export const MINI_GAME_TYPES = [
  {
    key: "trivia",
    label: "Quick Trivia",
    description: "A quick Disney question for the family or the Disney nerds.",
  },
  {
    key: "look_around",
    label: "Look Around",
    description: "A tiny scavenger hunt using what is already around you.",
  },
  {
    key: "family_vote",
    label: "Family Vote",
    description: "Pass the phone and let the group pick the vibe.",
  },
  {
    key: "would_you_rather",
    label: "Would You Rather",
    description: "Silly park questions for laughs in line.",
  },
];
