var murd = {};

murd.flags = {};
murd.flags.showered = 'showered';
// A counter of the number of units of food eaten (each action that consumes a
// food item should increment it).
murd.flags.foodEaten = 'foodEaten';

function isShowerCommand(verb, words) {
  return verb == 'shower'
      || ((verb == 'use' || verb == 'take') && words[0] == 'shower');
}

murd.BEDROOM = engine.MakeRoom({
  NAME: 'bedroom',
  TITLE: 'your bedroom',

  Init: function() {
    this.alarmClockOn = true;
  },

  Description: function(world) {
    var description = "Your bedroom is a bit messy.";
    if (this.alarmClockOn) {
      description += " The annoying alarm clock is beeping loudly."
    }
    description +=
        " Two doors are here, one leads to the restroom and one to the street.";
    return description;
  },

  DescribeObjects: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
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

  CanLeave: function(world, toRoom) {
    if (toRoom == murd.STREET) {
      if (this.alarmClockOn) {
        world.Print('You should turn that stupid alarm clock off first.');
        return false;
      }
      if (!world.GetFlag(murd.flags.showered)) {
        world.Print(
            "Hmm, you should probably take a shower first. You smell a bit.");
        return false;
      }
    }
    return true;
  },

  HandleAction: function(world, verb, words) {
    if (isShowerCommand(verb, words)) {
      world.Print(
          "I can't do that in the bedroom, but I think there's a shower in the "
          + "restroom.");
      return true;
    }
    if (verb == "turn" && words[0] == "off" && words[1] == "clock") {
      if (!this.alarmClockOn) {
        world.Print("Eh? The alarm clock is already off.");
        return true;
      }
      this.alarmClockOn = false;
      world.Print("Ahh, finally a bit of peace. The room looks different "
                  + "without all this noise.");
      return true;
    }
    return false;
  },

  Exits: function(world) {
    return {'restroom': true, 'street': true}
  },
});

murd.RESTROOM = engine.MakeRoom({
  NAME: 'restroom',
  TITLE: 'the restroom',

  Init: function() {
    // TODO: Make this a property of RESTROOM_WINDOW.
    this.windowOpen = false;
    // Used to alternate the messages in the description after the window is
    // open.
    this.descriptionCount = 0;
  },

  Description: function(world) {
    var description = "The blue tiles in the restroom are a bit cold.";
    if (this.windowOpen) {
      if (this.descriptionCount % 2 == 0) {
        description +=
            " A refreshing current of fresh air blows in from the open window.";
      } else {
        description += " A cold draft of air, straight from the mountains into "
                       + "your window, makes you shiver.";
      }
      this.descriptionCount++;
    } else {
      description += " The restroom smells a bit.";
    }
    return description;
  },

  DescribeObjects: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.RESTROOM_WINDOW && this.windowOpen) {
        continue;  // Already mentioned in the description.
      }
      out.push(obj)
    }
    return out;
  },

  CanEnter: function(world) {
    if (!world.GetFlag('restroomDoorOpen')) {
      world.Print('The door is closed.');
      return false;
    }
    world.Print('You enter the restroom.');
    return true;
  },
  Exits: function(world) {
    return {'bedroom': true}
  },
  HandleAction: function(world, verb, words) {
    if (isShowerCommand(verb, words)) {
      murd.SHOWER.Use(world);
      return true;
    }
    if (words[0] == 'window') {
      if (verb == 'open') {
        murd.RESTROOM_WINDOW.Open(world);
        return true;
      } else if (verb == 'close') {
        murd.RESTROOM_WINDOW.Close(world);
        return true;
      }
    }
    return false;
  },
});

// TODO: Add a mailbox, with some stuff that becomes critical later in the game?
murd.STREET = engine.MakeRoom({
  NAME: 'street',
  TITLE: 'the street',
  Description: function(world) {
    return "You're in a small park. From here you can go back into your "
           + "bedroom, to the local bar, or to the wiedikon train station.";
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
    return {'bedroom': true, 'wiedikon': true, 'bar': true};
  }
});

murd.BAR = engine.MakeRoom({
  NAME: 'bar',
  TITLE: 'the bar',

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
      function(name) { output += separator + name; separator = ", "; });
  return output + "<br>";
}

function ExitsTrainLines(room, exits) {
  room.TrainLines().forEach(
      function(name) { exits[name.toLowerCase()] = true; });
  return exits;
}

murd.WIEDIKON = engine.MakeRoom({
  NAME: 'wiedikon',
  TITLE: 'the Wiedikon train station',
  TrainLines: function() {
    return ["Enge", "Oerlikon", "Airport", "Hauptbahnhof"];
  },
  Description: function(world) {
    return "You're in Wiedikon, a small train station.<br>"
           + DescriptionTrainLines(murd.WIEDIKON)
           + "The station has a big clock, always on time. Damn, unlike it, "
           + "you're running late.";
  },
  CanEnter: function(world) {
    world.Print("You enter the Wiedikon train station.");
    return true;
  },
  CanLeave: function(world, toRoom) {
    if (toRoom == murd.STREET) {
      return true;  // Okay, why not.
    }
    if (toRoom == murd.ENGE) {
      if (world.INVENTORY.objects.indexOf(murd.WALLET) == -1) {
        world.Print(
            "Oh, dang: looks like you forgot your wallet, which has your "
            + "train pass.");
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
    return ExitsTrainLines(murd.WIEDIKON, {'street': true});
  }
});

// TODO: Add a Kiosk inside the station?
murd.ENGE = engine.MakeRoom({
  NAME: 'enge',
  TITLE: 'the Enge train station',
  TrainLines: function() {
    return ["Wiedikon", "Oerlikon", "Airport", "Hauptbahnhof"];
  },
  Description: function(world) {
    return "You're at the beautiful Enge train station. This whole thing was "
        + "built with granite from Ticino. Thousands of people commute here "
        + "everyday, going through the imposing facade.<br>"
        + DescriptionTrainLines(murd.ENGE)
        + "You can walk outside to Tessinerplatz.";
  },
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
    if (toRoom == murd.WIEDIKON) {
      world.Print("Why would you go back now? You didn't forget anything.");
    } else {
      world.Print(
          "There's no time for that! Now you really should get to your office, "
          + "which is a few blocks from Tessinerplatz.");
    }
    return false;
  },
  Exits: function(world) {
    return ExitsTrainLines(murd.ENGE, {'tessinerplatz': true});
  }
});

murd.HAUPTBAHNHOF = engine.MakeRoom({
  NAME: 'hauptbahnhof',
  TITLE: 'the main train station in Zurich',
  Description: function(world) {},
});

murd.AIRPORT = engine.MakeRoom({
  NAME: 'airport',
  TITLE: 'the airport',
  Description: function(world) {},
});

murd.OERLIKON = engine.MakeRoom({
  NAME: 'oerlikon',
  TITLE: 'the oerlikon train station',
  Description: function(world) {},
});

murd.TESSINERPLATZ = engine.MakeRoom({
  NAME: 'tessinerplatz',
  TITLE: 'Tessinerplatz',
  Description: function(world) {
    return "You're in Tessinerplatz, a beautiful square in front of the Enge "
           + "train station. From here you can walk to your office or to the "
           + "pizzeria.";
  },
  Exits: function(world) {
    return {'enge': true, 'office': true, 'pizzeria': true};
  }
});

murd.OFFICE = engine.MakeRoom({
  NAME: 'office',
  TITLE: 'the office',
  Init: function() {
    this.sitting = false;
    this.timeWorking = 0;
  },

  Description: function(world) {
    var description = "In your cubicle there's a desk, ";
    description +=
        this.sitting ? "the chair on which you're sitting" : "a chair";
    description += ", and an old computer.";
    if (this.timeWorking == 1) {
      // As a hint.
      description += " From here you can easily reach Tessinerplatz.";
    }
    return description;
  },
  DescribeObjects: function(world, objects) {
    var out = []
    for (var i in objects) {
      var obj = objects[i];
      if (obj == murd.OFFICE_CHAIR || obj == murd.OFFICE_DESK
          || obj == murd.COMPUTER) {
        continue;  // They're already in the description.
      }
      out.push(obj)
    }
    return out;
  },
  CanEnter: function(world) {
    world.Print(
        "You go through the door, take the lift an enter your cubicle. Looks "
        + "like nobody noticed how late you are.");
    return true;
  },
  CanLeave: function(world, toRoom) {
    if (this.timeWorking == 1) {
      this.sitting = false;
      return true;
    }
    world.Print("No, you need to focus on your work!");
    return false;
  },
  Exits: function(world) {
    return {'tessinerplatz': true};
  }
});

murd.PIZZERIA = engine.MakeRoom({
  NAME: 'pizzeria',
  TITLE: 'the pizzeria',
  Description: function(world) {
    return "The pizzeria Tricolore, located near Tessinerplatz, is the place "
           + "where you usually have lunch. "
           + "The pizza is mediocre but the prices are affordable for Zurich.";
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
    return {'tessinerplatz': true};
  },
});

murd.WALLET = engine.MakeObject({
  NAME: 'wallet',
  TITLE: 'your wallet',
  INITIAL_LOCATION: murd.BEDROOM,
  Description: function(world) {
    return 'You have $23, a trains pass, and a credit card.'
  },
  CanGet: function(world) {
    if (murd.BEDROOM.alarmClockOn) {
      world.Print('I don\'t know what you are talking about...');
      return false;
    }
    return true;
  },
});

murd.LINT = engine.MakeObject({
  NAME: 'lint',
  TITLE: 'some pocket lint',
  INITIAL_LOCATION: null,
  Description: function(world) {
    return 'Maybe you should consider buying new pants.'
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
          'You smear the lint on your wallet for no particular reason. ' + 
          'The particles dissolve into oblivion.');
      world.Destroy(this);
    } else {
      world.Print('What for?');
    }
  },
});

murd.SHOWER = engine.MakeObject({
  NAME: 'shower',
  TITLE: 'a shower',
  INITIAL_LOCATION: murd.RESTROOM,
  Description: function(world) {
  },
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
    world.SetFlag(murd.flags.showered, true);
    this.TITLE = 'a wet shower';
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
  NAME: 'window',
  TITLE: 'a window',
  INITIAL_LOCATION: murd.RESTROOM,
  Description: function(world) {},
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

murd.COMPUTER = engine.MakeObject({
  NAME: 'computer',
  TITLE: 'your old computer',
  INITIAL_LOCATION: murd.OFFICE,
  Description: function(world) {
    return "An old computer running Windows 98. You fight with spreadsheets "
           + "here all day.";
  },
  Use: function(world, onWhat) {
    if (murd.OFFICE.timeWorking == 3) {
      world.Print("You're too tired to work further. It's time to go home.");
      return;
    }
    if (murd.OFFICE.timeWorking == 0) {
      murd.OFFICE.timeWorking++;
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
        world.Print(
            "You try to work further but it's pointless: you're too hungry to "
            + "focus. Go grab a pizza or something?");
        return;
      }
      murd.OFFICE.timeWorking++;
      world.Print("<h1>You've won.</h1>");
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
  NAME: 'chair',
  TITLE: 'your chair',
  INITIAL_LOCATION: murd.OFFICE,
  Description: function(world) {},
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
  NAME: 'desk',
  TITLE: 'your desk',
  INITIAL_LOCATION: murd.OFFICE,
  Description: function(world) {},
  Use: function(world, onWhat) {
    world.Print("Umm, nah.");
  },
  CanGet: function(world) {
    world.Print("It's too heavy.");
    return false;
  }
});

murd.Game = function() {
  this.START_LOCATION = murd.BEDROOM;
  this.INTRO = 'The game is afoot.<br>You are in your bedroom.'
};
murd.Game.prototype = new engine.Game();
murd.Game.prototype.InitState = function(world) {
  world.SetFlag('restroomDoorOpen', false);
  world.SetFlag('foodEaten', 0);
};

murd.Game.prototype.HandleAction = function(world, verb, words) {
  if (verb == 'open') {
    if (words[0] == 'door') {
      if (!('restroom' in world.location.Exits())) {
        return false;
      }
      world.SetFlag('restroomDoorOpen', true);
      world.Print('Ok');
      return true;
    }
    return false;
  }

  return false;
};

murd.Game.prototype.ROOMS = [
  murd.BEDROOM,
  murd.RESTROOM,
  murd.STREET,
  murd.BAR,
  murd.WIEDIKON,
  murd.ENGE,
  murd.HAUPTBAHNHOF,
  murd.AIRPORT,
  murd.OERLIKON,
  murd.TESSINERPLATZ,
  murd.PIZZERIA,
  murd.OFFICE,
];
murd.Game.prototype.OBJECTS = [
  murd.WALLET,
  murd.LINT,
  murd.SHOWER,
  murd.RESTROOM_WINDOW,
  murd.COMPUTER,
  murd.OFFICE_CHAIR,
  murd.OFFICE_DESK,
];
