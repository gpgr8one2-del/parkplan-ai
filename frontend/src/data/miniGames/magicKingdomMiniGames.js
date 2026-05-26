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


const EPCOT_TRIVIA_BY_RIDE = {
  "Spaceship Earth": [
    {
      question: "How long does it take for Spaceship Earth to complete one full rotation of its historical timeline?",
      choices: ["About 8 minutes", "About 16 minutes", "About 24 minutes", "About 32 minutes"],
      answer: "About 16 minutes",
      fact: "Spaceship Earth is a slow-moving trip through communication history, which makes it one of EPCOT’s best calm reset rides.",
    },
    {
      question: "Disney nerd check: which phrase from Spaceship Earth became one of EPCOT’s most quoted lines?",
      choices: ["Thank the Phoenicians", "Paging Mr. Morrow", "Por favor manténganse alejado", "Nothing can stop us now"],
      answer: "Thank the Phoenicians",
      fact: "The Phoenicians helped spread one of the earliest alphabets, and EPCOT fans have turned that line into a full personality trait.",
    },
    {
      question: "What kind of ride system slowly moves guests through Spaceship Earth?",
      choices: ["Boat flume", "Omnimover", "Trackless ride", "Suspended coaster"],
      answer: "Omnimover",
      fact: "An Omnimover keeps vehicles moving continuously, which is why Spaceship Earth can move a lot of guests while staying calm.",
    },
  ],

  "Guardians of the Galaxy: Cosmic Rewind": [
    {
      question: "What famous 1980s pop song plays when you get the “Conga” track on Cosmic Rewind?",
      choices: ["September", "Conga", "Everybody Wants to Rule the World", "I Ran"],
      answer: "Conga",
      fact: "There are multiple possible songs on Cosmic Rewind, so half the fun is finding out which space jam your family gets.",
    },
    {
      question: "Cosmic Rewind is special because the ride vehicles do what during the coaster?",
      choices: ["Rotate toward the action", "Let guests steer", "Go underwater", "Launch backward only"],
      answer: "Rotate toward the action",
      fact: "Disney calls it an Omnicoaster. The vehicles turn so the ride can point your attention like a moving movie camera.",
    },
    {
      question: "What former EPCOT attraction area did Cosmic Rewind replace?",
      choices: ["Universe of Energy", "Horizons", "World of Motion", "Body Wars"],
      answer: "Universe of Energy",
      fact: "Old-school EPCOT fans still have complicated feelings about this one. Cosmic Rewind is amazing, but Universe of Energy was a classic.",
    },
  ],

  "Mission: SPACE": [
    {
      question: "How many miles is the simulated journey from Earth to Mars on Mission: SPACE?",
      choices: ["About 3 million", "About 12 million", "About 34 million", "About 100 million"],
      answer: "About 34 million",
      fact: "The ride turns a huge space journey into a few intense minutes. That is either awesome or a terrible idea right after lunch.",
    },
    {
      question: "Mission: SPACE has two versions. Which one is the more intense Mars mission?",
      choices: ["Green", "Orange", "Blue", "Silver"],
      answer: "Orange",
      fact: "Orange is the more intense version. Green is the calmer orbit version and usually the better pick for nervous riders.",
    },
  ],

  "Test Track": [
    {
      question: "Test Track reaches what top speed?",
      choices: ["45 mph", "55 mph", "65 mph", "75 mph"],
      answer: "65 mph",
      fact: "At 65 mph, Test Track is one of the fastest rides at Walt Disney World.",
    },
    {
      question: "What classic EPCOT ride used to live in the Test Track building?",
      choices: ["World of Motion", "Horizons", "Journey Into Imagination", "Body Wars"],
      answer: "World of Motion",
      fact: "World of Motion was a classic transportation dark ride before Test Track moved into the same building.",
    },
    {
      question: "Best family debate: what is the most important car feature?",
      choices: ["Speed", "Safety", "Comfort", "Snack storage"],
      answer: "Snack storage",
      fact: "Okay, not officially. But any family that has done a full park day knows snack storage is elite engineering.",
    },
  ],

  "Soarin' Around the World": [
    {
      question: "What does the Chief Flight Attendant call Mickey ear hats in the pre-show?",
      choices: ["Little beauties", "Mouse helmets", "Flight ears", "Tiny wings"],
      answer: "Little beauties",
      fact: "Patrick Warburton’s delivery is half the reason Disney fans can quote this pre-show from memory.",
    },
    {
      question: "What kind of experience is Soarin’?",
      choices: ["Hang gliding simulator", "Boat ride", "Dark coaster", "Trackless chase"],
      answer: "Hang gliding simulator",
      fact: "The ride lifts you into a giant screen and uses motion, wind, and scents to make it feel like a world tour.",
    },
  ],

  "Living with the Land": [
    {
      question: "What happens to some of the fruits and vegetables grown in Living with the Land?",
      choices: ["They are thrown away", "They are painted for display", "They are served in EPCOT restaurants", "They are sent to Magic Kingdom"],
      answer: "They are served in EPCOT restaurants",
      fact: "Some food grown in the greenhouses is harvested for use at Disney restaurants. EPCOT somehow made vegetables cool.",
    },
    {
      question: "In the greenhouses, some plants grow without soil. What is that method called?",
      choices: ["Hydroponics", "Root floating", "Soil skipping", "Plant magic"],
      answer: "Hydroponics",
      fact: "Hydroponics uses nutrient-rich water instead of traditional soil. Living with the Land is secretly a science class on a boat.",
    },
    {
      question: "Disney fan check: what abbreviation do fans use for Living with the Land?",
      choices: ["LWTL", "LWL", "LANDY", "Boat Veggies"],
      answer: "LWTL",
      fact: "Living with the Land has a huge fanbase because it is calm, cool, weirdly fascinating, and peak EPCOT comfort.",
    },
  ],

  "The Seas with Nemo & Friends": [
    {
      question: "How much water is inside the massive aquarium at The Seas pavilion?",
      choices: ["570,000 gallons", "1.2 million gallons", "5.7 million gallons", "10 million gallons"],
      answer: "5.7 million gallons",
      fact: "It is so massive that Spaceship Earth could fit inside the aquarium. EPCOT does not do subtle.",
    },
    {
      question: "What type of ride vehicle do you board on The Seas with Nemo & Friends?",
      choices: ["Clamobile", "Seashell spinner", "Submarine pod", "Turtle shell"],
      answer: "Clamobile",
      fact: "The Clamobiles move through the story before dropping you into the real aquarium area.",
    },
  ],

  "Journey of Water, Inspired by Moana": [
    {
      question: "What shape is the first water feature that greets you near the entrance of Journey of Water?",
      choices: ["A spiral wave", "A giant turtle", "A waterfall door", "A hidden Mickey fountain"],
      answer: "A spiral wave",
      fact: "It feels like the ocean waving hello, which is exactly the kind of small detail families actually remember.",
    },
    {
      question: "Journey of Water is mostly about what?",
      choices: ["The water cycle", "Volcanoes", "Space travel", "Norwegian mythology"],
      answer: "The water cycle",
      fact: "The trail turns the water cycle into something kids can touch, hear, and play with instead of just reading about it.",
    },
  ],

  "Journey into Imagination with Figment": [
    {
      question: "What exactly is Figment?",
      choices: ["A purple dragon made from imagination", "A tiny dinosaur", "A Norway troll", "A science robot"],
      answer: "A purple dragon made from imagination",
      fact: "Figment is the little purple spark of imagination, and EPCOT fans are very protective of him.",
    },
    {
      question: "Figment was originally paired with which beloved EPCOT character?",
      choices: ["Dreamfinder", "Buzzy", "Captain EO", "Sonny Eclipse"],
      answer: "Dreamfinder",
      fact: "Dreamfinder and Figment are sacred EPCOT nostalgia. Mention Dreamfinder around an EPCOT fan and watch what happens.",
    },
  ],

  "Gran Fiesta Tour Starring The Three Caballeros": [
    {
      question: "What are the names of Donald Duck’s two bird best friends in Gran Fiesta Tour?",
      choices: ["Panchito and José Carioca", "Lumiere and Cogsworth", "Timon and Pumbaa", "Chip and Dale"],
      answer: "Panchito and José Carioca",
      fact: "Panchito is the rooster, José Carioca is the parrot, and Donald is somehow always the problem.",
    },
    {
      question: "Gran Fiesta Tour is hidden inside which EPCOT pavilion?",
      choices: ["Mexico", "Norway", "Italy", "Morocco"],
      answer: "Mexico",
      fact: "The Mexico pavilion hides a twilight marketplace, a volcano backdrop, restaurants, shops, and a full boat ride.",
    },
  ],

  "Frozen Ever After": [
    {
      question: "What is the name of the giant snow monster Elsa created to guard her ice palace?",
      choices: ["Marshmallow", "Snowball", "Olaf 2", "Frostbite"],
      answer: "Marshmallow",
      fact: "Marshmallow is not exactly cuddly, but he does take his ice palace security job seriously.",
    },
    {
      question: "Frozen Ever After replaced what original Norway pavilion boat ride?",
      choices: ["Maelstrom", "El Rio del Tiempo", "Horizons", "Body Wars"],
      answer: "Maelstrom",
      fact: "Maelstrom was a cult-favorite Norway ride. EPCOT fans still bring it up like an unresolved family argument.",
    },
  ],

  "Remy's Ratatouille Adventure": [
    {
      question: "What is the name of the famous chef whose spirit guides Remy?",
      choices: ["Chef Auguste Gusteau", "Chef Linguini", "Chef Skinner", "Chef Anton Ego"],
      answer: "Chef Auguste Gusteau",
      fact: "Gusteau’s motto is that anyone can cook, which is encouraging until you remember Remy is a rat doing better than most adults.",
    },
    {
      question: "Remy’s Ratatouille Adventure uses what type of ride system?",
      choices: ["Trackless", "Boat ride", "Omnimover", "Suspended coaster"],
      answer: "Trackless",
      fact: "The vehicles move without a visible track, which helps them scurry around like tiny rats in a giant kitchen.",
    },
  ],
};

const EPCOT_LOOK_AROUND_BY_RIDE = {
  "Spaceship Earth": [
    {
      task: "In the Renaissance scene, look for the sleeping monk who should be working. Can you spot the ink stains he left on his paper?",
      hint: "Look for the monk who is very much not employee of the month.",
    },
    {
      task: "Try to spot one moment where communication technology changes the world.",
      hint: "Look for writing, printing, broadcasting, computers, and anything that screams “humans figured something out.”",
    },
  ],

  "Guardians of the Galaxy: Cosmic Rewind": [
    {
      task: "In the Xandar Gallery, look closely at the city models. Can you find the tiny red Nova Corps ships on the landing pads?",
      hint: "The little details are hiding in the display cases.",
    },
    {
      task: "Find the display that looks most like something your family would absolutely break by touching it.",
      hint: "This is an honor-system museum game. No actual touching. Please do not get us escorted out by Xandarians.",
    },
  ],

  "Mission: SPACE": [
    {
      task: "Look at the giant spinning gravity wheel in the queue. Can you spot the astronaut crew uniforms in the sleeping bunks?",
      hint: "Watch as the wheel rotates past you.",
    },
    {
      task: "Pick who in your group would be the calmest mission commander and who would press the wrong button first.",
      hint: "Be honest. Every family has a wrong-button person.",
    },
  ],

  "Test Track": [
    {
      task: "As you pass the concept car displays, try to spot a hidden Mickey in the blueprints, wheels, or design shapes.",
      hint: "Look for circles hiding in design details.",
    },
    {
      task: "Everyone pick the car detail they would add to the family car if there were no rules.",
      hint: "Flying mode, snack drawer, built-in AC blast seat, and parent mute button are all acceptable answers.",
    },
  ],

  "Soarin' Around the World": [
    {
      task: "Look up at the travel screens and find a country someone in your group wants to visit someday.",
      hint: "This is basically vacation dreaming while standing in line.",
    },
    {
      task: "Everyone quietly guess which scent they hope shows up on the ride.",
      hint: "The smell moments are half the fun.",
    },
  ],

  "Living with the Land": [
    {
      task: "In the aquaculture section, look for the wire mesh fish tubes shaped like Mickey Mouse heads.",
      hint: "They are easy to miss if you are just staring at the fish.",
    },
    {
      task: "Pick the weirdest plant-growing method you see and decide if your family could survive as EPCOT farmers.",
      hint: "The answer is probably no, but let the kids believe.",
    },
  ],

  "The Seas with Nemo & Friends": [
    {
      task: "In the indoor queue, look up in the room that feels like you’re under a pier. Can you spot the little glass-bottom boat above you?",
      hint: "Look up, not forward.",
    },
    {
      task: "After the ride, everyone has to find one real sea animal they would want as their underwater sidekick.",
      hint: "No, sharks are not practical sidekicks. But someone will pick one anyway.",
    },
  ],

  "Journey of Water, Inspired by Moana": [
    {
      task: "Look through the rock formations and see who can find Hei Hei carved into the stone first.",
      hint: "He is a chicken. He is not making good decisions.",
    },
    {
      task: "Find one place where the water reacts to your movement.",
      hint: "This trail rewards curious kids and adults who pretend they are just supervising.",
    },
  ],

  "Journey into Imagination with Figment": [
    {
      task: "In the queue, look for the Sight Lab door and read the funny eye chart.",
      hint: "Figment’s whole thing is making normal stuff weird.",
    },
    {
      task: "Everyone pick the sense they would trust least if Figment was in charge of testing it.",
      hint: "Smell is a dangerous answer on this ride.",
    },
  ],

  "Gran Fiesta Tour Starring The Three Caballeros": [
    {
      task: "Look out at the giant pyramid inside the pavilion. Can you spot the smoking volcano painted under the twilight sky?",
      hint: "The whole pavilion is pretending it is nighttime. EPCOT is ridiculous in the best way.",
    },
    {
      task: "Before boarding, find the detail that makes the Mexico pavilion feel most like an outdoor market.",
      hint: "Lights, shops, music, and the fake sky all count.",
    },
  ],

  "Frozen Ever After": [
    {
      task: "In Wandering Oaken’s Trading Post, listen and watch the sauna door. Who wipes the steam away to wave?",
      hint: "Wait long enough and Oaken may say hello.",
    },
    {
      task: "Find one detail in the queue that makes Norway feel cozy instead of icy.",
      hint: "Look for wood, lanterns, roofs, shop signs, and warm little village details.",
    },
  ],

  "Remy's Ratatouille Adventure": [
    {
      task: "Look closely at the indoor wallpaper. From far away it looks normal, but what tiny food and rat details are hidden in the pattern?",
      hint: "Look for cheese, grapes, and tiny rats.",
    },
    {
      task: "Find one oversized detail that makes you feel rat-sized before you board.",
      hint: "The best Remy queue details mess with scale.",
    },
  ],
};

const EPCOT_FAMILY_VOTE_PROMPTS = [
  {
    prompt: "We are jumping into Spaceship Earth’s time machine. If we could only visit one era, where are we going?",
    options: ["Ancient Egypt", "The Renaissance", "The first computer labs", "The future, because we are nosy"],
  },
  {
    prompt: "If our family formed an intergalactic hero team after Guardians, who gets each job?",
    options: ["Captain", "Pilot", "Snack officer", "Person causing all the trouble"],
  },
  {
    prompt: "We just landed on Mars. Who is stepping out first, who is monitoring radios, and who packed the space snacks?",
    options: ["Brave explorer", "Radio boss", "Snack commander", "Person asking when we go home"],
  },
  {
    prompt: "If we designed a family concept car at Test Track, what ridiculous feature does it need?",
    options: ["Hot chocolate machine", "Flying mode", "Built-in nap seats", "Sibling separator shield"],
  },
  {
    prompt: "If our family opened a fancy restaurant in Paris like Remy, who gets each role?",
    options: ["Head Chef", "Host", "Food critic", "Person eating bread before dinner"],
  },
  {
    prompt: "What EPCOT vibe does the family need right now?",
    options: ["Calm boat ride", "Big thrill", "Snack mission", "AC and no questions"],
  },
];

const EPCOT_WOULD_YOU_RATHER_PROMPTS = [
  "Would you rather carve all your texts into giant stone tablets or only communicate using a telegraph machine?",
  "Would you rather have Baby Groot riding in your backpack or Rocket building chaotic gadgets for your stroller?",
  "Would you rather float in zero gravity trying to catch your food or wear magnetic boots and walk on the ceiling?",
  "Would you rather test a car in a freezing blizzard simulator or a blazing desert simulator?",
  "Would you rather hang-glide anywhere in the world whenever you want or magically teleport instantly?",
  "Would you rather grow a pumpkin the size of a minivan or a tomato plant that reaches the clouds?",
  "Would you rather speak whale like Dory or ride the East Australian Current on a sea turtle shell?",
  "Would you rather sail with Hei Hei or explore a monster realm with Maui?",
  "Would you rather have a pet dragon that changes colors with your mood or a hat that creates whatever you imagine?",
  "Would you rather travel on a flying serape or have a piñata that refills with your favorite candy every morning?",
  "Would you rather have a talking snowman best friend or a loyal reindeer who can carry you anywhere?",
  "Would you rather be rat-sized in a giant kitchen or giant-sized in a tiny Paris?",
];

const HOLLYWOOD_TRIVIA_BY_RIDE = {
  "Mickey & Minnie's Runaway Railway": [
    {
      question: "What is the catchy theme song Mickey and Minnie sing before everything goes completely sideways?",
      choices: ["Nothing Can Stop Us Now", "Hot Dog!", "Minnie's Yoo Hoo", "Steamboat Shuffle"],
      answer: "Nothing Can Stop Us Now",
      fact: "It starts as a sweet picnic song and then immediately becomes cartoon chaos, which is exactly the point.",
    },
    {
      question: "What kind of ride system does Runaway Railway use?",
      choices: ["Trackless", "Boat flume", "Omnimover", "Suspended coaster"],
      answer: "Trackless",
      fact: "The trackless vehicles help the ride feel like you are bouncing through a cartoon instead of following a normal path.",
    },
  ],

  "The Twilight Zone Tower of Terror": [
    {
      question: "What year is the Tower of Terror story set in?",
      choices: ["1929", "1939", "1949", "1959"],
      answer: "1939",
      fact: "Specifically Halloween night of 1939, when the mysterious lightning strike hit the Hollywood Tower Hotel.",
    },
    {
      question: "What floor does the elevator famously send you toward?",
      choices: ["The basement", "The roof", "The Twilight Zone", "The lobby gift shop"],
      answer: "The Twilight Zone",
      fact: "The scariest answer might actually be the lobby gift shop, depending on your souvenir budget.",
    },
  ],

  "Rock 'n' Roller Coaster Starring The Muppets": [
    {
      question: "Which famous Muppet chicken gets a feature track singing “Born To Be Wild” on the new version of this coaster?",
      choices: ["Camilla", "Gonzo", "Janice", "Miss Piggy"],
      answer: "Camilla",
      fact: "Camilla the Chicken getting a rock moment is exactly the kind of chaos The Muppets were built for.",
    },
    {
      question: "Which Muppet band is taking over the rock-and-roll energy?",
      choices: ["The Electric Mayhem", "Dr. Teeth's Orchestra", "The Felt Notes", "The Gonzo Experience"],
      answer: "The Electric Mayhem",
      fact: "The Electric Mayhem is the perfect excuse for this coaster to get louder, weirder, and more ridiculous.",
    },
  ],

  "Slinky Dog Dash": [
    {
      question: "Whose drawings and blueprints are taped around the Slinky Dog Dash queue?",
      choices: ["Andy’s", "Bonnie’s", "Sid’s", "Woody’s"],
      answer: "Andy’s",
      fact: "The whole coaster is built to feel like Andy assembled it from a Mega Coaster Kit in his backyard.",
    },
    {
      question: "The Rex box price tag says $11.22. What is that a nod to?",
      choices: ["Toy Story’s release date", "Andy’s birthday", "Slinky’s model number", "A Disney patent number"],
      answer: "Toy Story’s release date",
      fact: "Toy Story was released on November 22, so $11.22 is a sneaky little Pixar date detail.",
    },
  ],

  "Toy Story Mania!": [
    {
      question: "What color are the 3D glasses for Toy Story Mania?",
      choices: ["Yellow", "Blue", "Green", "Red"],
      answer: "Yellow",
      fact: "They make everyone look ridiculous, which is honestly part of the charm.",
    },
    {
      question: "What are you pulling to launch virtual objects during the game?",
      choices: ["A spring-action shooter", "A joystick", "A steering wheel", "A rope bell"],
      answer: "A spring-action shooter",
      fact: "This is where families discover who is secretly way too competitive.",
    },
  ],

  "Alien Swirling Saucers": [
    {
      question: "What magical object do the little green aliens worship?",
      choices: ["The Claw", "The Button", "The Pizza Planet Sign", "The Space Spoon"],
      answer: "The Claw",
      fact: "The Claw chooses who will go and who will stay. Very dramatic for tiny toy aliens.",
    },
    {
      question: "Alien Swirling Saucers feels like a space version of what kind of ride?",
      choices: ["A whip-style spinner", "A drop tower", "A boat ride", "A flying theater"],
      answer: "A whip-style spinner",
      fact: "The little saucers swing you around just enough to make kids laugh and adults question their snack timing.",
    },
  ],

  "Star Wars: Rise of the Resistance": [
    {
      question: "What colors are the little astromech droids that drive your ride vehicle?",
      choices: ["Red, white, and black", "Blue and silver", "Green and gold", "Orange and white"],
      answer: "Red, white, and black",
      fact: "They are tiny, brave, and frankly doing a better job under pressure than most of us would.",
    },
    {
      question: "Which group captures you during Rise of the Resistance?",
      choices: ["The First Order", "The Resistance", "The Jedi Council", "The Jawas"],
      answer: "The First Order",
      fact: "The ride works because it makes the story feel huge, like you accidentally walked into the middle of a Star Wars movie.",
    },
  ],

  "Millennium Falcon: Smugglers Run": [
    {
      question: "Who recruits you to fly the Millennium Falcon and steal coaxium?",
      choices: ["Hondo Ohnaka", "Chewbacca", "Kylo Ren", "DJ R-3X"],
      answer: "Hondo Ohnaka",
      fact: "Hondo is funny, shady, and exactly the kind of guy who would hand a priceless ship to tourists.",
    },
    {
      question: "Which job in Smugglers Run usually gets blamed first when things go badly?",
      choices: ["Pilot", "Gunner", "Engineer", "Person yelling directions"],
      answer: "Pilot",
      fact: "The pilot job is fun, but it comes with the full family court of public opinion.",
    },
  ],

  "Star Tours – The Adventures Continue": [
    {
      question: "Who accidentally ends up flying your Starspeeder 1000?",
      choices: ["C-3PO", "R2-D2", "Chewbacca", "BB-8"],
      answer: "C-3PO",
      fact: "C-3PO absolutely did not sign up for this, which is why it is so funny.",
    },
    {
      question: "What makes Star Tours extra re-ridable?",
      choices: ["Different scene combinations", "Guests vote on the ending", "It changes by weather", "The seats move randomly"],
      answer: "Different scene combinations",
      fact: "Different destinations and characters can appear, so your family might not get the same trip twice.",
    },
  ],
};

const HOLLYWOOD_LOOK_AROUND_BY_RIDE = {
  "Mickey & Minnie's Runaway Railway": [
    {
      task: "In the room with the animated short, look at the classic movie posters. Which one features a hot dog?",
      hint: "Look for the Potatoland poster.",
    },
    {
      task: "Find the poster that looks most like it would be a terrible movie but an amazing family joke.",
      hint: "The sillier the title, the better.",
    },
  ],

  "The Twilight Zone Tower of Terror": [
    {
      task: "In the dusty lobby, look for the Mahjong game, tea cups, or lipstick stains left behind by hotel guests.",
      hint: "The lobby is a frozen disaster scene in the classiest way possible.",
    },
    {
      task: "Everyone silently pick the object in the lobby they would absolutely not touch in a haunted hotel.",
      hint: "Correct answer: probably everything.",
    },
  ],

  "Rock 'n' Roller Coaster Starring The Muppets": [
    {
      task: "In G-Force Records, look for wacky framed records or album covers that feel very Muppets.",
      hint: "The more ridiculous the music joke, the better.",
    },
    {
      task: "Pick which family member would survive longest on tour with The Electric Mayhem.",
      hint: "The snack person has a real advantage.",
    },
  ],

  "Slinky Dog Dash": [
    {
      task: "Look for Rex’s cardboard box and the $11.22 price tag.",
      hint: "It is a Toy Story release-date Easter egg.",
    },
    {
      task: "Find something that looks like Andy built the coaster by himself and probably did not read the instructions.",
      hint: "Tape, blocks, boxes, and toy parts all count.",
    },
  ],

  "Toy Story Mania!": [
    {
      task: "Look up for the giant Barrel of Monkeys. Are they making a chain across the ceiling?",
      hint: "Yes, and they are doing better teamwork than most families before lunch.",
    },
    {
      task: "Everyone pick which carnival game they think they will dominate.",
      hint: "This is where confidence gets very loud before reality arrives.",
    },
  ],

  "Alien Swirling Saucers": [
    {
      task: "Look for the giant space blasters and see who can spot the Buzz Lightyear logo on the toy packaging.",
      hint: "Pretend you are tiny in a toy box.",
    },
    {
      task: "Find the most dramatic alien face nearby.",
      hint: "The aliens are small, but their belief in The Claw is enormous.",
    },
  ],

  "Star Wars: Rise of the Resistance": [
    {
      task: "In the caves before the briefing room, look for laser burns and old markings on the walls.",
      hint: "The queue is telling you this Resistance base has history.",
    },
    {
      task: "Once you see Stormtroopers, everyone has to keep a straight face for ten seconds.",
      hint: "This is harder than it sounds if someone whispers something dumb.",
    },
  ],

  "Millennium Falcon: Smugglers Run": [
    {
      task: "Inside the Falcon waiting area, look at the Dejarik holochess table, then look up for the hidden Porg nest.",
      hint: "The nest is tucked above you.",
    },
    {
      task: "Before boarding, decide who should be Pilot, Gunner, and Engineer based on actual family skills.",
      hint: "Do not let the most chaotic driver automatically become Pilot.",
    },
  ],

  "Star Tours – The Adventures Continue": [
    {
      task: "In the terminal queue, watch the luggage scanner. Can you spot funny items like a lightsaber or Mickey ears?",
      hint: "Airport security is much better when droids are judging the bags.",
    },
    {
      task: "Look at the arrivals/departures board and pick which Star Wars planet your family would least survive.",
      hint: "Tatooine is hot, Hoth is cold, and everyone will have opinions.",
    },
  ],
};

const HOLLYWOOD_FAMILY_VOTE_PROMPTS = [
  {
    prompt: "We are packing the perfect Mickey and Minnie picnic. Everyone gets to bring one food. What are we bringing?",
    options: ["Sandwiches", "Cupcakes", "Fruit", "Something chaotic from Dad"],
  },
  {
    prompt: "If our family got stuck in the Tower of Terror hotel, who leads the way and who hides behind everyone?",
    options: ["Brave leader", "Map reader", "Screamer", "Person pretending they are fine"],
  },
  {
    prompt: "We just got hired as roadies for The Electric Mayhem. Who gets each job?",
    options: ["Tune guitars", "Drive the tour bus", "Guard the snacks", "Keep Animal away from equipment"],
  },
  {
    prompt: "If we were shrunk to toy size, which Andy’s backyard toy would be most fun?",
    options: ["Tinkertoys", "Bouncy balls", "Wooden blocks", "Slinky Dog"],
  },
  {
    prompt: "We were captured by the First Order. Who creates the escape plan?",
    options: ["Mastermind", "Stormtrooper distractor", "Door hacker", "Person panicking quietly"],
  },
  {
    prompt: "On Smugglers Run, who should actually be Pilot, Gunner, and Engineer?",
    options: ["Best driver", "Best gamer", "Best fixer", "Person who should not touch anything"],
  },
];

const HOLLYWOOD_WOULD_YOU_RATHER_PROMPTS = [
  "Would you rather be sucked into a bouncy cartoon world or into a superhero movie where you have to save the day?",
  "Would you rather spend one night alone in a haunted 1930s hotel or one night alone in a pitch-black creepy forest?",
  "Would you rather perform a rock concert in a heavy fuzzy Fozzie suit or get heckled by Statler and Waldorf while you sing?",
  "Would you rather ride on Slinky Dog through a giant playroom or fly on Buzz Lightyear’s back across the park?",
  "Would you rather have stretchy Slinky arms or wheels for feet like a toy race car?",
  "Would you rather eat pizza for every meal forever or only speak in the squeaky voice of a toy alien?",
  "Would you rather be an undercover spy on a Star Destroyer or an X-Wing pilot in a space battle?",
  "Would you rather owe money to Jabba the Hutt or face Darth Vader in a lightsaber duel?",
  "Would you rather have a lightsaber that slices your toast or use the Force to grab the TV remote?",
  "Would you rather pilot the Falcon perfectly once or crash it badly but make your whole family laugh?",
];

const TRIVIA_BY_PARK_AND_RIDE = {
  magic_kingdom: MAGIC_KINGDOM_TRIVIA_BY_RIDE,
  epcot: EPCOT_TRIVIA_BY_RIDE,
  hollywood: HOLLYWOOD_TRIVIA_BY_RIDE,
};

const TRIVIA_BY_PARK_AND_LAND = {
  magic_kingdom: MAGIC_KINGDOM_TRIVIA_BY_LAND,
  epcot: {},
  hollywood: {},
};

const LOOK_AROUND_BY_PARK_AND_RIDE = {
  magic_kingdom: LOOK_AROUND_BY_RIDE,
  epcot: EPCOT_LOOK_AROUND_BY_RIDE,
  hollywood: HOLLYWOOD_LOOK_AROUND_BY_RIDE,
};

const LOOK_AROUND_BY_PARK_AND_LAND = {
  magic_kingdom: LOOK_AROUND_BY_LAND,
  epcot: {},
  hollywood: {},
};

const FAMILY_VOTE_BY_PARK = {
  magic_kingdom: FAMILY_VOTE_PROMPTS,
  epcot: EPCOT_FAMILY_VOTE_PROMPTS,
  hollywood: HOLLYWOOD_FAMILY_VOTE_PROMPTS,
};

const WOULD_YOU_RATHER_BY_PARK = {
  magic_kingdom: WOULD_YOU_RATHER_PROMPTS,
  epcot: EPCOT_WOULD_YOU_RATHER_PROMPTS,
  hollywood: HOLLYWOOD_WOULD_YOU_RATHER_PROMPTS,
};


function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/&/g, "and")
    .replace(/\bstarring\b/g, "")
    .replace(/\bpresented by .+$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getRideNameAliases(value) {
  const normalized = normalizeName(value);
  const aliases = new Set([normalized]);

  if (normalized.includes("spaceship earth")) aliases.add("spaceship earth");

  if (normalized.includes("guardians") || normalized.includes("cosmic rewind")) {
    aliases.add("guardians of the galaxy cosmic rewind");
    aliases.add("cosmic rewind");
  }

  if (normalized.includes("mission space")) aliases.add("mission space");

  if (normalized.includes("test track")) {
    aliases.add("test track");
    aliases.add("test track presented by chevrolet");
  }

  if (normalized.includes("soarin")) {
    aliases.add("soarin around the world");
    aliases.add("soarin");
  }

  if (normalized.includes("living with the land")) aliases.add("living with the land");

  if (normalized.includes("nemo") || normalized.includes("seas")) {
    aliases.add("the seas with nemo and friends");
    aliases.add("nemo");
  }

  if (normalized.includes("journey of water") || normalized.includes("moana")) {
    aliases.add("journey of water inspired by moana");
    aliases.add("journey of water");
  }

  if (normalized.includes("figment") || normalized.includes("imagination")) {
    aliases.add("journey into imagination with figment");
    aliases.add("figment");
  }

  if (normalized.includes("gran fiesta") || normalized.includes("caballeros")) {
    aliases.add("gran fiesta tour starring the three caballeros");
    aliases.add("gran fiesta tour");
  }

  if (normalized.includes("frozen ever after")) aliases.add("frozen ever after");

  if (normalized.includes("remy") || normalized.includes("ratatouille")) {
    aliases.add("remys ratatouille adventure");
    aliases.add("remy ratatouille adventure");
  }

  if (normalized.includes("runaway railway") || normalized.includes("mickey and minnie")) {
    aliases.add("mickey and minnies runaway railway");
    aliases.add("mickey minnies runaway railway");
  }

  if (normalized.includes("tower of terror")) {
    aliases.add("the twilight zone tower of terror");
    aliases.add("tower of terror");
  }

  if (normalized.includes("rock n roller") || normalized.includes("rock and roller")) {
    aliases.add("rock n roller coaster starring the muppets");
    aliases.add("rock n roller coaster starring aerosmith");
    aliases.add("rock n roller coaster");
    aliases.add("rock and roller coaster");
  }

  if (normalized.includes("slinky dog")) aliases.add("slinky dog dash");

  if (normalized.includes("toy story mania")) aliases.add("toy story mania");

  if (normalized.includes("alien swirling")) aliases.add("alien swirling saucers");

  if (normalized.includes("rise of the resistance")) {
    aliases.add("star wars rise of the resistance");
    aliases.add("rise of the resistance");
  }

  if (normalized.includes("millennium falcon") || normalized.includes("smugglers run")) {
    aliases.add("millennium falcon smugglers run");
    aliases.add("smugglers run");
  }

  if (normalized.includes("star tours")) {
    aliases.add("star tours the adventures continue");
    aliases.add("star tours");
  }

  return aliases;
}

function pickFromList(list, seed = 0) {
  if (!list?.length) return null;
  return list[Math.abs(seed) % list.length];
}

function getRideSpecificList(source, rideName) {
  const rideAliases = getRideNameAliases(rideName);

  const matchedKey = Object.keys(source).find((key) => {
    const keyAliases = getRideNameAliases(key);
    const normalizedKey = normalizeName(key);

    if (rideAliases.has(normalizedKey)) return true;

    for (const alias of rideAliases) {
      if (keyAliases.has(alias)) return true;

      if (
        alias.length >= 8 &&
        normalizedKey.length >= 8 &&
        (alias.includes(normalizedKey) || normalizedKey.includes(alias))
      ) {
        return true;
      }
    }

    return false;
  });

  return matchedKey ? source[matchedKey] : [];
}

export function getMiniGameForContext({
  parkId,
  land,
  rideName,
  gameType,
  seed = 0,
}) {
  const parkTriviaByRide = TRIVIA_BY_PARK_AND_RIDE[parkId] || {};
  const parkTriviaByLand = TRIVIA_BY_PARK_AND_LAND[parkId] || {};
  const parkLookAroundByRide = LOOK_AROUND_BY_PARK_AND_RIDE[parkId] || {};
  const parkLookAroundByLand = LOOK_AROUND_BY_PARK_AND_LAND[parkId] || {};
  const parkFamilyVotes = FAMILY_VOTE_BY_PARK[parkId] || [];
  const parkWouldYouRather = WOULD_YOU_RATHER_BY_PARK[parkId] || [];

  if (gameType === "trivia") {
    const rideTrivia = getRideSpecificList(parkTriviaByRide, rideName);
    const landTrivia = parkTriviaByLand[land] || [];

    // Magic Kingdom V0 can keep land fallback because we already built land-based games there.
    // EPCOT/Hollywood should stay ride-specific so the experience does not feel generic.
    const question = pickFromList(
      parkId === "magic_kingdom" ? [...rideTrivia, ...landTrivia] : rideTrivia,
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
    const rideTasks = getRideSpecificList(parkLookAroundByRide, rideName);
    const landTasks = parkLookAroundByLand[land] || [];

    const challenge = pickFromList(
      parkId === "magic_kingdom" ? [...rideTasks, ...landTasks] : rideTasks,
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
    const prompt = pickFromList(parkFamilyVotes, seed);

    return prompt
      ? {
          type: "family_vote",
          title: "Family Vote",
          ...prompt,
        }
      : null;
  }

  if (gameType === "would_you_rather") {
    const prompt = pickFromList(parkWouldYouRather, seed);

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
