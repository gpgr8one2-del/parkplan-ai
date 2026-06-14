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
  "TRON Lightcycle / Run": [
    { question: "What color is the team you are racing for on the Grid?", answer: "Team Blue.", difficulty: "easy", kidFriendly: true },
    { question: "What are the vehicles you ride called?", answer: "Lightcycles.", difficulty: "easy", kidFriendly: true },
    { question: "What shape is the glowing identity disc on the back of the riders' suits?", answer: "A circle.", difficulty: "easy", kidFriendly: true },
    { question: "Who is the leader of the opposing Team Orange?", answer: "Rinzler.", difficulty: "medium", kidFriendly: true },
    { question: "What is the giant, sweeping canopy over the outside of the ride called?", answer: "The Upload Conduit.", difficulty: "hard", kidFriendly: false },
    { question: "What is the digital world you are entering called?", answer: "The Grid.", difficulty: "medium", kidFriendly: true },
    { question: "What do the Lightcycles leave behind them as they race?", answer: "A light ribbon.", difficulty: "medium", kidFriendly: true },
    { question: "How many energy gates do you have to pass through to win the race?", answer: "Eight.", difficulty: "hard", kidFriendly: false },
    { question: "What does the large laser in the pre-show room do?", answer: "It digitizes you so you can enter the computer world.", difficulty: "medium", kidFriendly: true },
    { question: "What happens to a Lightcycle if it crashes into a light ribbon?", answer: "It derezzes, or shatters into pixels.", difficulty: "medium", kidFriendly: true },
  ],

  "Seven Dwarfs Mine Train": [
    { question: "What kind of gems are the dwarfs digging for in the mine?", answer: "Diamonds and rubies.", difficulty: "easy", kidFriendly: true },
    { question: "Which dwarf is the only one who does not have a beard?", answer: "Dopey.", difficulty: "easy", kidFriendly: true },
    { question: "What tool do the dwarfs use to break the rocks?", answer: "Pickaxes.", difficulty: "easy", kidFriendly: true },
    { question: "Which dwarf wears glasses?", answer: "Doc.", difficulty: "medium", kidFriendly: true },
    { question: "What song do the dwarfs sing while they are working?", answer: "Heigh-Ho.", difficulty: "easy", kidFriendly: true },
    { question: "What makes the mine carts on this ride different from a normal roller coaster?", answer: "They swing side to side.", difficulty: "medium", kidFriendly: true },
    { question: "Who is the dwarf who is usually sleepy?", answer: "Sleepy.", difficulty: "easy", kidFriendly: true },
    { question: "What fruit is important in Snow White's story?", answer: "An apple.", difficulty: "easy", kidFriendly: true },
    { question: "What animal helps the dwarfs wash up?", answer: "A deer.", difficulty: "medium", kidFriendly: true },
    { question: "Who is secretly watching near the end of the ride?", answer: "The Evil Queen disguised as an old hag.", difficulty: "medium", kidFriendly: true },
  ],

  "Peter Pan's Flight": [
    { question: "What does Peter Pan lose in the Darling family nursery?", answer: "His shadow.", difficulty: "easy", kidFriendly: true },
    { question: "What is the name of the dog who acts as the children's nursemaid?", answer: "Nana.", difficulty: "medium", kidFriendly: true },
    { question: "What animal is Captain Hook absolutely terrified of?", answer: "A crocodile.", difficulty: "easy", kidFriendly: true },
    { question: "Besides a happy thought, what else do you need to fly?", answer: "Pixie dust.", difficulty: "easy", kidFriendly: true },
    { question: "What famous city do you fly over in the dark?", answer: "London.", difficulty: "medium", kidFriendly: true },
    { question: "Who gets jealous when Peter Pan talks to Wendy?", answer: "Tinker Bell.", difficulty: "easy", kidFriendly: true },
    { question: "What is the name of Captain Hook's pirate ship?", answer: "The Jolly Roger.", difficulty: "medium", kidFriendly: true },
    { question: "Which hand is Captain Hook missing?", answer: "His left hand.", difficulty: "hard", kidFriendly: false },
    { question: "What shape is the vehicle you ride in?", answer: "A pirate galleon.", difficulty: "easy", kidFriendly: true },
    { question: "What does the crocodile have in its stomach that makes a noise?", answer: "An alarm clock.", difficulty: "easy", kidFriendly: true },
  ],

  "Jungle Cruise": [
    { question: "What do you call the person driving the Jungle Cruise boat?", answer: "A Skipper.", difficulty: "easy", kidFriendly: true },
    { question: "Which animal is famous for taking a shower in the waterfall?", answer: "An elephant.", difficulty: "easy", kidFriendly: true },
    { question: "What famous river do you sail on in South America?", answer: "The Amazon.", difficulty: "medium", kidFriendly: true },
    { question: "What are the lions watching over in the cave scene?", answer: "A sleeping zebra.", difficulty: "medium", kidFriendly: true },
    { question: "What does the skipper call the 8th Wonder of the World?", answer: "The backside of water.", difficulty: "easy", kidFriendly: true },
    { question: "What animal chased the safari explorers up the tall pole?", answer: "A rhino.", difficulty: "easy", kidFriendly: true },
    { question: "How do the hippos warn you before they attack?", answer: "They wiggle their ears.", difficulty: "medium", kidFriendly: true },
    { question: "What color are many Jungle Cruise boat canopies?", answer: "Red and white striped.", difficulty: "hard", kidFriendly: false },
    { question: "What is the most dangerous part of the Jungle Cruise?", answer: "The skipper's jokes.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of ride vehicle do you board on Jungle Cruise?", answer: "A boat.", difficulty: "easy", kidFriendly: true },
  ],

  "Haunted Mansion": [
    { question: "How many happy haunts live inside the Haunted Mansion?", answer: "999, but there is room for one more.", difficulty: "easy", kidFriendly: true },
    { question: "What vehicle do you ride in through the dark hallways?", answer: "A Doom Buggy.", difficulty: "easy", kidFriendly: true },
    { question: "Who is the floating head calling the spirits inside the crystal ball?", answer: "Madame Leota.", difficulty: "medium", kidFriendly: true },
    { question: "What instrument is playing in the graveyard scene?", answer: "A pipe organ.", difficulty: "easy", kidFriendly: true },
    { question: "What animals are pulling the invisible hearse outside?", answer: "Invisible horses.", difficulty: "medium", kidFriendly: true },
    { question: "What famous ghost holds his head in a box?", answer: "The Hatbox Ghost.", difficulty: "medium", kidFriendly: true },
    { question: "What are the ghosts doing in the grand ballroom?", answer: "Waltzing and dancing.", difficulty: "easy", kidFriendly: true },
    { question: "How many singing busts perform in the graveyard?", answer: "Five.", difficulty: "hard", kidFriendly: false },
    { question: "What happens in the very first room you enter?", answer: "The room stretches.", difficulty: "easy", kidFriendly: true },
    { question: "What color is the bride's beating heart in the attic?", answer: "Red.", difficulty: "medium", kidFriendly: true },
  ],

  "Big Thunder Mountain Railroad": [
    { question: "What kind of town is Big Thunder located in?", answer: "A mining town.", difficulty: "easy", kidFriendly: true },
    { question: "What animal can you spot chewing on clothing during the ride?", answer: "A goat.", difficulty: "medium", kidFriendly: true },
    { question: "What famous warning does the announcer give before the train leaves?", answer: "Hold onto your hats and glasses.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of bones are sticking out near the ride tracks?", answer: "Dinosaur bones.", difficulty: "medium", kidFriendly: true },
    { question: "What can the interactive queue cranks set off?", answer: "Fake dynamite explosions.", difficulty: "easy", kidFriendly: true },
    { question: "What natural feature shoots water high into the air?", answer: "Geysers.", difficulty: "easy", kidFriendly: true },
    { question: "What is the name of the mining company on the signs?", answer: "Big Thunder Mining Co.", difficulty: "medium", kidFriendly: true },
    { question: "What flying animals do you hear in the dark cavern?", answer: "Bats.", difficulty: "easy", kidFriendly: true },
    { question: "Big Thunder is themed around what runaway vehicle?", answer: "A mine train.", difficulty: "easy", kidFriendly: true },
    { question: "Which row usually feels wildest on Big Thunder?", answer: "The back row.", difficulty: "easy", kidFriendly: true },
  ],

  "Space Mountain": [
    { question: "What shape is the Space Mountain building from the outside?", answer: "A dome or cone shape.", difficulty: "easy", kidFriendly: true },
    { question: "Are the rockets in Space Mountain flying in the light or the dark?", answer: "In the dark.", difficulty: "easy", kidFriendly: true },
    { question: "What color lights flash in the long tunnel near the start?", answer: "Blue lights.", difficulty: "medium", kidFriendly: true },
    { question: "How many people sit in one Magic Kingdom Space Mountain rocket?", answer: "Three, single-file.", difficulty: "medium", kidFriendly: true },
    { question: "What is the name of the spaceport you are walking through?", answer: "Starport 75.", difficulty: "hard", kidFriendly: false },
    { question: "What flies across the ceiling while you wait in the main indoor queue?", answer: "Asteroids and meteors.", difficulty: "medium", kidFriendly: true },
    { question: "What color is the outside of Space Mountain?", answer: "White.", difficulty: "easy", kidFriendly: true },
    { question: "Which slow-moving ride passes inside Space Mountain?", answer: "The PeopleMover.", difficulty: "medium", kidFriendly: true },
    { question: "True or false: Space Mountain goes upside down.", answer: "False.", difficulty: "easy", kidFriendly: true },
    { question: "Space Mountain is mostly famous for being what kind of coaster?", answer: "An indoor dark coaster.", difficulty: "easy", kidFriendly: true },
  ],

  "Tiana's Bayou Adventure": [
    { question: "What city is Tiana's Bayou Adventure set near?", answer: "New Orleans.", difficulty: "easy", kidFriendly: true },
    { question: "What instrument does Louis the alligator play?", answer: "The trumpet.", difficulty: "easy", kidFriendly: true },
    { question: "What food is Tiana famous for making?", answer: "Beignets.", difficulty: "medium", kidFriendly: true },
    { question: "Who is the 200-year-old fairy godmother of the bayou?", answer: "Mama Odie.", difficulty: "medium", kidFriendly: true },
    { question: "What bugs light up the bayou at night?", answer: "Fireflies.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of business is Tiana running in the ride story?", answer: "Tiana's Foods.", difficulty: "hard", kidFriendly: false },
    { question: "What is Tiana searching for in the bayou?", answer: "Musicians for the celebration.", difficulty: "medium", kidFriendly: true },
    { question: "What type of ride vehicle do you sit in?", answer: "A log.", difficulty: "easy", kidFriendly: true },
    { question: "True or false: You will probably get wet on this ride.", answer: "True.", difficulty: "easy", kidFriendly: true },
    { question: "Tiana's Bayou Adventure continues the story after which Disney movie?", answer: "The Princess and the Frog.", difficulty: "easy", kidFriendly: true },
  ],

  "Pirates of the Caribbean": [
    { question: "What kind of animal holds the keys in the jail cell scene?", answer: "A dog.", difficulty: "easy", kidFriendly: true },
    { question: "What does a pirate use to look far away across the ocean?", answer: "A spyglass.", difficulty: "easy", kidFriendly: true },
    { question: "What is the weather like near the beginning of the ride?", answer: "A thunderstorm.", difficulty: "medium", kidFriendly: true },
    { question: "Who is hiding in a barrel looking at a treasure map?", answer: "Captain Jack Sparrow.", difficulty: "medium", kidFriendly: true },
    { question: "What song do the pirates sing?", answer: "Yo Ho, A Pirate's Life for Me.", difficulty: "easy", kidFriendly: true },
  ],

  "Buzz Lightyear's Space Ranger Spin": [
    { question: "Who is Buzz Lightyear's sworn enemy?", answer: "Evil Emperor Zurg.", difficulty: "easy", kidFriendly: true },
    { question: "What shape are the targets you are trying to hit with your laser?", answer: "The letter Z.", difficulty: "easy", kidFriendly: true },
    { question: "Where does Buzz Lightyear get his power from?", answer: "Batteries.", difficulty: "medium", kidFriendly: true },
    { question: "What color are the little aliens?", answer: "Green.", difficulty: "easy", kidFriendly: true },
    { question: "What tool do you use to spin your ride vehicle?", answer: "A joystick or lever.", difficulty: "easy", kidFriendly: true },
  ],

  "it's a small world": [
    { question: "How do you travel through this ride?", answer: "On a boat.", difficulty: "easy", kidFriendly: true },
    { question: "What are the dolls doing inside the ride?", answer: "Singing and dancing.", difficulty: "easy", kidFriendly: true },
    { question: "What greets you at the very end of the ride?", answer: "Goodbye signs in different languages.", difficulty: "medium", kidFriendly: true },
    { question: "Who created the famous visual style of it's a small world?", answer: "Mary Blair.", difficulty: "medium", kidFriendly: false },
    { question: "What is the main message of it's a small world?", answer: "The world is connected.", difficulty: "easy", kidFriendly: true },
  ],

  "The Many Adventures of Winnie the Pooh": [
    { question: "What is Winnie the Pooh's favorite food?", answer: "Honey, spelled Hunny on his pots.", difficulty: "easy", kidFriendly: true },
    { question: "Which animal loves to bounce on its tail?", answer: "Tigger.", difficulty: "easy", kidFriendly: true },
    { question: "What color is Pooh's shirt?", answer: "Red.", difficulty: "easy", kidFriendly: true },
    { question: "Who lives in a house shaped like a giant tree?", answer: "Owl.", difficulty: "medium", kidFriendly: true },
    { question: "What spooky creatures does Pooh dream about?", answer: "Heffalumps and Woozles.", difficulty: "medium", kidFriendly: true },
  ],

  "Dumbo the Flying Elephant": [
    { question: "What makes Dumbo able to fly?", answer: "His giant ears.", difficulty: "easy", kidFriendly: true },
    { question: "What is the name of the mouse who helps Dumbo?", answer: "Timothy Q. Mouse.", difficulty: "medium", kidFriendly: true },
    { question: "What object helps Dumbo believe he can fly?", answer: "A magic feather.", difficulty: "medium", kidFriendly: true },
    { question: "What controls how high your Dumbo flies?", answer: "A lever or joystick inside the ride.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of animal stands on top of the ride spinning the sign?", answer: "A stork.", difficulty: "hard", kidFriendly: false },
  ],

  "The Barnstormer": [
    { question: "Who is the star of this roller coaster?", answer: "Goofy, also called The Great Goofini.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of vehicle are you riding in?", answer: "An airplane or biplane.", difficulty: "easy", kidFriendly: true },
    { question: "What does Goofy crash through at the end of the ride?", answer: "A billboard.", difficulty: "medium", kidFriendly: true },
    { question: "What is Goofy trying to do as a stunt pilot?", answer: "Perform a daredevil trick.", difficulty: "medium", kidFriendly: true },
    { question: "The Barnstormer is usually best for what kind of family moment?", answer: "First coaster confidence.", difficulty: "easy", kidFriendly: true },
  ],

  "Under the Sea - Journey of The Little Mermaid": [
    { question: "What kind of shell do you ride in?", answer: "A clamshell.", difficulty: "easy", kidFriendly: true },
    { question: "Who is the sea witch that steals Ariel's voice?", answer: "Ursula.", difficulty: "easy", kidFriendly: true },
    { question: "What does Ariel call a fork?", answer: "A dinglehopper.", difficulty: "medium", kidFriendly: true },
    { question: "What is the name of Ariel's fish best friend?", answer: "Flounder.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of animal is Sebastian?", answer: "A crab.", difficulty: "easy", kidFriendly: true },
  ],

  "Mad Tea Party": [
    { question: "What kind of objects do you ride inside?", answer: "Giant teacups.", difficulty: "easy", kidFriendly: true },
    { question: "Which Disney movie is this ride from?", answer: "Alice in Wonderland.", difficulty: "easy", kidFriendly: true },
    { question: "Who pops out of the giant teapot in the center?", answer: "The Dormouse.", difficulty: "medium", kidFriendly: true },
    { question: "What do you turn to make your cup spin faster?", answer: "A wheel.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of party are they celebrating?", answer: "An Unbirthday party.", difficulty: "medium", kidFriendly: true },
  ],

  "Tomorrowland Speedway": [
    { question: "What do you use to steer the cars?", answer: "A steering wheel.", difficulty: "easy", kidFriendly: true },
    { question: "What stops the cars from driving off the road?", answer: "A guide rail in the center.", difficulty: "medium", kidFriendly: true },
    { question: "Do the cars run on gas or electricity?", answer: "Gas.", difficulty: "medium", kidFriendly: true },
    { question: "What flag is associated with the end of a race?", answer: "A checkered flag.", difficulty: "easy", kidFriendly: true },
    { question: "Tomorrowland Speedway cars go about how fast?", answer: "About 7 miles per hour.", difficulty: "medium", kidFriendly: true },
  ],

  "Tomorrowland Transit Authority PeopleMover": [
    { question: "Which dark roller coaster does the PeopleMover drive inside of?", answer: "Space Mountain.", difficulty: "easy", kidFriendly: true },
    { question: "Where does the PeopleMover take you?", answer: "High above Tomorrowland.", difficulty: "easy", kidFriendly: true },
    { question: "What color are many PeopleMover ride vehicles?", answer: "Blue.", difficulty: "easy", kidFriendly: true },
    { question: "What giant model of a futuristic city do you pass?", answer: "Progress City.", difficulty: "hard", kidFriendly: false },
    { question: "Is the PeopleMover better as a thrill ride, a nap ride, or a foot-rest ride?", answer: "The perfect foot-rest ride.", difficulty: "easy", kidFriendly: true },
  ],

  "Walt Disney's Carousel of Progress": [
    { question: "Does the stage move, or does the audience move?", answer: "The audience moves around the stage.", difficulty: "medium", kidFriendly: true },
    { question: "What is the famous song throughout the show?", answer: "There's a Great Big Beautiful Tomorrow.", difficulty: "medium", kidFriendly: true },
    { question: "Who is the father character narrating the story?", answer: "John.", difficulty: "hard", kidFriendly: false },
    { question: "What appliance keeps causing trouble in the kitchen?", answer: "The oven or stove.", difficulty: "easy", kidFriendly: true },
    { question: "What holiday is the family celebrating in the last scene?", answer: "Christmas.", difficulty: "medium", kidFriendly: true },
  ],

  "Mickey's PhilharMagic": [
    { question: "What magical object does Donald Duck take?", answer: "Mickey's Sorcerer Hat.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of show is PhilharMagic?", answer: "A 3D movie.", difficulty: "easy", kidFriendly: true },
    { question: "What song plays during the magic carpet scene?", answer: "A Whole New World.", difficulty: "medium", kidFriendly: true },
    { question: "Who accidentally causes the chaos in PhilharMagic?", answer: "Donald Duck.", difficulty: "easy", kidFriendly: true },
    { question: "PhilharMagic is especially useful for families because it gives them what?", answer: "Air conditioning and seats.", difficulty: "easy", kidFriendly: true },
  ],

  "Monsters Inc. Laugh Floor": [
    { question: "What powers Monstropolis now?", answer: "Laughter.", difficulty: "easy", kidFriendly: true },
    { question: "Who is the main host of the comedy show?", answer: "Mike Wazowski.", difficulty: "medium", kidFriendly: true },
    { question: "Who constantly watches Mike?", answer: "Roz.", difficulty: "medium", kidFriendly: false },
    { question: "What do they ask the audience to send in before the show?", answer: "Jokes.", difficulty: "easy", kidFriendly: true },
    { question: "What happens if they do not fill the laugh canister?", answer: "The audience cannot leave.", difficulty: "medium", kidFriendly: true },
  ],

  "Walt Disney's Enchanted Tiki Room": [
    { question: "What kind of animals sing in this show?", answer: "Tropical birds.", difficulty: "easy", kidFriendly: true },
    { question: "What famous dessert is sold nearby?", answer: "Dole Whip.", difficulty: "easy", kidFriendly: true },
    { question: "What do the flowers do during the show?", answer: "They sing.", difficulty: "medium", kidFriendly: true },
    { question: "What kind of Disney technology helped make this show famous?", answer: "Audio-Animatronics.", difficulty: "medium", kidFriendly: false },
    { question: "What weather event happens outside the fake windows?", answer: "A rainstorm.", difficulty: "medium", kidFriendly: true },
  ],

  "The Magic Carpets of Aladdin": [
    { question: "What animal spits water at the riders?", answer: "A golden camel.", difficulty: "easy", kidFriendly: true },
    { question: "What controls the carpet going up and down?", answer: "A lever in the front seat.", difficulty: "easy", kidFriendly: true },
    { question: "What controls the carpet tilting forward and backward?", answer: "A magic scarab button in the back seat.", difficulty: "medium", kidFriendly: true },
    { question: "What color is the Genie?", answer: "Blue.", difficulty: "easy", kidFriendly: true },
    { question: "Magic Carpets is most similar to which Magic Kingdom ride style?", answer: "A Dumbo-style spinner.", difficulty: "easy", kidFriendly: true },
  ],

  "Prince Charming Regal Carrousel": [
    { question: "What kind of animal do you ride?", answer: "A horse.", difficulty: "easy", kidFriendly: true },
    { question: "Which princess does this ride connect to?", answer: "Cinderella.", difficulty: "easy", kidFriendly: true },
    { question: "What detail is said to identify Cinderella's horse?", answer: "A golden ribbon on the tail.", difficulty: "hard", kidFriendly: false },
    { question: "What plays the music while you ride?", answer: "A mechanical organ.", difficulty: "medium", kidFriendly: true },
    { question: "Are any two horses carved exactly the same?", answer: "No.", difficulty: "medium", kidFriendly: true },
  ],

  "Enchanted Tales with Belle": [
    { question: "What object does Maurice ask you to look at in the workshop?", answer: "A magic mirror.", difficulty: "medium", kidFriendly: true },
    { question: "What does the magic mirror turn into?", answer: "A door to the castle.", difficulty: "easy", kidFriendly: true },
    { question: "Who do you meet inside the library?", answer: "Belle.", difficulty: "easy", kidFriendly: true },
    { question: "Who is the talking candlestick?", answer: "Lumiere.", difficulty: "easy", kidFriendly: true },
    { question: "What magical object is central to Beauty and the Beast?", answer: "The enchanted rose.", difficulty: "medium", kidFriendly: true },
  ],

  "Country Bear Musical Jamboree": [
    { question: "What kind of animals are putting on the show?", answer: "Bears.", difficulty: "easy", kidFriendly: true },
    { question: "What hangs on the wall and talks during the show?", answer: "Animal heads.", difficulty: "medium", kidFriendly: true },
    { question: "What style of music do the bears perform?", answer: "Country-style music.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of attraction is Country Bear Musical Jamboree?", answer: "An Audio-Animatronic show.", difficulty: "medium", kidFriendly: true },
    { question: "If the bears started a family band, what would they probably need first?", answer: "A stage and instruments.", difficulty: "easy", kidFriendly: true },
  ],

  "The Hall of Presidents": [
    { question: "Which president is one of the main figures in the show?", answer: "Abraham Lincoln.", difficulty: "medium", kidFriendly: true },
    { question: "How many presidents appear on stage at the end?", answer: "All of them.", difficulty: "easy", kidFriendly: true },
    { question: "What famous American building does the outside resemble?", answer: "Independence Hall.", difficulty: "hard", kidFriendly: false },
    { question: "What does the animatronic Lincoln famously do?", answer: "He stands up from his chair.", difficulty: "medium", kidFriendly: false },
    { question: "Hall of Presidents is one of Magic Kingdom's best hidden weapons for what?", answer: "A long seated air-conditioned break.", difficulty: "easy", kidFriendly: true },
  ],

  "Astro Orbiter": [
    { question: "Where do you board Astro Orbiter compared with most spinner rides?", answer: "High above Tomorrowland.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of vehicles do you ride?", answer: "Rocket ships.", difficulty: "easy", kidFriendly: true },
    { question: "What can riders control during the ride?", answer: "How high their rocket flies.", difficulty: "easy", kidFriendly: true },
    { question: "Astro Orbiter is located near which relaxing Tomorrowland ride?", answer: "The PeopleMover.", difficulty: "medium", kidFriendly: true },
    { question: "What makes Astro Orbiter feel more intense than it looks?", answer: "It spins high above Tomorrowland.", difficulty: "medium", kidFriendly: true },
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
  "Guardians of the Galaxy: Cosmic Rewind": [
    { question: "What planet are you visiting in the Guardians of the Galaxy queue story?", answer: "Xandar.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of coaster is Cosmic Rewind known for being?", answer: "A rotating indoor storytelling coaster.", difficulty: "medium", kidFriendly: true },
    { question: "Which Guardians character is a talking raccoon?", answer: "Rocket.", difficulty: "easy", kidFriendly: true },
    { question: "Which Guardians character is a tree-like hero?", answer: "Groot.", difficulty: "easy", kidFriendly: true },
    { question: "What does Star-Lord love listening to?", answer: "Classic pop and rock music.", difficulty: "easy", kidFriendly: true },
    { question: "What is the large ship associated with the Guardians called?", answer: "The Milano.", difficulty: "medium", kidFriendly: true },
    { question: "What color is Gamora often associated with?", answer: "Green.", difficulty: "easy", kidFriendly: true },
    { question: "What is unusual about the ride vehicles on Cosmic Rewind?", answer: "They rotate to point riders toward the story.", difficulty: "medium", kidFriendly: true },
    { question: "Cosmic Rewind is located in which EPCOT neighborhood?", answer: "World Discovery.", difficulty: "medium", kidFriendly: true },
    { question: "What kind of music surprise can happen during the ride?", answer: "The ride can play different songs.", difficulty: "medium", kidFriendly: true },
  ],

  "Frozen Ever After": [
    { question: "Which sisters are the main characters of Frozen?", answer: "Anna and Elsa.", difficulty: "easy", kidFriendly: true },
    { question: "What is the name of the snowman who loves warm hugs?", answer: "Olaf.", difficulty: "easy", kidFriendly: true },
    { question: "What is the name of Kristoff's reindeer?", answer: "Sven.", difficulty: "easy", kidFriendly: true },
    { question: "What song is Elsa most famous for singing?", answer: "Let It Go.", difficulty: "easy", kidFriendly: true },
    { question: "What is the name of the giant snow monster Elsa creates?", answer: "Marshmallow.", difficulty: "medium", kidFriendly: true },
    { question: "Frozen Ever After is located in which EPCOT pavilion?", answer: "Norway.", difficulty: "easy", kidFriendly: true },
    { question: "Frozen Ever After replaced what original Norway pavilion boat ride?", answer: "Maelstrom.", difficulty: "hard", kidFriendly: false },
    { question: "What kind of ride vehicle do you board on Frozen Ever After?", answer: "A boat.", difficulty: "easy", kidFriendly: true },
    { question: "True or false: Frozen Ever After has a small backward movement.", answer: "True.", difficulty: "medium", kidFriendly: true },
    { question: "What kingdom is Frozen set in?", answer: "Arendelle.", difficulty: "medium", kidFriendly: true },
  ],

  "Remy's Ratatouille Adventure": [
    { question: "What kind of animal is Remy?", answer: "A rat.", difficulty: "easy", kidFriendly: true },
    { question: "What city is Remy's Ratatouille Adventure set in?", answer: "Paris.", difficulty: "easy", kidFriendly: true },
    { question: "What is the name of the famous chef whose motto inspires Remy?", answer: "Chef Auguste Gusteau.", difficulty: "medium", kidFriendly: true },
    { question: "What is Gusteau's famous motto?", answer: "Anyone can cook.", difficulty: "easy", kidFriendly: true },
    { question: "What type of ride system does Remy's Ratatouille Adventure use?", answer: "A trackless ride system.", difficulty: "medium", kidFriendly: true },
    { question: "In the ride, guests are made to feel about the size of what?", answer: "A rat.", difficulty: "easy", kidFriendly: true },
    { question: "Which EPCOT pavilion is Remy's Ratatouille Adventure in?", answer: "France.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of kitchen chaos does Remy try to escape?", answer: "A busy restaurant kitchen.", difficulty: "easy", kidFriendly: true },
    { question: "What is the name of the restaurant from Ratatouille?", answer: "Gusteau's.", difficulty: "medium", kidFriendly: true },
    { question: "What food is in the attraction's title?", answer: "Ratatouille.", difficulty: "easy", kidFriendly: true },
  ],

  "Test Track": [
    { question: "What type of vehicle do you ride on Test Track?", answer: "A test car.", difficulty: "easy", kidFriendly: true },
    { question: "What is Test Track mostly about?", answer: "Testing how a vehicle performs.", difficulty: "easy", kidFriendly: true },
    { question: "What part of Test Track is famous for feeling the fastest?", answer: "The outdoor speed section.", difficulty: "easy", kidFriendly: true },
    { question: "True or false: Test Track is a slow boat ride.", answer: "False.", difficulty: "easy", kidFriendly: true },
    { question: "What does a vehicle need to handle during testing?", answer: "Speed, turns, weather, and road conditions.", difficulty: "medium", kidFriendly: true },
    { question: "Which EPCOT neighborhood is Test Track in?", answer: "World Discovery.", difficulty: "medium", kidFriendly: true },
    { question: "What kind of real-world process inspires the attraction?", answer: "Automotive testing.", difficulty: "medium", kidFriendly: true },
    { question: "What should riders do before the high-speed section?", answer: "Hold on and get ready.", difficulty: "easy", kidFriendly: true },
    { question: "What is one thing engineers care about when testing a car?", answer: "Safety, speed, handling, or efficiency.", difficulty: "medium", kidFriendly: true },
    { question: "Why does the outdoor section feel exciting?", answer: "Because the car accelerates quickly outside.", difficulty: "easy", kidFriendly: true },
  ],

  "Soarin' Around the World": [
    { question: "What does Soarin' make you feel like you are doing?", answer: "Flying.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of screen helps create the flying feeling?", answer: "A giant curved screen.", difficulty: "medium", kidFriendly: true },
    { question: "What do your feet do during Soarin'?", answer: "They hang in the air.", difficulty: "easy", kidFriendly: true },
    { question: "What sense besides sight and sound does Soarin' sometimes use?", answer: "Smell.", difficulty: "medium", kidFriendly: true },
    { question: "What famous structure in Paris can guests see on Soarin' Around the World?", answer: "The Eiffel Tower.", difficulty: "easy", kidFriendly: true },
    { question: "What natural wonder in Africa may appear during Soarin' Around the World?", answer: "Mount Kilimanjaro.", difficulty: "medium", kidFriendly: true },
    { question: "Which EPCOT pavilion area is Soarin' located near?", answer: "The Land pavilion.", difficulty: "easy", kidFriendly: true },
    { question: "What should you buckle before the flight begins?", answer: "Your seat belt.", difficulty: "easy", kidFriendly: true },
    { question: "What is the ride's main family-friendly thrill?", answer: "The feeling of gliding high above the world.", difficulty: "easy", kidFriendly: true },
    { question: "True or false: Soarin' is a roller coaster.", answer: "False.", difficulty: "easy", kidFriendly: true },
  ],

  "Spaceship Earth": [
    { question: "What giant shape is Spaceship Earth famous for?", answer: "A geodesic sphere.", difficulty: "medium", kidFriendly: true },
    { question: "What is the ride mostly about?", answer: "The history of human communication.", difficulty: "medium", kidFriendly: true },
    { question: "What invention helped people print books faster?", answer: "The printing press.", difficulty: "medium", kidFriendly: true },
    { question: "What do you ride in on Spaceship Earth?", answer: "A slow-moving ride vehicle.", difficulty: "easy", kidFriendly: true },
    { question: "What does Spaceship Earth look like to many kids from far away?", answer: "A giant golf ball.", difficulty: "easy", kidFriendly: true },
  ],

  "Mission: SPACE": [
    { question: "What planet is Mission: SPACE most famously connected to?", answer: "Mars.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of job are guests pretending to train for?", answer: "Astronaut.", difficulty: "easy", kidFriendly: true },
    { question: "What color mission is usually the more intense version?", answer: "Orange.", difficulty: "medium", kidFriendly: true },
    { question: "What color mission is usually the less intense version?", answer: "Green.", difficulty: "medium", kidFriendly: true },
    { question: "What should guests pay attention to before riding Mission: SPACE?", answer: "The intensity warnings.", difficulty: "easy", kidFriendly: true },
  ],

  "Living with the Land": [
    { question: "What does Living with the Land teach guests about?", answer: "Farming, food, and the environment.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of ride vehicle do you board?", answer: "A boat.", difficulty: "easy", kidFriendly: true },
    { question: "What do you see growing inside the greenhouses?", answer: "Plants, fruits, vegetables, and other crops.", difficulty: "easy", kidFriendly: true },
    { question: "What is one animal-based farming area shown on the ride?", answer: "Aquaculture.", difficulty: "medium", kidFriendly: true },
    { question: "Which EPCOT pavilion is Living with the Land inside?", answer: "The Land pavilion.", difficulty: "easy", kidFriendly: true },
  ],

  "The Seas with Nemo & Friends": [
    { question: "What kind of animal is Nemo?", answer: "A clownfish.", difficulty: "easy", kidFriendly: true },
    { question: "Who is Nemo's forgetful friend?", answer: "Dory.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of shell-shaped vehicle do guests ride in?", answer: "A clamobile.", difficulty: "medium", kidFriendly: true },
    { question: "Where does the ride lead guests after the attraction?", answer: "Into The Seas aquarium area.", difficulty: "easy", kidFriendly: true },
    { question: "What is Nemo's dad's name?", answer: "Marlin.", difficulty: "easy", kidFriendly: true },
  ],

  "Journey of Water, Inspired by Moana": [
    { question: "Which Disney character inspires Journey of Water?", answer: "Moana.", difficulty: "easy", kidFriendly: true },
    { question: "What natural element is the walkthrough all about?", answer: "Water.", difficulty: "easy", kidFriendly: true },
    { question: "What can guests do with some of the water features?", answer: "Interact with them.", difficulty: "easy", kidFriendly: true },
    { question: "What chicken from Moana can guests look for in the rockwork?", answer: "Hei Hei.", difficulty: "medium", kidFriendly: true },
    { question: "True or false: Journey of Water is a roller coaster.", answer: "False.", difficulty: "easy", kidFriendly: true },
  ],

  "Journey into Imagination with Figment": [
    { question: "Who is the purple dragon in this attraction?", answer: "Figment.", difficulty: "easy", kidFriendly: true },
    { question: "What is Figment all about?", answer: "Imagination.", difficulty: "easy", kidFriendly: true },
    { question: "What sense gets a silly surprise during the ride?", answer: "Smell.", difficulty: "medium", kidFriendly: true },
    { question: "What is the name of the Imagination Institute character who guides the tour?", answer: "Dr. Nigel Channing.", difficulty: "hard", kidFriendly: false },
    { question: "What does Figment usually do to the serious tour?", answer: "He causes playful chaos.", difficulty: "easy", kidFriendly: true },
  ],

  "Gran Fiesta Tour Starring The Three Caballeros": [
    { question: "Which Disney duck stars in Gran Fiesta Tour?", answer: "Donald Duck.", difficulty: "easy", kidFriendly: true },
    { question: "Who are Donald's two bird friends in The Three Caballeros?", answer: "Panchito and José Carioca.", difficulty: "medium", kidFriendly: true },
    { question: "Which EPCOT pavilion hides Gran Fiesta Tour?", answer: "Mexico.", difficulty: "easy", kidFriendly: true },
    { question: "What kind of ride is Gran Fiesta Tour?", answer: "A boat ride.", difficulty: "easy", kidFriendly: true },
    { question: "What is Donald doing during much of the ride story?", answer: "Getting separated from his friends.", difficulty: "medium", kidFriendly: true },
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
  ],

  "Gorilla Falls Exploration Trail": [
    {
      question: "Gorilla Falls is best enjoyed how?",
      choices: ["Slowly and self-paced", "As a roller coaster", "Only at night", "Without looking around"],
      answer: "Slowly and self-paced",
      fact:
        "Animal trails work best when your family slows down and actually looks.",
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
  ],

  "Feathered Friends in Flight!": [
    {
      question: "Feathered Friends in Flight! focuses on what animals?",
      choices: ["Birds", "Tigers", "Gorillas", "Dinosaurs"],
      answer: "Birds",
      fact:
        "It uses trained bird behaviors, humor, and live demonstrations.",
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
  ],

  "Adventurers Outpost": [
    {
      question: "Adventurers Outpost is mainly known as what kind of experience?",
      choices: ["Character meet-and-greet", "Water ride", "Coaster", "Train station"],
      answer: "Character meet-and-greet",
      fact:
        "For character-focused families, this can be more emotionally important than a short wait-time calculation suggests.",
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
  ],

  "Affection Section": [
    {
      question: "Affection Section is best described as what?",
      choices: ["Animal interaction area", "Roller coaster", "Indoor 4D show", "Boat ride"],
      answer: "Animal interaction area",
      fact:
        "It can be a sweet slower moment for animal-loving kids if the family already committed to Rafiki’s Planet Watch.",
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
