var murd = {};

murd.flags = {};
murd.flags.showered = "showered";
// A counter of the number of units of food eaten (each action that consumes a
// food item should increment it).
murd.flags.foodEaten = "foodEaten";
// Did we already warn him that he should have his wallet (train pass) whenever
// he rides a train?
murd.warnedTrainPass = "warnedTrainPass";
// Has drank? Set when he drinks water, cleared when he uses the toilet.
murd.flags.hasDrank = "hasDrank";
// Are his hands clean? Set to true when he showers, to false when he eats
// his pizza, needs to wash them in the fountain.
murd.flags.hasCleanHands = "hasCleanHands";

// Given an array of messages, selects an returns one randomly.
function pickRandomMessage(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function isShowerCommand(parsed) {
  return parsed.MatchAny([
      {verb: /shower/, entities: []},
      {verb: /use|get/, entities: [murd.SHOWER]},
  ]);
}

// Returns `text`. If showLink is true, shows it with a link that, when clicked,
// performs action.
function linkToAction(showLink, action, text) {
  if (!showLink) {
    return text;
  }
  return "<a href='javascript:eng.ProcessAction(&quot;" + action + "&quot;);'>"
         + text + "</a>";
}

function linkToRoom(room) {
  return linkToAction(room.visited, "go " + room.NAME, room.TITLE);
}

murd.DREAM = engine.MakeRoom({
  NAME: "dream-world",
  TITLE: "an open space",
  ALIASES: ["space"],
  Init: function() {
    this.playerAlive = true;
    this.actionsCounter = 0;
  },
  Description: function(world) {
    return "You are standing in an open field west of a white house, with a "
        + "boarded front door. There is a small mailbox here.<br>"
        + "A big monster is running towards you!";
  },
  DescribeContents: function(world, objects) {
    var out = [];
    for (var i in objects) {
      var obj = objects[i];
      if (obj.skipContents) {
        continue;  // Already explicitly mentioned.
      }
      out.push(obj)
    }
    return out;
  },
  HandleAction: function(world, parsed) {
    if (murd.DREAM_MONSTER.location != this) {
      world.Print(
          (parsed.verb == "no" || parsed.verb == "n"
               ? "Sure. " : "There's no time for instructions: ")
          + "A big red scary monster appears and starts chasing you! "
          + "Its head glows red. "
          + "As it chases you, it starts growling an electric cry, the fuel of "
          + "headaches.");
      this.Add(murd.DREAM_MONSTER);
      return true;
    }
    if (this.actionsCounter++ % 3 == 0) {
      world.Print("The "
          + pickRandomMessage(["", "ugly ", "scary ", "angry ", "evil "])
          + "monster"
          + pickRandomMessage([
              "'s cry grows increasingly louder!",
              " is closing in!",
              " is rushing towards you!"]));
    }
    if (parsed.MatchAny([
            {verb: /go/, entities: [], modifiers: [/(?:away)?/]},
            {verb: /go/, entities: [], modifiers: []},])) {
      world.Print("You try to get away but the monster catches up with you and "
                  + "eats you.");
      this.playerAlive = false;
      world.Enter(murd.BEDROOM);
      return true;
    }
    if (parsed.Match({verb: /check/, entities: [murd.DREAM_MAILBOX]})) {
      world.Print(murd.DREAM_MAILBOX.Detail(world));
      return true;
    }
    return false;
  },
  CanLeave: function(world, toRoom) {
    murd.DREAM_SPOON.dropIfHeld(world);
    murd.DREAM_POSTCARD.dropIfHeld(world);
    return true;
  },
  Exits: function() {
    var output = {};
    if (!this.playerAlive) { output["bedroom"] = true; }
    return output;
  }
});

murd.BEDROOM = engine.MakeRoom({
  NAME: "bedroom",
  TITLE: "your bedroom",
  ALIASES: ["apartment"],

  Init: function() {
    this.alarmClockOn = true;
    this.bedMade = false;
  },

  Description: function(world) {
    var description = "Your bedroom is a bit messy. ";
    if (this.alarmClockOn) {
      description += " ... *BEEP* *BEEP* *BEEP*... "
          + "There's ... The annoying alarm clock is beeping loudly."
          + " You can't even think with all this noise!";
    } else {
      description += "There's "
          + (this.bedMade ? "a comfortable bed" : "an unmade bed")
          + " and a nightstand besides it."
          + " There's two doors here, one leads to "
          + linkToRoom(murd.RESTROOM)
          + " and one down to "
          + linkToRoom(murd.BRUPBACHERPLATZ)
          + ".";
    }
    return description;
  },

  DescribeContents: function(world, objects) {
    var out = []
    if (this.alarmClockOn) {
      return [];
    }
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.ALARM_CLOCK) {
        // Either explicitly mentioned or the player already interacted with it.
        continue;
      }
      if (obj == murd.BED || obj == murd.NIGHTSTAND) {
        continue;  // Already explicitly mentioned.
      }
      if (obj == murd.WALLET) {
        if (!this.alarmClockOn) {
          world.Print("Your wallet lies on your nightstand.");
        }
      } else {
        out.push(obj)
      }
    }
    return out;
  },

  CanEnter: function(world) {
    if (world.location == murd.BRUPBACHERPLATZ) {
      world.Print("You climb up the stairs to your apartment.");
    }
    if (world.location == murd.DREAM) {
      world.Print("You wake up startled. It was just a dream.<br>"
                  + "You breath deeply.");
    }
    return true;
  },

  CanLeave: function(world, toRoom) {
    if (toRoom == murd.BRUPBACHERPLATZ) {
      if (!world.GetFlag(murd.flags.showered)) {
        world.Print(
            "Hmm, you should probably take a shower first. You smell a bit.");
        return false;
      }
      if (this.alarmClockOn) {
        world.Print("You should turn that stupid alarm clock off first.");
        return false;
      }
      murd.BEDROOM_PLANT.dropIfHeld(world);
    }
    murd.ALARM_CLOCK.dropIfHeld(world);
    return true;
  },

  HandleAction: function(world, parsed) {
    if (isShowerCommand(parsed)) {
      world.Print(
          "I can't do that in the bedroom, but I think there's a shower in the "
          + "restroom.");
      return true;
    }
    if (parsed.Match(
          {verb: /turn/, entities: [murd.ALARM_CLOCK], modifiers: [/off/]})) {
      murd.ALARM_CLOCK.Use(world, null);
      return true;
    }
    if (parsed.MatchAny([
            {verb: /make|fix|tidy|clean/, entities: [murd.BED]},
            {verb: /clean|tidy/, entities: [murd.BED], modifiers: [/up/]}])) {
      this.bedMade = true;
      world.Print("You tidy up your bed a bit.");
      return true;
    }
    return false;
  },

  Exits: function(world) {
    return {"home-restroom": true, "brupbacherplatz": true}
  },
});

murd.RESTROOM = engine.MakeRoom({
  NAME: "home-restroom",
  TITLE: "the restroom",
  ALIASES: ["restroom", "toilet", "bathroom"],

  Init: function() {
    // TODO: Make this a property of RESTROOM_WINDOW.
    this.windowOpen = false;
    // Used to alternate the messages in the description after the window is
    // open.
    this.descriptionCount = 0;
    this.toothBrushUsed = false;
  },

  Description: function(world) {
    var description = "The blue tiles in the restroom are a bit cold.";
    if (this.windowOpen) {
      if (this.descriptionCount % 2 == 0) {
        description +=
            " A refreshing current of fresh air blows in from the open window.";
      } else {
        description += " A cold draft of air, straight from the mountains into "
                       + "your window, makes you shiver. There's ";
      }
      this.descriptionCount++;
    } else {
      description += " The restroom smells a bit. There's a window facing the "
                     + "beautiful mountain of Uetliberg and ";
    }
    description += "a door leading back to " + linkToRoom(murd.BEDROOM)
        + ".";
    return description;
  },

  DescribeContents: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.RESTROOM_WINDOW) {
        continue;  // Already mentioned in the description.
      }
      out.push(obj)
    }
    return out;
  },

  CanEnter: function(world) {
    world.Print("You enter the restroom.");
    return true;
  },
  CanLeave: function(world, toRoom) {
    murd.TOOTH_BRUSH.dropIfHeld(world);
    return true;
  },
  Exits: function(world) {
    return {"bedroom": true}
  },
  HandleAction: function(world, parsed) {
    if (isShowerCommand(parsed)) {
      murd.SHOWER.Use(world);
      return true;
    }
    if (parsed.Match({entities: [murd.RESTROOM_WINDOW]})) {
      if (parsed.Match({verb: /open/})) {
        murd.RESTROOM_WINDOW.Open(world);
        return true;
      } else if (parsed.Match({verb: /close/})) {
        murd.RESTROOM_WINDOW.Close(world);
        return true;
      }
    }
    return false;
  },
});

// TODO: Add a mailbox, with some stuff that becomes critical later in the game?
murd.BRUPBACHERPLATZ = engine.MakeRoom({
  NAME: "brupbacherplatz",
  TITLE: "Brupbacherplatz",
  ALIASES: [
    "street",
    "out",
    "outside",
    "square",
    "platz",
    "plaza",
  ],
  Description: function(world) {
    return "You're in a small park. From here you can go back into "
           + linkToRoom(murd.BEDROOM) + ", to "
           + linkToRoom(murd.BAR) + ", or to "
           + linkToRoom(murd.WIEDIKON) + ".";
  },
  CanEnter: function(world) {
    if (world.location == murd.BEDROOM) {
      world.Print(
          "You unlock the door and take the stairs down. The sun is shinning, "
          + "it's a beautiful day.");
    } else {
      world.Print("The sun is shinning, it's a beautiful day.");
    }
    return true;
  },
  Exits: function(world) {
    return {"bedroom": true, "wiedikon": true, "bar": true};
  }
});

murd.BAR = engine.MakeRoom({
  NAME: "bar",
  TITLE: "the bar",

  Init: function() {
    this.attempts = 0;
  },

  Description: function(world) {},
  CanEnter: function(world) {
    var description =
        "The bar is currently closed. It'll only open in the afternoon.<br>"
        + "You knock on the door repeatedly, but nobody opens.";
    if (this.attempts > 3) {
      description +=
          " You should probably head to Wiedikon and go to work. "
          + " You can come back tonight.";
      if (this.attempts > 5) {
        description += " Don't let anybody say you're an alcoholic.";
      }
    } else if (this.attempts == 0) {
      description +=
          " One old lady walks by, shaking her head and muttering something in "
          + "Swiss German, giving you a look of disapproval.";
    }
    world.Print(description);
    this.attempts ++;
    return false;
  },
});

function DescriptionTrainLines(room) {
  var output =
      "A few train lines run through here, taking you to the following "
      + "stations:";
  var separator = " ";
  room.TrainLines().forEach(
      function(r) {
        output += separator + linkToRoom(r); separator = ", ";
      });
  return output + "<br>";
}

function ExitsTrainLines(room, exits) {
  room.TrainLines().forEach(
      function(r) { exits[r.NAME.toLowerCase()] = true; });
  return exits;
}

function HandleTrainStationAction(world, parsed) {
  /*
   * var sentence = [verb].concat(words).join(" ");
  var pattern =
      "^(board|get|take|ride)"
      + "( the( mother[ -]?fucking)?)?"
      + " (bahn|train|choo[ -]?choo|trains)";
  var takeTheTrain = new RegExp(pattern + "$");
  if (takeTheTrain.exec(sentence)) {
    world.Print(pickRandomMessage([
        "But to which station?",
        "But what station would you like to go to?"]));
    return true;
  }

  var takeTheTrainTo = new RegExp(pattern + " to ([a-z]+)$");
  var result = takeTheTrainTo.exec(sentence);
  if (result != null) {
    world.GoAction([result[result.length - 1]]);
    return true;
  }*/

  return false;
}

murd.WIEDIKON = engine.MakeRoom({
  NAME: "wiedikon",
  TITLE: "the Wiedikon train station",
  ALIASES: ["station", "bahnhof",],
  TrainLines: function() {
    return [murd.ENGE, murd.OERLIKON, murd.AIRPORT, murd.HAUPTBAHNHOF];
  },
  Description: function(world) {
    return "You're in Wiedikon, a small train station.<br>"
           + DescriptionTrainLines(murd.WIEDIKON)
           + "The station has a big clock, always on time. Damn, unlike it, "
           + "you're running late.<br>"
           + "You can walk to " + linkToRoom(murd.BRUPBACHERPLATZ)
           + " from here.";
  },
  HandleAction: HandleTrainStationAction,
  CanEnter: function(world) {
    world.Print("You enter the Wiedikon train station.");
    return true;
  },
  CanLeave: function(world, toRoom) {
    if (toRoom == murd.BRUPBACHERPLATZ) {
      return true;  // Okay, why not.
    }
    if (toRoom == murd.ENGE) {
      if (world.INVENTORY.objects.indexOf(murd.WALLET) == -1) {
        if (!world.GetFlag(murd.flags.warnedTrainPass)) {
          world.SetFlag(murd.flags.warnedTrainPass, true);
          world.Print(
              "Oh, dang: looks like you forgot your wallet, which has your "
              + "train pass. You shouldn't ride the trains without it.");
          return false;
        }
        world.Print(
            "You board your train without your train pass. A guard from the "
            + "train company comes by and arrests you.<br>"
            + "<h1>Game over!</h1>");
        world.location = murd.JAIL;
        world.DescribeRoom();
        return false;
      }
      return true;  // That's where we want him to go.
    }
    world.Print(
        "You don't have time for that: you need to get to work soon! Take a "
        + "train to Enge, that's the ticket.");
    return false;
  },
  Exits: function(world) {
    return ExitsTrainLines(murd.WIEDIKON, {"brupbacherplatz": true});
  }
});

// TODO: Add a Kiosk inside the station?
murd.ENGE = engine.MakeRoom({
  NAME: "enge",
  TITLE: "the Enge train station",
  ALIASES: ["station", "bahnhof",],
  TrainLines: function() {
    return [murd.WIEDIKON, murd.OERLIKON, murd.AIRPORT, murd.HAUPTBAHNHOF];
  },
  Description: function(world) {
    return "You're at the beautiful Enge train station. This whole thing was "
        + "built with granite from Ticino. Thousands of people commute here "
        + "everyday, going through the imposing facade.<br>"
        + DescriptionTrainLines(murd.ENGE)
        + "You can walk outside to " + linkToRoom(murd.TESSINERPLATZ) + ".";
  },
  HandleAction: HandleTrainStationAction,
  CanEnter: function(world) {
    if (world.location == murd.WIEDIKON) {
      world.Print(
          "You hop on the S2 train to Enge. It's a bit crowded.<br>"
          + "Once it reaches Enge, you make it back to the door and get off.");
    } else {
      // TODO: Add more custom messages.
      world.Print("Ok.");
    }
    return true;
  },
  CanLeave: function(world, toRoom) {
    if (toRoom == murd.TESSINERPLATZ) {
      return true;
    }
    if (murd.OFFICE.timeWorking == 0) {
      if (toRoom == murd.WIEDIKON) {
        world.Print("Why would you go back now? You didn't forget anything.");
      } else {
        world.Print(
            "There's no time for that! Now you really should get to your "
            + "office, which is a few blocks from "
            + linkToRoom(murd.TESSINERPLATZ) + ".");
      }
    }
    if (murd.OFFICE.timeWorking == 1) {
      if (world.GetFlag(murd.flags.foodEaten) == 0) {
        world.Print(
            "Hmm, your lunch break is not that long. You barely have time to "
            + "eat a slice of pizza from the Pizzeria Tricolore.");
      } else {
        world.Print(
            "Your lunch break is over, you should get back to work. Sigh. "
            + "Spreadsheets...");
      }
    }
    return false;
  },
  Exits: function(world) {
    return ExitsTrainLines(murd.ENGE, {"tessinerplatz": true});
  }
});

murd.HAUPTBAHNHOF = engine.MakeRoom({
  NAME: "hauptbahnhof",
  TITLE: "the main train station in Zurich",
  Description: function(world) {},
});

murd.AIRPORT = engine.MakeRoom({
  NAME: "airport",
  TITLE: "the airport",
  Description: function(world) {},
});

murd.OERLIKON = engine.MakeRoom({
  NAME: "oerlikon",
  TITLE: "the Oerlikon train station",
  Description: function(world) {},
});

murd.TESSINERPLATZ = engine.MakeRoom({
  NAME: "tessinerplatz",
  TITLE: "Tessinerplatz",
  ALIASES: ["street", "out", "outside", "square", "platz", "plaza",],
  Init: function() {
    // Did we already warn that uprooting the tree is a bad idea?
    this.warnedUprootTree = false;
  },
  Description: function(world) {
    return "You're in Tessinerplatz, a beautiful square in front of "
           + linkToRoom(murd.ENGE) + ".<br>"
           + "The square has a nice fountain and a few trees.<br>"
           + "From here you can walk to " + linkToRoom(murd.BANK_RECEPTION)
           + " or to " + linkToRoom(murd.PIZZERIA) + ".";
  },
  DescribeContents: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.TESSINERPLATZ_FOUNTAIN
          || obj == murd.TESSINERPLATZ_TREE) {
        continue;  // Already described.
      }
      out.push(obj)
    }
    return out;
  },
  CanEnter: function(world) {
    if (world.location == murd.OFFICE) {
      world.Print("You take the lift down.");
    } else if (world.location == murd.ENGE) {
      world.Print("You walk out of the train station.");
    } else if (world.location == murd.PIZZERIA) {
      world.Print("You leave the pizzeria.");
    }
    return true;
  },
  Exits: function(world) {
    return {"enge": true, "reception": true, "pizzeria": true};
  }
});

function HandleUseLiftAction(world, parsed) {
  if (parsed.Match({verb: /use/, entities: [murd.BANK_LIFT]})) {
    world.Enter(murd.BANK_LIFT);
    return true;
  }
  return false;
}

murd.BANK_RECEPTION = engine.MakeRoom({
  NAME: "reception",
  TITLE: "the reception of the bank where you work",
  Description: function(world) {
    return "You're in the office reception of the bank where you work. From "
           + "here you can reach " + linkToRoom(murd.BANK_LIFT)
           + " or you can walk out to " + linkToRoom(murd.TESSINERPLATZ) + ".";
  },
  HandleAction: HandleUseLiftAction,
  CanEnter: function(world) {
    if (world.location == murd.BANK_LIFT) {
      world.Print("You exit the lift and walk into the reception.");
    } else if (world.location == murd.TESSINERPLATZ) {
      var description = "The automatic doors slide open and let you in.";
      var r = Math.random();
      if (r < 0.3) {
        description += " The receptionist smiles as you walk through.";
      } else if (r < 0.6) {
        description += " The receptionist talks loudly on the phone.";
      }
      world.Print(description);
    }
    return true;
  },
  Exits: function(world) {
    return {"lift": true, "tessinerplatz": true, "stairs-1": true};
  }
});

// One function per level, should describe what's visible.
murd.BankFloorsDescriptions = [
    function(world) {
      return linkToRoom(murd.BANK_RECEPTION) + ", leading outside";
    },
    function (world) {
      return "a small cafe";
    },
    function (world) {
      return "the hall leading to " + linkToRoom(murd.BANK_2_OFFICE)
          + " and to " + linkToRoom(murd.BANK_2_TOILET);
    },
    function (world) {
      return "the hall leading to " + linkToRoom(murd.OFFICE) + " and to "
             + linkToRoom(murd.BANK_TOILET);
    },
];

function dispatchBankLiftButton(world, button) {
  var buttons = {
    0: murd.BANK_LIFT_BUTTON_0,
    1: murd.BANK_LIFT_BUTTON_1,
    2: murd.BANK_LIFT_BUTTON_2,
    3: murd.BANK_LIFT_BUTTON_3,
  }
  if (button in buttons) {
    buttons[button].Use(world, null);
    return true;
  }
  return false;
}

murd.BANK_LIFT = engine.MakeRoom({
  NAME: "lift",
  TITLE: "the lift",
  Init: function() {
    this.floor = 0;
    this.floorsVisited = { 0: true, };
  },
  Description: function(world) {
    return "You're surrounded by the three walls of steel in the lift. "
           + "The open doors are facing "
           + murd.BankFloorsDescriptions[this.floor](world)
           + ". There are four buttons here: "
           + linkToAction(0 in this.floorsVisited, "use 0", "0") + ", "
           + linkToAction(1 in this.floorsVisited, "use 1", "1") + ", "
           + linkToAction(2 in this.floorsVisited, "use 2", "2") + ", and "
           + linkToAction(3 in this.floorsVisited, "use 3", "3") + ".";
  },
  HandleAction: function(world, parsed) {
    if (parsed.Match({verb: /use|press/, entities: [engine.ANY_OBJECT]})) {
      if (parsed.entities[0].IS_BANK_LIFT) {
        parsed.entities[0].Use(world);
        return true;
      }
    }
    /*if ((verb == "use" || verb == "press")
        && words.length == 2 && words[0] == "button"
        && dispatchBankLiftButton(world, words[1])) {
      return true;
    }
    if (verb == "press" && words.length == 1
        && dispatchBankLiftButton(world, words[0])) {
      return true;
    }*/
    return HandleUseLiftAction(world, parsed);
  },
  CanEnter: function(world) {
    // Technically, the lift is already at the current floor, but pretending it
    // is arriving makes things slightly more colorful.
    if (murd.OFFICE.timeWorking == 3) {
      world.Print(
          "You try to call the lift but it doesn't come; it appears to be out "
          + "of service. Ugh, looks like you'll have to take the stairs.");
      return false;
    }
    world.Print("You press the button to call the lift. " + pickRandomMessage([
        "It arrives instantaneously.",
        "It takes a while but the lift finally arrives.",
        "You enter and the doors close behind you."]));
    return true;
  },
  Exits: function(world) {
    var output = {};
    if (this.floor == 0) {
      output["reception"] = true;
    } else if (this.floor == 1) {
    } else if (this.floor == 2) {
      output["bank-2-office"] = true;
      output["bank-2-toilet"] = true;
    } else if (this.floor == 3) {
      output["bank-3-office"] = true;
      output["bank-3-toilet"] = true;
    }
    return output;
  },
  DescribeContents: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.BANK_LIFT_BUTTON_0
          || obj == murd.BANK_LIFT_BUTTON_1
          || obj == murd.BANK_LIFT_BUTTON_2
          || obj == murd.BANK_LIFT_BUTTON_3
          || obj == murd.BANK_LIFT_BUTTON_4) {
        continue;  // They're already in the description.
      }
      out.push(obj)
    }
    return out;
  },
});

function CanLeaveOfficeFloor(world, toRoom) {
  if (toRoom == murd.OFFICE || toRoom == murd.BANK_TOILET) {
    return true;
  }

  var timeWorking = murd.OFFICE.timeWorking;
  if (timeWorking == 0) {
    world.Print("No, you need to focus on your work!");
    return false;
  }
  if (timeWorking == 1) {
    if (world.GetFlag(murd.flags.foodEaten) == 0
        || !world.GetFlag(murd.flags.hasCleanHands)) {
      return true;
    }
    world.Print("Your lunch break is over, time to get back to your "
                + "spreadsheets.");
    return false;
  }
  if (timeWorking == 2) {
    world.Print("You should probably work a bit more, or you're never going "
                + "to finish this annoying report.");
    return false;
  }
  if (timeWorking == 3) {
    return true;
  }
  return true;
}

murd.BANK_2_OFFICE = engine.MakeRoom({
  NAME: "bank-2-office",
  TITLE: "your coworker's office",
  ALIASES: ["office"],
  Description: function(world) {
    var description = "You are in the office of your coworker. ";
    if (murd.COWORKER.location == murd.BANK_2_OFFICE) {
      description += "He's sitting on his computer, working.";
    } else {
      description += "He's nowhere to be seen.";
    }
    description +=
        " From here you can walk back to "
        + linkToRoom(murd.BANK_LIFT) + " or go to "
        + linkToRoom(murd.BANK_2_TOILET) + ".";
    return description;
  },
  DescribeContents: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.COWORKER) {
        continue;  // Already in the description.
      }
      out.push(obj)
    }
    return out;
  },
  Update: function(world) {
    if (murd.OFFICE.timeWorking == 1) {
      murd.PIZZERIA.Add(murd.COWORKER);
    } else {
      murd.BANK_2_OFFICE.Add(murd.COWORKER);
    }
  },
  Exits: function(world) {
    return {"lift": true, "bank-2-toilet": true};
  }
});

murd.BANK_2_TOILET = engine.MakeRoom({
  NAME: "bank-2-toilet",
  TITLE: "a small toilet",
  ALIASES: ["toilet"],
  Description: function(world) {
    return "A smallish office toilet. It's relatively clean.";
  },
  CanEnter: function(world) {
    if (murd.OFFICE.timeWorking == 1
        && world.GetFlag(murd.flags.foodEaten) == 1
        && !world.GetFlag(murd.flags.hasCleanHands)) {
      world.Print(
          "There's a sign by the door that reads 'Under Maintenance.' "
          + "You try to enter but a woman gives you a stern look. "
          + "'Sorry, sir, I'm cleaning this place; please go somewhere else.' "
          + "You go back.");
      return false;
    }
    return true;
  },
  Exits: function(world) {
    return {"lift": true, "bank-2-office": true};
  }
});

murd.OFFICE = engine.MakeRoom({
  NAME: "bank-3-office",
  TITLE: "your office",
  ALIASES: ["office"],
  Init: function() {
    this.sitting = false;
    this.timeWorking = 0;
  },

  HandleAction: HandleUseLiftAction,

  Description: function(world) {
    var description = "In your cubicle there's a desk, a photo, ";
    description +=
        this.sitting ? "the chair on which you're sitting" : "a chair";
    description += ", and an old computer.";
    if (this.timeWorking == 3) {
      description += " It's dark outside.";
    }
    description += " There's " + linkToRoom(murd.BANK_TOILET) + " nearby.";
    if ((this.timeWorking == 1
         && ((world.GetFlag(murd.flags.foodEaten) == 0
              && murd.PIZZA.location != world.INVENTORY
              && murd.PIZZA.location != murd.OFFICE)
             || !world.GetFlag(murd.flags.hasCleanHands)))
        || this.timeWorking == 3) {
      // As a hint.
      description += " From here you can take " + linkToRoom(murd.BANK_LIFT)
                     + " to go elsewhere.";
    }
    return description;
  },
  DescribeContents: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.OFFICE_CHAIR || obj == murd.OFFICE_DESK
          || obj == murd.COMPUTER || obj == murd.OFFICE_PHOTO) {
        continue;  // They're already in the description.
      }
      out.push(obj)
    }
    return out;
  },
  CanEnter: function(world) {
    var description;
    if (world.location == murd.BANK_LIFT) {
      description = "You exit " + linkToRoom(murd.BANK_LIFT)
                        + " and walk to your cubicle.";
      if (murd.OFFICE.timeWorking == 0) {
        description += " Looks like nobody noticed how late you are.";
      }
    } else {
      description = "You walk across the hall"
                    + (murd.OFFICE.visited ? " back" : "")
                    + " to the office.";
    }
    world.Print(description);
    return true;
  },
  CanLeave: function(world, toRoom) {
    if (!CanLeaveOfficeFloor(world, toRoom)) {
      return false;
    }
    this.sitting = false;
    murd.OFFICE_PHOTO.dropIfHeld(world);
    return true;
  },
  Exits: function(world) {
    return {"lift": true, "bank-3-toilet": true, "stairs-1": true};
  }
});

murd.BANK_TOILET = engine.MakeRoom({
  NAME: "bank-3-toilet",
  TITLE: "a small toilet",
  ALIASES: ["toilet"],
  Description: function(world) {
    return "You're in a standard, if a bit small, office toilet. It has "
           + "gray tiles and smells of cheap soap. Jazmin.<br>"
           + "There's a hall outside, leading to " + linkToRoom(murd.OFFICE)
           + " and to " + linkToRoom(murd.BANK_LIFT) + ".";
  },
  CanEnter: function(world) {
    if (murd.OFFICE.timeWorking == 1
        && world.GetFlag(murd.flags.foodEaten) == 1
        && !world.GetFlag(murd.flags.hasCleanHands)) {
      world.Print(pickRandomMessage([
          "Ugh, looks like one of your colleages is locked in in there.",
          "You try to turn the knob but the door is locked from inside."]));
      return false;
    }
    return true;
  },
  CanLeave: CanLeaveOfficeFloor,
  Exits: function(world) {
    return {"lift": true, "bank-3-office": true, "stairs-1": true};
  },
});

// TODO: When we support per-exit aliases, add more stairs, make the player
// actually traverse them.
murd.STAIRS_1 = engine.MakeRoom({
  NAME: "stairs-1",
  TITLE: "the stairs",
  ALIASES: ["stairs"],
  Description: function(world) {
    var description = "You're in the stairs at floor 1."
    if (murd.OFFICE.timeWorking == 3) {
      description +=
          " The corpse of your coworker, Micha, is laying on the floor. Blood "
          + "is dripping from a big wound in him.";
    }
    description += " From here you can go down to "
        + linkToRoom(murd.BANK_RECEPTION) + " or up to "
        + linkToRoom(murd.OFFICE) + ".";
    return description;
  },
  CanEnter: function(world) {
    if ((world.location == murd.OFFICE || world.location == murd.BANK_TOILET)
        && murd.OFFICE.timeWorking == 3) {
      world.Print(
          "As you're walking down, you stumble and nearly fall as you find "
          + "the murder scene!"
          + " The body of your coworker Micha is laying on the ground, between "
          + "floors 2 and 1!<br>"
          + "Welcome to Micha's Murder Mistery!");
    }
    return true;
  },
  DescribeContents: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
      if (obj.skipContents) {
        continue;
      }
      out.push(obj)
    }
    return out;
  },
  Exits: function(world) {
    return {"bank-3-office": true, "reception": true};
  },
  Update: function(world) {
    if (murd.OFFICE.timeWorking == 3) {
      this.Add(murd.MURDER_CORPSE);
    }
  },
});

murd.JAIL = engine.MakeRoom({
  NAME: "jail",
  TITLE: "jail",
  Init: function() {
    this.mouseVisible = true;
    this.crackVisible = false;
  },
  Description: function(world) {
    return "You're in an empty prison cell. "
           + "There's nothing to do and nowhere to go. "
           + "You've lost.";
  },
  HandleAction: function(world, parsed) {
    if (parsed.Match({verb: /catch/, entities: [murd.JAIL_MOUSE]})) {
      murd.JAIL_MOUSE.CanGet(world);
      return true;
    }
    if (parsed.Match({verb: /sleep/, entities: []})) {
      murd.JAIL_BED.Use(world);
      return true;
    }
    return false;
  },
  DescribeContents: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.JAIL_MOUSE && !this.mouseVisible) {
        continue;
      }
      if (obj == murd.JAIL_CRACK && !this.crackVisible) {
        continue;
      }
      out.push(obj)
    }
    return out;
  }
});

murd.PIZZERIA = engine.MakeRoom({
  NAME: "pizzeria",
  TITLE: "the Pizzeria Tricolore",
  Init: function() {
    // So that if he drops the pizza and takes it again, we don't show him
    // paying again.
    this.pizzaPaid = false;
  },
  Description: function(world) {
    return "The pizzeria Tricolore, located near "
           + linkToRoom(murd.TESSINERPLATZ)
           + ", is the place where you usually have lunch. "
           + "The pizza is mediocre but the prices are affordable for Zurich. "
           + "A bunch of people are having lunch here"
           + (murd.COWORKER.location == murd.PIZZERIA
                  ? ", including your coworker Micha"
                  : "")
           + ". There's " + linkToRoom(murd.PIZZERIA_RESTROOM)
           + " in the back.";
  },
  DescribeContents: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.COWORKER) {
        continue;  // Already explicitly mentioned.
      }
      out.push(obj)
    }
    return out;
  },
  CanEnter: function(world) {
    if (murd.OFFICE.timeWorking == 0) {
      world.Print("The pizzeria is not open yet. You knock on the door but "
                  + "nobody opens.");
      return false;
    }
    return true;
  },
  Exits: function(world) {
    return {"tessinerplatz": true, "pizzeria-restroom": true};
  },
});

murd.PIZZERIA_RESTROOM = engine.MakeRoom({
  NAME: "pizzeria-restroom",
  TITLE: "a smelly restroom",
  ALIASES: ["restroom", "toilet",],
  Init: function() {
    this.hasUsedSink = false;
    this.warnedFilthy = false;
    this.thrownUp = false;
    this.warnedVomit = false;
  },
  Description: function(world) {
    var description = "You're inside the filthy restroom of "
        + linkToRoom(murd.PIZZERIA) + ", on the floor of which all kinds of "
        + "germs thrive.";
    if (this.thrownUp) {
      description += " Oh, look: there's vomit on the floor.";
    }
    return description;
  },
  DescribeContents: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.PIZZERIA_GERMS
          || obj == murd.PIZZERIA_FLOOR
          || obj == murd.PIZZERIA_VOMIT) {
        continue;  // Already explicitly mentioned.
      }
      out.push(obj)
    }
    return out;
  },
  Exits: function(world) {
    return {"pizzeria": true};
  },
  CanLeave: function(world, toRoom) {
    var description = "You turn the knob and leave the disgusting restroom.";
    if (world.GetFlag(murd.flags.hasCleanHands)) {
      description += " Ugh, the knob was very greasy. "
                     + "Your hands are now very greasy.";
      world.SetFlag(murd.flags.hasCleanHands, false);
    }
    world.Print(description);
    return true;
  },
});

// ** Objects ******************************************************************

murd.DREAM_FIELD = engine.MakeObject({
  NAME: "field",
  TITLE: "an open field",
  INITIAL_LOCATION: murd.DREAM,
  skipContents: true,
  Use: function(world, onWhat) {
    world.Print("You try to escape through the field but the monster catches "
        + "up with you and eats you.");
    murd.DREAM.playerAlive = false;
    world.Enter(murd.BEDROOM);
  },
  CanGet: function(world) {
    world.Print("That makes no sense.");
    return false;
  }
});

murd.DREAM_HOUSE = engine.MakeObject({
  NAME: "house",
  TITLE: "a white house",
  INITIAL_LOCATION: murd.DREAM,
  skipContents: true,
  Detail: function(world) {
    return "It looks very unremarkable. It has a boarded front door.";
  },

  Use: function(world, onWhat) {
    world.Print(
        "You try to hide behind the house but the monster sees you! "
         + "It chases you around the house.");
  },
  DescribeContents: function(world, objects) {
    return [];
  },
  CanGet: function(world) {
    world.Print("It's fixed to the ground.");
    return false;
  }
});

murd.DREAM_DOOR = engine.MakeObject({
  NAME: "door",
  TITLE: "a boarded front door",
  INITIAL_LOCATION: murd.DREAM_HOUSE,
  Use: function(world, onWhat) {
    world.Print("You try to "
        + pickRandomMessage([
              "push the door open", "open the door", "kick the door open"])
        + " but it won't "
        + pickRandomMessage(["move", "budge"])
        + ".");
  },
  CanGet: function(world) {
    world.Print("The door won't move.");
    return false;
  }
});

murd.DREAM_MAILBOX = engine.MakeObject({
  NAME: "mailbox",
  TITLE: "a small mailbox",
  INITIAL_LOCATION: murd.DREAM,
  skipContents: true,
  Detail: function(world) {
    var description = "There is a small mailbox here."
    if (murd.DREAM_SPOON.location == this
        && murd.DREAM_POSTCARD.location == this) {
      description += " It contains a postcard and a small spoon.";
    } else if (murd.DREAM_SPOON.location == this) {
      description += " It contains a small spoon.";
    } else if (murd.DREAM_POSTCARD.location == this) {
      description += " It contains a postcard.";
    }
    return description;
  },
  Use: function(world, onWhat) {
    if (murd.DREAM_POSTCARD.location != murd.DREAM_MAILBOX) {
      world.Print("You put the postcard inside the mailbox.");
      murd.DREAM_MAILBOX.Add(murd.DREAM_POSTCARD);
      return;
    }
    world.Print("You try to hide inside the mailbox but you don't fit. "
        + "The monster is getting closer!");
  },
  DescribeContents: function(world, objects) {
    return [];
  },
  CanGet: function(world) {
    world.Print("It's fixed to the ground.");
    return false;
  },
});

murd.DREAM_SPOON = engine.MakeObject({
  NAME: "spoon",
  TITLE: "a completely unremarkable spoon",
  INITIAL_LOCATION: murd.DREAM_MAILBOX,
  Use: function(world, onWhat) {
    world.Print("You see no use for the spoon here.");
  },
  dropIfHeld: function(world) {
    if (this.location != world.INVENTORY) { return; }
    murd.DREAM.Add(this)
  }
});

murd.DREAM_POSTCARD = engine.MakeObject({
  NAME: "postcard",
  TITLE: "a surreal postcard",
  INITIAL_LOCATION: murd.DREAM_MAILBOX,
  Detail: function(world) {
    return "The postcard has an image of an unusual creature:<pre>"
        + "            .-9 9 `\\\n"
        + "          =(:(::)=  ;\n"
        + "            ||||     \\\n"
        + "            ||||      `-.\n"
        + "           ,\\|\\|         `,\n"
        + "          /                \\\n"
        + "         ;                  `'---.,\n"
        + "         |                         `\\\n"
        + "         ;                     /     |\n"
        + "         \\                    |      /\n"
        + "          )           \\  __,.--\\    /\n"
        + "       .-' \\,..._\\     \\`   .-'  .-'\n"
        + "      `-=``      `:    |   /-/-/`\n"
        + "                   `.__/</pre>"
        + "A gust of wind whispers in your ear: '"
        + "<i>I am he as you are he as you are me and we are all "
        + "together</i>.'";
  },
  Use: function(world, onWhat) {
    world.Print("No time to look at it and daydream, the scary monster is "
                + "closing in!");
  },
  dropIfHeld: function(world) {
    if (this.location != world.INVENTORY) { return; }
    murd.DREAM.Add(this)
  }
});

murd.DREAM_MONSTER = engine.MakeObject({
  NAME: "monster",
  TITLE: "a scary monster",
  INITIAL_LOCATION: murd.BEDROOM,
  skipContents: true,
  Detail: function(world) {
    return "The monster looks very scary. "
           + "It has black fur and his head glows red. "
           + "It cries an electric buzz, maddening. "
           + "It's chasing you! "
           + "Running away sounds like a good idea.";
  },
  DescribeContents: function(world, objects) {
    return [];
  },
  Use: function(world, onWhat) {
    world.Print("You approach the monster and, before you have time to think "
                + "it better, the scary monster... eats you whole.");
    murd.DREAM.playerAlive = false;
    world.Enter(murd.BEDROOM);
  },
  CanGet: function(world) {
    world.Print(pickRandomMessage([
        "No way I'm touching it!",
        "No, I fear it would eat me!",
        "I'm not getting close to it, it looks very scary."]));
    return false;
  },
});

murd.DREAM_MONSTER_FUR = engine.MakeObject({
  NAME: "fur",
  TITLE: "the fur of the scary monster",
  INITIAL_LOCATION: murd.DREAM_MONSTER,
  Detail: function(world) {
    return "The monster has a thick black fur, dark as shadows. This monster "
           + "must have come from another world.";
  },
  Use: function(world, onWhat) {
    world.Print("It's attached to the monster. You're to scared to get close "
                + "to it.");
  },
  CanGet: function(world) {
    world.Print("No way you're getting closer to that ugly monster!");
    return false;
  }
});

murd.DREAM_MONSTER_HEAD = engine.MakeObject({
  NAME: "head",
  TITLE: "the head of the monster",
  INITIAL_LOCATION: murd.DREAM_MONSTER,
  ALIASES: ["forehead",],
  Detail: function(world) {
    return "The monster has a huge forehead, glowing red. The glow appears to "
           + "come from some numbers written on it.";
  },
  DescribeContents: function(world, objects) {
    return [];
  },
  Use: function(world, onWhat) {
    world.Print("That makes no sense. What would you use the monster's "
                + "head for?");
  },
  CanGet: function(world) {
    world.Print(pickRandomMessage([
        "I'm not touching his head!",
        "I'm too scared to get any closer.",
        ]));
    return false;
  },
});

murd.DREAM_MONSTER_HEAD_GLOW = engine.MakeObject({
  NAME: "glow",
  TITLE: "the glow on the monster's head",
  INITIAL_LOCATION: murd.DREAM_MONSTER_HEAD,
  Detail: function(world) {
    return "The red glow on the monster's head appears to come from some "
        + "numbers written on his forehead, among his black fur.";
  },
  DescribeContents: function(world, objects) {
    return [];
  },
  Use: function(world, onWhat) {
    world.Print("For what? Umm.");
  },
  CanGet: function(world) {
    world.Print(pickRandomMessage([
        "I'm not touching his head!",
        "I'm too scared to get any closer.",
        ]));
    return false;
  },
});

murd.DREAM_MONSTER_HEAD_NUMBERS = engine.MakeObject({
  NAME: "numbers",
  TITLE: "numbers of the forehead of the monster",
  INITIAL_LOCATION: murd.DREAM_MONSTER_HEAD,
  Detail: function(world) {
    return "The red numbers in the monster's forehead look digital, somehow. "
        + "They become blurry as you try to read them.";
  },
  Use: function(world, onWhat) {
    world.Print("What for?");
  },
  CanGet: function(world) {
    world.Print("They're attached to the monster's forehead.");
    return false;
  },
});

murd.NIGHTSTAND = engine.MakeObject({
  NAME: "nightstand",
  TITLE: "a nightstand",
  INITIAL_LOCATION: murd.BEDROOM,
  Detail: function(world) {
    return "It's a nice bedside table, made of beautiful wood. "
           + "It was pretty affordable."
  },
  Use: function(world, onWhat) {
    world.Print(pickRandomMessage([
        "You have no use for the nightstand.",
        "Eh? For what?"]));
  },
  CanGet: function(world) {
    world.Print("Nah, it's a bit heavy and you have no use for it.");
    return false;
  },
});

murd.ALARM_CLOCK = engine.MakeObject({
  NAME: "clock",
  TITLE: "an alarm clock that's beeping loudly",
  INITIAL_LOCATION: murd.NIGHTSTAND,
  Use: function(world, onWhat) {
    if (!murd.BEDROOM.alarmClockOn) {
      world.Print("You have no use for the clock right now. "
                  + "However, looking at it reminds you that you're running a "
                  + "bit late for work.");
      return;
    }
    murd.BEDROOM.alarmClockOn = false;
    murd.NIGHTSTAND.Add(murd.WALLET);
    world.Print("You turn off the clock. "
                + "Ahh, finally a bit of peace. "
                + "The room looks different without all this noise.");
    this.TITLE = "an alarm clock";
  },
  dropIfHeld: function(world) {
    if (this.location != world.INVENTORY) { return; }
    world.Print("The alarm clock is plugged to the wall. You set it over the "
                + "nightstand.");
    murd.NIGHTSTAND.Add(this)
  }
});

murd.BED = engine.MakeObject({
  NAME: "bedroom-bed",
  TITLE: "a comfortable bed",
  INITIAL_LOCATION: murd.BEDROOM,
  ALIASES: ["bed",],
  Use: function(world, onWhat) {
    world.Print("It's not time to sleep! You have to go to work.");
  },
  CanGet: function(world) {
    world.Print("Why would you want to do that?");
    return false;
  },
});

murd.WALLET = engine.MakeObject({
  NAME: "wallet",
  TITLE: "your wallet",
  INITIAL_LOCATION: null,
  Detail: function(world) {
    if (this.location == world.INVENTORY) {
      return "You have $23, a trains pass, and a credit card.";
    }
    return "It's an elegant Prada leather wallet. " + 
      "Sadly, it's probably your most valuable possession.";
  },
  CanGet: function(world) {
    if (murd.BEDROOM.alarmClockOn) {
      world.Print("I don't know what you are talking about...");
      return false;
    }
    return true;
  },
});

murd.LINT = engine.MakeObject({
  NAME: "lint",
  TITLE: "some pocket lint",
  INITIAL_LOCATION: engine.INVENTORY,
  Detail: function(world) {
    return "Maybe you should consider buying new pants."
  },
  Use: function(world, onWhat) {
    if (this.location != world.INVENTORY) {
      world.game.NotHave(world, this);
      return;
    }
    if (onWhat == murd.WALLET) {
      if (murd.WALLET.location != world.INVENTORY) {
        world.game.NotHave(world, onWhat);
        return;
      }
      world.Print(
          "You smear the lint on your wallet for no particular reason. " + 
          "The particles dissolve into oblivion.");
      world.Destroy(this);
    } else {
      world.Print("What for?");
    }
  },
});

murd.BEDROOM_PLANT = engine.MakeObject({
  NAME: "orchid",
  TITLE: "an orchid growing on a yellow pot",
  ALIASES: ["flower", "plant"],
  INITIAL_LOCATION: murd.BEDROOM,
  Detail: function(world) {
    return pickRandomMessage([
        "A sad-looking orchid that hasn't flowered in many years.",
        "It has seen better days, but at least it's still alive.",
        "It has some green leaves but no flowers."]);
  },
  Use: function(world, onWhat) {
    world.Print(pickRandomMessage([
        "You look at the orchid for a few seconds. It's supposed to "
        + "cheer you up but it doesn't really work.",
        "For what? It's not edible.",
        "You have no use for the orchid now."]));
  },
  dropIfHeld: function(world) {
    if (murd.BEDROOM_PLANT.location != world.INVENTORY) { return; }
    world.Print("You set the orchid down. It belongs in your apartment.");
    murd.BEDROOM.Add(this)
  }
});

murd.SHOWER = engine.MakeObject({
  NAME: "shower",
  TITLE: "a shower",
  INITIAL_LOCATION: murd.RESTROOM,
  Use: function(world, onWhat) {
    if (world.GetFlag(murd.flags.showered)) {
      world.Print("Remembering last month's water bill, you decide that one "
                  + "shower is enough.");
      return true;
    }
    if (murd.WALLET.location == world.INVENTORY) {
      world.Print("Not while holding my wallet, that would ruin it!");
      return false;
    }
    if (murd.BEDROOM_PLANT.location == world.INVENTORY) {
      world.Print("I should drop the orchid first, I think it likes water but "
                  + "showering with it seems a bit excessive.");
      return false;
    }
    murd.TOOTH_BRUSH.dropIfHeld(world);
    world.SetFlag(murd.flags.hasCleanHands, true);
    world.SetFlag(murd.flags.showered, true);
    this.TITLE = "a wet shower";
    world.Print(
        "You take your clothes off and take a quick shower. The water feels "
        + "refreshing. After showering, you dry yourself with a towel and put "
        + "on your banker suit.");
  },
  CanGet: function(world) {
    this.Use(world, null);
    return false;
  },
});

murd.RESTROOM_WINDOW = engine.MakeObject({
  NAME: "window",
  TITLE: "a window",
  INITIAL_LOCATION: murd.RESTROOM,
  Use: function(world, onWhat) {
    (murd.RESTROOM.windowOpen ? this.Close : this.Open)(world);
  },
  CanGet: function(world) {
    world.Print("You can't; it's fixed to the wall.");
    return false;
  },
  Open: function(world) {
    if (murd.RESTROOM.windowOpen) {
      world.Print("It's already open.");
      return;
    }
    murd.RESTROOM.windowOpen = true;
    world.Print("You open that window. Ahh, a fresh breeze of Swiss air!");
  },
  Close: function(world) {
    if (!murd.RESTROOM.windowOpen) {
      world.Print("It's already closed.");
      return;
    }
    murd.RESTROOM.windowOpen = false;
    world.Print("You close the window.");
  },
});

murd.SINK = engine.MakeObject({
  NAME: "sink",
  TITLE: "the sink",
  INITIAL_LOCATION: murd.RESTROOM,
  Use: function(world, onWhat) {
    world.Print("You wash your hands on the sink. The water is a bit cold.");
  },
  CanGet: function(world) {
    world.Print(pickRandomMessage([
        "It's attached to the wall.",
        "You hang on to it for a few seconds to steady yourself. "
        + "You let it go.",
        "You can't carry the sink around, that makes no sense."]));
    return false;
  },
});

murd.TOOTH_BRUSH = engine.MakeObject({
  NAME: "toothbrush",
  TITLE: "a red toothbrush",
  INITIAL_LOCATION: murd.SINK,
  Detail: function(world) {
    return "A red toothbrush. It's a bit old.";
  },
  Use: function(world, onWhat) {
    if (murd.RESTROOM.toothBrushUsed) {
      world.Print("Your teeth are already spotless.");
      return;
    }
    murd.RESTROOM.toothBrushUsed = true;
    world.Print("You grab the brush and attack the plaque with it. It leaves a "
                + "refreshing mint scent in your mouth.");
  },
  dropIfHeld: function(world) {
    if (this.location != world.INVENTORY) { return; }
    world.Print("You set the toothbrush by the sink.");
    murd.SINK.Add(this)
  }
});

murd.TESSINERPLATZ_FOUNTAIN = engine.MakeObject({
  NAME: "fountain",
  TITLE: "a fountain",
  INITIAL_LOCATION: murd.TESSINERPLATZ,
  Use: function(world, onWhat) {
    var descriptions;
    if (!world.GetFlag(murd.flags.hasDrank)) {
      descriptions = [
          "Ahh, delicious water, fresh from the Alps. You quench your thirst.",
          "You carefully drink a bit of water. Two drops land in your shirt.",
          "You lean down and drink some water from the fountain. You're no "
          + "longer thirsty."];
      world.SetFlag(murd.flags.hasDrank, true);
    } else if (!world.GetFlag(murd.flags.hasCleanHands)) {
      descriptions = [
          "You wash your hands in the water.",
          "You rinse the grease away. The water feels cold in your hands."];
      world.SetFlag(murd.flags.hasCleanHands, true);
    } else {
      descriptions = [
          "You are not currently thirsty.",
          "The water looks refreshing, but you're not thirsty.",
          "You have no use for it right now."];
    }
    world.Print(pickRandomMessage(descriptions));
  },
  CanGet: function(world) {
    world.Print("Eh? That makes no sense.");
    return false;
  },
});

murd.TESSINERPLATZ_TREE = engine.MakeObject({
  NAME: "tessinerplatz-tree",
  TITLE: "a tree",
  ALIASES: ["tree",],
  INITIAL_LOCATION: murd.TESSINERPLATZ,
  Detail: function(world) {
    return "A nice flush tree, not very tall. It provides some shade."
  },
  Use: function(world, onWhat) {
    // TODO: When it gets dark, adjust the message.
    world.Print(pickRandomMessage([
        "You stand on the shadow of the tree.",
        "The tree protects you from the sun."]));
  },
  CanGet: function(world) {
    if (!murd.TESSINERPLATZ.warnedUprootTree) {
      world.Print("Umm, uprooting the tree is probably not a good idea.");
      murd.TESSINERPLATZ.warnedUprootTree = true;
    } else {
      world.Print("You start trying to uproot the tree. A police car drives by "
                  + "and arrests you.<br>"
                  + "<h1>Game over!</h1>");
      world.location = murd.JAIL;
      world.DescribeRoom();
    }
    return false;
  },
});

murd.BANK_PALM_TREE = engine.MakeObject({
  NAME: "palm",
  TITLE: "a palm tree",
  INITIAL_LOCATION: murd.BANK_RECEPTION,
  // TODO: Figure out why "tree" isn't working here. Probably some bug with the
  // handling of aliases?
  ALIASES: ["tree", "palm-tree", "palmtree", "palm tree"],
  Detail: function(world) {
    return "A somewhat pretty but ultimately unremarkable palm tree, in a big "
           + "gray pot.";
  },
  Use: function(world, onWhat) {
    world.Print(pickRandomMessage([
        "You have no use for the palm tree.",
        "Uh, what for?"]));
  },
  CanGet: function(world) {
    world.Print("You approach the palm tree. "
                + "The receptionist gives you a strange look. "
                + "You decide to leave it alone; it's too heavy anyway.");
    return false;
  },
});


function MakeLiftButton(data) {
  return engine.MakeObject({
    NAME: data.floor.toString(),
    TITLE: "button " + data.floor,
    ALIASES: ["" + data.floor],
    INITIAL_LOCATION: murd.BANK_LIFT,
    Use: function(world, onWhat) {
      if (data.floor == 1) {
        world.Print(pickRandomMessage([
            "Nothing happens.",
            "It looks like that button is broken."]));
        return;
      }
      if (data.floor == murd.BANK_LIFT.floor) {
        world.Print(pickRandomMessage([
            "Nothing happens.",
            "Oh, you're already in that floor."]));
        return;
      }
      world.Print(
          "The doors close and the lift travels "
          + (data.floor > murd.BANK_LIFT.floor ? "upwards" : "downwards")
          + ". The doors open again, facing "
          + murd.BankFloorsDescriptions[data.floor](world)
          + ".");
      murd.BANK_LIFT.floor = data.floor;
      murd.BANK_LIFT.floorsVisited[data.floor] = true;;
    },
    CanGet: function(world) {
      world.Print("It's attached to the panel.");
      return false;
    },
    IS_BANK_LIFT: true,
  });
}

murd.BANK_LIFT_BUTTON_0 = MakeLiftButton({ floor: 0 });
murd.BANK_LIFT_BUTTON_1 = MakeLiftButton({ floor: 1 });
murd.BANK_LIFT_BUTTON_2 = MakeLiftButton({ floor: 2 });
murd.BANK_LIFT_BUTTON_3 = MakeLiftButton({ floor: 3 });

murd.COWORKER = engine.MakeObject({
  NAME: "coworker",
  TITLE: "your coworker",
  INITIAL_LOCATION: murd.BANK_2_OFFICE,
  ALIASES: ["coworker", "micha", "colleage"],
  Detail: function(world) {
    var description = "Your coworker, Micha, is dressed very sharply. ";
    if (this.location == murd.BANK_2_OFFICE) {
      description += "He appears to be very focused on his work.";
    } else if (this.location == murd.PIZZERIA) {
      description += "He's enjoying a slice of pizza.";
    }
    return description;
  },
  Use: function(world, onWhat) {
    if (this.location == murd.BANK_2_OFFICE) {
      world.Print(
          "He has no time to do your work; he's busy enough with his own.");
    } else if (this.location == murd.PIZZERIA) {
      world.Print("He looks at you. 'What? Buy your own pizza!' he says.");
    } else {
      world.Print("You have no use for him.");
    }
  },
  CanGet: function(world) {
    world.Print("He looks at you and shakes his head. "
        + pickRandomMessage(["Uh, no, thanks.", "He politely declines."]));
    return false;
  },
});

function notifyTimePass(world) {
  murd.OFFICE.timeWorking++;
  murd.BANK_2_OFFICE.Update(world);
  murd.STAIRS_1.Update(world);
}

murd.COMPUTER = engine.MakeObject({
  NAME: "computer",
  TITLE: "your old computer",
  INITIAL_LOCATION: murd.OFFICE,
  Detail: function(world) {
    return "An old computer running Windows 98. You fight with spreadsheets "
           + "here all day.";
  },
  Use: function(world, onWhat) {
    if (!world.GetFlag(murd.flags.hasCleanHands)) {
      world.Print(pickRandomMessage([
          "Your hands are currently a bit greasy; you should wash them before "
          + "you use the computer.",
          "Not with these filthy hands! You'd make the keyboard greasy."]));
      return;
    }
    if (murd.OFFICE.timeWorking == 0) {
      notifyTimePass(world);
      var description;
      if (murd.OFFICE.sitting) {
        description = "You boot your old computer.";
      } else {
        murd.OFFICE.sitting = true;
        description = "You sit down in your chair and boot your old computer.";
      }
      description += " Windows 98. It takes a while to start...<br>"
          + "You crank numbers and add formulas to your spreadsheets.";
      if (Math.random() < 0.5) {
        description += " The computer crashes a few times.";
      }
      world.Print(description
                  + "<br>The morning goes by really fast. Your stomach begins "
                  + "to growl.");
      return;
    }

    if (murd.OFFICE.timeWorking == 1) {
      if (world.GetFlag(murd.flags.foodEaten) == 0) {
        var description = "You try to work further but it's pointless: you're "
                          + "too hungry to focus. ";
        if (murd.PIZZA.location == world.INVENTORY) {
          description += "Eat your pizza?";
        } else {
          description += "Go grab a pizza or something?";
        }
        world.Print(description);
        return;
      }

      notifyTimePass(world);
      var description;
      if (murd.OFFICE.sitting) {
        description = "You start working on your spreadsheets again.";
      } else {
        murd.OFFICE.sitting = true;
        description =
            "You sit down and start working on your spreadsheets again.";
      }
      description += " The afternoon goes by.<br>"
          + "At some point your manager comes in. He commends your hard work "
          + "and asks you to finish preparing your report by end-of-day, "
          + "because he has an important meeting tomorrow. Damn, looks like "
          + "you'll have to work late tonight.";
      world.Print(description);
      return;
    }

    if (murd.OFFICE.timeWorking == 2) {
      murd.OFFICE.sitting = true;
      notifyTimePass(world);
      world.Print(
          "You continue to work on your spreadsheet. The night falls upon "
          + "you.<br>"
          + "Eventually you finish. It's late now, all your coworkers have "
          + "long left.");
      return;
    }

    if (murd.OFFICE.timeWorking == 3) {
      world.Print("You're too tired to work further and your report is done. "
                  + "It's time to go home and get some sleep.");
      return;
    }

    world.Print("Internal error.");
  },
  CanGet: function(world) {
    world.Print("It's too heavy. What would you do with it anyway?");
    return false;
  }
});

// Mostly a dummy object, but adds some color.
murd.OFFICE_CHAIR = engine.MakeObject({
  NAME: "chair",
  TITLE: "your chair",
  INITIAL_LOCATION: murd.OFFICE,
  Detail: function(world) {
    return "A standard office chair.";
  },
  Use: function(world, onWhat) {
    if (murd.OFFICE.sitting) {
      world.Print("You're already sitting down on it.");
      return;
    }
    murd.OFFICE.sitting = true;
    world.Print("You sit down on your chair in front of the computer.");
  },
  CanGet: function(world) {
    world.Print("You can't really take it with you, that'd be weird.");
    return false;
  }
});

// Mostly a dummy object, but adds some color.
murd.OFFICE_DESK = engine.MakeObject({
  NAME: "desk",
  TITLE: "your desk",
  INITIAL_LOCATION: murd.OFFICE,
  Use: function(world, onWhat) {
    world.Print("Umm, nah.");
  },
  CanGet: function(world) {
    world.Print("It's too heavy.");
    return false;
  }
});

// Mostly a dummy object, but adds some color.
murd.OFFICE_PHOTO = engine.MakeObject({
  NAME: "photo",
  TITLE: "a photo in a beautiful frame",
  INITIAL_LOCATION: murd.OFFICE,
  Detail: function(world) {
    return "A photo of your vacation in Bali.";
  },
  Use: function(world, onWhat) {
    murd.OFFICE.sitting = false;
    world.Print(
        "You look at the photo. It's a beautiful beach from your vacation in "
        + "Bali. It helps you relax.");
  },
  dropIfHeld: function(world) {
    if (murd.OFFICE_PHOTO.location != world.INVENTORY) { return; }
    world.Print("You set the photo back on the desk.");
    murd.OFFICE_DESK.Add(this)
  }
});

// TODO: Rename to "sink" once it no longer clashes with the other sink.
murd.BANK_SINK = engine.MakeObject({
  NAME: "washbasin",
  TITLE: "a washbasin",
  INITIAL_LOCATION: murd.BANK_TOILET,
  Detail: function(world) {
    return "A nice basin where you can wash your hands.";
  },
  Use: function(world, onWhat) {
    world.Print(
        pickRandomMessage([
            "You open the sink and run a bit of water through your hands. ",
            "You open the sink and get your hands wet. "])
        + pickRandomMessage([
              "You add a bit of soap and then rinse it off. ",
              "You rub a bit of soap on your hands and rinse it off. "])
        + pickRandomMessage([
              "The water is refreshing.",
              "The water feels refreshing.",
              "The water is a bit cold.",
              "The water burns you briefly."]));
    world.SetFlag(murd.flags.hasCleanHands, true);
  },
  CanGet: function(world) {
    world.Print(pickRandomMessage([
        "It's fixed to the wall.",
        "Nope. What would you do with it?",
        "It's attached to the wall."]));
    return false;
  },
});

murd.BANK_SOAP = engine.MakeObject({
  NAME: "soap",
  TITLE: "soap",
  INITIAL_LOCATION: murd.BANK_SINK,
  Use: function(world, onWhat) {
    murd.BANK_SINK.Use(world, onWhat);
  },
  CanGet: function(world) {
    murd.BANK_SINK.Use(world, null);
    return false;
  },
});

murd.PIZZA = engine.MakeObject({
  NAME: "pizza",
  TITLE: "a slice of pizza",
  INITIAL_LOCATION: murd.PIZZERIA,
  Detail: function(world) {
    return "A mediocre slice of pizza margherita from the Pizzera Tricolore.";
  },
  Use: function(world, onWhat) {
    if (this.location != world.INVENTORY) {
      world.Get(this);
      if (this.location != world.INVENTORY) {
        return;  // Couldn't get it.
      }
    }

    if (world.location == murd.PIZZERIA_RESTROOM) {
      if (murd.PIZZERIA_RESTROOM.thrownUp) {
        world.Print("I refuse to eat the pizza in this filthy place.");
        return;
      }
      world.Print("You eat the pizza but the smell of the restroom is so "
                  + "disgusting that you immediately throw up. "
                  + "Damn. Your vomit quickly dissolves in the mulch. "
                  + "The germs would thank you for your contribution, if only "
                  + "they could speak.");
      murd.PIZZERIA.Add(murd.PIZZA);
      murd.PIZZERIA.pizzaPaid = false;  // Needs to pay again.
      murd.PIZZERIA_RESTROOM.thrownUp = true;
      murd.PIZZERIA_RESTROOM.Add(murd.PIZZERIA_VOMIT);
      return;
    }

    var description = "";

    // Move the coworker back to his office.
    murd.BANK_2_OFFICE.Add(murd.COWORKER);
    if (world.location == murd.PIZZERIA) {
      description +=
          "While you're eating, your coworker stands up and leaves.<br>";
    } else if (world.location == murd.BANK_2_OFFICE) {
      description +=
          "While you're eating, your coworker arrives, gives you a weird "
          + "look, and starts working.<br>";
    } else if (world.location == murd.TESSINERPLATZ
               || world.location == murd.BANK_RECEPTION) {
      description += "Your coworker walks by while you're eating.<br>";
    }

    world.SetFlag(murd.flags.foodEaten,
                  world.GetFlag(murd.flags.foodEaten) + 1);
    world.Destroy(this);
    description +=
        "You eat the slice of pizza. It's not the best you've eaten, but it "
        + "certainly calms your appetite.";
    if (world.GetFlag(murd.flags.hasCleanHands)) {
      world.SetFlag(murd.flags.hasCleanHands, false);
      description += " Ugh, your hands are now very greasy.";
    }

    world.Print(description);
  },
  CanGet: function(world) {
    if (murd.PIZZERIA.pizzaPaid) {
      return true;
    }
    if (murd.WALLET.location != world.INVENTORY) {
      world.Print("Ooops, you don't have your wallet, you can't pay for it!");
      return false;
    }
    // TODO: Inhibit the "Ok" message.
    murd.PIZZERIA.pizzaPaid = true;
    world.Print("You take your credit card out of your wallet and pay for it.");
    return true;
  }
});

// TODO: Rename to sink, once the aliases are improved.
murd.PIZZERIA_SINK = engine.MakeObject({
  NAME: "washbowl",
  TITLE: "a washbowl",
  INITIAL_LOCATION: murd.PIZZERIA_RESTROOM,
  Detail: function(world) {
    var description = "A filthy looking sink.";
    if (!murd.PIZZERIA_RESTROOM.hasUsedSink) {
      description += " You wonder if water actually comes out of it.";
    }
    return description;
  },
  Use: function(world, onWhat) {
    if (world.GetFlag(murd.flags.hasCleanHands)) {
      world.Print(pickRandomMessage([
          "Hmm, nah, my hands are already clean.",
          "I'd rather not touch it with my clean hands."]));
    } else if (!murd.PIZZERIA_RESTROOM.warnedFilthy) {
      murd.PIZZERIA_RESTROOM.warnedFilthy = true;
      world.Print("It looks very disgusting. "
                  + "Not sure touching the knob is a good idea. Hmm. "
                  + "Maybe not.");
    } else {
      murd.PIZZERIA_RESTROOM.hasUsedSink = true;
      world.Print("You open the knob and a frail stream of water trails down, "
                  + "like tears. You wash your hands as well as you can, which "
                  + "is not that good, but ... shrug, better than nothing. "
                  + "Your hands are now (mostly) clean.");
      world.SetFlag(murd.flags.hasCleanHands, true);
    }
  },
  CanGet: function(world) {
    world.Print("Hmm, no, thanks, that's very dirty.");
    return false;
  },
});

murd.PIZZERIA_GERMS = engine.MakeObject({
  NAME: "germs",
  TITLE: "germs",
  INITIAL_LOCATION: murd.PIZZERIA_RESTROOM,
  Detail: function(world) {
    return "Germs are invisible, but I'm sure there's many of them in here.";
  },
  Use: function(world, onWhat) {
    world.Print(pickRandomMessage([
        "Uh, what for?",
        "Uh, what?",
        "I don't want to get sick."]));
  },
  CanGet: function(world) {
    world.Print(pickRandomMessage([
        "Eww, that's disgusting!",
        "No way I'm touching that!"]));
    return false;
  },
});

murd.PIZZERIA_FLOOR = engine.MakeObject({
  NAME: "pizzeria-floor",
  TITLE: "floor",
  ALIASES: ["floor"],
  INITIAL_LOCATION: murd.PIZZERIA_RESTROOM,
  Detail: function(world) {
    var description =
        "The floor looks very disgusting. No way to tell when it was last "
        + "cleaned.";
    if (murd.PIZZERIA_RESTROOM.thrownUp) {
      description += " And, yeah: your vomit is still there.";
    }
    return description;
  },
  Use: function(world, onWhat) {
    world.Print(pickRandomMessage([
        "You mean like... sit down? No way!",
        "Yeah, right, you expect me to sleep there? Or what?",
        "I have no use for it.",]));
  },
  CanGet: function(world) {
    world.Print("That makes no sense.");
    return false;
  },
});

murd.PIZZERIA_VOMIT = engine.MakeObject({
  NAME: "vomit",
  TITLE: "vomit",
  INITIAL_LOCATION: null,
  Detail: function(world) {
    return "The regurgitated remains of your pizza in the floor camouflage "
        + "among other things.";
  },
  Use: function(world, onWhat) {
    this.CanGet(world);
  },
  CanGet: function(world) {
    if (!murd.PIZZERIA_RESTROOM.warnedVomit) {
      murd.PIZZERIA_RESTROOM.warnedVomit = true;
      world.Print("Hmm, that's probably not a good idea...");
      return;
    }
    world.Print("You grab the vomit as well as you can and smear it all over "
                + "your clothes. You start singing random voices very loudly. "
                + "The manager of the Pizzera, Don Leone, calls the police. "
                + "The police come by, knock the door down, stop your silly "
                + "chants and arrests you.<br>"
                + "<h1>Game over!</h1>");
    world.location = murd.JAIL;
    world.DescribeRoom();
    return false;
  },
});

murd.MURDER_CORPSE = engine.MakeObject({
  NAME: "corpse",
  TITLE: "a corpse",
  ALIASES: ["micha", "coworker"],
  INITIAL_LOCATION: null,
  skipContents: true,
  Detail: function(world) {
    var description =
        "The corpse of your coworker, Micha, is laying on the floor. "
        + "You grab his wrist and try to get a pulse, but fail. "
        + "Looks like he's really done for. He has a big wound on his back.";
    return description;
  },
  DescribeContents: function(world, objects) {
    var out = [];
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.MURDER_WOUND) {
        continue;  // Already explicitly mentioned.
      }
      out.push(obj)
    }
    return out;
  },
  Use: function(world, onWhat) {
    world.Print("You're not THAT hungry.");
  },
  CanGet: function(world) {
    world.Print("You try to lift it but it's too heavy.");
    return false;
  }
});

murd.MURDER_WOUND = engine.MakeObject({
  NAME: "wound",
  INITIAL_LOCATION: murd.MURDER_CORPSE,
  Detail: function(world) {
    return "The corpse has a big wound in his back. "
        + "Blood is still coming out of it."
        + (murd.MURDER_KNIFE.location == this
               ? " A small Swiss Army knife is stuck in it."
               : "");
  },
  DescribeContents: function(world, objects) {
    var out = [];
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.MURDER_KNIFE || obj == murd.MURDER_BLOOD) {
        continue;  // Already explicitly mentioned.
      }
      out.push(obj)
    }
    return out;
  },
  Use: function(world, onWhat) {
    world.Print("For what?");
  },
  CanGet: function(world) {
    world.Print("Eh, what?");
    return false;
  }
})

murd.MURDER_KNIFE = engine.MakeObject({
  NAME: "knife",
  TITLE: "a Swiss Army knife",
  ALIASES: ["swiss army knife", "pocket knife"],
  INITIAL_LOCATION: murd.MURDER_WOUND,
  Detail: function(world) {
    return "A small Swiss army knife. It's covered in Micha's blood.";
  },
  Use: function(world, onWhat) {
    if (onWhat == murd.MURDER_CORPSE
        || onWhat == murd.MURDER_WOUND) {
      world.Print("No way, why would I do that!");
    } else {
      world.Print("I have no use for the Swiss Army knife here.");
    }
  },
  CanGet: function(world) {
    world.Print("As you take the knife out of the wound, you hear sirens from "
        + "the police just outside the building. Oh, shit. You should probably "
        + "leave the building!");
    world.Print("<h1>To be continued ...</h1>");
    return true;
  }
});

murd.MURDER_BLOOD = engine.MakeObject({
  NAME: "blood",
  TITLE: "Micha's blood",
  INITIAL_LOCATION: murd.MURDER_WOUND,
  Detail: function(world) {
    return "Micha's blood is still dripping out of him.";
  },
  Use: function(world, onWhat) {
    if (onWhat == murd.MURDER_CORPSE) {
      world.Print("At this point his blood is all over the floor, there's not "
          + "much you can do.");
    } else {
      world.Print("You're not THAT thirsty. This is not a vampire's game.");
    }
  },
  CanGet: function(world) {
    world.Print("You can't get it; it's all over the floor now. "
        + "Maybe if you had a sponge.");
    return false;
  }
});

murd.MURDER_FLOOR = engine.MakeObject({
  NAME: "stairs-1-floor",
  TITLE: "the floor",
  ALIASES: ["ground", "floor"],
  INITIAL_LOCATION: murd.STAIRS_1,
  skipContents: true,
  Detail: function(world) {
    return "The floor is mostly clean... that is, if you ignore the huge "
        + "amount of blood seeping out of Micha's body.";
  },
  Use: function(world, onWhat) {
    world.Print("You bang your fists against the floor in frustration. "
        + "Nothing happens.");
  },
  CanGet: function(world) {
    world.Print("Na-ah.");
  }
});

murd.JAIL_BED = engine.MakeObject({
  NAME: "bedroom-bed",
  TITLE: "a crappy bed",
  INITIAL_LOCATION: murd.JAIL,
  ALIASES: ["bed",],
  Use: function(world, onWhat) {
    world.Print(pickRandomMessage([
        "You lay down on the bed and fail to fall asleep.",
        "You lay down and get some rest.",
        "You lay down and close your eyes. Sleep doesn't come.",
        "You fall asleep and dream of a hut in the Alps.",
        "You sleep. You dream of a slice of pizza margherita.",
        "You close your eyes and count sheep. You get to seven hundred fourty "
        + "two before you give up.",
        "You manage to sleep. You have a strange dream where you're drinking "
        + "with your colleagues and taking turn hammering nails."]));
    if (!murd.JAIL.mouseVisible && Math.random() > 0.2) {
      murd.JAIL.mouseVisible = true;
      world.Print(pickRandomMessage([
          "The mouse returns in the meantime.",
          "The mouse reappears.",
          "As you open your eyes, you see that the mouse is back."]));
    }
  },
  CanGet: function(world) {
    world.Print("It's bolted to the floor.");
    return false;
  }
});

murd.JAIL_MOUSE = engine.MakeObject({
  NAME: "mouse",
  TITLE: "a little mouse",
  INITIAL_LOCATION: murd.JAIL,
  Use: function(world, onWhat) {
    world.Print("You'd have to catch it first.");
  },
  CanGet: function(world) {
    if (!murd.JAIL.mouseVisible) {
      world.Print(pickRandomMessage([
          "The mouse is nowhere to be seen.",
          "The mouse is gone."]));
      return false;
    }
    world.Print(pickRandomMessage([
        "As you approach him, the mouse disappears behind the bars.",
        "The mouse flees from you, disappearing behind the bars."]));
    murd.JAIL.mouseVisible = false;
    return false;
  }
});

murd.JAIL_POSTER = engine.MakeObject({
  NAME: "poster",
  TITLE: "a poster of a rock band",
  INITIAL_LOCATION: murd.JAIL,
  Detail: function(world) {
    return "It's a poster of a rock band. You don't know who they are. They "
        + "have very long hair.";
  },
  Use: function(world, onWhat) {
    world.Print("You look at the poster and imagine you're free.");
  },
  CanGet: function(world) {
    world.Print(
        "You carefully take the poster off the wall. It tears down a bit.<br>"
        + "There's a small crack behind the poster.");
    murd.JAIL.crackVisible = true;
    // TODO: Inhibit "Ok".
    return true;
  },
});

murd.JAIL_CRACK = engine.MakeObject({
  NAME: "crack",
  TITLE: "a small crack in the wall",
  INITIAL_LOCATION: murd.JAIL,
  Use: function(world, onWhat) {
    world.Print(pickRandomMessage([
        "Unfortunately, it is too small.",
        "Maybe it would work if you were a mouse.",
        "You can barely fit a finger in there.",
        "For what? To escape? It's way too narrow."]));
  },
  CanGet: function(world) {
    world.Print("Eh? Na-ah.");
    return false;
  }
});

murd.Game = function() {
  this.START_LOCATION = murd.DREAM;
  this.INTRO = "Welcome to Adventure!<br>"
      + "You are standing in an open field west of a white house, with a "
      + "boarded front door. There is a small mailbox here.<br>"
      + "Would you like instructions?";
};
murd.Game.prototype = new engine.Game();
murd.Game.prototype.InitState = function(world) {
  world.SetFlag(murd.flags.foodEaten, 0);
};

murd.Game.prototype.HandleAction = function(world, parsed) {
  if (parsed.Match({verb: /eat/, entities: [murd.PIZZA]})) {
    if (murd.PIZZA.location != world.location
        && murd.PIZZA.location != world.INVENTORY) {
      world.Print("I'd love to, but I see no pizza here.");
    } else {
      murd.PIZZA.Use(world, null);
    }
    return true;
  }

  return false;
};

murd.Game.prototype.ROOMS = [
  murd.DREAM,
  murd.BEDROOM,
  murd.RESTROOM,
  murd.BRUPBACHERPLATZ,
  murd.BAR,
  murd.WIEDIKON,
  murd.ENGE,
  murd.HAUPTBAHNHOF,
  murd.AIRPORT,
  murd.OERLIKON,
  murd.TESSINERPLATZ,
  murd.PIZZERIA,
  murd.PIZZERIA_RESTROOM,
  murd.BANK_RECEPTION,
  murd.BANK_LIFT,
  murd.BANK_2_OFFICE,
  murd.BANK_2_TOILET,
  murd.OFFICE,
  murd.STAIRS_1,
  murd.BANK_TOILET,
  murd.JAIL,
];
murd.Game.prototype.OBJECTS = [
  murd.DREAM_FIELD,
  murd.DREAM_HOUSE,
  murd.DREAM_DOOR,
  murd.DREAM_MAILBOX,
  murd.DREAM_SPOON,
  murd.DREAM_POSTCARD,
  murd.DREAM_MONSTER,
  murd.DREAM_MONSTER_FUR,
  murd.DREAM_MONSTER_HEAD,
  murd.DREAM_MONSTER_HEAD_GLOW,
  murd.DREAM_MONSTER_HEAD_NUMBERS,

  murd.NIGHTSTAND,
  murd.ALARM_CLOCK,
  murd.BED,
  murd.WALLET,
  murd.BEDROOM_PLANT,
  murd.LINT,

  murd.SHOWER,
  murd.RESTROOM_WINDOW,
  murd.SINK,
  murd.TOOTH_BRUSH,

  murd.TESSINERPLATZ_FOUNTAIN,
  murd.TESSINERPLATZ_TREE,

  murd.BANK_PALM_TREE,

  murd.BANK_LIFT_BUTTON_0,
  murd.BANK_LIFT_BUTTON_1,
  murd.BANK_LIFT_BUTTON_2,
  murd.BANK_LIFT_BUTTON_3,

  murd.COWORKER,

  murd.COMPUTER,
  murd.OFFICE_CHAIR,
  murd.OFFICE_DESK,
  murd.OFFICE_PHOTO,

  murd.BANK_SINK,
  murd.BANK_SOAP,

  murd.MURDER_CORPSE,
  murd.MURDER_WOUND,
  murd.MURDER_KNIFE,
  murd.MURDER_BLOOD,
  murd.MURDER_FLOOR,

  murd.PIZZA,
  murd.PIZZERIA_SINK,
  murd.PIZZERIA_GERMS,
  murd.PIZZERIA_FLOOR,
  murd.PIZZERIA_VOMIT,

  murd.JAIL_BED,
  murd.JAIL_MOUSE,
  murd.JAIL_POSTER,
  murd.JAIL_CRACK,
];
