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
    {
      question: "What kind of roller coaster is Space Mountain?",
      choices: ["Indoor dark coaster", "Water raft ride", "Spinning tea cup", "Safari ride"],
      answer: "Indoor dark coaster",
      fact: "Space Mountain is an indoor roller coaster where darkness makes the turns and drops feel more surprising.",
    },
    {
      question: "What land is Space Mountain located in?",
      choices: ["Tomorrowland", "Fantasyland", "Adventureland", "Frontierland"],
      answer: "Tomorrowland",
      fact: "Space Mountain fits Tomorrowland because it is themed around rockets, space travel, and futuristic adventure.",
    },
    {
      question: "What are Space Mountain ride vehicles styled like?",
      choices: ["Rockets", "Mine trains", "Pirate boats", "Doom Buggies"],
      answer: "Rockets",
      fact: "Space Mountain's ride vehicles are styled like rockets to match the outer-space theme.",
    },
    {
      question: "What makes Space Mountain feel extra surprising?",
      choices: ["Most of the track is dark", "It goes underwater", "It has live actors", "It spins nonstop"],
      answer: "Most of the track is dark",
      fact: "Because much of Space Mountain happens in darkness, riders cannot easily see the next turn or dip coming.",
    },
    {
      question: "How do guests sit in many Space Mountain rockets?",
      choices: ["One behind another", "In a big circle", "Sideways on benches", "Standing up"],
      answer: "One behind another",
      fact: "Space Mountain uses single-file style seating, which helps each rocket feel narrow and fast.",
    },
    {
      question: "What theme do guests see throughout Space Mountain?",
      choices: ["Outer space", "The Wild West", "A haunted mansion", "A jungle river"],
      answer: "Outer space",
      fact: "The attraction uses stars, tunnels, and space-station style details to create a space-flight feeling.",
    },
    {
      question: "What color is the outside of Space Mountain best known for?",
      choices: ["White", "Red", "Green", "Brown"],
      answer: "White",
      fact: "The outside of Space Mountain is a large white futuristic structure that stands out in Tomorrowland.",
    },
    {
      question: "What is the main thrill of Space Mountain?",
      choices: ["A fast ride through darkness", "A slow boat tour", "A 3D movie", "A spinning carousel"],
      answer: "A fast ride through darkness",
      fact: "Space Mountain combines coaster motion with darkness to make the ride feel faster and more mysterious.",
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
    {
      question: "What kind of vehicle do guests ride on TRON Lightcycle / Run?",
      choices: ["Lightcycle", "Pirate ship", "Safari truck", "Doom Buggy"],
      answer: "Lightcycle",
      fact: "TRON Lightcycle / Run uses motorcycle-style ride vehicles called Lightcycles.",
    },
    {
      question: "What movie world inspires TRON Lightcycle / Run?",
      choices: ["TRON", "Frozen", "Toy Story", "The Lion King"],
      answer: "TRON",
      fact: "The ride is inspired by the digital world of TRON, where riders enter a glowing computer-like Grid.",
    },
    {
      question: "What kind of coaster launch does TRON use?",
      choices: ["Fast forward launch", "Slow boat start", "Backward elevator drop", "Spinning lift hill"],
      answer: "Fast forward launch",
      fact: "TRON begins with a quick launch that sends riders racing forward on their Lightcycles.",
    },
    {
      question: "How do riders sit on a TRON Lightcycle?",
      choices: ["Leaning forward", "Lying flat", "Sideways", "In a circle"],
      answer: "Leaning forward",
      fact: "The Lightcycle position makes riders lean forward like they are riding a futuristic motorcycle.",
    },
    {
      question: "What land is TRON Lightcycle / Run in?",
      choices: ["Tomorrowland", "Liberty Square", "Adventureland", "Main Street"],
      answer: "Tomorrowland",
      fact: "TRON is in Tomorrowland, close to Space Mountain, which gives that area two major futuristic thrill rides.",
    },
    {
      question: "What is the glowing outdoor roof area on TRON known for?",
      choices: ["Neon light effects", "Jungle vines", "Pirate flags", "Snowy mountains"],
      answer: "Neon light effects",
      fact: "TRON's outdoor canopy glows with bright lighting that matches the ride's digital racing theme.",
    },
    {
      question: "What does TRON make riders feel like they are entering?",
      choices: ["The Grid", "A haunted attic", "A mine shaft", "A royal ballroom"],
      answer: "The Grid",
      fact: "The ride is themed as a race through the Grid, a digital world from the TRON story.",
    },
    {
      question: "What should guests store before riding TRON?",
      choices: ["Loose items", "Park maps only", "Shoes", "MagicBands"],
      answer: "Loose items",
      fact: "TRON uses lockers for loose items because the Lightcycle ride position is different from a normal coaster seat.",
    },
    {
      question: "What is one big visual feature of TRON Lightcycle / Run?",
      choices: ["Blue glowing race energy", "A castle tower", "A riverboat dock", "A circus tent"],
      answer: "Blue glowing race energy",
      fact: "TRON uses bright blue lighting and racing visuals to make the coaster feel like a digital competition.",
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
    {
      question: "What story is Seven Dwarfs Mine Train based on?",
      choices: ["Snow White and the Seven Dwarfs", "Peter Pan", "Aladdin", "Moana"],
      answer: "Snow White and the Seven Dwarfs",
      fact: "The ride brings guests into the world of Snow White and the Seven Dwarfs, especially the dwarfs' mine.",
    },
    {
      question: "What are the ride vehicles themed as?",
      choices: ["Mine carts", "Pirate boats", "Rocket ships", "Tea cups"],
      answer: "Mine carts",
      fact: "Seven Dwarfs Mine Train uses mine cart vehicles to match the dwarfs' jewel-filled mine.",
    },
    {
      question: "What special motion do the mine carts have?",
      choices: ["They sway side to side", "They float on water", "They spin freely", "They fly overhead"],
      answer: "They sway side to side",
      fact: "The mine carts are designed to gently sway, giving the family coaster a playful motion.",
    },
    {
      question: "What do guests see inside the mine scene?",
      choices: ["Glowing gems", "Pirate treasure maps", "Space rockets", "Jungle animals"],
      answer: "Glowing gems",
      fact: "The indoor mine scene is filled with colorful glowing gems and the dwarfs working happily.",
    },
    {
      question: "Which song feeling is strongly connected to the mine scene?",
      choices: ["Heigh-Ho", "Yo Ho", "Grim Grinning Ghosts", "Great Big Beautiful Tomorrow"],
      answer: "Heigh-Ho",
      fact: "The dwarfs' mine scene uses the cheerful Heigh-Ho spirit from Snow White and the Seven Dwarfs.",
    },
    {
      question: "What kind of ride is Seven Dwarfs Mine Train?",
      choices: ["Family coaster", "Drop tower", "Boat ride", "3D theater"],
      answer: "Family coaster",
      fact: "Seven Dwarfs Mine Train is a family coaster with outdoor coaster sections and indoor story scenes.",
    },
    {
      question: "Where is Seven Dwarfs Mine Train located?",
      choices: ["Fantasyland", "Tomorrowland", "Frontierland", "Adventureland"],
      answer: "Fantasyland",
      fact: "The ride sits in Fantasyland because it is based on a classic Disney fairy tale.",
    },
    {
      question: "What character group is most important to the ride?",
      choices: ["The Seven Dwarfs", "The Pirates", "The Muppets", "The Incredibles"],
      answer: "The Seven Dwarfs",
      fact: "The Seven Dwarfs are the heart of the attraction, especially during the mine scene.",
    },
    {
      question: "What scene appears near the end of Seven Dwarfs Mine Train?",
      choices: ["The dwarfs' cottage", "A space station", "A pirate fort", "A jungle temple"],
      answer: "The dwarfs' cottage",
      fact: "Near the end, guests pass the dwarfs' cottage, tying the coaster back to the Snow White story.",
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
    {
      question: "What do guests ride in on Peter Pan's Flight?",
      choices: ["Flying pirate ships", "Mine carts", "Rocket bikes", "Safari jeeps"],
      answer: "Flying pirate ships",
      fact: "Peter Pan's Flight uses suspended pirate ships that make guests feel like they are flying.",
    },
    {
      question: "What city do guests fly over near the beginning?",
      choices: ["London", "Paris", "Orlando", "New York"],
      answer: "London",
      fact: "The ride famously lifts guests over a miniature nighttime London before heading toward Never Land.",
    },
    {
      question: "What magical place does Peter Pan's Flight travel to?",
      choices: ["Never Land", "Arendelle", "Radiator Springs", "Pandora"],
      answer: "Never Land",
      fact: "Peter Pan's Flight takes guests from London into Never Land, the storybook home of Peter Pan's adventures.",
    },
    {
      question: "What makes the ride feel like flying?",
      choices: ["The ships hang from above", "The cars bounce on springs", "The seats spin fast", "The boat floats outside"],
      answer: "The ships hang from above",
      fact: "The pirate ships are suspended from an overhead track, helping create the flying feeling.",
    },
    {
      question: "Which character is the ride named after?",
      choices: ["Peter Pan", "Captain Jack Sparrow", "Mickey Mouse", "Buzz Lightyear"],
      answer: "Peter Pan",
      fact: "The ride is named for Peter Pan, the boy who leads the Darling children to Never Land.",
    },
    {
      question: "Which villain's ship appears in the Never Land scenes?",
      choices: ["Captain Hook", "Jafar", "Gaston", "Hades"],
      answer: "Captain Hook",
      fact: "Captain Hook's pirate ship is part of the Never Land adventure in Peter Pan's Flight.",
    },
    {
      question: "What type of attraction is Peter Pan's Flight?",
      choices: ["Dark ride", "Water coaster", "Drop tower", "Walking trail"],
      answer: "Dark ride",
      fact: "Peter Pan's Flight is a classic dark ride, using indoor scenes, lighting, and music to tell the story.",
    },
    {
      question: "Where is Peter Pan's Flight located?",
      choices: ["Fantasyland", "Tomorrowland", "Adventureland", "Frontierland"],
      answer: "Fantasyland",
      fact: "Peter Pan's Flight is in Fantasyland because it is based on a classic Disney fantasy story.",
    },
    {
      question: "What tiny glowing effect helps the story feel magical?",
      choices: ["Pixie dust", "Lightning bolts", "Campfire sparks", "Rocket fuel"],
      answer: "Pixie dust",
      fact: "Pixie dust is part of Peter Pan's story and helps explain the magical flight to Never Land.",
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
    {
      question: "What kind of ride vehicle do guests board on Pirates of the Caribbean?",
      choices: ["Boats", "Mine carts", "Rocket bikes", "Doom Buggies"],
      answer: "Boats",
      fact: "Pirates of the Caribbean is a boat ride that carries guests through pirate scenes and waterfront towns.",
    },
    {
      question: "Which famous pirate character can guests spot in the ride?",
      choices: ["Captain Jack Sparrow", "Buzz Lightyear", "Peter Pan", "Figment"],
      answer: "Captain Jack Sparrow",
      fact: "Captain Jack Sparrow appears in multiple scenes, connecting the classic attraction to the Pirates films.",
    },
    {
      question: "What song phrase is strongly connected to Pirates of the Caribbean?",
      choices: ["Yo Ho", "Heigh-Ho", "Hakuna Matata", "Let It Go"],
      answer: "Yo Ho",
      fact: "The classic pirate song helps give the ride its playful swashbuckling mood.",
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
    {
      question: "What are the ride vehicles in Haunted Mansion called?",
      choices: ["Doom Buggies", "Ghost Wagons", "Bat Boats", "Shadow Cars"],
      answer: "Doom Buggies",
      fact: "Haunted Mansion uses slow-moving Doom Buggies so guests can glide through each spooky scene.",
    },
    {
      question: "Who is the voice that guides guests through Haunted Mansion?",
      choices: ["The Ghost Host", "The Jungle Skipper", "The Toy Sheriff", "The Mine Boss"],
      answer: "The Ghost Host",
      fact: "The Ghost Host narration helps set the playful spooky tone throughout the attraction.",
    },
    {
      question: "What room appears to grow taller near the start of Haunted Mansion?",
      choices: ["Stretching room", "Ballroom", "Library", "Attic"],
      answer: "Stretching room",
      fact: "The stretching room creates a mysterious illusion before guests board the ride.",
    },
    {
      question: "Which scene shows ghosts dancing and dining?",
      choices: ["Ballroom", "Space station", "Mine shaft", "Bayou dock"],
      answer: "Ballroom",
      fact: "The ballroom scene uses classic haunted-house effects to make ghostly figures appear throughout the room.",
    },
    {
      question: "What kind of attraction is Haunted Mansion?",
      choices: ["Dark ride", "Water coaster", "Outdoor train", "Spinning carnival ride"],
      answer: "Dark ride",
      fact: "Haunted Mansion is a dark ride that uses indoor scenes, lighting, music, and illusions.",
    },
    {
      question: "What is the mood of Haunted Mansion meant to be?",
      choices: ["Spooky but playful", "Very serious history", "High-speed racing", "Underwater exploring"],
      answer: "Spooky but playful",
      fact: "Haunted Mansion mixes ghostly scenes with humor, making it spooky without being too intense for many families.",
    },
    {
      question: "Which Haunted Mansion scene includes many outdoor-style ghost characters?",
      choices: ["Graveyard", "Rocket tunnel", "Safari plain", "Castle courtyard"],
      answer: "Graveyard",
      fact: "The graveyard scene is full of singing and playful ghost characters near the end of the ride.",
    },
    {
      question: "What object often appears to follow guests with its eyes?",
      choices: ["Portraits", "Traffic cones", "Lanterns", "Treasure chests"],
      answer: "Portraits",
      fact: "Haunted Mansion uses changing portraits and visual tricks to make the house feel alive.",
    },
    {
      question: "Where is Haunted Mansion located in Magic Kingdom?",
      choices: ["Liberty Square", "Tomorrowland", "Storybook Circus", "Frontierland"],
      answer: "Liberty Square",
      fact: "Haunted Mansion sits in Liberty Square, giving that corner of the park a spooky old-estate feeling.",
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
    {
      question: "Which Disney story inspires Tiana's Bayou Adventure?",
      choices: ["The Princess and the Frog", "Frozen", "Peter Pan", "Toy Story"],
      answer: "The Princess and the Frog",
      fact: "The attraction continues the world of The Princess and the Frog with Tiana, Louis, and bayou music.",
    },
    {
      question: "What kind of ride vehicle do guests use on Tiana's Bayou Adventure?",
      choices: ["Log-style boats", "Rocket bikes", "Doom Buggies", "Flying carpets"],
      answer: "Log-style boats",
      fact: "Tiana's Bayou Adventure is a water ride with log-style boats that travel through bayou scenes.",
    },
    {
      question: "What is one major thrill on Tiana's Bayou Adventure?",
      choices: ["A big water drop", "A spinning teacup", "A backwards launch", "A flying theater"],
      answer: "A big water drop",
      fact: "The ride includes a large outdoor drop that is one of the biggest thrill moments in Magic Kingdom.",
    },
    {
      question: "Which character is a jazz-loving alligator in Tiana's story?",
      choices: ["Louis", "Olaf", "Figment", "Baloo"],
      answer: "Louis",
      fact: "Louis is the trumpet-playing alligator connected to the music and fun of Tiana's bayou world.",
    },
    {
      question: "What setting is central to Tiana's Bayou Adventure?",
      choices: ["Louisiana bayou", "Outer space", "Swiss mountain", "London rooftops"],
      answer: "Louisiana bayou",
      fact: "The ride's scenes are built around a lively Louisiana bayou atmosphere with music, water, and critters.",
    },
    {
      question: "What kind of music feeling fits Tiana's Bayou Adventure best?",
      choices: ["New Orleans jazz", "Space techno", "Pirate chant", "Western yodeling"],
      answer: "New Orleans jazz",
      fact: "The ride leans into New Orleans-inspired music, matching Tiana's story and restaurant dreams.",
    },
    {
      question: "What are Tiana and friends preparing for in the attraction's story?",
      choices: ["A celebration", "A space launch", "A pirate battle", "A royal tournament"],
      answer: "A celebration",
      fact: "The ride follows Tiana and friends as they gather music and friends for a joyful celebration.",
    },
    {
      question: "What should riders expect on Tiana's Bayou Adventure?",
      choices: ["They may get wet", "They must stand up", "They wear 3D glasses", "They drive cars"],
      answer: "They may get wet",
      fact: "Because it is a flume-style water ride with drops and splashes, guests may get wet.",
    },
    {
      question: "Where is Tiana's Bayou Adventure located?",
      choices: ["Frontierland", "Tomorrowland", "Fantasyland", "Main Street"],
      answer: "Frontierland",
      fact: "Tiana's Bayou Adventure is in Frontierland, bringing bayou storytelling and water-ride thrills to that area.",
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
    {
      question: "Who tells jokes throughout Jungle Cruise?",
      choices: ["The skipper", "The Ghost Host", "The mayor", "The mine boss"],
      answer: "The skipper",
      fact: "Jungle Cruise skippers are famous for playful jokes and puns during the boat ride.",
    },
    {
      question: "What kind of vehicle do guests ride on Jungle Cruise?",
      choices: ["River boat", "Mine train", "Rocket ship", "Flying elephant"],
      answer: "River boat",
      fact: "Jungle Cruise uses boat vehicles to take guests along a themed river adventure.",
    },
    {
      question: "What kind of humor is Jungle Cruise best known for?",
      choices: ["Puns", "Silent comedy", "Scary stories", "Sports chants"],
      answer: "Puns",
      fact: "The attraction is famous for silly wordplay and skipper jokes that make the cruise feel playful.",
    },
    {
      question: "What do guests see along the Jungle Cruise river?",
      choices: ["Animal scenes", "Space stations", "Castle rooms", "Toy boxes"],
      answer: "Animal scenes",
      fact: "Jungle Cruise passes themed animal scenes, jungle ruins, waterfalls, and river scenes.",
    },
    {
      question: "What famous waterfall-style joke is part of Jungle Cruise?",
      choices: ["The backside of water", "The top of fire", "The middle of snow", "The bottom of space"],
      answer: "The backside of water",
      fact: "The boat passes behind a waterfall, setting up one of the attraction's best-known skipper jokes.",
    },
    {
      question: "What land is Jungle Cruise located in?",
      choices: ["Adventureland", "Tomorrowland", "Fantasyland", "Liberty Square"],
      answer: "Adventureland",
      fact: "Jungle Cruise fits Adventureland because it is themed like a river expedition through faraway places.",
    },
    {
      question: "What is the pace of Jungle Cruise?",
      choices: ["Slow boat ride", "High-speed coaster", "Drop tower", "Spinning ride"],
      answer: "Slow boat ride",
      fact: "Jungle Cruise is a slow-moving boat ride, giving families time to enjoy the scenes and jokes.",
    },
    {
      question: "What makes each Jungle Cruise ride feel a little different?",
      choices: ["The skipper's delivery", "The track changes", "The boat flies", "The seats spin"],
      answer: "The skipper's delivery",
      fact: "Different skippers bring their own timing and personality to the jokes, so rides can feel different.",
    },
    {
      question: "What kind of adventure does Jungle Cruise pretend to be?",
      choices: ["A guided river expedition", "A royal dance", "A space battle", "A cooking lesson"],
      answer: "A guided river expedition",
      fact: "The ride is staged like a guided jungle river trip, with the skipper leading the expedition.",
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
    {
      question: "What kind of ride is Big Thunder Mountain Railroad?",
      choices: ["Runaway mine train coaster", "Boat ride", "Flying theater", "Carousel"],
      answer: "Runaway mine train coaster",
      fact: "Big Thunder Mountain is themed as a wild mine train racing through a desert mountain town.",
    },
    {
      question: "What land is Big Thunder Mountain Railroad in?",
      choices: ["Frontierland", "Tomorrowland", "Fantasyland", "Adventureland"],
      answer: "Frontierland",
      fact: "Big Thunder Mountain fits Frontierland with its Old West mining town and desert mountain theme.",
    },
    {
      question: "What are the ride vehicles themed as?",
      choices: ["Mine trains", "Rocket bikes", "River rafts", "Pirate ships"],
      answer: "Mine trains",
      fact: "The coaster trains are styled like mine trains, matching the story of a runaway railroad.",
    },
    {
      question: "What setting is Big Thunder Mountain known for?",
      choices: ["Desert mining town", "Haunted mansion", "Frozen castle", "Outer space"],
      answer: "Desert mining town",
      fact: "The ride's scenery includes red rock, tunnels, mining equipment, and an Old West atmosphere.",
    },
    {
      question: "What makes Big Thunder Mountain exciting?",
      choices: ["Turns, dips, and tunnels", "A slow museum tour", "A 3D movie", "A spinning tea cup"],
      answer: "Turns, dips, and tunnels",
      fact: "Big Thunder Mountain uses quick turns, small drops, and tunnels to create a fun coaster adventure.",
    },
    {
      question: "What animal is often associated with the Big Thunder Mountain setting?",
      choices: ["Goat", "Penguin", "Giraffe", "Dolphin"],
      answer: "Goat",
      fact: "A goat scene is one of the memorable details riders may notice on Big Thunder Mountain.",
    },
    {
      question: "What is the ride's story style?",
      choices: ["A train racing through a haunted mining area", "A boat looking for pirates", "A tour of movie props", "A flight over Earth"],
      answer: "A train racing through a haunted mining area",
      fact: "The attraction tells the story of a mining railroad with a wild, almost supernatural energy.",
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
    {
      question: "What kind of ride is it's a small world?",
      choices: ["Boat ride", "Roller coaster", "Drop tower", "Shooting game"],
      answer: "Boat ride",
      fact: "it's a small world is a gentle boat ride through colorful scenes representing children around the world.",
    },
    {
      question: "What is the main message of it's a small world?",
      choices: ["People around the world are connected", "Pirates love treasure", "Space travel is fast", "Ghosts throw parties"],
      answer: "People around the world are connected",
      fact: "The attraction uses music, costumes, and scenery to celebrate global friendship and connection.",
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
    {
      question: "What do guests use to score points on Buzz Lightyear's Space Ranger Spin?",
      choices: ["Laser cannons", "Fishing rods", "Paint brushes", "Magic wands"],
      answer: "Laser cannons",
      fact: "Guests use laser cannons to aim at targets and help Buzz defeat Emperor Zurg.",
    },
    {
      question: "Which Toy Story character leads the mission?",
      choices: ["Buzz Lightyear", "Woody", "Rex", "Jessie"],
      answer: "Buzz Lightyear",
      fact: "Buzz Lightyear recruits guests as Space Rangers for the attraction's interactive mission.",
    },
    {
      question: "Who is the main villain in Buzz Lightyear's Space Ranger Spin?",
      choices: ["Emperor Zurg", "Captain Hook", "Ursula", "Jafar"],
      answer: "Emperor Zurg",
      fact: "Emperor Zurg is the villain guests are trying to stop by hitting targets throughout the ride.",
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
    {
      question: "What area does the PeopleMover travel around?",
      choices: ["Tomorrowland", "Fantasyland", "Adventureland", "Frontierland"],
      answer: "Tomorrowland",
      fact: "The PeopleMover gives guests an elevated tour around Tomorrowland.",
    },
    {
      question: "What is the pace of the PeopleMover?",
      choices: ["Gentle and steady", "Fast and looping", "Wet and splashy", "Spinning nonstop"],
      answer: "Gentle and steady",
      fact: "The PeopleMover is known as a calm ride with steady movement and great views of Tomorrowland.",
    },
    {
      question: "What makes the PeopleMover helpful during a busy park day?",
      choices: ["It gives a relaxing break", "It requires running", "It sprays everyone", "It has a big drop"],
      answer: "It gives a relaxing break",
      fact: "Families often enjoy the PeopleMover because it is seated, breezy, and usually low-stress.",
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
    {
      question: "What are the ride vehicles shaped like on Under the Sea?",
      choices: ["Clamshells", "Rocket ships", "Mine carts", "Safari trucks"],
      answer: "Clamshells",
      fact: "Guests ride in clamshell vehicles that fit the underwater theme of Ariel's story.",
    },
    {
      question: "Which Disney princess is the ride centered around?",
      choices: ["Ariel", "Belle", "Tiana", "Mulan"],
      answer: "Ariel",
      fact: "Under the Sea follows Ariel's story from The Little Mermaid through music-filled scenes.",
    },
    {
      question: "Which sea witch appears in the ride?",
      choices: ["Ursula", "Maleficent", "Cruella", "Mother Gothel"],
      answer: "Ursula",
      fact: "Ursula appears during the darker part of Ariel's story before the happy ending.",
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
    {
      question: "What kind of vehicle do guests ride in on Winnie the Pooh?",
      choices: ["Honey pots", "Pirate ships", "Rocket bikes", "Doom Buggies"],
      answer: "Honey pots",
      fact: "The ride vehicles are themed as honey pots, matching Pooh's love of honey.",
    },
    {
      question: "What storybook place does the ride visit?",
      choices: ["Hundred Acre Wood", "Never Land", "Arendelle", "Pandora"],
      answer: "Hundred Acre Wood",
      fact: "The attraction takes guests through the Hundred Acre Wood with Pooh and his friends.",
    },
    {
      question: "Which bouncy character appears in the ride?",
      choices: ["Tigger", "Goofy", "Baloo", "Stitch"],
      answer: "Tigger",
      fact: "Tigger brings a playful bouncing moment to the ride, matching his energetic personality.",
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
    {
      question: "What do guests ride on Dumbo the Flying Elephant?",
      choices: ["Flying elephants", "Pirate boats", "Race cars", "Mine trains"],
      answer: "Flying elephants",
      fact: "Guests ride elephant-shaped vehicles inspired by Dumbo's ability to fly.",
    },
    {
      question: "What can riders usually control during Dumbo?",
      choices: ["How high they fly", "The music speed", "The track direction", "The castle lights"],
      answer: "How high they fly",
      fact: "Each Dumbo vehicle lets riders control whether they fly higher or lower during the ride.",
    },
    {
      question: "What area of Magic Kingdom is Dumbo connected to?",
      choices: ["Storybook Circus", "Liberty Square", "Frontierland", "Adventureland"],
      answer: "Storybook Circus",
      fact: "Dumbo sits in Storybook Circus, which matches the attraction's circus-inspired theme.",
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
    {
      question: "What do guests spin in on Mad Tea Party?",
      choices: ["Teacups", "Rocket ships", "Logs", "Doom Buggies"],
      answer: "Teacups",
      fact: "Mad Tea Party uses colorful teacup vehicles inspired by Alice in Wonderland.",
    },
    {
      question: "Which story inspires Mad Tea Party?",
      choices: ["Alice in Wonderland", "The Jungle Book", "Toy Story", "Moana"],
      answer: "Alice in Wonderland",
      fact: "The ride is based on the silly tea party scene from Alice in Wonderland.",
    },
    {
      question: "What can guests control in the center of the teacup?",
      choices: ["How much they spin", "The ride music", "The lights", "The roof"],
      answer: "How much they spin",
      fact: "The wheel in the center of each teacup lets riders make their cup spin more or less.",
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
    {
      question: "What animals do guests ride on Prince Charming Regal Carrousel?",
      choices: ["Horses", "Elephants", "Camels", "Dragons"],
      answer: "Horses",
      fact: "The carousel features ornate horses that circle through the heart of Fantasyland.",
    },
    {
      question: "Where is Prince Charming Regal Carrousel located?",
      choices: ["Fantasyland", "Tomorrowland", "Adventureland", "Frontierland"],
      answer: "Fantasyland",
      fact: "The carousel is in Fantasyland near Cinderella Castle, adding to the classic fairytale setting.",
    },
    {
      question: "What kind of classic attraction is Prince Charming Regal Carrousel?",
      choices: ["Carousel", "Dark ride", "Water flume", "Shooting game"],
      answer: "Carousel",
      fact: "A carousel is one of the most classic amusement rides, with animals moving up and down as the platform turns.",
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
    {
      question: "Which character causes musical chaos in Mickey's PhilharMagic?",
      choices: ["Donald Duck", "Goofy", "Pluto", "Chip"],
      answer: "Donald Duck",
      fact: "Donald Duck gets swept into the show after putting on Mickey's sorcerer hat.",
    },
    {
      question: "What kind of show is Mickey's PhilharMagic?",
      choices: ["3D musical show", "Boat ride", "Roller coaster", "Parade"],
      answer: "3D musical show",
      fact: "Mickey's PhilharMagic combines 3D film effects, music, and classic Disney animated moments.",
    },
    {
      question: "Which famous Mickey item appears in Mickey's PhilharMagic?",
      choices: ["Sorcerer hat", "Pirate sword", "Space helmet", "Crystal slipper"],
      answer: "Sorcerer hat",
      fact: "Mickey's sorcerer hat helps kick off the magical trouble in the show.",
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
    {
      question: "What kind of ride is The Barnstormer?",
      choices: ["Junior coaster", "Boat ride", "Dark ride", "Carousel"],
      answer: "Junior coaster",
      fact: "The Barnstormer is a small family coaster that is often a kid's first coaster experience.",
    },
    {
      question: "Which Disney character is tied to The Barnstormer theme?",
      choices: ["Goofy", "Mickey", "Ariel", "Buzz Lightyear"],
      answer: "Goofy",
      fact: "The Barnstormer is themed around Goofy and his playful stunt-flying style.",
    },
    {
      question: "What area is The Barnstormer part of?",
      choices: ["Storybook Circus", "Liberty Square", "Adventureland", "Frontierland"],
      answer: "Storybook Circus",
      fact: "The Barnstormer fits Storybook Circus with its playful flying-school and circus feel.",
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
    {
      question: "What do guests ride on The Magic Carpets of Aladdin?",
      choices: ["Flying carpets", "Pirate boats", "Mine trains", "Rocket bikes"],
      answer: "Flying carpets",
      fact: "The attraction lets guests ride carpet-shaped vehicles inspired by Aladdin.",
    },
    {
      question: "Which Disney movie inspires The Magic Carpets of Aladdin?",
      choices: ["Aladdin", "Frozen", "Cars", "The Lion King"],
      answer: "Aladdin",
      fact: "The ride is based on the magic carpet adventure feeling from Aladdin.",
    },
    {
      question: "Which animal figure is known for surprising guests near the ride?",
      choices: ["Camel", "Elephant", "Tiger", "Giraffe"],
      answer: "Camel",
      fact: "The camel near the attraction is known for playfully spitting water at passing guests.",
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
    {
      question: "What kind of animals are the main performers in the Tiki Room?",
      choices: ["Birds", "Bears", "Fish", "Dogs"],
      answer: "Birds",
      fact: "The Enchanted Tiki Room stars singing birds along with flowers and tiki figures.",
    },
    {
      question: "What do guests mostly do during Walt Disney's Enchanted Tiki Room?",
      choices: ["Sit and watch a musical show", "Drive cars", "Shoot targets", "Ride a coaster"],
      answer: "Sit and watch a musical show",
      fact: "The Tiki Room is a seated show with music, colorful characters, and tropical atmosphere.",
    },
    {
      question: "What is the overall setting of the Tiki Room?",
      choices: ["Tropical hideaway", "Space station", "Old mansion", "Snowy mountain"],
      answer: "Tropical hideaway",
      fact: "The show uses tropical birds, flowers, and tiki details to create an island-style setting.",
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
    {
      question: "What do guests ride in on Astro Orbiter?",
      choices: ["Rocket ships", "Teacups", "Log boats", "Honey pots"],
      answer: "Rocket ships",
      fact: "Astro Orbiter uses small rocket vehicles that circle high above Tomorrowland.",
    },
    {
      question: "Where is Astro Orbiter located?",
      choices: ["Tomorrowland", "Fantasyland", "Adventureland", "Frontierland"],
      answer: "Tomorrowland",
      fact: "Astro Orbiter fits Tomorrowland with its space-age rocket theme.",
    },
    {
      question: "What makes Astro Orbiter feel different from many spinner rides?",
      choices: ["It is elevated high above the land", "It goes underwater", "It moves through a dark mansion", "It has a big splash"],
      answer: "It is elevated high above the land",
      fact: "Astro Orbiter sits high above Tomorrowland, giving riders big views while they circle.",
    },
    {
      question: "What can riders control on Astro Orbiter?",
      choices: ["Moving the rocket higher or lower", "Changing the music", "Stopping the ride", "Choosing the track"],
      answer: "Moving the rocket higher or lower",
      fact: "Riders can adjust their rocket's height during the flight.",
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
    {
      question: "What do guests drive on Tomorrowland Speedway?",
      choices: ["Gas-powered race cars", "Pirate ships", "Rocket bikes", "Safari trucks"],
      answer: "Gas-powered race cars",
      fact: "Tomorrowland Speedway lets guests steer small race cars along a guided roadway.",
    },
    {
      question: "What helps keep Tomorrowland Speedway cars on course?",
      choices: ["A guide rail", "A boat rope", "A flying cable", "A train track"],
      answer: "A guide rail",
      fact: "The cars follow a guide rail, so younger drivers can steer while staying on the course.",
    },
    {
      question: "What is the main activity on Tomorrowland Speedway?",
      choices: ["Driving a car", "Watching a 3D movie", "Riding a boat", "Spinning in a cup"],
      answer: "Driving a car",
      fact: "The fun of Tomorrowland Speedway is getting to steer and drive around the track.",
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
    {
      question: "What do the monsters collect during Monsters Inc. Laugh Floor?",
      choices: ["Laughs", "Gems", "Pixie dust", "Rocket fuel"],
      answer: "Laughs",
      fact: "The show is built around collecting laughter to power the monster world.",
    },
    {
      question: "Which Monsters Inc. character is closely connected to the Laugh Floor?",
      choices: ["Mike Wazowski", "Buzz Lightyear", "Simba", "Peter Pan"],
      answer: "Mike Wazowski",
      fact: "Mike Wazowski helps lead the comedy-club style show.",
    },
    {
      question: "What kind of attraction is Monsters Inc. Laugh Floor?",
      choices: ["Interactive comedy show", "Roller coaster", "Boat ride", "Carousel"],
      answer: "Interactive comedy show",
      fact: "The show uses live-style jokes and audience interaction to make each performance feel different.",
    },
    {
      question: "What can sometimes happen to guests during the show?",
      choices: ["They may appear on screen", "They ride a rocket", "They drive a car", "They get soaked"],
      answer: "They may appear on screen",
      fact: "Monsters Inc. Laugh Floor often includes audience members in the jokes using cameras and screens.",
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
    {
      question: "What kind of performers star in Country Bear Musical Jamboree?",
      choices: ["Singing bears", "Flying elephants", "Space aliens", "Pirates"],
      answer: "Singing bears",
      fact: "Country Bear Musical Jamboree features Audio-Animatronic bears performing musical numbers.",
    },
    {
      question: "What kind of attraction is Country Bear Musical Jamboree?",
      choices: ["Seated musical show", "Water ride", "Dark coaster", "Shooting game"],
      answer: "Seated musical show",
      fact: "Guests sit in a theater while the bear performers sing and joke from the stage.",
    },
    {
      question: "What land is Country Bear Musical Jamboree located in?",
      choices: ["Frontierland", "Tomorrowland", "Fantasyland", "Adventureland"],
      answer: "Frontierland",
      fact: "The show fits Frontierland with its country music style and rustic theater setting.",
    },
    {
      question: "What makes the Country Bears unusual performers?",
      choices: ["They are Audio-Animatronics", "They are live animals", "They are puppets on strings", "They are holograms only"],
      answer: "They are Audio-Animatronics",
      fact: "The bears are Audio-Animatronic figures, a classic Disney way to bring characters to life on stage.",
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
    {
      question: "What does The Hall of Presidents focus on?",
      choices: ["United States presidents", "Pirates", "Space pilots", "Disney villains"],
      answer: "United States presidents",
      fact: "The attraction presents the history and office of the United States presidency.",
    },
    {
      question: "What kind of attraction is The Hall of Presidents?",
      choices: ["Seated theater show", "Roller coaster", "Spinner ride", "Water raft"],
      answer: "Seated theater show",
      fact: "Guests watch The Hall of Presidents from a theater, making it a calm indoor attraction.",
    },
    {
      question: "What type of figures appear on stage in The Hall of Presidents?",
      choices: ["Audio-Animatronics", "Cardboard cutouts", "Shadow puppets", "Toy cars"],
      answer: "Audio-Animatronics",
      fact: "The show uses Audio-Animatronic figures to represent U.S. presidents on stage.",
    },
    {
      question: "Where is The Hall of Presidents located?",
      choices: ["Liberty Square", "Tomorrowland", "Storybook Circus", "Adventureland"],
      answer: "Liberty Square",
      fact: "The Hall of Presidents is in Liberty Square, a land themed around American history.",
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
    {
      question: "What is the giant EPCOT icon that Spaceship Earth is inside?",
      choices: ["Geodesic sphere", "Castle tower", "Pirate fort", "Tree trunk"],
      answer: "Geodesic sphere",
      fact: "Spaceship Earth is housed inside EPCOT's giant geodesic sphere, one of the park's most recognizable icons.",
    },
    {
      question: "What big idea does Spaceship Earth explore?",
      choices: ["Human communication", "Car racing", "Toy battles", "Jungle exploration"],
      answer: "Human communication",
      fact: "Spaceship Earth follows how people have shared ideas through writing, printing, technology, and connection.",
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
    {
      question: "What Marvel team is featured in Cosmic Rewind?",
      choices: ["Guardians of the Galaxy", "The Avengers", "The X-Men", "Fantastic Four"],
      answer: "Guardians of the Galaxy",
      fact: "Cosmic Rewind centers on Star-Lord, Gamora, Rocket, Groot, and Drax from Guardians of the Galaxy.",
    },
    {
      question: "What kind of coaster is Cosmic Rewind known for?",
      choices: ["Indoor spinning coaster", "Outdoor wooden coaster", "Water flume", "Junior coaster"],
      answer: "Indoor spinning coaster",
      fact: "Cosmic Rewind uses rotating ride vehicles indoors to point guests toward story moments.",
    },
    {
      question: "Which raccoon-like Guardian appears in the ride story?",
      choices: ["Rocket", "Remy", "Figment", "Olaf"],
      answer: "Rocket",
      fact: "Rocket is one of the Guardians and helps bring the team's fast, funny energy to the attraction.",
    },
    {
      question: "What is Groot best known for saying?",
      choices: ["I am Groot", "To infinity and beyond", "Let it go", "Just keep swimming"],
      answer: "I am Groot",
      fact: "Groot's simple phrase is one of the most recognizable parts of the Guardians team.",
    },
    {
      question: "What setting does Cosmic Rewind mostly feel like?",
      choices: ["Outer space", "A frozen village", "A French kitchen", "A test road"],
      answer: "Outer space",
      fact: "The ride uses planets, stars, ships, and cosmic visuals to create a space adventure.",
    },
    {
      question: "What makes Cosmic Rewind different from a normal forward-facing coaster?",
      choices: ["The vehicles rotate", "Guests paddle boats", "Guests wear wings", "The track is underwater"],
      answer: "The vehicles rotate",
      fact: "The ride vehicles can turn to face scenes, making the coaster feel more like a moving story.",
    },
    {
      question: "What is the tone of Cosmic Rewind?",
      choices: ["Funny space adventure", "Quiet museum tour", "Scary haunted house", "Slow jungle cruise"],
      answer: "Funny space adventure",
      fact: "The Guardians are known for mixing action, music, and jokes during their space adventures.",
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
    {
      question: "What kind of mission does Mission: SPACE simulate?",
      choices: ["Space flight", "Pirate sailing", "Jungle cruising", "Car testing"],
      answer: "Space flight",
      fact: "Mission: SPACE is designed to make guests feel like they are part of a space-training mission.",
    },
    {
      question: "What role do guests pretend to have on Mission: SPACE?",
      choices: ["Crew members", "Jungle skippers", "Movie directors", "Toy collectors"],
      answer: "Crew members",
      fact: "The attraction gives guests a space-crew feeling as they prepare for launch and flight.",
    },
    {
      question: "What is the main theme of Mission: SPACE?",
      choices: ["Astronaut training", "Frozen music", "Cooking in Paris", "Mexican folklore"],
      answer: "Astronaut training",
      fact: "Mission: SPACE uses a training-center setup to make the space adventure feel like a real mission.",
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
    {
      question: "What is Test Track themed around?",
      choices: ["Vehicle testing", "Pirate treasure", "Haunted rooms", "Flying over countries"],
      answer: "Vehicle testing",
      fact: "Test Track is built around the idea of testing vehicle performance and road conditions.",
    },
    {
      question: "What kind of vehicle do guests ride in on Test Track?",
      choices: ["Test car", "Boat", "Rocket bike", "Mine cart"],
      answer: "Test car",
      fact: "Guests ride in car-style vehicles that move through different testing moments.",
    },
    {
      question: "What is one thing Test Track is known for near the end?",
      choices: ["A fast outdoor run", "A big water splash", "A backwards drop", "A spinning teacup"],
      answer: "A fast outdoor run",
      fact: "Test Track is known for a high-speed outdoor section that feels like a performance test.",
    },
    {
      question: "Which EPCOT area fits Test Track best?",
      choices: ["World Discovery", "World Showcase", "Fantasyland", "Adventureland"],
      answer: "World Discovery",
      fact: "Test Track fits EPCOT's discovery and innovation side because it focuses on cars, design, and motion.",
    },
    {
      question: "What type of ride experience is Test Track?",
      choices: ["Fast car-style ride", "Slow boat ride", "3D theater show", "Walking trail"],
      answer: "Fast car-style ride",
      fact: "Test Track combines indoor show scenes with a faster car-style ride experience.",
    },
    {
      question: "What do the ride scenes suggest the car is going through?",
      choices: ["Performance tests", "Cooking lessons", "Ghost tricks", "Safari tracking"],
      answer: "Performance tests",
      fact: "The attraction uses test-style scenes to make guests feel like the vehicle is being evaluated.",
    },
    {
      question: "What is the main thrill families remember from Test Track?",
      choices: ["Speed", "Singing birds", "Floating boats", "Carousel horses"],
      answer: "Speed",
      fact: "The faster portions of Test Track are the ride's most memorable thrill moments.",
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
    {
      question: "What kind of attraction is Soarin' Around the World?",
      choices: ["Flying theater", "Boat ride", "Car ride", "Dark coaster"],
      answer: "Flying theater",
      fact: "Soarin' lifts guests in front of a giant screen to create the feeling of hang gliding.",
    },
    {
      question: "What does Soarin' make guests feel like they are doing?",
      choices: ["Flying over landmarks", "Driving race cars", "Sailing with pirates", "Digging in a mine"],
      answer: "Flying over landmarks",
      fact: "Soarin' uses huge scenic footage to make guests feel like they are flying over famous places.",
    },
    {
      question: "What sense does Soarin' sometimes use besides sight and sound?",
      choices: ["Smell", "Taste", "Touch screens", "Snowballs"],
      answer: "Smell",
      fact: "Soarin' uses gentle scent effects in some scenes to make the flight feel more immersive.",
    },
    {
      question: "What do guests sit in during Soarin'?",
      choices: ["Glider-style seats", "Log boats", "Tea cups", "Mine trains"],
      answer: "Glider-style seats",
      fact: "The seats rise into position so guests feel like they are gliding through the air.",
    },
    {
      question: "What is the mood of Soarin' Around the World?",
      choices: ["Calm and awe-filled", "Spooky and dark", "Wild and splashy", "Loud comedy show"],
      answer: "Calm and awe-filled",
      fact: "Soarin' is more about scenic beauty and wonder than intense thrills.",
    },
    {
      question: "What kind of places does Soarin' show?",
      choices: ["World landmarks", "Haunted mansions", "Toy bedrooms", "Alien planets only"],
      answer: "World landmarks",
      fact: "The film takes guests over recognizable landscapes and landmarks from around the world.",
    },
    {
      question: "Which EPCOT theme does Soarin' fit well?",
      choices: ["Exploring the world", "Frontier mining", "Monster comedy", "Pirate battles"],
      answer: "Exploring the world",
      fact: "Soarin' matches EPCOT's spirit of travel, discovery, and seeing the world in a big way.",
    },
    {
      question: "What makes the screen on Soarin' feel so huge?",
      choices: ["It wraps around the riders' view", "It sits inside a tiny box", "It is only on the floor", "It is handheld"],
      answer: "It wraps around the riders' view",
      fact: "The large curved screen helps fill the riders' vision, making the flight feel bigger.",
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
    {
      question: "What kind of ride is Living with the Land?",
      choices: ["Boat ride", "Roller coaster", "Drop tower", "Spinning ride"],
      answer: "Boat ride",
      fact: "Living with the Land is a gentle boat ride through scenes about farming, nature, and greenhouses.",
    },
    {
      question: "What real growing area do guests pass through on Living with the Land?",
      choices: ["Greenhouses", "Mine tunnels", "Castle rooms", "Movie sets"],
      answer: "Greenhouses",
      fact: "The ride passes through working greenhouse areas where plants are grown using different techniques.",
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
    {
      question: "Which Pixar movie inspires The Seas with Nemo & Friends?",
      choices: ["Finding Nemo", "Cars", "Ratatouille", "Toy Story"],
      answer: "Finding Nemo",
      fact: "The attraction follows Nemo and friends from the world of Finding Nemo.",
    },
    {
      question: "What kind of ride vehicles do guests board on The Seas with Nemo & Friends?",
      choices: ["Clamobiles", "Rocket ships", "Mine carts", "Race cars"],
      answer: "Clamobiles",
      fact: "Guests ride in shell-shaped vehicles often called Clamobiles as they travel through the Nemo scenes.",
    },
    {
      question: "What kind of animals fit the theme of The Seas with Nemo & Friends?",
      choices: ["Ocean animals", "Farm animals", "Jungle cats", "Desert camels"],
      answer: "Ocean animals",
      fact: "The attraction connects Nemo's story to EPCOT's larger ocean and aquarium theme.",
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
    {
      question: "Which Disney character inspires Journey of Water?",
      choices: ["Moana", "Elsa", "Ariel", "Mulan"],
      answer: "Moana",
      fact: "Journey of Water is inspired by Moana and her connection to the ocean.",
    },
    {
      question: "What natural element is the main focus of Journey of Water?",
      choices: ["Water", "Fire", "Snow", "Lightning"],
      answer: "Water",
      fact: "The experience teaches how water moves, changes, and supports life in playful ways.",
    },
    {
      question: "What kind of experience is Journey of Water?",
      choices: ["Walk-through exploration trail", "Roller coaster", "Boat flume", "3D theater"],
      answer: "Walk-through exploration trail",
      fact: "Journey of Water is a walk-through experience where guests interact with water features at their own pace.",
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
    {
      question: "Which purple dragon stars in Journey into Imagination?",
      choices: ["Figment", "Spike", "Mushu", "Elliott"],
      answer: "Figment",
      fact: "Figment is EPCOT's playful purple dragon connected to imagination and creativity.",
    },
    {
      question: "What is the main idea of Journey into Imagination?",
      choices: ["Using imagination", "Testing cars", "Flying over Earth", "Cooking soup"],
      answer: "Using imagination",
      fact: "The ride is built around creativity, senses, and the fun of thinking differently.",
    },
    {
      question: "What kind of mood does Figment bring to the attraction?",
      choices: ["Silly and playful", "Scary and serious", "Quiet and formal", "Wild West"],
      answer: "Silly and playful",
      fact: "Figment adds humor and mischief as guests move through the imagination-themed scenes.",
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
    {
      question: "Where is Gran Fiesta Tour located in EPCOT?",
      choices: ["Mexico pavilion", "France pavilion", "Norway pavilion", "Canada pavilion"],
      answer: "Mexico pavilion",
      fact: "Gran Fiesta Tour is inside the Mexico pavilion in World Showcase.",
    },
    {
      question: "What kind of ride is Gran Fiesta Tour?",
      choices: ["Boat ride", "Coaster", "Flying theater", "Walking trail"],
      answer: "Boat ride",
      fact: "Gran Fiesta Tour is a gentle boat ride through colorful scenes inspired by Mexico and The Three Caballeros.",
    },
    {
      question: "Which classic Disney duck appears in Gran Fiesta Tour?",
      choices: ["Donald Duck", "Daisy Duck", "Scrooge McDuck", "Darkwing Duck"],
      answer: "Donald Duck",
      fact: "Donald Duck appears with José Carioca and Panchito as part of The Three Caballeros.",
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
    {
      question: "Which movie inspires Frozen Ever After?",
      choices: ["Frozen", "Moana", "Tangled", "Brave"],
      answer: "Frozen",
      fact: "Frozen Ever After brings guests into the world of Anna, Elsa, Olaf, and Arendelle.",
    },
    {
      question: "What kind of ride is Frozen Ever After?",
      choices: ["Boat ride", "Roller coaster", "Flying theater", "Car ride"],
      answer: "Boat ride",
      fact: "Frozen Ever After is a boat ride through musical scenes inspired by Frozen.",
    },
    {
      question: "Which snowman appears in Frozen Ever After?",
      choices: ["Olaf", "Frosty", "Sven", "Marshmallow"],
      answer: "Olaf",
      fact: "Olaf appears in the ride and brings the same cheerful energy he has in the Frozen films.",
    },
    {
      question: "Which character has ice powers in Frozen?",
      choices: ["Elsa", "Anna", "Kristoff", "Sven"],
      answer: "Elsa",
      fact: "Elsa's ice powers are a major part of the story and the ride's snowy visuals.",
    },
    {
      question: "What kingdom is central to Frozen Ever After?",
      choices: ["Arendelle", "Agrabah", "Atlantica", "Corona"],
      answer: "Arendelle",
      fact: "Frozen Ever After is set in and around Arendelle, the kingdom from Frozen.",
    },
    {
      question: "What kind of music moment does Frozen Ever After include?",
      choices: ["Songs from Frozen", "Pirate sea shanties", "Country bear songs", "Space techno only"],
      answer: "Songs from Frozen",
      fact: "The attraction uses familiar Frozen music to make the ride feel like stepping into the movie.",
    },
    {
      question: "Which animal is Kristoff's loyal friend?",
      choices: ["Sven", "Rajah", "Maximus", "Pua"],
      answer: "Sven",
      fact: "Sven is Kristoff's reindeer friend and is part of the Frozen world guests recognize.",
    },
    {
      question: "What should riders expect on Frozen Ever After?",
      choices: ["Gentle boat movement with a small thrill", "A looping coaster", "A driving test", "A walk-through trail"],
      answer: "Gentle boat movement with a small thrill",
      fact: "Frozen Ever After is mostly gentle, with a few fun boat-ride surprises.",
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
    {
      question: "What size are guests meant to feel on Remy's Ratatouille Adventure?",
      choices: ["Rat-sized", "Giant-sized", "Toy-sized", "Dragon-sized"],
      answer: "Rat-sized",
      fact: "The ride makes guests feel tiny, like they are scurrying through Gusteau's restaurant with Remy.",
    },
    {
      question: "Which Pixar movie inspires Remy's Ratatouille Adventure?",
      choices: ["Ratatouille", "Cars", "Up", "Inside Out"],
      answer: "Ratatouille",
      fact: "The attraction is based on Ratatouille, the Pixar movie about Remy the rat who loves cooking.",
    },
    {
      question: "Where does Remy's Ratatouille Adventure take place?",
      choices: ["A Paris restaurant", "A jungle temple", "A space station", "A haunted hotel"],
      answer: "A Paris restaurant",
      fact: "The ride is set around Gusteau's restaurant and the Paris world of Ratatouille.",
    },
    {
      question: "What kind of animal is Remy?",
      choices: ["Rat", "Mouse", "Rabbit", "Raccoon"],
      answer: "Rat",
      fact: "Remy is a rat with a passion for cooking, which makes the story playful and unexpected.",
    },
    {
      question: "What kind of ride system does Remy's Ratatouille Adventure use?",
      choices: ["Trackless vehicles", "Hanging pirate ships", "Log boats", "Carousel horses"],
      answer: "Trackless vehicles",
      fact: "The ride vehicles move without a visible track, helping them scurry in surprising directions.",
    },
    {
      question: "What sense is important to Remy's story?",
      choices: ["Taste", "Flying", "Treasure hunting", "Car racing"],
      answer: "Taste",
      fact: "Ratatouille is centered around cooking, flavor, and Remy's talent for food.",
    },
    {
      question: "What country pavilion area is Remy's ride connected to?",
      choices: ["France", "Norway", "Mexico", "Canada"],
      answer: "France",
      fact: "Remy's Ratatouille Adventure is located in the France area of EPCOT's World Showcase.",
    },
    {
      question: "What is the ride's main feeling?",
      choices: ["A chaotic kitchen chase", "A calm museum walk", "A haunted ghost tour", "A slow train commute"],
      answer: "A chaotic kitchen chase",
      fact: "The attraction makes guests feel like they are darting through a busy restaurant and kitchen.",
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
    {
      question: "What classic Disney character duo stars in Runaway Railway?",
      choices: ["Mickey and Minnie", "Woody and Jessie", "Anna and Elsa", "Simba and Nala"],
      answer: "Mickey and Minnie",
      fact: "Mickey & Minnie's Runaway Railway puts guests inside a cartoon adventure with Mickey and Minnie.",
    },
    {
      question: "What kind of vehicles carry guests through Runaway Railway?",
      choices: ["Trackless train cars", "Pirate ships", "Log boats", "Carousel horses"],
      answer: "Trackless train cars",
      fact: "Runaway Railway uses trackless ride vehicles that can move through scenes in surprising ways.",
    },
    {
      question: "Which character drives the train at the beginning of the adventure?",
      choices: ["Goofy", "Donald", "Pluto", "Pete"],
      answer: "Goofy",
      fact: "Goofy is the train engineer, and his train helps launch the runaway cartoon adventure.",
    },
    {
      question: "What style does Runaway Railway feel like?",
      choices: ["Mickey cartoon short", "Space documentary", "Old West mine story", "Jungle expedition"],
      answer: "Mickey cartoon short",
      fact: "The attraction is designed to feel like stepping inside a modern Mickey Mouse cartoon.",
    },
    {
      question: "What happens to the train during Runaway Railway?",
      choices: ["It becomes part of a wild cartoon adventure", "It turns into a boat", "It leaves Earth", "It becomes a carousel"],
      answer: "It becomes part of a wild cartoon adventure",
      fact: "The ride turns a simple train trip into a silly cartoon journey through changing scenes.",
    },
    {
      question: "Which theater building is Runaway Railway inside?",
      choices: ["Chinese Theatre", "Tiki Room", "Hall of Presidents", "Country Bear Theater"],
      answer: "Chinese Theatre",
      fact: "At Hollywood Studios, Runaway Railway is housed inside the park's Chinese Theatre building.",
    },
    {
      question: "What makes the ride scenes feel cartoon-like?",
      choices: ["Bright animation-style effects", "Real jungle animals", "Historic speeches", "Live car racing"],
      answer: "Bright animation-style effects",
      fact: "The attraction uses colorful visuals, projection effects, and physical sets to create a cartoon world.",
    },
    {
      question: "What is the overall mood of Runaway Railway?",
      choices: ["Silly and playful", "Spooky and serious", "Calm and formal", "Dark and scary"],
      answer: "Silly and playful",
      fact: "Runaway Railway is built around goofy surprises, music, and cartoon-style fun.",
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
    {
      question: "What kind of building is Tower of Terror themed as?",
      choices: ["Old Hollywood hotel", "Space station", "Toy factory", "Pirate fort"],
      answer: "Old Hollywood hotel",
      fact: "Tower of Terror is themed as the mysterious Hollywood Tower Hotel.",
    },
    {
      question: "What type of thrill is Tower of Terror known for?",
      choices: ["Elevator-style drops", "Water splashes", "Spinning teacups", "Target shooting"],
      answer: "Elevator-style drops",
      fact: "The ride is famous for its unpredictable drop sequence inside a haunted hotel setting.",
    },
    {
      question: "What classic TV series inspires Tower of Terror?",
      choices: ["The Twilight Zone", "The Muppet Show", "DuckTales", "Winnie the Pooh"],
      answer: "The Twilight Zone",
      fact: "The attraction uses the eerie storytelling style of The Twilight Zone.",
    },
    {
      question: "What part of the hotel do guests board as their ride vehicle?",
      choices: ["Service elevator", "Laundry cart", "Tour bus", "Dining booth"],
      answer: "Service elevator",
      fact: "The ride vehicle is themed as a service elevator that travels through the mysterious hotel.",
    },
    {
      question: "What is the mood of Tower of Terror?",
      choices: ["Spooky mystery", "Sunny beach day", "Silly tea party", "Farm tour"],
      answer: "Spooky mystery",
      fact: "Tower of Terror mixes old Hollywood glamour with eerie supernatural storytelling.",
    },
    {
      question: "What happens before the big drops on Tower of Terror?",
      choices: ["Guests move through mysterious hotel scenes", "Guests race outside", "Guests float through a garden", "Guests steer cars"],
      answer: "Guests move through mysterious hotel scenes",
      fact: "The attraction builds suspense with story scenes before the elevator drop sequence begins.",
    },
    {
      question: "What land area is Tower of Terror associated with?",
      choices: ["Sunset Boulevard", "Toy Story Land", "Galaxy's Edge", "Animation Courtyard"],
      answer: "Sunset Boulevard",
      fact: "Tower of Terror stands at the end of Sunset Boulevard, making it one of the park's biggest icons.",
    },
    {
      question: "What makes Tower of Terror feel different on repeat rides?",
      choices: ["The drop sequence can vary", "The building moves outside", "The seats spin freely", "The track turns into water"],
      answer: "The drop sequence can vary",
      fact: "The attraction can use different drop patterns, so the timing may feel surprising.",
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
    {
      question: "What kind of ride is Rock 'n' Roller Coaster?",
      choices: ["Indoor launched coaster", "Boat ride", "Walking trail", "Flying theater"],
      answer: "Indoor launched coaster",
      fact: "Rock 'n' Roller Coaster is known for launching riders quickly into an indoor coaster experience.",
    },
    {
      question: "What entertainment style fits Rock 'n' Roller Coaster best?",
      choices: ["Rock concert energy", "Quiet museum tour", "Jungle river jokes", "Fairytale boat ride"],
      answer: "Rock concert energy",
      fact: "The ride's identity is built around loud music, lights, and backstage-show excitement.",
    },
    {
      question: "Which character group is named in this ride entry?",
      choices: ["The Muppets", "The Seven Dwarfs", "The Guardians", "The Three Caballeros"],
      answer: "The Muppets",
      fact: "This app entry treats the attraction as a Muppets-themed rock-and-roll coaster experience.",
    },
    {
      question: "What kind of start is Rock 'n' Roller Coaster famous for?",
      choices: ["Fast launch", "Slow boat drift", "Gentle carousel spin", "Walking start"],
      answer: "Fast launch",
      fact: "The coaster launch is one of the ride's biggest thrill moments.",
    },
    {
      question: "What does the indoor setting allow the ride to use heavily?",
      choices: ["Lights and music", "Real rainstorms", "Live animals", "Outdoor fireworks only"],
      answer: "Lights and music",
      fact: "An indoor coaster can use darkness, lighting, signs, and music to shape the whole experience.",
    },
    {
      question: "What kind of vehicle feeling does the coaster use?",
      choices: ["Stretch-limo style ride vehicle", "Safari truck", "Pirate ship", "Flying carpet"],
      answer: "Stretch-limo style ride vehicle",
      fact: "Rock 'n' Roller Coaster has traditionally used a limo-style ride vehicle to match the backstage concert story.",
    },
    {
      question: "What is the main thrill combination on Rock 'n' Roller Coaster?",
      choices: ["Speed, darkness, and music", "Water, animals, and boats", "Slow scenes and narration", "Gentle spinning and tea cups"],
      answer: "Speed, darkness, and music",
      fact: "The attraction mixes a fast coaster with a dark indoor setting and high-energy music.",
    },
    {
      question: "What makes a Muppets rock coaster idea feel playful?",
      choices: ["Music mixed with comedy", "Silent history lessons", "Serious car testing", "Quiet nature trails"],
      answer: "Music mixed with comedy",
      fact: "The Muppets are known for comedy and show business, which fits a playful concert-style coaster.",
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
    {
      question: "Which Toy Story character is the ride vehicle based on?",
      choices: ["Slinky Dog", "Buzz Lightyear", "Rex", "Hamm"],
      answer: "Slinky Dog",
      fact: "The coaster train is styled like Slinky Dog stretching along the track.",
    },
    {
      question: "What land is Slinky Dog Dash located in?",
      choices: ["Toy Story Land", "Galaxy's Edge", "Sunset Boulevard", "Animation Courtyard"],
      answer: "Toy Story Land",
      fact: "Slinky Dog Dash is one of the main attractions in Toy Story Land.",
    },
    {
      question: "What kind of ride is Slinky Dog Dash?",
      choices: ["Family coaster", "Drop tower", "Boat ride", "3D shooting game"],
      answer: "Family coaster",
      fact: "Slinky Dog Dash is a family coaster with playful hills, turns, and Toy Story theming.",
    },
    {
      question: "What perspective does Toy Story Land use?",
      choices: ["Guests feel toy-sized", "Guests feel giant-sized", "Guests feel underwater", "Guests feel invisible"],
      answer: "Guests feel toy-sized",
      fact: "Toy Story Land is designed so guests feel like they have shrunk down into Andy's backyard.",
    },
    {
      question: "What toy-like material appears throughout the Slinky Dog Dash area?",
      choices: ["Building blocks and toy pieces", "Pirate treasure", "Ancient stone", "Haunted portraits"],
      answer: "Building blocks and toy pieces",
      fact: "The ride area uses oversized toys and playful backyard details to support the Toy Story theme.",
    },
    {
      question: "What makes Slinky Dog Dash feel like something Andy built?",
      choices: ["Toy-style coaster pieces", "A haunted elevator", "A space launch bay", "A jungle dock"],
      answer: "Toy-style coaster pieces",
      fact: "Slinky Dog Dash is themed like a backyard coaster assembled from toys and play pieces.",
    },
    {
      question: "What is the mood of Slinky Dog Dash?",
      choices: ["Playful and bouncy", "Spooky and haunted", "Formal and historic", "Dark and serious"],
      answer: "Playful and bouncy",
      fact: "The coaster is designed to feel cheerful, colorful, and fun for families.",
    },
    {
      question: "What makes Slinky Dog Dash a good Toy Story ride?",
      choices: ["It feels like a toy coaster in a backyard", "It feels like a haunted hotel", "It feels like a space museum", "It feels like a jungle boat"],
      answer: "It feels like a toy coaster in a backyard",
      fact: "The attraction combines coaster thrills with oversized toy scenery to match Toy Story Land.",
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
    {
      question: "What kind of game does Toy Story Mania! feel like?",
      choices: ["A 3D carnival midway game", "A haunted elevator ride", "A jungle boat tour", "A space coaster"],
      answer: "A 3D carnival midway game",
      fact: "Toy Story Mania! turns classic midway-style games into an interactive Toy Story attraction.",
    },
    {
      question: "What do guests use to play Toy Story Mania!?",
      choices: ["A pull-string shooter", "A steering wheel", "A magic wand", "A paintbrush"],
      answer: "A pull-string shooter",
      fact: "Guests aim and pull a string to launch virtual objects at targets during the games.",
    },
    {
      question: "Which Toy Story character is closely tied to the ride's carnival game theme?",
      choices: ["Mr. Potato Head", "Kylo Ren", "Figment", "Goofy"],
      answer: "Mr. Potato Head",
      fact: "Mr. Potato Head appears in the attraction's playful midway setting and helps sell the carnival-game feel.",
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
    {
      question: "Which Toy Story characters are featured on Alien Swirling Saucers?",
      choices: ["The little green aliens", "The Green Army Men", "Bo Peep's sheep", "Sid's toys"],
      answer: "The little green aliens",
      fact: "The ride is themed around the claw-loving green aliens from Toy Story.",
    },
    {
      question: "What kind of motion does Alien Swirling Saucers use?",
      choices: ["Whipping and spinning", "Straight vertical drops", "Slow boat floating", "High-speed launching"],
      answer: "Whipping and spinning",
      fact: "The saucers move in a swirling pattern that gently whips trailers around curves.",
    },
    {
      question: "What toy-inspired setting does Alien Swirling Saucers belong to?",
      choices: ["Toy Story Land", "Galaxy's Edge", "Sunset Boulevard", "Echo Lake"],
      answer: "Toy Story Land",
      fact: "Alien Swirling Saucers fits Toy Story Land's idea that guests have shrunk down into a toy-filled backyard.",
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
    {
      question: "Which side are guests trying to help on Rise of the Resistance?",
      choices: ["The Resistance", "The First Order", "The Empire", "The Trade Federation"],
      answer: "The Resistance",
      fact: "The attraction puts guests into a Resistance mission before the First Order interrupts the plan.",
    },
    {
      question: "Which enemy force captures guests during the story?",
      choices: ["The First Order", "The Rebel Alliance", "The Resistance", "The Ewoks"],
      answer: "The First Order",
      fact: "A major story turn happens when guests are taken aboard a First Order Star Destroyer.",
    },
    {
      question: "What huge ship do guests appear to enter during Rise of the Resistance?",
      choices: ["A Star Destroyer", "The Millennium Falcon", "A pirate galleon", "A jungle steamboat"],
      answer: "A Star Destroyer",
      fact: "The Star Destroyer scene helps make the attraction feel much larger than a normal ride queue.",
    },
    {
      question: "Which Star Wars villain appears as a major threat in the attraction?",
      choices: ["Kylo Ren", "Darth Maul", "Jabba the Hutt", "Boba Fett"],
      answer: "Kylo Ren",
      fact: "Kylo Ren appears during the escape, adding danger and urgency to the Resistance mission.",
    },
    {
      question: "What kind of vehicles carry guests through the main escape scenes?",
      choices: ["Trackless transports", "Flying carpets", "Safari trucks", "Carousel horses"],
      answer: "Trackless transports",
      fact: "Trackless vehicles can move through the Star Destroyer scenes without following a visible rail.",
    },
    {
      question: "What large walking machines can guests see inside the attraction?",
      choices: ["AT-AT walkers", "Podracers", "Speeder bikes", "Droid carts"],
      answer: "AT-AT walkers",
      fact: "The AT-AT scene is one of the attraction's biggest visual moments.",
    },
    {
      question: "What makes Rise of the Resistance feel different from a simple dark ride?",
      choices: ["It uses several story and ride moments", "It only circles one small room", "It has no characters", "It is only a theater show"],
      answer: "It uses several story and ride moments",
      fact: "The attraction blends queue scenes, story rooms, ride vehicles, and big effects into one long adventure.",
    },
    {
      question: "What is the overall feeling Rise of the Resistance is trying to create?",
      choices: ["Being inside a Star Wars escape mission", "Taking a calm boat tour", "Playing in a toy backyard", "Watching a history lesson"],
      answer: "Being inside a Star Wars escape mission",
      fact: "The ride is designed to make guests feel like they have stepped into the middle of a Star Wars battle.",
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
    {
      question: "What famous ship do guests step inside on Smugglers Run?",
      choices: ["The Millennium Falcon", "A Star Destroyer", "An X-wing", "A Naboo submarine"],
      answer: "The Millennium Falcon",
      fact: "Smugglers Run lets guests board the Millennium Falcon and sit inside its cockpit.",
    },
    {
      question: "Which character recruits guests for the Smugglers Run mission?",
      choices: ["Hondo Ohnaka", "Kylo Ren", "Yoda", "Chewbacca"],
      answer: "Hondo Ohnaka",
      fact: "Hondo Ohnaka sends crews on a smuggling job aboard the Falcon.",
    },
    {
      question: "Which of these is one of the crew roles on Smugglers Run?",
      choices: ["Pilot", "Painter", "Chef", "Lifeguard"],
      answer: "Pilot",
      fact: "Guests are assigned roles such as pilot, gunner, or engineer during the mission.",
    },
    {
      question: "What do the gunners help do during the ride?",
      choices: ["Fire at targets", "Steer the elevator", "Serve snacks", "Choose the music"],
      answer: "Fire at targets",
      fact: "The gunner role helps defend the Falcon during the interactive mission.",
    },
    {
      question: "What do engineers help manage during the mission?",
      choices: ["Ship repairs", "Hotel check-in", "Toy assembly", "Jungle animals"],
      answer: "Ship repairs",
      fact: "Engineers press controls to help keep the Falcon working during the rough flight.",
    },
    {
      question: "What makes Smugglers Run different from a normal movie-style ride?",
      choices: ["The crew can press controls", "Guests ride in silence", "There are no screens", "Everyone walks the whole time"],
      answer: "The crew can press controls",
      fact: "The attraction gives riders jobs so the cockpit feels like a working ship.",
    },
    {
      question: "Where is Smugglers Run located in Hollywood Studios?",
      choices: ["Star Wars: Galaxy's Edge", "Toy Story Land", "Sunset Boulevard", "Animation Courtyard"],
      answer: "Star Wars: Galaxy's Edge",
      fact: "Smugglers Run is one of the main attractions inside Star Wars: Galaxy's Edge.",
    },
    {
      question: "What is the main goal on Smugglers Run?",
      choices: ["Complete a mission as a Falcon crew", "Escape a haunted hotel", "Race a toy dog", "Tour a movie theater"],
      answer: "Complete a mission as a Falcon crew",
      fact: "The ride works best when the cockpit crew works together to finish Hondo's job.",
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
    {
      question: "What kind of attraction is Star Tours?",
      choices: ["Motion simulator", "Outdoor coaster", "Boat ride", "Carousel"],
      answer: "Motion simulator",
      fact: "Star Tours uses a simulator cabin to make guests feel like they are flying through Star Wars scenes.",
    },
    {
      question: "Which droid is known for piloting guests on Star Tours?",
      choices: ["C-3PO", "BB-8", "R2-D2 only", "K-2SO"],
      answer: "C-3PO",
      fact: "C-3PO often ends up in the pilot role, which adds humor to the chaotic Star Tours flight.",
    },
    {
      question: "What makes Star Tours different on repeat rides?",
      choices: ["It can use different scene combinations", "It always has the exact same route", "Guests walk instead of ride", "It has no Star Wars characters"],
      answer: "It can use different scene combinations",
      fact: "Star Tours can mix different planets, characters, and scenes, so repeat rides may feel different.",
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


const ANIMAL_KINGDOM_TRIVIA_BY_RIDE = {
  "Avatar Flight of Passage": [
    {
      question: "On Avatar Flight of Passage, what creature are you linking with?",
      choices: ["A banshee", "A dragon", "A direhorse", "A giant bird"],
      answer: "A banshee",
      fact:
        "The whole ride is built around the idea that you are linking to an avatar and flying on the back of a mountain banshee.",
    },
    {
      question: "Flight of Passage is best described as what kind of attraction?",
      choices: ["A flying simulator", "A boat ride", "A drop tower", "A spinning coaster"],
      answer: "A flying simulator",
      fact:
        "It combines motion, wind, scent, screen scale, and breathing effects to make the banshee feel alive.",
    },
    {
      question: "What detail can riders often feel from the banshee during the ride?",
      choices: ["Breathing", "Purring", "Sneezing", "Singing"],
      answer: "Breathing",
      fact:
        "The ride vehicle helps create the feeling that the banshee is breathing beneath you. It is one of the coolest small touches in the attraction.",
    },
    {
      question: "What alien world is Avatar Flight of Passage set on?",
      choices: ["Pandora", "Tatooine", "Arendelle", "Neverland"],
      answer: "Pandora",
      fact: "Flight of Passage is set in Pandora, the moon from the Avatar story world.",
    },
    {
      question: "What is the ride meant to feel like guests are doing?",
      choices: ["Flying on a banshee", "Driving a race car", "Sailing a pirate ship", "Riding a mine train"],
      answer: "Flying on a banshee",
      fact: "The attraction uses motion, wind, and huge visuals to create the feeling of flying over Pandora.",
    },
    {
      question: "What kind of scenery do riders fly over on Flight of Passage?",
      choices: ["Pandora's mountains and oceans", "A haunted hotel", "A toy backyard", "A snowy village"],
      answer: "Pandora's mountains and oceans",
      fact: "The ride takes guests over dramatic Pandora landscapes like cliffs, forests, caves, and water.",
    },
    {
      question: "What does the ride's link chair help guests imagine?",
      choices: ["Connecting to an avatar", "Boarding a safari truck", "Launching into space", "Entering a castle"],
      answer: "Connecting to an avatar",
      fact: "The story says guests link with an avatar so they can experience flying on a banshee.",
    },
    {
      question: "What makes Flight of Passage feel more realistic?",
      choices: ["Motion, wind, and sensory effects", "Only a still picture", "A silent room", "A flat map"],
      answer: "Motion, wind, and sensory effects",
      fact: "The attraction combines movement, wind, sound, and visuals to make the flight feel alive.",
    },
    {
      question: "What is the overall mood of Avatar Flight of Passage?",
      choices: ["Soaring and adventurous", "Spooky and haunted", "Silly and tiny", "Quiet and formal"],
      answer: "Soaring and adventurous",
      fact: "Flight of Passage is designed to feel like a big, emotional flight through Pandora.",
    },
    {
      question: "Which land is Avatar Flight of Passage located in?",
      choices: ["Pandora - The World of Avatar", "Africa", "Asia", "DinoLand U.S.A."],
      answer: "Pandora - The World of Avatar",
      fact: "Flight of Passage is the major thrill attraction inside Pandora - The World of Avatar.",
    },
  ],

  "Na'vi River Journey": [
    {
      question: "Na'vi River Journey takes place in what kind of environment?",
      choices: ["A glowing bioluminescent rainforest", "A desert canyon", "A frozen cave", "A spaceport"],
      answer: "A glowing bioluminescent rainforest",
      fact:
        "The ride is all about atmosphere: glowing plants, music, creatures, and the feeling of drifting through Pandora at night.",
    },
    {
      question: "What is the famous Audio-Animatronic near the end called?",
      choices: ["The Shaman of Songs", "The Forest Queen", "The River Spirit", "The Banshee Keeper"],
      answer: "The Shaman of Songs",
      fact:
        "The Shaman of Songs is known for extremely fluid facial and hand movement.",
    },
    {
      question: "What kind of ride vehicle is used on Na'vi River Journey?",
      choices: ["A boat", "A coaster train", "A safari truck", "A spinning saucer"],
      answer: "A boat",
      fact: "Na'vi River Journey is a gentle boat ride through Pandora's glowing rainforest.",
    },
    {
      question: "What makes the forest on Na'vi River Journey look magical?",
      choices: ["Bioluminescent plants", "Neon road signs", "Snow machines", "Fireworks only"],
      answer: "Bioluminescent plants",
      fact: "The ride uses glowing plants and colorful lighting to create Pandora's nighttime rainforest feel.",
    },
    {
      question: "Which culture is featured throughout Na'vi River Journey?",
      choices: ["The Na'vi", "The pirates", "The toys", "The Muppets"],
      answer: "The Na'vi",
      fact: "The attraction focuses on the Na'vi people and the natural world of Pandora.",
    },
    {
      question: "What is the pace of Na'vi River Journey?",
      choices: ["Slow and gentle", "Fast and looping", "Bumpy and wild", "Straight down"],
      answer: "Slow and gentle",
      fact: "Na'vi River Journey is a calm boat ride, making it a softer Pandora experience than Flight of Passage.",
    },
    {
      question: "What can guests hear during Na'vi River Journey?",
      choices: ["Pandora music and nature sounds", "Race car engines", "Elevator bells", "Carnival buzzers"],
      answer: "Pandora music and nature sounds",
      fact: "Music, water sounds, and creature noises help make the rainforest feel alive.",
    },
    {
      question: "What does the Shaman of Songs do near the end of the ride?",
      choices: ["Sings", "Drives a truck", "Launches a coaster", "Runs a game booth"],
      answer: "Sings",
      fact: "The Shaman of Songs is known for her detailed movement and musical performance.",
    },
    {
      question: "What is Na'vi River Journey best for families wanting?",
      choices: ["A calm scenic ride", "A huge drop", "A spinning challenge", "A loud coaster launch"],
      answer: "A calm scenic ride",
      fact: "The attraction is a peaceful way to experience Pandora without a thrill-ride feel.",
    },
    {
      question: "Which Animal Kingdom land is Na'vi River Journey in?",
      choices: ["Pandora - The World of Avatar", "Asia", "Africa", "Discovery Island"],
      answer: "Pandora - The World of Avatar",
      fact: "Na'vi River Journey is located in Pandora near Avatar Flight of Passage.",
    },
  ],

  "Kilimanjaro Safaris": [
    {
      question: "Kilimanjaro Safaris is designed to feel like what?",
      choices: ["A wildlife reserve", "A roller coaster", "A zoo tram only", "A jungle cruise with jokes"],
      answer: "A wildlife reserve",
      fact:
        "The attraction covers a massive area and is built to feel like a living animal reserve rather than a normal ride.",
    },
    {
      question: "When are animals often more active?",
      choices: ["Morning or later day", "Only at noon", "Only during fireworks", "Only after closing"],
      answer: "Morning or later day",
      fact:
        "Heat matters. Animals may be more active in the morning, later in the day, or after rain.",
    },
    {
      question: "What should families remember about every safari ride?",
      choices: ["It can be different each time", "It is always exactly the same", "There are no real animals", "It is indoors"],
      answer: "It can be different each time",
      fact:
        "Because the animals are real, each safari can feel different depending on weather, time, and animal behavior.",
    },
    {
      question: "What kind of vehicle do guests ride on Kilimanjaro Safaris?",
      choices: ["Safari truck", "Boat", "Train coaster", "Flying banshee"],
      answer: "Safari truck",
      fact: "Kilimanjaro Safaris uses open-air safari trucks to take guests through animal habitats.",
    },
    {
      question: "What Animal Kingdom land is Kilimanjaro Safaris located in?",
      choices: ["Africa", "Asia", "Pandora", "Discovery Island"],
      answer: "Africa",
      fact: "Kilimanjaro Safaris is located in the Africa section of Disney's Animal Kingdom.",
    },
    {
      question: "Why can Kilimanjaro Safaris feel different each time?",
      choices: ["The animals may be in different places", "The track changes every day", "The trucks become boats", "The ride has no animals"],
      answer: "The animals may be in different places",
      fact: "Because the animals are living creatures, each safari can have different sightings and moments.",
    },
    {
      question: "Which large animal might families see on Kilimanjaro Safaris?",
      choices: ["Giraffe", "Polar bear", "Kangaroo", "Penguin"],
      answer: "Giraffe",
      fact: "Giraffes are among the animals guests may spot while riding through the savanna areas.",
    },
    {
      question: "What type of habitat does part of Kilimanjaro Safaris recreate?",
      choices: ["African savanna", "Arctic tundra", "Toy backyard", "Haunted mansion"],
      answer: "African savanna",
      fact: "The safari includes wide savanna-style spaces designed for animals like giraffes, antelope, and rhinos.",
    },
    {
      question: "What should riders do to enjoy Kilimanjaro Safaris most?",
      choices: ["Look around carefully", "Keep eyes closed", "Only watch the floor", "Ignore the guide"],
      answer: "Look around carefully",
      fact: "Animal sightings can happen on either side of the truck, so looking around helps families spot more.",
    },
    {
      question: "What makes Kilimanjaro Safaris a good family attraction?",
      choices: ["Real animals and a guided ride", "A high-speed launch", "A haunted drop", "A spinning carnival game"],
      answer: "Real animals and a guided ride",
      fact: "The ride mixes animal viewing with a guided safari story that families can enjoy together.",
    },
  ],

  "Festival of the Lion King": [
    {
      question: "Festival of the Lion King is best described as what?",
      choices: ["A live musical celebration", "A boat ride", "A coaster", "A 3D movie"],
      answer: "A live musical celebration",
      fact:
        "It blends music, acrobatics, costumes, puppetry, and audience energy into one of Animal Kingdom’s best reset shows.",
    },
    {
      question: "Why is Festival of the Lion King so valuable on a hot Animal Kingdom day?",
      choices: ["Seats and AC", "It sprays everyone", "It exits straight to the hotel", "It has no music"],
      answer: "Seats and AC",
      fact:
        "Sometimes the smartest family move is sitting down in air conditioning before everyone melts.",
    },
    {
      question: "Which Disney movie inspires Festival of the Lion King?",
      choices: ["The Lion King", "Finding Nemo", "Zootopia", "Moana"],
      answer: "The Lion King",
      fact: "Festival of the Lion King uses music, characters, and energy from The Lion King.",
    },
    {
      question: "What kind of entertainment is Festival of the Lion King?",
      choices: ["Live stage show", "Roller coaster", "River raft ride", "Animal trail"],
      answer: "Live stage show",
      fact: "The show combines live performers, music, puppetry, and colorful staging.",
    },
    {
      question: "Why can Festival of the Lion King be a smart family break?",
      choices: ["It is seated and indoors", "It requires running", "It has no shade", "It is a long outdoor trail"],
      answer: "It is seated and indoors",
      fact: "The indoor theater gives families a chance to sit, cool off, and still enjoy a major Animal Kingdom experience.",
    },
  ],

  "Expedition Everest - Legend of the Forbidden Mountain": [
    {
      question: "Expedition Everest is themed around which legendary creature?",
      choices: ["The Yeti", "Bigfoot", "A dragon", "A kraken"],
      answer: "The Yeti",
      fact:
        "The whole story is that your expedition enters a forbidden mountain protected by the Yeti.",
    },
    {
      question: "What surprise does Everest include?",
      choices: ["A backward section", "A water splash", "A spinning teacup section", "A 3D glasses scene"],
      answer: "A backward section",
      fact:
        "The backward section is one reason Everest feels more intense than a standard family coaster.",
    },
    {
      question: "Everest is located in which Animal Kingdom area?",
      choices: ["Asia", "Africa", "Pandora", "Oasis"],
      answer: "Asia",
      fact:
        "Asia is one of Animal Kingdom’s most walking-heavy areas, so nearby timing matters.",
    },
    {
      question: "What kind of ride is Expedition Everest?",
      choices: ["Roller coaster", "Boat ride", "Safari truck tour", "Motion simulator"],
      answer: "Roller coaster",
      fact: "Expedition Everest is Animal Kingdom's large outdoor roller coaster.",
    },
    {
      question: "Which Animal Kingdom land is Expedition Everest located in?",
      choices: ["Asia", "Africa", "Pandora", "Discovery Island"],
      answer: "Asia",
      fact: "Expedition Everest stands in the Asia section of Disney's Animal Kingdom.",
    },
    {
      question: "What mountain is the ride themed around?",
      choices: ["Everest", "Space Mountain", "Big Thunder", "Mount Olympus"],
      answer: "Everest",
      fact: "The attraction uses the legend and look of Mount Everest as the center of its story.",
    },
    {
      question: "What happens to the track during the ride story?",
      choices: ["It appears broken", "It turns into water", "It becomes a road", "It disappears into space"],
      answer: "It appears broken",
      fact: "A broken track scene is one of the ride's signature story moments before the train changes direction.",
    },
    {
      question: "What unusual coaster movement is Expedition Everest known for?",
      choices: ["Going backward", "Floating slowly", "Spinning in circles only", "Stopping forever"],
      answer: "Going backward",
      fact: "The coaster includes a backward section that adds surprise to the mountain adventure.",
    },
    {
      question: "What is the overall mood of Expedition Everest?",
      choices: ["Mysterious mountain adventure", "Gentle garden tour", "Toy carnival game", "Peaceful river cruise"],
      answer: "Mysterious mountain adventure",
      fact: "The attraction combines a mountain expedition story with the legend of the Yeti.",
    },
    {
      question: "What can guests see from parts of Expedition Everest?",
      choices: ["Wide views of Animal Kingdom", "A castle parade route", "A space station", "A pirate harbor"],
      answer: "Wide views of Animal Kingdom",
      fact: "Because the coaster is tall and outdoors, some moments give riders big views across the park.",
    },
  ],

  "Kali River Rapids": [
    {
      question: "What is the biggest practical warning for Kali River Rapids?",
      choices: ["You may get soaked", "It is indoors", "It goes upside down", "It has no water"],
      answer: "You may get soaked",
      fact:
        "Kali is not a tiny sprinkle ride. Someone can get absolutely drenched.",
    },
    {
      question: "Kali’s story includes a message about what?",
      choices: ["Conservation", "Space travel", "Toy repair", "Pirate treasure"],
      answer: "Conservation",
      fact:
        "The ride moves through lush scenery and areas affected by logging to support its conservation theme.",
    },
    {
      question: "What kind of ride is Kali River Rapids?",
      choices: ["River raft ride", "Safari truck tour", "Stage show", "Train ride"],
      answer: "River raft ride",
      fact: "Kali River Rapids sends guests through a churning river in a circular raft.",
    },
    {
      question: "What is likely to happen on Kali River Rapids?",
      choices: ["Guests may get wet", "Guests fly on a banshee", "Guests watch a parade", "Guests meet Mickey"],
      answer: "Guests may get wet",
      fact: "The ride is known for splashes, and some seats can get much wetter than others.",
    },
    {
      question: "Which Animal Kingdom land is Kali River Rapids located in?",
      choices: ["Asia", "Africa", "Pandora", "Discovery Island"],
      answer: "Asia",
      fact: "Kali River Rapids is located in the Asia section of Disney's Animal Kingdom.",
    },
  ],

  "Zootopia: Better Zoogether!": [
    {
      question: "Zootopia: Better Zoogether! is located near which Animal Kingdom icon?",
      choices: ["Tree of Life", "Expedition Everest", "Spaceship Earth", "Cinderella Castle"],
      answer: "Tree of Life",
      fact:
        "It uses the Tree of Life Theater area, making it a convenient Discovery Island reset.",
    },
    {
      question: "What kind of family moment should ParkPlan treat Zootopia as?",
      choices: ["Indoor show reset", "Huge thrill ride", "Water ride", "Long train detour"],
      answer: "Indoor show reset",
      fact:
        "It can be useful when the family needs seats, AC, and something easy near the center of the park.",
    },
    {
      question: "Which Disney movie world inspires Zootopia: Better Zoogether!?",
      choices: ["Zootopia", "The Lion King", "Avatar", "Finding Nemo"],
      answer: "Zootopia",
      fact: "The attraction is based on the animal city and characters from Zootopia.",
    },
    {
      question: "Where is Zootopia: Better Zoogether! located?",
      choices: ["Tree of Life theater", "Pandora", "Asia bridge", "Rafiki's Planet Watch"],
      answer: "Tree of Life theater",
      fact: "Zootopia: Better Zoogether! is associated with the theater inside the Tree of Life.",
    },
    {
      question: "What type of attraction is Zootopia: Better Zoogether! expected to be?",
      choices: ["Indoor show experience", "Outdoor raft ride", "Safari truck ride", "High-speed coaster"],
      answer: "Indoor show experience",
      fact: "The attraction is treated as an indoor show-style family stop, not a thrill ride.",
    },
  ],

  "Finding Nemo: The Big Blue... and Beyond!": [
    {
      question: "Finding Nemo: The Big Blue... and Beyond! is what type of experience?",
      choices: ["A live theater show", "A coaster", "A safari truck ride", "A boat flume"],
      answer: "A live theater show",
      fact:
        "It uses performers, puppetry, staging, and songs instead of a ride vehicle.",
    },
    {
      question: "Which character is most likely to say something like 'just keep swimming'?",
      choices: ["Dory", "Marlin", "Bruce", "Crush"],
      answer: "Dory",
      fact:
        "Dory energy is basically the official strategy for surviving a hot park day with kids.",
    },
    {
      question: "Which Disney-Pixar movie inspires Finding Nemo: The Big Blue... and Beyond!?",
      choices: ["Finding Nemo", "Cars", "Toy Story", "Coco"],
      answer: "Finding Nemo",
      fact: "The show uses characters and songs inspired by Finding Nemo.",
    },
    {
      question: "What kind of attraction is Finding Nemo: The Big Blue... and Beyond!?",
      choices: ["Stage show", "Roller coaster", "Safari ride", "Spinning ride"],
      answer: "Stage show",
      fact: "The attraction is a seated theater show with performers, puppets, music, and underwater storytelling.",
    },
    {
      question: "Why can Finding Nemo be useful during a long Animal Kingdom day?",
      choices: ["It gives families a seated show break", "It makes everyone run", "It is a water raft ride", "It has no place to sit"],
      answer: "It gives families a seated show break",
      fact: "The show can give families a calmer window while still keeping kids engaged.",
    },
  ],

  "Bluey's Wild World at Conservation Station": [
    {
      question: "Bluey's Wild World is located in which Animal Kingdom area?",
      choices: ["Rafiki’s Planet Watch", "Pandora", "Asia", "Oasis"],
      answer: "Rafiki’s Planet Watch",
      fact:
        "That matters because it requires the Wildlife Express Train loop. It can be amazing, but it is not a quick detour.",
    },
    {
      question: "For families with toddlers or preschoolers, Bluey’s Wild World may be what kind of stop?",
      choices: ["An emotional anchor", "A thrill ride", "A fireworks show", "A water ride"],
      answer: "An emotional anchor",
      fact:
        "For a Bluey-loving kid, this could be one of the memories the family talks about later.",
    },
    {
      question: "Which Bluey game would be most dangerous in a crowded theme park line?",
      choices: ["Keepy Uppy", "Dance Mode", "Shadowlands", "Magic Xylophone"],
      answer: "Keepy Uppy",
      fact:
        "A balloon in a theme park queue would create immediate family chaos. Fun chaos, but chaos.",
    },
    {
      question: "Which character family is Bluey's Wild World centered around?",
      choices: ["Bluey's family", "The Incredibles", "The Muppets", "The Madrigals"],
      answer: "Bluey's family",
      fact: "The experience is built around Bluey and her playful family world.",
    },
    {
      question: "Where do guests travel to reach Conservation Station?",
      choices: ["Rafiki's Planet Watch", "Pandora", "Asia", "Discovery Island"],
      answer: "Rafiki's Planet Watch",
      fact: "Conservation Station is reached by taking the Wildlife Express Train to Rafiki's Planet Watch.",
    },
  ],

  "Wildlife Express Train": [
    {
      question: "What is the most important strategy note for Wildlife Express Train?",
      choices: ["It is a time commitment", "It is a thrill coaster", "It is inside Pandora", "It is a water ride"],
      answer: "It is a time commitment",
      fact:
        "The train takes you out to Rafiki’s Planet Watch, so treat it like a planned block, not quick filler.",
    },
    {
      question: "Where does Wildlife Express Train take guests?",
      choices: ["Rafiki’s Planet Watch", "EPCOT", "Magic Kingdom", "Galaxy’s Edge"],
      answer: "Rafiki’s Planet Watch",
      fact:
        "It is a great fit if your family wants Bluey, animal-care experiences, or a slower block away from the main park loop.",
    },
    {
      question: "What type of transportation is Wildlife Express Train?",
      choices: ["Train", "Boat", "Monorail", "Gondola"],
      answer: "Train",
      fact: "Wildlife Express Train carries guests between Africa and Rafiki's Planet Watch.",
    },
    {
      question: "What area does Wildlife Express Train help guests reach?",
      choices: ["Rafiki's Planet Watch", "Pandora", "Asia", "Dinoland U.S.A."],
      answer: "Rafiki's Planet Watch",
      fact: "The train is the main way for guests to reach Rafiki's Planet Watch and Conservation Station.",
    },
    {
      question: "What should families remember before riding Wildlife Express Train?",
      choices: ["It adds travel time both ways", "It is a quick coaster loop", "It ends at Magic Kingdom", "It skips Conservation Station"],
      answer: "It adds travel time both ways",
      fact: "Because families need to ride out and back, the train is best treated as a planned side trip.",
    },
  ],

  "Gorilla Falls Exploration Trail": [
    {
      question: "Gorilla Falls is best enjoyed how?",
      choices: ["Slowly and self-paced", "As a roller coaster", "Only at night", "Without looking around"],
      answer: "Slowly and self-paced",
      fact:
        "Animal trails work best when your family slows down and actually looks.",
    },
    {
      question: "What type of attraction is Gorilla Falls Exploration Trail?",
      choices: ["Walking trail", "Roller coaster", "Stage show", "River raft ride"],
      answer: "Walking trail",
      fact: "Gorilla Falls is a self-paced walking trail where families can slow down and look for animals.",
    },
    {
      question: "Which animals is Gorilla Falls especially known for?",
      choices: ["Gorillas", "Penguins", "Kangaroos", "Polar bears"],
      answer: "Gorillas",
      fact: "The trail is named for gorillas, and the gorilla viewing areas are a major reason to visit.",
    },
    {
      question: "Which Animal Kingdom land is Gorilla Falls Exploration Trail located in?",
      choices: ["Africa", "Asia", "Pandora", "Discovery Island"],
      answer: "Africa",
      fact: "Gorilla Falls Exploration Trail is located near Kilimanjaro Safaris in the Africa section.",
    },
    {
      question: "What is the best strategy for spotting animals on Gorilla Falls?",
      choices: ["Move slowly and look carefully", "Rush straight through", "Only look at the ground", "Keep eyes closed"],
      answer: "Move slowly and look carefully",
      fact: "Animal trails reward families who take their time because animals may be resting, moving, or partly hidden.",
    },
  ],

  "Maharajah Jungle Trek": [
    {
      question: "Maharajah Jungle Trek is located in which area?",
      choices: ["Asia", "Africa", "Pandora", "Oasis"],
      answer: "Asia",
      fact:
        "It pairs naturally with Everest, Kali, and Feathered Friends if the family still has walking energy.",
    },
    {
      question: "What type of attraction is Maharajah Jungle Trek?",
      choices: ["Walking trail", "Boat ride", "Coaster", "Motion simulator"],
      answer: "Walking trail",
      fact: "Maharajah Jungle Trek is a self-guided walking trail with animal viewing areas and detailed scenery.",
    },
    {
      question: "Which big cats are associated with Maharajah Jungle Trek?",
      choices: ["Tigers", "Lions", "Cheetahs", "Snow leopards"],
      answer: "Tigers",
      fact: "The trail is especially known for its tiger viewing areas and Asian-inspired setting.",
    },
    {
      question: "What should families do on Maharajah Jungle Trek?",
      choices: ["Take their time", "Expect a launch", "Prepare for a drop", "Skip every viewing area"],
      answer: "Take their time",
      fact: "The trail works best when families slow down and give themselves time to spot animals.",
    },
    {
      question: "What kind of setting does Maharajah Jungle Trek use?",
      choices: ["Asian ruins and animal habitats", "Toy backyard props", "Space station rooms", "Haunted hotel halls"],
      answer: "Asian ruins and animal habitats",
      fact: "The trail uses detailed ruins, paths, and habitats to create an immersive Asia-area animal walk.",
    },
  ],

  "Feathered Friends in Flight!": [
    {
      question: "Feathered Friends in Flight! focuses on what animals?",
      choices: ["Birds", "Tigers", "Gorillas", "Dinosaurs"],
      answer: "Birds",
      fact:
        "It uses trained bird behaviors, humor, and live demonstrations.",
    },
    {
      question: "What kind of show is Feathered Friends in Flight!?",
      choices: ["Live bird show", "Roller coaster", "Boat ride", "3D movie"],
      answer: "Live bird show",
      fact: "Feathered Friends in Flight! is a live show focused on birds and their natural behaviors.",
    },
    {
      question: "What do guests learn about during Feathered Friends in Flight!?",
      choices: ["Bird behaviors", "Race car engines", "Toy design", "Mountain climbing"],
      answer: "Bird behaviors",
      fact: "The show highlights how different birds move, communicate, and use their natural abilities.",
    },
    {
      question: "Why can Feathered Friends in Flight! be a good family stop?",
      choices: ["It is seated and educational", "It is a high-speed launch", "It soaks every rider", "It requires a long hike"],
      answer: "It is seated and educational",
      fact: "The show gives families a seated break while still keeping the experience connected to animals.",
    },
    {
      question: "What makes Feathered Friends in Flight! feel different from a trail?",
      choices: ["Birds appear in a live presentation", "Guests ride safari trucks", "Guests board a train", "Guests spin in saucers"],
      answer: "Birds appear in a live presentation",
      fact: "Instead of walking through habitats, guests watch birds and presenters in a scheduled live show.",
    },
  ],

  "Tree of Life": [
    {
      question: "The Tree of Life is covered with carvings of what?",
      choices: ["Animals", "Planets", "Cars", "Pirates"],
      answer: "Animals",
      fact:
        "There are hundreds of animal carvings built into the trunk and roots.",
    },
    {
      question: "What is the Tree of Life at Animal Kingdom?",
      choices: ["The park's central icon", "A roller coaster", "A hotel", "A monorail station"],
      answer: "The park's central icon",
      fact: "The Tree of Life is the visual centerpiece of Disney's Animal Kingdom.",
    },
    {
      question: "What can families look for on the Tree of Life?",
      choices: ["Animal carvings", "Hidden race cars", "Pirate flags", "Snowflakes"],
      answer: "Animal carvings",
      fact: "The Tree of Life is covered with many carved animals, making it fun to look closely.",
    },
    {
      question: "Which area is the Tree of Life connected to?",
      choices: ["Discovery Island", "Asia only", "Pandora only", "Rafiki's Planet Watch"],
      answer: "Discovery Island",
      fact: "The Tree of Life sits at the heart of Discovery Island near the center of the park.",
    },
    {
      question: "Why is the Tree of Life useful as a family landmark?",
      choices: ["It is easy to recognize", "It moves around the park", "It is hidden indoors", "It only appears at night"],
      answer: "It is easy to recognize",
      fact: "Because it is large and central, the Tree of Life helps families orient themselves in Animal Kingdom.",
    },
  ],

  "Adventurers Outpost": [
    {
      question: "Adventurers Outpost is mainly known as what kind of experience?",
      choices: ["Character meet-and-greet", "Water ride", "Coaster", "Train station"],
      answer: "Character meet-and-greet",
      fact:
        "For character-focused families, this can be more emotionally important than a short wait-time calculation suggests.",
    },
    {
      question: "Who can guests usually meet at Adventurers Outpost?",
      choices: ["Mickey and Minnie", "Elsa and Anna", "Chewbacca and Rey", "Buzz and Woody"],
      answer: "Mickey and Minnie",
      fact: "Adventurers Outpost is known as a character greeting location for Mickey and Minnie.",
    },
    {
      question: "What type of experience is Adventurers Outpost?",
      choices: ["Character meet-and-greet", "River raft ride", "Walking animal trail", "Bird show"],
      answer: "Character meet-and-greet",
      fact: "Adventurers Outpost is mainly about meeting characters rather than riding a vehicle.",
    },
    {
      question: "Why might families prioritize Adventurers Outpost?",
      choices: ["They want a character photo", "They want a coaster launch", "They want to get soaked", "They want a long train ride"],
      answer: "They want a character photo",
      fact: "It can be a strong stop for families who care about photos and character moments.",
    },
    {
      question: "What is the mood of Adventurers Outpost?",
      choices: ["Friendly character greeting", "Spooky mystery", "High-speed adventure", "Quiet animal trail"],
      answer: "Friendly character greeting",
      fact: "The experience is built around a warm, simple character interaction.",
    },
  ],

  "The Animation Experience at Conservation Station": [
    {
      question: "The Animation Experience lets guests do what?",
      choices: ["Learn to draw a Disney character", "Ride a coaster", "Feed a banshee", "Drive a safari truck"],
      answer: "Learn to draw a Disney character",
      fact:
        "It is a calmer creative break, but remember it is part of the Rafiki’s Planet Watch train loop.",
    },
    {
      question: "What do guests learn to do at The Animation Experience?",
      choices: ["Draw a Disney character", "Drive a safari truck", "Launch a coaster", "Steer a raft"],
      answer: "Draw a Disney character",
      fact: "The Animation Experience gives guests a guided drawing activity connected to Disney characters.",
    },
    {
      question: "Where is The Animation Experience located?",
      choices: ["Conservation Station", "Pandora", "Asia", "Sunset Boulevard"],
      answer: "Conservation Station",
      fact: "The experience is located at Conservation Station, reached by Wildlife Express Train.",
    },
    {
      question: "What kind of pace does The Animation Experience offer?",
      choices: ["Calm and creative", "Fast and soaking wet", "Loud and scary", "Bumpy and wild"],
      answer: "Calm and creative",
      fact: "The drawing class gives families a slower creative break from walking and ride lines.",
    },
    {
      question: "What should families remember before choosing The Animation Experience?",
      choices: ["It takes extra travel time", "It is next to Cinderella Castle", "It is a water ride", "It is inside Galaxy's Edge"],
      answer: "It takes extra travel time",
      fact: "Because it is at Conservation Station, families need to account for the train ride there and back.",
    },
  ],

  "Affection Section": [
    {
      question: "Affection Section is best described as what?",
      choices: ["Animal interaction area", "Roller coaster", "Indoor 4D show", "Boat ride"],
      answer: "Animal interaction area",
      fact:
        "It can be a sweet slower moment for animal-loving kids if the family already committed to Rafiki’s Planet Watch.",
    },
    {
      question: "What kind of animals are found at Affection Section?",
      choices: ["Gentle domestic animals", "Dinosaurs", "Ocean dolphins", "Polar animals"],
      answer: "Gentle domestic animals",
      fact: "Affection Section is a petting-area style experience with approachable animals.",
    },
    {
      question: "Where is Affection Section located?",
      choices: ["Rafiki's Planet Watch", "Pandora", "Asia", "Discovery Island"],
      answer: "Rafiki's Planet Watch",
      fact: "Affection Section is part of the Rafiki's Planet Watch area reached by Wildlife Express Train.",
    },
    {
      question: "What type of family moment does Affection Section offer?",
      choices: ["Hands-on animal interaction", "A coaster thrill", "A boat drop", "A nighttime fireworks show"],
      answer: "Hands-on animal interaction",
      fact: "Affection Section gives families a slower, hands-on animal experience instead of a ride.",
    },
    {
      question: "What should families consider before visiting Affection Section?",
      choices: ["The train trip adds time", "It has a height requirement", "It is a lightning-fast coaster", "It is only a parade route"],
      answer: "The train trip adds time",
      fact: "Like other Rafiki's Planet Watch stops, Affection Section works best when families have time for the round trip.",
    },
  ],
};

const ANIMAL_KINGDOM_TRIVIA_BY_LAND = {
  oasis: [
    {
      question: "The Oasis area is mostly designed to do what?",
      choices: ["Ease you into the park", "Launch you into space", "Start a parade", "Hide a roller coaster"],
      answer: "Ease you into the park",
      fact:
        "The Oasis sets the tone with paths, greenery, and animal exhibits before the park fully opens up.",
    },
  ],

  discovery_island: [
    {
      question: "Discovery Island sits around which park icon?",
      choices: ["Tree of Life", "Cinderella Castle", "Spaceship Earth", "Hollywood Tower Hotel"],
      answer: "Tree of Life",
      fact:
        "It is the central connector for Animal Kingdom, so it matters a lot for family flow.",
    },
  ],

  pandora: [
    {
      question: "Pandora is based on what movie world?",
      choices: ["Avatar", "Zootopia", "The Lion King", "Moana"],
      answer: "Avatar",
      fact:
        "Pandora is designed to feel alien, lush, glowing, and alive.",
    },
  ],

  africa: [
    {
      question: "Africa is home to which major Animal Kingdom anchor?",
      choices: ["Kilimanjaro Safaris", "TRON", "Slinky Dog Dash", "Frozen Ever After"],
      answer: "Kilimanjaro Safaris",
      fact:
        "Safaris is one of the biggest reasons many families visit Animal Kingdom.",
    },
  ],

  asia: [
    {
      question: "Asia is home to which mountain coaster?",
      choices: ["Expedition Everest", "Big Thunder", "Space Mountain", "Seven Dwarfs Mine Train"],
      answer: "Expedition Everest",
      fact:
        "Asia can be a great area when your group has thrill energy, but it is a meaningful walk from some parts of the park.",
    },
  ],

  rafikis_planet_watch: [
    {
      question: "Rafiki’s Planet Watch usually requires what to reach it?",
      choices: ["Wildlife Express Train", "Monorail", "Skyliner", "Boat from Magic Kingdom"],
      answer: "Wildlife Express Train",
      fact:
        "That is why ParkPlan should treat it as a planned block, not a quick nearby filler.",
    },
  ],
};

const ANIMAL_KINGDOM_LOOK_AROUND_BY_RIDE = {
  "Avatar Flight of Passage": [
    {
      task: "In the queue, find the avatar floating in the tank.",
      hint: "The lab section is the big payoff before the link chamber.",
    },
    {
      task: "Everyone pick whether the cave, lab, or link room feels the coolest.",
      hint: "This queue changes tone a lot as you move through it.",
    },
  ],

  "Na'vi River Journey": [
    {
      task: "Look for the most unusual glowing plant or creature before you board.",
      hint: "Pandora hides details in the layers, not just the obvious places.",
    },
    {
      task: "Everyone pick one color that feels most like Pandora.",
      hint: "Blue and purple are strong choices, but let the kids argue.",
    },
  ],

  "Kilimanjaro Safaris": [
    {
      task: "Everyone pick one animal they hope to see before boarding.",
      hint: "Compare your picks after the safari.",
    },
    {
      task: "Look for signs, crates, maps, or reserve details that make the area feel like a real expedition.",
      hint: "The story starts before the truck.",
    },
  ],

  "Festival of the Lion King": [
    {
      task: "Before the show, everyone pick which Lion King song they hope to hear.",
      hint: "There are no wrong answers, but someone will absolutely pick Hakuna Matata.",
    },
    {
      task: "Pick your family’s show role: singer, dancer, acrobat, drummer, or person enjoying the AC.",
      hint: "The AC role is underrated.",
    },
  ],

  "Expedition Everest - Legend of the Forbidden Mountain": [
    {
      task: "Find one expedition object: rope, gear, crate, map, boot, photo, or artifact.",
      hint: "The queue is basically a museum of terrible mountain decisions.",
    },
    {
      task: "Everyone pick who would keep hiking toward the Yeti and who would turn around immediately.",
      hint: "Be honest. Survival matters.",
    },
  ],

  "Kali River Rapids": [
    {
      task: "Look for prayer flags, carved details, bells, or signs of Anandapur while you wait.",
      hint: "The queue is doing more storytelling than people notice.",
    },
    {
      task: "Everyone vote who is most likely to get soaked.",
      hint: "Do not say it too confidently. The raft hears you.",
    },
  ],

  "Zootopia: Better Zoogether!": [
    {
      task: "Before the show, everyone pick which Zootopia district they would visit first.",
      hint: "Tundratown, Sahara Square, Little Rodentia, and the Rainforest District all have strong arguments.",
    },
    {
      task: "Pick who in your family is most like Judy, Nick, Flash, or Clawhauser.",
      hint: "This could get very personal very fast.",
    },
  ],

  "Finding Nemo: The Big Blue... and Beyond!": [
    {
      task: "Everyone pick which Nemo character matches their current park mood.",
      hint: "Dory is optimism. Marlin is stress. Crush is vacation mode. The seagulls are snack mode.",
    },
    {
      task: "Look for ocean colors, bubbles, or sea-life design details around the theater area.",
      hint: "Animal Kingdom loves natural textures even near shows.",
    },
  ],

  "Bluey's Wild World at Conservation Station": [
    {
      task: "Everyone pick which Bluey game your family would be best at.",
      hint: "Dance Mode is dangerous if Dad commits too hard.",
    },
    {
      task: "Before committing to the loop, do a family check: snack, water, bathroom, stroller, or patience?",
      hint: "Rafiki’s is a block, not a quick pop-in.",
    },
  ],

  "Wildlife Express Train": [
    {
      task: "Look for backstage animal-care buildings or train details as you ride.",
      hint: "This is one of the few attractions where the travel is part of the point.",
    },
    {
      task: "Everyone decide: is this a Bluey mission, animal mission, art mission, or reset mission?",
      hint: "Knowing why you are going makes the time commitment feel better.",
    },
  ],

  "Gorilla Falls Exploration Trail": [
    {
      task: "Move slowly and find one animal, bird, or habitat detail most people would walk past.",
      hint: "Trails reward patient families.",
    },
  ],

  "Maharajah Jungle Trek": [
    {
      task: "Find one detail that makes the area feel like ancient ruins.",
      hint: "Look for murals, stonework, weathered walls, and carved shapes.",
    },
  ],

  "Feathered Friends in Flight!": [
    {
      task: "Watch where the birds fly from and to. Can you spot the trainer cues?",
      hint: "The show is training, trust, and timing.",
    },
  ],

  "Tree of Life": [
    {
      task: "Pick one section of the Tree of Life and count how many animal carvings you can find in 60 seconds.",
      hint: "There are way more animals than you notice at first.",
    },
  ],

  "Adventurers Outpost": [
    {
      task: "Look for explorer or travel details around the meet-and-greet area.",
      hint: "The theme is Mickey and Minnie as adventurers.",
    },
  ],

  "The Animation Experience at Conservation Station": [
    {
      task: "Before class, everyone guesses which animal or character would be easiest to draw.",
      hint: "The easiest-looking one is not always easy.",
    },
  ],

  "Affection Section": [
    {
      task: "Everyone pick which animal interaction would make the best vacation story.",
      hint: "The sillier the story, the better.",
    },
  ],
};

const ANIMAL_KINGDOM_LOOK_AROUND_BY_LAND = {
  oasis: [
    {
      task: "Find one animal exhibit, water feature, or quiet path detail before reaching Discovery Island.",
      hint: "Most families rush through the Oasis. Slow down for 30 seconds.",
    },
  ],
  discovery_island: [
    {
      task: "Find three different animal carvings on or near the Tree of Life.",
      hint: "Look at roots, branches, and carved surfaces.",
    },
  ],
  pandora: [
    {
      task: "Find something that looks alive but might be a plant, animal, or alien rock.",
      hint: "Pandora is intentionally weird.",
    },
  ],
  africa: [
    {
      task: "Find a sign, drum, market detail, or animal-care clue that makes Harambe feel lived-in.",
      hint: "Africa has some of the best environmental storytelling in the park.",
    },
  ],
  asia: [
    {
      task: "Find prayer flags, bells, weathered signs, or mountain details nearby.",
      hint: "Asia rewards looking up and around.",
    },
  ],
  rafikis_planet_watch: [
    {
      task: "Find one animal-care or conservation detail that shows this area is more than just a character stop.",
      hint: "Look for clinic, care, or learning details.",
    },
  ],
};

const ANIMAL_KINGDOM_FAMILY_VOTE_PROMPTS = [
  {
    prompt: "What does the family need most in Animal Kingdom right now?",
    options: ["Shade", "Water", "AC seats", "A slower animal moment"],
  },
  {
    prompt: "Pick the Animal Kingdom mission:",
    options: ["Big thrill", "Animal spotting", "Bluey / kid magic", "Cool down and reset"],
  },
  {
    prompt: "Who in the group would make the best safari guide?",
    options: ["Animal expert", "Map reader", "Joke maker", "Person who packed snacks"],
  },
  {
    prompt: "If the family joined an expedition, who gets each job?",
    options: ["Leader", "Photographer", "Snack guard", "Person yelling “wait for me”"],
  },
  {
    prompt: "Which Animal Kingdom area fits your family mood right now?",
    options: ["Pandora wonder", "Africa animals", "Asia adventure", "Discovery Island reset"],
  },
  {
    prompt: "Before committing to Rafiki’s Planet Watch, what must be checked?",
    options: ["Time", "Bathroom", "Snacks/water", "Does the group actually want the train loop?"],
  },
];

const ANIMAL_KINGDOM_WOULD_YOU_RATHER_PROMPTS = [
  "Would you rather fly on a banshee over Pandora or ride in the front row on Everest?",
  "Would you rather spot a lion on safari or see a gorilla up close on a trail?",
  "Would you rather get totally soaked on Kali or walk across the park in full afternoon sun?",
  "Would you rather have Bluey plan your family day or Timon and Pumbaa plan it?",
  "Would you rather be able to talk to animals for one park day or teleport to any land instantly?",
  "Would you rather sleep in a safe treehouse above the safari or inside a glowing cave in Pandora?",
  "Would you rather draw a perfect Disney animal or take the perfect Tree of Life family photo?",
  "Would you rather have a bird deliver your snacks or a goat carry your backpack?",
  "Would you rather be the calm safari guide or the dramatic Everest expedition leader?",
  "Would you rather find a secret animal trail or a secret air-conditioned lounge?",
];


const CONVERSATION_STARTERS_BY_PARK = {
  magic_kingdom: [
    "What has been the funniest moment of our day so far?",
    "If we could ride one attraction again with no wait, which one would you pick?",
    "What snack should officially represent our family vacation?",
    "Which Disney character would be the best tour guide for our family?",
    "What is one thing someone in our family did today that made the day better?",
    "If our family could create one new Magic Kingdom ride, what would it be about?",
    "What is one thing we almost missed today that was actually really cool?",
    "Which land feels most like our family right now: calm, chaotic, hungry, or adventurous?",
    "If we could invite one Disney character to wait in line with us, who would be the funniest?",
    "What is one tiny detail in this park that makes it feel magical?",
    "If today had a title like a movie, what would we call it?",
    "Which ride would each person in our family be if rides had personalities?",
    "What is one thing we should make sure we remember from today?",
    "If we could skip to one part of the day again, what would it be?",
    "What would our family’s parade float look like?",
  ],
  epcot: [
    "If we could visit any country in World Showcase for real tomorrow, where should we go?",
    "What food or drink have we seen today that looked the most interesting?",
    "If our family invented a future city, what would it absolutely need?",
    "Which EPCOT pavilion would make the best place to live for a week?",
    "What has felt most peaceful, weird, or surprising about EPCOT today?",
    "If our family could build one new EPCOT pavilion, what would it be about?",
    "Which country, food, ride, or show has surprised us the most today?",
    "If we could live inside one EPCOT attraction for a day, which one would we choose?",
    "What is one thing here that feels futuristic, even if it is small?",
    "Which World Showcase country would be the best family dinner spot?",
    "If our family made an EPCOT festival, what would the theme be?",
    "What is one snack or meal we should remember for next time?",
    "Which EPCOT area feels most like our family right now?",
    "If Figment followed us around all day, what would he make more chaotic?",
    "What is one thing at EPCOT that feels calmer than the rest of the trip?",
  ],
  hollywood_studios: [
    "If our family was cast in a movie, what kind of movie would it be?",
    "Who in our group would survive best in a Star Wars adventure?",
    "What Toy Story toy would fit our family personality best?",
    "If we had a backstage pass to any show or ride here, what would we want to see?",
    "What has been the most cinematic moment of the day so far?",
    "If our family was making a movie today, what would the title be?",
    "Which Hollywood Studios area feels most like our family right now?",
    "If we could be in one Star Wars, Toy Story, or Mickey cartoon scene, which would we pick?",
    "Who in our family would be the best movie director?",
    "What has been the funniest or most dramatic moment of the day so far?",
    "If one ride here became a family movie, who would play each role?",
    "Which character here would make the best travel buddy for our family?",
    "What is one backstage secret we would want to learn about this park?",
    "If our family had a Hollywood Studios catchphrase, what would it be?",
    "Which ride or show here would make the best dinner conversation later?",
  ],
  animal_kingdom: [
    "What animal have we seen today that best matches our family energy?",
    "If we could explore one real jungle, mountain, or river together, where would we go?",
    "What has been the best nature detail we noticed today?",
    "If our family had a wilderness team name, what would it be?",
    "What is one calm moment from today that we should remember?",
    "If our family could design a new animal trail, what animals would be on it?",
    "Which Animal Kingdom area feels the most peaceful so far?",
    "If one animal could guide us through the park, which animal should it be?",
    "What is one thing here that feels more like an adventure than a theme park?",
    "Which ride, show, or trail has made us feel the most like explorers?",
    "If our family had a Wilderness Explorer badge, what would it be for?",
    "What animal do we think has the most personality?",
    "If we could spend one night safely inside Animal Kingdom, where would we sleep?",
    "Which land here feels most like another world?",
    "What is one quiet detail here we almost missed?",
  ],
};

const QUEUE_CLUES_BY_PARK = {
  magic_kingdom: [
    ["Castle", "Lantern", "Boat", "Clock", "Crown"],
    ["Mountain", "Star", "Rocket", "Robot", "Train"],
    ["Pirate", "Ghost", "Gem", "Honey", "Elephant"],
    ["Sword", "Map", "Flower", "Dragon", "Teacup"],
    ["Fireworks", "Monorail", "Popcorn", "Princess", "Carousel"],
    ["Dole Whip", "Parade", "MagicBand", "Stroller", "Dragon"],
    ["Thunder", "Mine Train", "Haunted", "Adventure", "Tomorrow"],
    ["Mermaid", "Genie", "Beast", "Tinker Bell", "Goofy"],
    ["Main Street", "Liberty", "Fantasyland", "Frontierland", "Tomorrowland"],
    ["Churro", "Castle", "Pirate", "Lantern", "Space"],
    ["Mickey", "Minnie", "Donald", "Daisy", "Pluto"],
    ["Firehouse", "Riverboat", "Cannon", "Rocket", "Teacup"],
  ],
  epcot: [
    ["Sphere", "Passport", "Garden", "Rocket", "Chef"],
    ["Boat", "Planet", "Figment", "Water", "Lantern"],
    ["France", "Norway", "Mexico", "Land", "Seas"],
    ["Music", "Bridge", "Fountain", "Spaceship", "Monorail"],
    ["Figment", "Monorail", "Lagoon", "Festival", "Passport"],
    ["Croissant", "Troll", "Rat", "Rocket", "Greenhouse"],
    ["Spaceship", "Garden", "Fountain", "Chef", "Dragon"],
    ["Norway", "France", "Mexico", "Japan", "Canada"],
    ["Test Track", "Soarin", "Frozen", "Remy", "Nemo"],
    ["Baguette", "Viking", "Taco", "Tea", "Sushi"],
    ["Imagination", "Mission", "Land", "Seas", "Odyssey"],
    ["Fireworks", "Bridge", "Skyliner", "World", "Future"],
  ],
  hollywood_studios: [
    ["Camera", "Droid", "Toy", "Tower", "Star"],
    ["Alien", "Slinky", "Falcon", "Train", "Guitar"],
    ["Popcorn", "Poster", "Stage", "Robot", "Backlot"],
    ["Lightning", "Stormtrooper", "Mickey", "Woody", "Spaceship"],
    ["Droid", "Falcon", "Slinky", "Tower", "Mickey"],
    ["Woody", "Buzz", "Alien", "Jessie", "Bo Peep"],
    ["Stormtrooper", "Lightsaber", "Resistance", "First Order", "Starship"],
    ["Camera", "Director", "Backlot", "Poster", "Spotlight"],
    ["Runaway", "Railway", "Elevator", "Guitar", "Coaster"],
    ["Popcorn", "Premiere", "Stage", "Script", "Costume"],
    ["Toy", "Movie", "Cartoon", "Robot", "Alien"],
    ["Hollywood", "Sunset", "Galaxy", "Muppets", "Animation"],
  ],
  animal_kingdom: [
    ["Tree", "River", "Drum", "Bird", "Mountain"],
    ["Safari", "Tiger", "Gorilla", "Banshee", "Yeti"],
    ["Leaf", "Bridge", "Waterfall", "Dinosaur", "Feather"],
    ["Trail", "Nest", "Vine", "Lantern", "Creature"],
    ["Safari", "Everest", "Avatar", "Dinosaur", "Tiger"],
    ["Giraffe", "Rhino", "Gorilla", "Lion", "Zebra"],
    ["Pandora", "River", "Mountain", "Tree", "Trail"],
    ["Banshee", "Yeti", "Drum", "Cave", "Bridge"],
    ["Explorer", "Badge", "Map", "Binoculars", "Compass"],
    ["Rafiki", "Kilimanjaro", "Asia", "Africa", "Oasis"],
    ["Feather", "Paw", "Roar", "Nest", "Waterfall"],
    ["Jeep", "Expedition", "Creature", "Forest", "Outpost"],
  ],
};

const PREDICTION_GAMES_BY_PARK = {
  magic_kingdom: [
    "Predict the next stroller color we will see.",
    "Predict whether the next group walking by has matching shirts.",
    "Predict the first character, castle, mountain, or boat detail someone spots from here.",
    "Predict whether our ride vehicle will be in the front half or back half.",
    "Predict who in our family will laugh first on the ride.",
    "Predict the next Disney character shirt someone walks by wearing.",
    "Predict whether the next kid nearby is holding a snack, bubble wand, or stuffed animal.",
    "Predict who in our family will say they are hungry next.",
    "Predict whether the next ride announcement we hear will be calm or dramatic.",
    "Predict the next thing we see: ears, balloons, stroller fan, or popcorn bucket.",
    "Predict whether our next ride photo would look brave, chaotic, or confused.",
    "Predict who will notice the next hidden detail first.",
    "Predict whether the next song we hear will be classic Disney or park background music.",
    "Predict the next color MagicBand someone nearby is wearing.",
    "Predict who in our group will be ready for a snack break first.",
  ],
  epcot: [
    "Predict the next country, food item, or plant detail someone mentions.",
    "Predict whether we will hear music, water, or a ride announcement next.",
    "Predict the first color we see repeated three times from this spot.",
    "Predict whether the next family walking by is heading to food, a ride, or shopping.",
    "Predict who in our group will notice the weirdest detail first.",
    "Predict the next country someone in our group mentions.",
    "Predict whether the next thing we smell is food, flowers, water, or sunscreen.",
    "Predict who will ask for a snack or drink next.",
    "Predict the next language, accent, or music style we notice.",
    "Predict whether the next family walking by is heading to food, a ride, or the exit.",
    "Predict the next EPCOT icon we spot: sphere, monorail, fountain, flag, or festival sign.",
    "Predict whether our next best move is ride, food, shade, or slow walk.",
    "Predict who will notice the weirdest World Showcase detail first.",
    "Predict the next color we see on a festival booth sign.",
    "Predict whether the next kid nearby is holding food, a bubble wand, or a plush.",
  ],
  hollywood_studios: [
    "Predict the next Star Wars, Toy Story, or movie shirt we see.",
    "Predict whether the next sound we notice is music, a ride vehicle, or a character voice.",
    "Predict who in our family would be the best actor in this park.",
    "Predict whether our next ride moment will feel funny, thrilling, or chaotic.",
    "Predict the next color lightsaber, alien, or Mickey detail someone spots.",
    "Predict the next Star Wars shirt, Toy Story shirt, or Mickey shirt we see.",
    "Predict whether the next sound we hear is music, a ride vehicle, or a character voice.",
    "Predict who in our family would be the best pilot on Smugglers Run.",
    "Predict whether our next ride moment feels funny, thrilling, or chaotic.",
    "Predict the next movie-style detail someone notices: poster, prop, costume, or light.",
    "Predict who will quote a movie or character first.",
    "Predict whether the next kid nearby is holding a toy, snack, bubble wand, or lightsaber.",
    "Predict whether our next photo would look heroic, goofy, scared, or confused.",
    "Predict whether the next thing we spot is a droid, alien, tower, toy, or guitar.",
    "Predict who in our group would survive longest in a Star Wars mission.",
  ],
  animal_kingdom: [
    "Predict the next animal we hear, see, or talk about.",
    "Predict whether the next sound we notice is music, water, birds, or people.",
    "Predict who in our family would be best at leading a jungle expedition.",
    "Predict the next nature detail someone spots: leaf, rock, water, animal, or flower.",
    "Predict whether our next reset should be shade, snack, show, or slower walking.",
    "Predict the next animal someone in our group mentions.",
    "Predict whether the next sound we hear is music, water, drums, birds, or people.",
    "Predict who will spot the next animal detail first.",
    "Predict whether our next best move is ride, shade, snack, show, or trail.",
    "Predict the next animal print we see: stripes, spots, scales, feathers, or paws.",
    "Predict whether the next family nearby is heading to Safari, Everest, Pandora, food, or the exit.",
    "Predict who in our group would be the best Wilderness Explorer.",
    "Predict the next thing we see that feels like nature took over.",
    "Predict whether the next photo should be serious, silly, brave, or explorer-style.",
    "Predict which animal would be most likely to judge our park plan.",
  ],
};

const FAMILY_CHALLENGES_BY_PARK = {
  magic_kingdom: [
    "Everyone name one Disney character before the line moves again.",
    "Do your best silent parade wave. The family votes on the most royal one.",
    "Name five Magic Kingdom rides as fast as you can.",
    "Everyone pick a vacation nickname for the person on your left.",
    "Try to make the group laugh using only one Disney word.",
    "Everyone name one Magic Kingdom land without repeating anyone else.",
    "Each person has five seconds to name a Disney snack.",
    "Make your best royal pose for two seconds. No blocking the walkway.",
    "Everyone silently points to who would be the best pirate captain.",
    "Name three things you can see from this line that prove we are at Disney.",
    "Create a family motto for the rest of the park day.",
    "Everyone pick one ride sound effect and quietly act it out.",
    "Say one compliment to someone in the group before the line moves.",
    "Name five Disney characters before anyone checks the wait time again.",
    "Everyone votes: who has been the family MVP so far today?",
  ],
  epcot: [
    "Name five countries, foods, or inventions before the line moves again.",
    "Everyone say one place in the world they want to visit someday.",
    "Make up a fake EPCOT festival food booth and one ridiculous menu item.",
    "Each person names one thing they learned or noticed today.",
    "Try to pronounce a fancy imaginary restaurant name with total confidence.",
    "Everyone name one EPCOT country without repeating anyone else.",
    "Name three foods from around the world before the line moves.",
    "Each person picks one invention they wish existed for theme park days.",
    "Make up a fake EPCOT festival and one booth name for it.",
    "Everyone says one place in the world they want to visit someday.",
    "Name five things you can see here that are not rides.",
    "Each person picks a role: navigator, snack scout, photographer, chill captain.",
    "Say one thing EPCOT has taught us today, serious or ridiculous.",
    "Everyone vote: which pavilion would make the best movie setting?",
    "Create a family slogan for walking around World Showcase.",
  ],
  hollywood_studios: [
    "Everyone make a movie trailer voice for what our family is doing right now.",
    "Name five movie, Toy Story, or Star Wars characters before the line moves.",
    "Do your best silent robot, alien, or movie star pose.",
    "Create a fake movie title for our day so far.",
    "Everyone picks who would be director, actor, stunt double, and snack manager.",
    "Everyone name one movie, show, or character without repeating anyone else.",
    "Make your best silent movie-star pose for two seconds.",
    "Each person picks a movie role: hero, sidekick, villain, narrator, or snack manager.",
    "Name five Toy Story or Star Wars characters before the line moves.",
    "Create a fake movie trailer voice for what our family is doing right now.",
    "Everyone silently points to who would be the best pilot.",
    "Make up a fake Hollywood Studios ride name in five seconds.",
    "Say one nice review of today like you are a movie critic.",
    "Everyone vote: who has had the most main-character energy today?",
    "Create a family movie title for the rest of the day.",
  ],
  animal_kingdom: [
    "Name five animals before the line moves again.",
    "Everyone make a quiet animal face. No loud animal noises in line.",
    "Pick an expedition role for each family member: guide, snack scout, map reader, photographer.",
    "Name one way to cool down or slow down before anyone gets cranky.",
    "Invent a fake nature documentary title about our family today.",
    "Everyone name one animal without repeating anyone else.",
    "Make your best explorer face for two seconds.",
    "Each person picks an Animal Kingdom role: guide, tracker, photographer, snack scout, or map reader.",
    "Name five animals before the line moves.",
    "Make up a fake Wilderness Explorer badge for this moment.",
    "Everyone quietly points to who would survive longest on an expedition.",
    "Create a fake Animal Kingdom ride name in five seconds.",
    "Say one thing we noticed here that we would miss if we were rushing.",
    "Everyone vote: Safari truck, banshee, train, raft, or walking trail?",
    "Make up a family explorer motto for the rest of the day.",
  ],
};

const TRIVIA_BY_PARK_AND_RIDE = {
  magic_kingdom: MAGIC_KINGDOM_TRIVIA_BY_RIDE,
  epcot: EPCOT_TRIVIA_BY_RIDE,
  hollywood: HOLLYWOOD_TRIVIA_BY_RIDE,
  animal_kingdom: ANIMAL_KINGDOM_TRIVIA_BY_RIDE,
};

const TRIVIA_BY_PARK_AND_LAND = {
  magic_kingdom: MAGIC_KINGDOM_TRIVIA_BY_LAND,
  epcot: {},
  hollywood: {},
  animal_kingdom: ANIMAL_KINGDOM_TRIVIA_BY_LAND,
};

const LOOK_AROUND_BY_PARK_AND_RIDE = {
  magic_kingdom: LOOK_AROUND_BY_RIDE,
  epcot: EPCOT_LOOK_AROUND_BY_RIDE,
  hollywood: HOLLYWOOD_LOOK_AROUND_BY_RIDE,
  animal_kingdom: ANIMAL_KINGDOM_LOOK_AROUND_BY_RIDE,
};

const LOOK_AROUND_BY_PARK_AND_LAND = {
  magic_kingdom: LOOK_AROUND_BY_LAND,
  epcot: {},
  hollywood: {},
  animal_kingdom: ANIMAL_KINGDOM_LOOK_AROUND_BY_LAND,
};

const FAMILY_VOTE_BY_PARK = {
  magic_kingdom: FAMILY_VOTE_PROMPTS,
  epcot: EPCOT_FAMILY_VOTE_PROMPTS,
  hollywood: HOLLYWOOD_FAMILY_VOTE_PROMPTS,
  animal_kingdom: ANIMAL_KINGDOM_FAMILY_VOTE_PROMPTS,
};

const WOULD_YOU_RATHER_BY_PARK = {
  magic_kingdom: WOULD_YOU_RATHER_PROMPTS,
  epcot: EPCOT_WOULD_YOU_RATHER_PROMPTS,
  hollywood: HOLLYWOOD_WOULD_YOU_RATHER_PROMPTS,
  animal_kingdom: ANIMAL_KINGDOM_WOULD_YOU_RATHER_PROMPTS,
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
    aliases.add("rock n roller coaster the muppets");
    aliases.add("rock n roller coaster starring the muppets");
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

  if (normalized.includes("flight of passage") || normalized.includes("avatar")) {
    aliases.add("avatar flight of passage");
    aliases.add("flight of passage");
  }

  if (normalized.includes("navi") || normalized.includes("na vi")) {
    aliases.add("navi river journey");
    aliases.add("na vi river journey");
  }

  if (normalized.includes("kilimanjaro") || normalized.includes("safaris")) {
    aliases.add("kilimanjaro safaris");
    aliases.add("safaris");
  }

  if (normalized.includes("lion king")) {
    aliases.add("festival of the lion king");
  }

  if (normalized.includes("everest")) {
    aliases.add("expedition everest legend of the forbidden mountain");
    aliases.add("expedition everest");
  }

  if (normalized.includes("kali")) {
    aliases.add("kali river rapids");
  }

  if (normalized.includes("zootopia") || normalized.includes("better zoogether")) {
    aliases.add("zootopia better zoogether");
  }

  if (normalized.includes("bluey")) {
    aliases.add("blueys wild world at conservation station");
    aliases.add("bluey wild world");
  }

  if (normalized.includes("wildlife express")) {
    aliases.add("wildlife express train");
  }

  if (normalized.includes("nemo") || normalized.includes("big blue")) {
    aliases.add("finding nemo the big blue and beyond");
  }

  if (normalized.includes("gorilla falls")) {
    aliases.add("gorilla falls exploration trail");
  }

  if (normalized.includes("maharajah")) {
    aliases.add("maharajah jungle trek");
  }

  if (normalized.includes("feathered friends")) {
    aliases.add("feathered friends in flight");
  }

  if (normalized.includes("tree of life")) {
    aliases.add("tree of life");
  }

  if (normalized.includes("adventurers outpost")) {
    aliases.add("adventurers outpost");
  }

  if (normalized.includes("animation experience")) {
    aliases.add("the animation experience at conservation station");
    aliases.add("animation experience");
  }

  if (normalized.includes("affection section")) {
    aliases.add("affection section");
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
  const parkConversationStarters = CONVERSATION_STARTERS_BY_PARK[parkId] || [];
  const parkQueueClues = QUEUE_CLUES_BY_PARK[parkId] || [];
  const parkPredictionGames = PREDICTION_GAMES_BY_PARK[parkId] || [];
  const parkFamilyChallenges = FAMILY_CHALLENGES_BY_PARK[parkId] || [];

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

  if (gameType === "conversation_starter") {
    const prompt = pickFromList(parkConversationStarters, seed);

    return prompt
      ? {
          type: "conversation_starter",
          title: "Conversation Starter",
          prompt,
        }
      : null;
  }

  if (gameType === "queue_clues") {
    const wordSet = pickFromList(parkQueueClues, seed);
    const word = wordSet?.length ? pickFromList(wordSet, seed + 1) : null;

    return word
      ? {
          type: "queue_clues",
          title: "Queue Clues",
          prompt:
            "Hold the phone up without looking. Your family gives clues until you guess the word.",
          word,
        }
      : null;
  }

  if (gameType === "prediction_game") {
    const prompt = pickFromList(parkPredictionGames, seed);

    return prompt
      ? {
          type: "prediction_game",
          title: "Prediction Game",
          prompt,
        }
      : null;
  }

  if (gameType === "family_challenge") {
    const prompt = pickFromList(parkFamilyChallenges, seed);

    return prompt
      ? {
          type: "family_challenge",
          title: "Family Challenge",
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
    "conversation_starter",
    "queue_clues",
    "prediction_game",
    "family_challenge",
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
    description: "Pass the phone and let everyone pick a side.",
  },
  {
    key: "would_you_rather",
    label: "Would You Rather",
    description: "Silly park questions for laughs in line.",
  },
  {
    key: "conversation_starter",
    label: "Conversation",
    description: "A simple prompt to get the family talking.",
  },
  {
    key: "queue_clues",
    label: "Queue Clues",
    description: "Hold the phone up and guess the word from family clues.",
  },
  {
    key: "prediction_game",
    label: "Prediction",
    description: "Guess what will happen before the line moves.",
  },
  {
    key: "family_challenge",
    label: "Family Challenge",
    description: "A quick no-pressure group challenge.",
  },
];
