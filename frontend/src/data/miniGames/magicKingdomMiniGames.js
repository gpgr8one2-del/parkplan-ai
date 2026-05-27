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

  "Big Thunder Mountain Railroad": [
    {
      question: "What is Big Thunder Mountain’s famous nickname?",
      choices: [
        "The Wildest Ride in the Wilderness",
        "The Fastest Train in Frontierland",
        "The Haunted Mine Express",
        "The Gold Rush Rocket",
      ],
      answer: "The Wildest Ride in the Wilderness",
      fact:
        "Big Thunder has earned that nickname. It is not the tallest or fastest coaster, but it feels wild because the train whips through turns, caves, and mining-town chaos.",
    },
    {
      question: "Big Thunder is themed around what kind of runaway vehicle?",
      choices: ["A mine train", "A riverboat", "A stagecoach", "A rocket train"],
      answer: "A mine train",
      fact:
        "The story is that the mine train has a mind of its own. Great news for fun. Terrible news for fictional mining safety.",
    },
    {
      question: "Best family debate: where is Big Thunder usually the wildest?",
      choices: ["Front row", "Middle", "Back row", "Standing by the exit watching everyone scream"],
      answer: "Back row",
      fact:
        "The back tends to get pulled over drops and turns with more whip. This is also where brave family members suddenly become very quiet.",
    },
  ],

  "it's a small world": [
    {
      question: "Who created the famous visual style of “it’s a small world”?",
      choices: ["Mary Blair", "Claude Coats", "Tony Baxter", "X Atencio"],
      answer: "Mary Blair",
      fact:
        "Mary Blair’s bold colors, simple shapes, and joyful designs are a huge reason Small World looks so iconic.",
    },
    {
      question: "What major event was “it’s a small world” originally created for?",
      choices: [
        "The 1964 New York World’s Fair",
        "EPCOT opening day",
        "Disneyland’s 10th anniversary",
        "Magic Kingdom opening day",
      ],
      answer: "The 1964 New York World’s Fair",
      fact:
        "The original attraction debuted at the 1964 New York World’s Fair before becoming a Disney park classic.",
    },
    {
      question: "What is the main message of “it’s a small world”?",
      choices: [
        "The world is connected",
        "Boats are the best way to travel",
        "Dolls secretly run everything",
        "Never get the song stuck in your head",
      ],
      answer: "The world is connected",
      fact:
        "The ride is simple on purpose: kids from around the world singing together. Also yes, the song is now renting space in your brain.",
    },
  ],

  "Buzz Lightyear's Space Ranger Spin": [
    {
      question: "Who are you trying to defeat on Buzz Lightyear’s Space Ranger Spin?",
      choices: ["Emperor Zurg", "Lotso", "Sid", "The Claw"],
      answer: "Emperor Zurg",
      fact:
        "Your mission is to stop Zurg by blasting targets. Your family’s real mission is figuring out who secretly spins the vehicle too much.",
    },
    {
      question: "Which target shape is usually worth looking for if you want a better score?",
      choices: ["Triangles and diamonds", "Only circles", "Stars only", "Anything blue"],
      answer: "Triangles and diamonds",
      fact:
        "Not all targets are equal. Disney scoring games are where calm family members become terrifyingly competitive.",
    },
  ],

  "Tomorrowland Transit Authority PeopleMover": [
    {
      question: "The PeopleMover is best described as what kind of ride?",
      choices: ["A slow moving tour", "A spinning coaster", "A boat ride", "A drop tower"],
      answer: "A slow moving tour",
      fact:
        "PeopleMover is part ride, part rest, part Tomorrowland therapy. It is one of the best “we need a minute” attractions in Magic Kingdom.",
    },
    {
      question: "What famous model can you see while riding the PeopleMover?",
      choices: ["Progress City", "A tiny Disneyland castle", "A model of Batuu", "A miniature Monorail hotel"],
      answer: "Progress City",
      fact:
        "The Progress City model connects back to Walt Disney’s original ideas that helped inspire EPCOT.",
    },
  ],

  "Under the Sea - Journey of The Little Mermaid": [
    {
      question: "What kind of ride vehicle do you board on Under the Sea?",
      choices: ["A clamshell", "A pirate ship", "A seahorse", "A bubble pod"],
      answer: "A clamshell",
      fact:
        "The clamshell vehicles move continuously, which helps the line move and makes it a solid family reset ride.",
    },
    {
      question: "Which villain appears in a big dramatic scene on this ride?",
      choices: ["Ursula", "Maleficent", "Cruella", "Mother Gothel"],
      answer: "Ursula",
      fact:
        "Ursula is huge in this attraction. She is basically the definition of “do not sign paperwork underwater.”",
    },
  ],

  "The Many Adventures of Winnie the Pooh": [
    {
      question: "Which former Magic Kingdom ride did Winnie the Pooh replace?",
      choices: ["Mr. Toad’s Wild Ride", "Snow White’s Scary Adventures", "20,000 Leagues", "Skyway"],
      answer: "Mr. Toad’s Wild Ride",
      fact:
        "Mr. Toad fans were not quiet about losing it. Disney fans can hold a grudge longer than a standby queue.",
    },
    {
      question: "Which Pooh character is most likely to turn a normal day into bouncing chaos?",
      choices: ["Tigger", "Piglet", "Rabbit", "Owl"],
      answer: "Tigger",
      fact:
        "Tigger energy is fun until your group is hot, hungry, and someone says “let’s walk to the other side of the park.”",
    },
  ],

  "Dumbo the Flying Elephant": [
    {
      question: "What controls how high Dumbo flies?",
      choices: ["A lever in your elephant", "The Cast Member only", "A hidden foot pedal", "The elephant’s ears"],
      answer: "A lever in your elephant",
      fact:
        "Dumbo is simple, but kids love being in control. Adults love when the line is not brutal.",
    },
    {
      question: "What makes Magic Kingdom’s Dumbo queue especially family-friendly?",
      choices: ["An indoor play area", "Free popcorn", "A boat ride", "A character meal"],
      answer: "An indoor play area",
      fact:
        "The circus tent play area is one of the better kid-energy pressure valves in the park.",
    },
  ],

  "Mad Tea Party": [
    {
      question: "Who pops out of the giant teapot near Mad Tea Party?",
      choices: ["The Dormouse", "The White Rabbit", "Cheshire Cat", "The Queen of Hearts"],
      answer: "The Dormouse",
      fact:
        "The Dormouse is living his best tiny chaotic life in the teapot.",
    },
    {
      question: "What is the biggest family risk on Mad Tea Party?",
      choices: ["Someone spins too much", "The tea gets cold", "The cups go backward", "The Queen steals your seat"],
      answer: "Someone spins too much",
      fact:
        "Every family has one person who says “I won’t spin it too fast” and then immediately becomes the villain.",
    },
  ],

  "Prince Charming Regal Carrousel": [
    {
      question: "Prince Charming Regal Carrousel is tied to which Disney story?",
      choices: ["Cinderella", "Sleeping Beauty", "Snow White", "Tangled"],
      answer: "Cinderella",
      fact:
        "The carrousel’s painted scenes tell Cinderella’s story, which makes it feel more special than a standard merry-go-round.",
    },
    {
      question: "What detail is said to identify Cinderella’s Horse?",
      choices: ["A golden ribbon on the tail", "A blue saddle", "A glass slipper mark", "A crown on the mane"],
      answer: "A golden ribbon on the tail",
      fact:
        "Families love hunting for this one. Whether you find it or not, everyone will suddenly have strong horse opinions.",
    },
  ],

  "Mickey's PhilharMagic": [
    {
      question: "Who accidentally causes most of the chaos in Mickey’s PhilharMagic?",
      choices: ["Donald Duck", "Goofy", "Minnie", "Pluto"],
      answer: "Donald Duck",
      fact:
        "Donald plus magical objects is almost never a stable business plan.",
    },
    {
      question: "PhilharMagic is especially useful because it gives families what?",
      choices: ["AC and seats", "A thrill launch", "A boat ride", "A parade view"],
      answer: "AC and seats",
      fact:
        "Sometimes the best attraction is the one that quietly saves everyone’s mood.",
    },
  ],

  "The Barnstormer": [
    {
      question: "The Barnstormer is themed around which classic Disney character?",
      choices: ["Goofy", "Donald", "Mickey", "Chip"],
      answer: "Goofy",
      fact:
        "It is a junior coaster with Goofy’s stunt-plane energy, which is exactly as safe-sounding as it needs to be.",
    },
    {
      question: "The Barnstormer is usually best for what kind of family moment?",
      choices: ["First coaster confidence", "Long AC break", "Huge thrill ride", "Fireworks viewing"],
      answer: "First coaster confidence",
      fact:
        "For younger kids, this can be the “I did a coaster!” moment without going full Space Mountain.",
    },
  ],

  "The Magic Carpets of Aladdin": [
    {
      question: "What can the camel near Magic Carpets sometimes do?",
      choices: ["Spit water", "Sing", "Tell jokes", "Spin the carpet"],
      answer: "Spit water",
      fact:
        "The camel splash is harmless, but it is absolutely personal if it gets you.",
    },
    {
      question: "Magic Carpets is most similar to which other Magic Kingdom ride style?",
      choices: ["Dumbo-style spinner", "Boat ride", "Dark ride", "Roller coaster"],
      answer: "Dumbo-style spinner",
      fact:
        "It is a spinner with a little Adventureland chaos added in.",
    },
  ],

  "Walt Disney's Enchanted Tiki Room": [
    {
      question: "The Enchanted Tiki Room is famous for using what Disney technology?",
      choices: ["Audio-Animatronics", "Trackless vehicles", "Omnicoaster cars", "Virtual reality"],
      answer: "Audio-Animatronics",
      fact:
        "The singing birds and flowers helped make Audio-Animatronics a signature Disney storytelling tool.",
    },
    {
      question: "What is the correct emotional response when the Tiki birds start singing?",
      choices: ["Join in", "Question your life choices", "Look for a snack", "All of the above"],
      answer: "All of the above",
      fact:
        "The Tiki Room is classic Disney weirdness, and that is exactly why it works.",
    },
  ],

  "Astro Orbiter": [
    {
      question: "What makes Astro Orbiter feel more intense than many spinner rides?",
      choices: ["It loads high above Tomorrowland", "It goes underwater", "It spins backward", "It has a launch"],
      answer: "It loads high above Tomorrowland",
      fact:
        "The height makes the view great and the ride feel more dramatic than it looks from the ground.",
    },
  ],

  "Tomorrowland Speedway": [
    {
      question: "Tomorrowland Speedway cars top out around what speed?",
      choices: ["7 mph", "25 mph", "45 mph", "65 mph"],
      answer: "7 mph",
      fact:
        "Seven miles per hour has never felt more powerful to a kid holding a steering wheel.",
    },
    {
      question: "Who should drive on Tomorrowland Speedway?",
      choices: ["The kid with confidence", "The adult with patience", "The person who hits the rail least", "All of the above"],
      answer: "All of the above",
      fact:
        "The guide rail is doing heroic work out there.",
    },
  ],

  "Monsters Inc. Laugh Floor": [
    {
      question: "Monsters Inc. Laugh Floor powers Monstropolis with what?",
      choices: ["Laughter", "Screams", "Pixie dust", "Dole Whip"],
      answer: "Laughter",
      fact:
        "It is a great recovery show because the commitment is low, the seats are real, and the jokes are family-safe.",
    },
  ],

  "Country Bear Musical Jamboree": [
    {
      question: "Country Bear Musical Jamboree is what kind of attraction?",
      choices: ["An Audio-Animatronic show", "A boat ride", "A roller coaster", "A simulator"],
      answer: "An Audio-Animatronic show",
      fact:
        "It is weird, musical, indoors, and exactly the kind of show that gives tired families a needed reset.",
    },
  ],

  "The Hall of Presidents": [
    {
      question: "Hall of Presidents is one of Magic Kingdom’s best hidden weapons for what?",
      choices: ["A long seated AC break", "A thrill ride", "A fireworks shortcut", "A water ride"],
      answer: "A long seated AC break",
      fact:
        "Sometimes the smartest park move is not glamorous. It is sitting down in air conditioning before everyone melts.",
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

  "Big Thunder Mountain Railroad": [
    {
      task: "Look for mining tools, crates, lanterns, or warning signs while you move through the queue.",
      hint: "The whole area is pretending this mine has seen some things.",
    },
    {
      task: "Find the detail that makes the mountain feel the most abandoned or cursed.",
      hint: "Old wood, rusty equipment, caves, signs, and weird little props all count.",
    },
    {
      task: "Everyone pick the person in your group most likely to yell “faster!” on the runaway train.",
      hint: "It is probably the same person who says they are not scared.",
    },
  ],

  "it's a small world": [
    {
      task: "Find one animal that looks like it is having the best day ever.",
      hint: "Small World animals have extreme main-character energy.",
    },
    {
      task: "Pick the room with the color combo you would most want in your dream playroom.",
      hint: "Mary Blair did not come here to be subtle.",
    },
    {
      task: "Spot one clock, sun, moon, or geometric shape that feels very Small World.",
      hint: "Look at the backgrounds, not just the dolls.",
    },
  ],

  "Buzz Lightyear's Space Ranger Spin": [
    {
      task: "Look for the giant View-Master disks or oversized batteries in the queue.",
      hint: "Tomorrowland loves making normal toy things look huge and important.",
    },
    {
      task: "Everyone pick who will get the highest score and who will just spin the car for chaos.",
      hint: "There is always a chaos pilot.",
    },
  ],

  "Tomorrowland Transit Authority PeopleMover": [
    {
      task: "During the ride, look for the Progress City model.",
      hint: "It looks like a tiny futuristic city and connects back to Walt’s EPCOT ideas.",
    },
    {
      task: "Pick the most relaxing part of the ride: the views, the breeze, the tunnel, or sitting down.",
      hint: "Sitting down is a very valid answer.",
    },
  ],

  "Under the Sea - Journey of The Little Mermaid": [
    {
      task: "Look for nautical wreckage, shells, and carved rock details in the queue.",
      hint: "The queue is doing a lot before you even board.",
    },
    {
      task: "Find one detail that makes you feel like you are moving from land toward the ocean.",
      hint: "Watch the materials, sounds, and sea-life touches.",
    },
  ],

  "The Many Adventures of Winnie the Pooh": [
    {
      task: "Look for honey-themed details in the queue.",
      hint: "Pooh does not believe in subtle branding.",
    },
    {
      task: "Everyone pick which Hundred Acre Wood character matches their current mood.",
      hint: "Hot, tired adults may identify with Eeyore more than expected.",
    },
  ],

  "Dumbo the Flying Elephant": [
    {
      task: "Look for circus tent details, peanuts, flags, or bright carnival colors.",
      hint: "This area is designed to feel like a toy-box circus.",
    },
    {
      task: "Pick who would fly Dumbo highest and who would keep him low.",
      hint: "This can reveal a lot about your family.",
    },
  ],

  "Mad Tea Party": [
    {
      task: "Spot the Dormouse popping out of the giant teapot.",
      hint: "Look toward the center of the ride.",
    },
    {
      task: "Everyone choose: are you a gentle spinner or a full chaos spinner?",
      hint: "Anyone who says “gentle” cannot always be trusted.",
    },
  ],

  "Prince Charming Regal Carrousel": [
    {
      task: "Look up at the painted Cinderella scenes on the canopy.",
      hint: "There is more story detail above you than people notice.",
    },
    {
      task: "Try to find the horse with the golden ribbon on its tail.",
      hint: "Families love hunting for Cinderella’s Horse.",
    },
  ],

  "Mickey's PhilharMagic": [
    {
      task: "Before the show, everyone pick the Disney song they hope appears.",
      hint: "This is a no-wrong-answer situation unless someone starts singing too loudly.",
    },
  ],

  "The Barnstormer": [
    {
      task: "Look for Goofy stunt-plane details around the ride.",
      hint: "The theme is basically “Goofy tried aviation.”",
    },
    {
      task: "Ask who in your group is using this as a warm-up coaster.",
      hint: "Tiny thrills still count.",
    },
  ],

  "The Magic Carpets of Aladdin": [
    {
      task: "Watch the camel and see if anyone gets splashed.",
      hint: "If it is you, the camel chose violence.",
    },
    {
      task: "Find colorful jewels or Adventureland market details around the ride.",
      hint: "Look at the metalwork and surrounding props.",
    },
  ],

  "Walt Disney's Enchanted Tiki Room": [
    {
      task: "Pick the bird, flower, or tiki that seems to have the most personality.",
      hint: "There are a lot of candidates.",
    },
    {
      task: "Listen for the first song lyric someone in your group recognizes.",
      hint: "Warning: it may follow you around the park.",
    },
  ],

  "Astro Orbiter": [
    {
      task: "Look down over Tomorrowland and pick the best view from above.",
      hint: "The height is the whole drama.",
    },
  ],

  "Tomorrowland Speedway": [
    {
      task: "Look for racetrack details like signs, lanes, and the Yard of Bricks-style touch.",
      hint: "It is slow, but it wants to feel official.",
    },
    {
      task: "Everyone vote for the safest driver in the family.",
      hint: "Do not let this become too honest.",
    },
  ],

  "Monsters Inc. Laugh Floor": [
    {
      task: "Everyone pick who is most likely to get picked by the monsters.",
      hint: "If someone is wearing a loud shirt, they are in danger.",
    },
  ],

  "Country Bear Musical Jamboree": [
    {
      task: "Pick which bear looks like they would be the most fun at a family party.",
      hint: "There is no scientific method here. Go with vibes.",
    },
  ],

  "The Hall of Presidents": [
    {
      task: "Use this as a family reset check: water, snack, bathroom, or one more ride after this?",
      hint: "This is less scavenger hunt and more survival strategy.",
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
  "Would you rather be stuck on “it’s a small world” for 20 minutes or have the song randomly play every time you open the fridge?",
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

  "Rock 'n' Roller Coaster Starring Aerosmith": [
    {
      question: "Rock ’n’ Roller Coaster is famous for what kind of start?",
      choices: ["A high-speed launch", "A backwards drop", "A water splash", "A slow lift hill"],
      answer: "A high-speed launch",
      fact:
        "The launch is the star. It takes you from standing still to nearly 60 mph in just a few seconds.",
    },
    {
      question: "What are you riding in on Rock ’n’ Roller Coaster?",
      choices: ["A super-stretch limo", "A tour bus", "A rocket", "A taxi"],
      answer: "A super-stretch limo",
      fact:
        "The whole story is that you are racing across town to make it to the concert.",
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

  "Rock 'n' Roller Coaster Starring Aerosmith": [
    {
      task: "Look for recording studio details like guitars, posters, cables, and music gear.",
      hint: "The queue wants you to feel like you wandered backstage.",
    },
    {
      task: "Everyone invent a family band name before you board.",
      hint: "The worse the pun, the better.",
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

  if (normalized.includes("big thunder")) {
    aliases.add("big thunder mountain railroad");
    aliases.add("big thunder");
  }

  if (normalized.includes("small world") || normalized.includes("its a small world")) {
    aliases.add("its a small world");
    aliases.add("it's a small world");
    aliases.add("small world");
  }

  if (normalized.includes("buzz lightyear")) {
    aliases.add("buzz lightyears space ranger spin");
    aliases.add("buzz lightyear space ranger spin");
  }

  if (normalized.includes("peoplemover") || normalized.includes("people mover")) {
    aliases.add("tomorrowland transit authority peoplemover");
    aliases.add("peoplemover");
  }

  if (normalized.includes("little mermaid") || normalized.includes("under the sea")) {
    aliases.add("under the sea journey of the little mermaid");
    aliases.add("under the sea journey of the little mermaid");
    aliases.add("journey of the little mermaid");
  }

  if (normalized.includes("winnie") || normalized.includes("pooh")) {
    aliases.add("the many adventures of winnie the pooh");
    aliases.add("winnie the pooh");
  }

  if (normalized.includes("magic carpets") || normalized.includes("aladdin")) {
    aliases.add("the magic carpets of aladdin");
    aliases.add("magic carpets of aladdin");
  }

  if (normalized.includes("tiki")) {
    aliases.add("walt disneys enchanted tiki room");
    aliases.add("enchanted tiki room");
  }

  if (normalized.includes("philharmagic")) {
    aliases.add("mickeys philharmagic");
    aliases.add("philharmagic");
  }

  if (normalized.includes("carousel of progress")) {
    aliases.add("walt disneys carousel of progress");
    aliases.add("carousel of progress");
  }

  if (normalized.includes("monsters") || normalized.includes("laugh floor")) {
    aliases.add("monsters inc laugh floor");
    aliases.add("monsters inc laugh floor");
  }

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

function buildMiniGameForType({
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

export function getMiniGameForContext({
  parkId,
  land,
  rideName,
  gameType,
  seed = 0,
}) {
  const requestedGame = buildMiniGameForType({
    parkId,
    land,
    rideName,
    gameType,
    seed,
  });

  if (requestedGame) return requestedGame;

  // Safety net: never let Line Time Companion disappear just because one tab
  // lacks ride-specific content. Try the other family-safe game types before
  // giving up.
  const fallbackOrder = [
    "trivia",
    "look_around",
    "family_vote",
    "would_you_rather",
  ].filter((type) => type !== gameType);

  for (const fallbackType of fallbackOrder) {
    const fallbackGame = buildMiniGameForType({
      parkId,
      land,
      rideName,
      gameType: fallbackType,
      seed,
    });

    if (fallbackGame) {
      return {
        ...fallbackGame,
        fallbackFrom: gameType,
      };
    }
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
