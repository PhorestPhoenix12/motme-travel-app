export type CaseInterest = 'Landmarks' | 'Food' | 'Museums' | 'Nature' | 'Nightlife' | 'Architecture' | 'Shopping'

export const QUEST_VARIANTS: Record<CaseInterest, Array<{ title: string; hints: string[] }>> = {
  Landmarks: [
    {
      title: "The Bell That Beats the Sunrise",
      hints: [
        "The night clerk stamps this on the tower that has marked {city}'s parish hours since before the railway. A pointed spire, an open belfry — the bells show before the doors.",
        "Take the small square that answers to its west front. Paired doors, a rose or clock above them, a south aisle in shadow. A bridge or fortress gate is another dossier.",
        "Count the belfry openings and the colour of the stone. The south-flank door the sacristan still uses is the seal on this case.",
      ],
    },
    {
      title: "The Span the Maps Still Argue",
      hints: [
        "This is the old foot-crossing {city} still trusts instead of the modern road bridge — a sealed fact, not a rumor. Stone or iron arches over water, houses or shops clinging to a bank.",
        "Walk to mid-span. Count the bays. Lions, lamps, or stalls on the deck; boats passing under. If traffic owns the whole roadway, you have the wrong file.",
        "At the crown, file the downstream view. The parapet is worn smooth at chest height where generations have leaned. That wear is the evidence.",
      ],
    },
    {
      title: "The Square That Keeps a Watcher",
      hints: [
        "The city's main civic square — the paved open place {city} still cuts across on errands — keeps a statue, column, or fountain at its heart. Porters call it the watcher.",
        "Name the figure without a plaque if you can: bronze horseman, orator, obelisk, stacked bowls. The paving changes underfoot as you near it.",
        "Circuit the square. One facade is grander — palace, basilica, or town hall. File the monument with that facade. They share this briefing.",
      ],
    },
    {
      title: "The Gate the Walls Remember",
      hints: [
        "A gate built to keep armies out still opens {city} into the old town. The arch is thicker than any house — brick or stone meant for a siege, not a parish spire.",
        "Look for arrow slits or cannon ports and a drop to a moat, road, or water on the outer side. The inner face is the city's; the outer face is the world's.",
        "Photograph the arch looking out. If a clock tower or church stands just beyond, keep it in the frame. That pairing is how the depot describes this file.",
      ],
    },
    {
      title: "The Promenade That Faces the Water",
      hints: [
        "A monument on {city}'s waterfront — column, winged figure, or belvedere — faces open water and marks where the city meets harbor, lake, or sea. The wind off the water is part of the classification.",
        "A wide walk, quay steps, or stone terrace comes first. Ferries, fishing boats, or a light should share the view. A hill climb or a nave is the wrong envelope.",
        "Stand with your back to the water. Note the first grand building inland, then turn and file water plus monument. That two-way view closes the case.",
      ],
    },
    {
      title: "The Clock That Runs the Quarter",
      hints: [
        "A civic clock, not a church, still sets the hour for {city}'s market or town-hall quarter. Several faces look down from a public building the shopkeepers still consult.",
        "At street level: loggia, market arches, or municipal doors — never holy-water stoups. The bells may strike without a mass.",
        "Count the faces and whether the numerals are Roman. File the tower with the civic building it belongs to. A nearby cathedral is a decoy.",
      ],
    },
    {
      title: "The Fountain That Never Travels",
      hints: [
        "A public fountain {city} has used for centuries: sculpted figures, stacked basins, water loud enough to hear before you see it. Coins and superstition cling to the rim.",
        "Count the tiers. One figure dominates — god, beast, or allegory. Several streets arrive here; this is a crossroads the city never moved.",
        "Walk the rim. File the wet stone, the largest sculpture, and the building that photographs as its backdrop. Even if the water is off, the sculpture still names the place.",
      ],
    },
    {
      title: "The Terrace Above the Roofs",
      hints: [
        "The hill or rampart {city} uses for air: from the terrace you look down on roofs and a recognizable dome or bridge. The clerk files a prospect, not a pavement spire.",
        "The path is stepped or switchbacked. At the top: terrace, fort, or churchyard, perhaps a panorama plaque. Station and river, if the city has them, should both answer a single turn.",
        "File the skyline with a known dome or bridge in it, and the railing you lean on. The cafe at the bottom of the hill is not this case.",
      ],
    },
  ],
  Food: [
    {
      title: "The Marble Table That Never Closes Early",
      hints: [
        "A grand cafe that has served {city} coffee and pastry since the railway age. High ceiling, marble or zinc, a long glass case — the Express still takes its morning there.",
        "The room runs deep: counter, cakes, jackets on the waiters. A mirror, chandelier, or painted ceiling gives the century away.",
        "Order the house coffee and the pastry the case is built around. Note the saucer or the name the staff use for the room. File that rite, not a dinner kitchen.",
      ],
    },
    {
      title: "The Family Kitchen Off the Corso",
      hints: [
        "A family kitchen a street off {city}'s corso, cooking the city's own food from a short chalkboard. Small room, checked cloth or paper napkins — a sealed address, not a tourist board of every cuisine.",
        "The doorway is easy to miss. Stock, grill, or tomato reaches you before the sign. Few tables. The owner still greets regulars by name.",
        "Sit. Order the first dish on the board, or the day's plate. Ask which neighborhood the recipe belongs to. The answer and the plate close this kitchen's file.",
      ],
    },
    {
      title: "The Stall That Sells the City by Weight",
      hints: [
        "A standing counter in {city}'s working market that sells one local specialty by weight or scoop. Crates, ice, overlapping voices — the city priced in kilos, not white cloth.",
        "The stall holds a corner or end-cap. One craft: produce, cheese, spice, or fry. Neighboring stalls sell the same city's ingredients in other forms.",
        "Buy a small portion of what they are famous for. Ask which village or hill it comes from. File the awning or stall number. A dining room is another envelope.",
      ],
    },
    {
      title: "The Window That Perfumes the Street",
      hints: [
        "A bakery whose oven still perfumes {city}'s pavement. The window is bread, tarts, or laminated dough — sugar and heat as the classified trade, not espresso as the main event.",
        "The morning line moves. Trays come through a hatch. Flour, a peel, or a marble slab should show behind the glass.",
        "Buy the shape this shop is known for — ring, filled bun, dark loaf — and note the wrap. File the window. A cafe next door is a different case.",
      ],
    },
    {
      title: "The Counter That Faces the Catch",
      hints: [
        "A catch kitchen on {city}'s harbor, canal, or fish market. Ice, grill or fryer, boats or crates in the same view as the counter — the night's work still on the slab.",
        "Stools or standing room. The list is short and changes with the boats. Lemon, oil, charcoal or a fryer do most of the labour.",
        "Order whatever came in that morning. Ask the fish's name in the local tongue. File the counter with water or crates behind it.",
      ],
    },
    {
      title: "The Cellar of Unwritten Hours",
      hints: [
        "A cellar osteria that pours {city}'s own wine by the glass and cuts a simple plate. Stone vault or barrels, low light — hours the timetable never printed.",
        "Bottles along a wall. The list is a chalkboard of vintages and a few plates: cheese, ham, crostini. Not a cocktail story.",
        "Ask for the house pour of this region and the plate that always travels with it. File the pairing. A cafe upstairs is not this briefing.",
      ],
    },
  ],
  Museums: [
    {
      title: "The Palace That Learned to Keep Hours",
      hints: [
        "A palace or purpose-built gallery on {city}'s principal square, raised to show the city's famous paintings or antiquities. Columns, a ticket hall, a monumental stair — civic treasure under glass.",
        "The facade is ceremonial. Inside: long galleries, marble, and the work the city puts on posters. Cloakroom and bookshop are part of the ritual.",
        "Find the room the posters promise, then file the quieter gallery beside it — the one the crowd skips. That second room is your evidence.",
      ],
    },
    {
      title: "The House That Kept Its Furniture",
      hints: [
        "The preserved house, studio, or apartment of someone {city} still names. Rooms kept as they were lived in — kitchen, study, creaking floors — not the galleries of dynasties.",
        "A quieter street than the museum mile. Plaque by the door, a small desk for tickets. Labels speak of the inhabitant, not of emperors.",
        "File a window from inside looking out, and one object that belonged to them — desk, coat, score. A marble atrium is another case.",
      ],
    },
    {
      title: "The Wing That Holds the Older Century",
      hints: [
        "A museum of archaeology or applied arts: metal, clay, or textile behind glass, vitrine light, an older century than the picture galleries next door.",
        "Quieter rooms, long captions. A restoration window or a cast court may lie on the way. The crowd thins here on purpose.",
        "Choose a case on a lower shelf toward the rear of a side room. Read the whole placard. The disputed date or unnamed workshop is the point of this file.",
      ],
    },
    {
      title: "The Gallery of Living Walls",
      hints: [
        "A modern or contemporary gallery in a converted warehouse or white rooms. Installation, large canvas, or moving image — the city's newest sealed rooms, not old masters.",
        "Factory windows, a courtyard, or a loading dock may still confess the building's former life. The cafe serves the rooms, not the other way around.",
        "File the work that occupies a whole wall or floor, then the street through those old windows. That contrast closes the briefing.",
      ],
    },
    {
      title: "The Stacks That Still Smell of Glue",
      hints: [
        "A historic library or archive still used as a reading room. Gilt spines, a decorated ceiling, desks under a supervisor's eye — books as architecture, classified by silence.",
        "Desks face a dais or a window wall. A gallery of stacks or a chained-book display should appear on the public route.",
        "Stand under the main ceiling and file it, then one desk row. Marble emperors mean you wandered into the wrong palace.",
      ],
    },
    {
      title: "The Collection Behind the Shopfront",
      hints: [
        "A small specialist museum — costume, instruments, or a single trade — above shops or in a courtyard. One subject, a handful of rooms. No twenty-wing map is on file.",
        "The ticket is modest. Mannequins, tools, or instruments sit close enough to read without a rope. A volunteer may still know every case.",
        "Ask which object they would save in a fire. File that object and the shop or courtyard you passed to enter.",
      ],
    },
  ],
  Nature: [
    {
      title: "The Oldest Shade on the Map",
      hints: [
        "The principal park {city} laid out for walking: gated green, lawns, and a named old tree with brass or stone at its base — the oldest shade still on the map.",
        "A working fountain, benches that face lawn not traffic, gravel allees or carriage drives. The marker at the tree is worn by many palms.",
        "File the canopy from directly beneath the marked tree, then the gate you entered. A hilltop viewpoint is another envelope.",
      ],
    },
    {
      title: "The Water That Corrects the Streets",
      hints: [
        "A river, canal, or lake shore you can walk for some distance, trees or reeds along the bank. Water is the subject of this file — not a fountain in a square.",
        "Paths stay with the bank. Boats, anglers, or waterfowl. Bridges are scenery, not the destination. The city noise drops a register.",
        "File a bend where a landmark appears on the far bank. Wait until a bird or boat crosses the frame. That is the evidence.",
      ],
    },
    {
      title: "The Garden of Measured Beds",
      hints: [
        "A botanical or princely garden of labeled beds and glasshouses. Latin names on stakes, clipped geometry — scientific order {city} still keeps, not a rambling lawn.",
        "A palm house or orangery. Paths that obey a plan. Gardeners may still be working in sight of visitors.",
        "File one glasshouse or parterre from its long axis, and a single labeled plant that could not grow here without help.",
      ],
    },
    {
      title: "The Hill the City Uses for Air",
      hints: [
        "A green hill or woodland above {city}'s roofs, used for air and prospect. Dirt or uneven stone; the city laid out below like a model on the clerk's desk.",
        "Joggers and dog-walkers outnumber tour groups. At some turn the roofs appear all at once.",
        "File the view with a recognizable dome or bridge, and one tree or rock in the foreground that proves you were on the hill.",
      ],
    },
    {
      title: "The Quiet Menagerie",
      hints: [
        "A zoo, aquarium, or historic menagerie in a park — living collections, old ironwork or a round pavilion beside the cages. You hear them before some of the bars come into view.",
        "A painted taxidermy hall may survive beside modern enclosures. Families set the pace, not connoisseurs.",
        "File one historic pavilion or gate plus the enclosure the crowd is actually watching. The gift shop is not the case.",
      ],
    },
    {
      title: "The Cemetery That Learned to Be a Garden",
      hints: [
        "A historic cemetery {city} now walks as a garden: cypress avenues, ceremonial gates, tombs with a view back at the city or the sea. Keep your voice down; that is in the briefing.",
        "Paths are named. A famous grave, a chapel, or a terrace of monuments should answer.",
        "File one avenue of tombs and the city or water beyond the wall.",
      ],
    },
  ],
  Nightlife: [
    {
      title: "The Painted Sign Before Last Call",
      hints: [
        "An old neighborhood bar with a painted or wooden sign and a worn threshold. Regulars, amber light, brass or wood along the counter — last call as {city} has kept it, not a club queue.",
        "Bottles against a mirror. A television nobody watches. The door handle is smoother on the right, where a century of hands has argued with it.",
        "Order the house pour or the local spirit they pour without a menu. Note the saucer or the small plate that arrives unbidden. File that ritual.",
      ],
    },
    {
      title: "The Room That Waits for Music",
      hints: [
        "A live-music cellar or jazz room where the stage is smaller than the bar. Instruments wait in the corner even when nobody is playing — a classified hour after the last train.",
        "Stairs down, or a back room. Posters of past bills. Tables close enough to hear a piano pedal. The street door may not look like much.",
        "Stay through one set, or ask what night the house band plays. File the stage wall and the first drink.",
      ],
    },
    {
      title: "The Terrace That Catches the Evening",
      hints: [
        "An aperitivo terrace at the hour offices empty: outdoor tables facing a square, water, or boulevard, a local spritz in most glasses. {city} taking its evening in public.",
        "Umbrellas or heaters. You should watch the city without going inside except to order. A basement bar is the wrong depth.",
        "Sit facing the view the terrace was built for. File the glass against that backdrop.",
      ],
    },
    {
      title: "The Door with a Quiet Password",
      hints: [
        "A cocktail room behind an unmarked or barely marked door — bell, curtain, or bookshelf as the tell. Designed light, serious ice. The password is knowing where to knock.",
        "The list reads like a short story. Conversation drops a notch from the street. A pavement cafe is not this envelope.",
        "Order the drink they are proudest of — local bitter, gin, or fruit. File the glass and the door you used to enter.",
      ],
    },
    {
      title: "The Hall of Long Tables",
      hints: [
        "A beer hall or tavern of long shared tables and a house pour by the mug. High wooden room, communal noise, food that arrives without ceremony — {city} celebrating in the open.",
        "Benches, perhaps barrels. Locals still mark occasions here. A whispered cocktail list is another file.",
        "Sit at a shared table. Order the house mug and the plate that always accompanies it. File the hall, not a hotel booth.",
      ],
    },
    {
      title: "The Last Dance Above the Street",
      hints: [
        "A club or ballroom with a proper floor — sprung wood, a booth, or a mirror ball. The bar serves the dancing. After the trams thin, this is still {city}'s late room.",
        "The queue faces a doorman, not a cafe awning. Coats are checked. Inside, the floor is the exhibit.",
        "File the floor from the edge, then the street when you step back out. A quiet wine cellar is another specialty.",
      ],
    },
  ],
  Architecture: [
    {
      title: "The Facade That Changed Its Century",
      hints: [
        "A building whose street face is one century and whose courtyard or interior is another. Through a modest carriage arch: Gothic bones, Baroque plaster, or iron and glass — two dates on one address.",
        "The door may sit between shops. A dry fountain or stair in the court is common. The street does not advertise the interior.",
        "File the lintel or stair from the courtyard looking back at the street door. If two dates are carved, they need not agree. That disagreement is the case.",
      ],
    },
    {
      title: "The Iron and Glass Hour",
      hints: [
        "A 19th-century market hall, gallery, or station shed: iron ribs, a glass roof, light in stripes. The structure is the decoration — industry dressed for the public, filed under glass.",
        "Look up first. Shops or stalls may line the sides. A palace courtyard is a different century's envelope.",
        "File the roof from the center aisle, then one column base with its original number or maker's mark.",
      ],
    },
    {
      title: "The Dome You Can Walk Around",
      hints: [
        "A dome or rotunda you can circuit on foot — drum and cap against {city}'s sky, an oculus or painted ring when you stand underneath. Volume is the clue, not a pointed spire.",
        "From outside, a drum and cap. Inside, stand under the eye of the dome. Echoes are part of the architecture.",
        "File the oculus from the floor, then the drum from the square. A square campanile without a dome is the wrong tower.",
      ],
    },
    {
      title: "The Stair That Performs",
      hints: [
        "A palace, university, or opera famous for its staircase: a double flight or hanging stair under a painted vault. The climb is the exhibit — {city} performing for anyone who takes the landing.",
        "You may need a ticket. Stone balusters, a vault above the flights, perhaps a red carpet that is not ironic. People pause mid-landing to look up.",
        "File the view from the first landing, up and down. A metro escalator or a church bell-stair is not this dossier.",
      ],
    },
    {
      title: "The Brick Experiment",
      hints: [
        "A modern or modernist work that once shocked {city}: exposed concrete, ribbon windows, a flat roof or severe portico. Clean planes. The street may still argue with it.",
        "A plaque will mention an architect more readily than a saint. Gothic doorways nearby are scenery, not the subject.",
        "File the corner where two planes meet, and the street that has to live with it.",
      ],
    },
    {
      title: "The Cloister That Kept Its Walk",
      hints: [
        "A cloister or college quad of repeated arches around a garden, built for pacing. A well or cedar in the middle; voices drop on the walk. This is not a shopping arcade.",
        "The rhythm of columns should lull you. A chapter-house door may sit off one walk.",
        "File one corner of the arcade and the garden it encloses. Shop signs in the arches mean you opened the market-hall case by mistake.",
      ],
    },
  ],
  Shopping: [
    {
      title: "The Passage That Kept Its Glass",
      hints: [
        "A 19th-century covered passage: glass roof, mosaic floor, a narrow indoor street of small shops with two mouths onto the pavement. Daylight through glass — {city}'s weather held at the door.",
        "Brass shop signs, perhaps a clock. Footsteps sound different than on the outside stones.",
        "Walk the full length. File the roof, one original shopfront, and the street you exit onto. A supermarket behind glass is not this briefing.",
      ],
    },
    {
      title: "The Market That Still Uses Voices",
      hints: [
        "The working market where {city} still buys food and household goods — awnings, scales, overlapping calls, handwritten prices. Voices are the classification, not antique theater.",
        "Arrive when it is actually trading. Ice, crates. The edge of the market is as telling as the center.",
        "Ask one vendor where the goods came from. File their stall number or awning color and a crate at their feet.",
      ],
    },
    {
      title: "The Shelf of Second Lives",
      hints: [
        "A flea market or bric-a-brac hall of objects with previous owners: monograms, dates, mismatched china. Dust that is honest — lives that passed through {city} and left a mark.",
        "The best stall is often at the edge, quieter. Weekend mornings are typical. The vendor lets you handle things.",
        "Handle three objects and ask where each came from. File the most specific answer and that stall's corner of the market.",
      ],
    },
    {
      title: "The Independent Spine",
      hints: [
        "An independent bookshop of stacked rooms and a spiral stair or basement of secondhand shelves. Paper in the air — {city}'s unfiled pages, not a station kiosk.",
        "A cat, a blackboard of events, staff who point without a screen.",
        "Ask for a book about this city written by someone who lived here. File the recommendation and the room you were pointed toward.",
      ],
    },
    {
      title: "The Workshop That Still Makes the Thing",
      hints: [
        "A craft workshop that still makes the thing at this address: gloves, hats, paper, chocolate, shoes, or print. Tools in the window — the trade has not left {city}.",
        "A side street. A person at work, or a half-door to a studio. Dye, glue, sugar, or metal in the air.",
        "Ask how long this craft has been practiced here. File the tool bench and one finished object. A mall chain does not count.",
      ],
    },
    {
      title: "The Hall of Many Awnings",
      hints: [
        "A historic department store or emporium of several floors under one roof, a central well or grand stair facing a boulevard. Civic shopping {city} still uses as a landmark.",
        "Look up the well. Counters may survive on the ground floor. Old lettering on the outside.",
        "Go one floor up and file the well looking down, then the original lettering on the street. A passage of tiny shops is a different file.",
      ],
    },
  ],
}
