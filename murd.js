var murd = {};

murd.flags = {};
murd.flags.showered = 'showered';

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

  Exits: function(world) {
    return {'restroom': true, 'street': true}
  },
});

murd.RESTROOM = engine.MakeRoom({
  NAME: 'restroom',
  TITLE: 'the restroom',

  Init: function() {
    this.windowOpen = false;
  },

  Description: function(world) {
    var description = "The blue tiles in the restroom are a bit cold.";
    var isShowerWet = world.GetFlag(murd.flags.showered) ? " wet" : "";
    if (this.windowOpen) {
      description +=
          " A refreshing current of fresh air blows in from the open window."
          + " There's a" + isShowerWet + " shower here.";
    } else {
      description +=
          " The restroom smells a bit. There's a window and a" + isShowerWet
          + " shower here.";
    }
    return description;
  },
  CanEnter: function(world) {
    if (!world.GetFlag('restroomDoorOpen')) {
      world.Print('The door is closed.');
      return false;
    }
    world.Print('You enter the restroom.');
    if (this.windowOpen) {
      world.Print("A cold draft of air, straight from the mountains, makes you "
                  + "shiver.");
    } else {
      world.Print("The restroom smells a bit.");
    }
    return true;
  },
  Exits: function(world) {
    return {'bedroom': true}
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
  Description: function(world) {},
  CanEnter: function(world) {
    world.Print(
        "The bar is currently closed. It'll only open in the afternoon.<br>"
        + "You knock on the door repeatedly, but nobody opens. One woman walks "
        + "by, shaking her head and muttering something in Swiss German, "
        + "giving you a look of disapproval.");
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
    if (toRoom == murd.ENGE) {
      return true;  // That's where we want him to go.
    }
    if (toRoom == murd.STREET) {
      return true;  // Okay, why not.
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
        + "From here you can reach your office easily.";
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
    if (toRoom == murd.OFFICE) {
      return true;
    }
    if (toRoom == murd.WIEDIKON) {
      world.Print("Why would you go back now? You didn't forget anything.");
    } else {
      world.Print(
          "There's no time for that! You really should get to the office now.");
    }
    return false;
  },
  Exits: function(world) {
    return ExitsTrainLines(murd.ENGE, {'office': true});
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

murd.OFFICE = engine.MakeRoom({
  NAME: 'office',
  TITLE: 'the office',
  Description: function(world) {
    return "Your office, in a small branch of a big bank.<br>"
           + "<h1>You won the game!</h1>";
  },
  CanEnter: function(world) {
    world.Print(
        "You go through the door, take the lift an enter your cubicle. Looks "
        + "like nobody noticed how late you are. You sit down on your chair in "
        + "front of the computer."
        + "<br>"
        + "<h1>You won the game!</h1>");
    return true;
  },
  CanLeave: function(world, toRoom) {
    world.Print("No, you need to focus on your work!");
    return false;
  },
  Exits: function(world) {
    return {'enge': true};
  }
});

murd.Game = function() {
  this.START_LOCATION = murd.BEDROOM;
  this.INTRO = 'The game is afoot.<br>You are in your bedroom.'
};
murd.Game.prototype = new engine.Game();
murd.Game.prototype.InitState = function(world) {
  world.SetFlag('restroomDoorOpen', false);
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
    if (words[0] == 'window') {
      if (world.location != murd.RESTROOM) {
        return false;
      }
      murd.RESTROOM.windowOpen = true;
      world.Print("You open that window. Ahh, a fresh breeze of Swiss air!");
      return true;
    }
    return false;
  }

  if (verb == 'use') {
    if (words[0] !== 'shower') {
      return false;
    }
    if (world.location != murd.RESTROOM) {
      return false;
    }
    world.SetFlag(murd.flags.showered, true);
    world.Print(
        "You take your clothes off and take a quick shower. The water feels "
        + "refreshing. After showering, you dry yourself with a towel and put "
        + "on your banker suit.");
    return true;
  }

  if (verb == 'turn' && words[0] == 'off') {
    if (words[1] !== 'clock') {
      return false;
    }
    if (world.location != murd.BEDROOM) {
      return false;
    }
    murd.BEDROOM.alarmClockOn = false;
    world.Print('Ahh, finally a bit of peace.');
    return true;
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
  murd.OFFICE,
];
