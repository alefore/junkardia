var murd = {};

murd.flags = {};
murd.flags.showered = "showered";
// A counter of the number of units of food eaten (each action that consumes a
// food item should increment it).
murd.flags.foodEaten = "foodEaten";
// Did we already warn him that he should have his wallet (train pass) whenever
// he rides a train?
murd.warnedTrainPass = "warnedTrainPass";
// Are his hands clean? Set to true when he showers, to false when he eats
// his pizza, needs to wash them in the fountain.
murd.flags.hasCleanHands = "hasCleanHands";

// Given an array of messages, selects an returns one randomly.
function pickRandomMessage(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function awesome() {
  return pickRandomMessage([
      "aewsome", "awesoem", "awseome", "aweosme", "awosome", "aweomse"]);
}

function Awesome() {
  var value = awesome();
  return value.charAt(0).toUpperCase() + value.substring(1);
}

function describeContentsWithSkip(world, objects) {
  var out = [];
  for (var i in objects) {
    var obj = objects[i];
    if (!obj.skipContents) {
      out.push(obj)
    }
  }
  return out;
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

murd.CONTROL_ROOM = engine.MakeRoom({
  NAME: "control-room",
  TITLE: "the control room of your space ship",
  ALIASES: ["control", "room", "control room"],
  Init: function() {
    this.sitting = true;
    this.used_controls = false;
    this.landed = false;
    this.music_playing = false;
    this.music_has_played = false;
  },
  DescriptionShort: function(world) {
    return (this.sitting
               ? "You're sitting on"
               : "You see")
        + " a large black chair facing a panel with several blinking buttons: "
        + "the controls of your ship. There's a window above them, looking "
        + (this.landed
               ? "into Junkardia."
               : "out into space. There's a poster fixed to the wall "
                 + "behind you.")
        + (this.music_playing
               ? " Some old earth music is playing out of the one of the "
                 + "speakers near the ceiling."
               : "");
  },
  Description: function(world) {
    return "You're in the control room of your space ship. "
        + this.DescriptionShort(world);
  },
  DescribeContents: describeContentsWithSkip,
  HandleAction: function(world, parsed) {
    if (parsed.MatchAny([
            {verb: /land/},
            {verb: /land/, entities: [murd.CONTROL_ROOM_SHIP]},
            {verb: /land/, entities: [murd.CONTROL_ROOM_JUNKARDIA],
             modifiers: [/on|at/]}])) {
      if (this.landed) {
        world.Print("We have already landed!");
      } else {
        world.Print(
            this.used_controls
                ? ("Yep, the ship is now closer and closer to Junkardia. Maybe "
                   + "it's time to use press the Land button?")
                : ("Yeah, that's a good idea. That's probably what the "
                   + " controls are for!"));
      }
      return true;
    }
    if (parsed.MatchAny([
            {verb: /stand/},
            {verb: /stand/, modifiers: [/up/]}])) {
      if (this.sitting) {
        world.Print("You stand up and stretch your legs.");
        this.sitting = false;
      } else {
        world.Print("You are already standing.");
      }
      return true;
    }
    if (parsed.MatchAny([
            {verb: /sit/},
            {verb: /sit/, modifiers: [/down/]}])) {
      if (this.sitting == true) {
        world.Print("You are already seated on your comfortable black chair.");
      } else {
        murd.CONTROL_ROOM_CHAIR.Use(world, null);
      }
      return true;
    }
    if (parsed.MatchAny([
            {verb: /go/, entities: [murd.CONTROL_ROOM_JUNKARDIA]},
            {verb: /go/, entities: [], modifiers: [/out/]}])) {
      world.Enter(murd.JUNKARDIA);
      return true;
    }
    if (parsed.Match({verb: /listen/})) {
      murd.CONTROL_ROOM_SPEAKERS.Use(world, null);
      return true;
    }
    if (parsed.Match({verb: /relax/})) {
      (this.music_playing ? murd.CONTROL_ROOM_SPEAKERS
                          : murd.CONTROL_ROOM_POSTER)
          .Use(world, null);
      return true;
    }
    return false;
  },
  CanLeave: function(world, toRoom) {
    if (!this.landed) {
      world.Print("You need to land your ship first.");
      return false;
    }
    if (murd.CONTROL_ROOM_SPACE_SUIT.location != world.INVENTORY) {
      world.Print(
          "Without wearing a space suit? It might be dangerously stinky out "
          + "there.");
      return false;
    }
    return true;
  },
  Exits: function(world) {
    return [engine.MakeExit({TO: murd.JUNKARDIA})];
  }
});

murd.JUNKARDIA = engine.MakeRoom({
  NAME: "junkardia",
  TITLE: "a pile of garbage on planet Junkardia",
  ALIASES: ["planet"],
  Init: function() {
    this.visited = false;
    this.robot_has_been_powered = false;
    this.robot_powered = false;
    this.robot_on = false;
    this.turret_has_been_active = false;
    this.turret_active = false;
  },
  Description: function(world) {
    return "You're standing on the heap of garbage that is planet Junkardia "
        + "looking for treasures. "
        + (this.turret_active
               ? ("The Base2XL is standing next to your ship, scanning the "
                  + "territory for hostile activity.")
               : ("It might get dark pretty soon, so you should take out the "
                  + "Base2XL out of the ship and activate it; who knows what "
                  + "monsters you'll encounter here!"));
  },
  DescribeContents: describeContentsWithSkip,
  HandleAction: function(world, parsed) {
  },
  CanLeave: function(world, toRoom) {
    return false;
  },
  CanEnter: function(world) {
    world.Print(
        "You step out of the space ship into Junkardia."
        + (this.visited
               ? ""
               : " Looks like your ship landed on top of a pile of garbage. "
                 + "Perfect!"));
    this.visited = true;
    return true;
  },
  Exits: function(world) {
    var output = [];
    if (this.landed) {
      output = [engine.MakeExit({TO: murd.CONTROL_ROOM})];
    }
    return output;
  }
});

// ** Objects ******************************************************************

murd.Game = function() {
  this.START_LOCATION = murd.CONTROL_ROOM;
  this.INTRO = "Welcome to Junkardia Space Adventure Magistral!<br>"
      + "You are sitting on your black chair in the control room of the Eliza, "
      + "looking out the window. "
      + "You see Junkardia out there, not too far.<br>";
};

murd.Game.prototype = new engine.Game();
murd.Game.prototype.OBJECTS = [];

function MakeFixedObject(data) {
  var value = engine.MakeFixedObject(data);
  murd.Game.prototype.OBJECTS.push(value);
  return value;
}

function MakeObject(data) {
  var value = engine.MakeObject(data);
  murd.Game.prototype.OBJECTS.push(value);
  return value;
}

// ** List of objects **********************************************************

murd.CONTROL_ROOM_CHAIR = MakeFixedObject({
  NAME: "chair",
  TITLE: "your chair",
  // TODO: Get rid of "black" alias.
  ALIASES: ["black", "black chair"],
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    return "It is a standard black space ship chair, somewhat worn out by many "
        + "years of abuse. It's facing the controls of the ship. "
        + (murd.CONTROL_ROOM.sitting ? " You're sitting on it." : "")
        + (murd.CONTROL_ROOM.music_playing
               ? " OK, the chair may not amount to much, but whatever, it's "
                 + "pretty great."
               : "");
  },
  Use: function(world, onWhat) {
    if (murd.CONTROL_ROOM.sitting) {
      world.Print("You're already sitting down on it.");
      return;
    }
    murd.CONTROL_ROOM.sitting = true;
    world.Print(
        "You sit down on your chair, facing the controls of your ship."
        + (murd.CONTROL_ROOM.music_playing ? " It feels good to sit!" : ""));
  },
  CanGet: function(world) {
    world.Print("It's bolted to the ground.");
    return false;
  }
});

murd.CONTROL_ROOM_CONTROLS = MakeFixedObject({
  NAME: "controls",
  TITLE: "the controls of your ship",
  // TODO: Get rid of "blinking".
  ALIASES: ["control", "buttons", "panel", "control buttons", "control panel",
            "blinking", "blinking buttons"],
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    return "You see a panel full of buttons. Some are blinking in different "
        + "colors. "
        + (murd.CONTROL_ROOM.used_controls && !murd.CONTROL_ROOM.landed
               ? " The Land button is waiting "
                 + "for you to press it."
               : "You know these buttons like the palm of your hand, since "
                 + "you've been flying the good ol' Eliza for a few decades.");
  },
  Use: function(world, onWhat) {
    var prefix =
        murd.CONTROL_ROOM.sitting
            ? ""
            : "You sit down on your chair and face the controls. ";
    if (murd.CONTROL_ROOM.used_controls) {
      if (murd.CONTROL_ROOM.music_playing) {
        world.Print(
            "You press the Music Off button.");
      } else {
        this.music_has_played = true;
        world.Print(
            "You press some buttons randomly. Some music starts playing out of "
            + "one of the two speakers near the ceiling: old earth rock. "
            + "It helps you cheer up.");
      }
      murd.CONTROL_ROOM.music_playing = !murd.CONTROL_ROOM.music_playing;
      window.document.title =
          murd.CONTROL_ROOM.music_playing
              ? "Junkardia Space Adventure Magistral!!!!! " + Awesome() + "!1"
              : "Junkardia Space Adventure Magistral!"
      return;
    }
    world.Print(
        prefix
        + "You press some buttons. Beep! Beep! "
        + "The ship stirs and lets out a sigh as it starts zooming in towards "
        + "Junkardia.");
    murd.CONTROL_ROOM.sitting = true;
    murd.CONTROL_ROOM.used_controls = true;
  },
  CanGet: function(world) {
    world.Print("The controls are attached to the ship.");
    return false;
  },
  HandleAction: function(world, parsed) {
    if (parsed.Match({verb: /press|push/, entities: [this]})) {
      this.Use(world, null);
      return true;
    }
  }
});

murd.CONTROL_ROOM_WALL = MakeFixedObject({
  NAME: "wall",
  TITLE: "the wall of your control room",
  // TODO: Get rid of "new".
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    return "It's an unremarkable wall, a bit dirty."
        + " A poster is hanging from it next to a closet.";
  },
  Use: function(world, onWhat) {
    world.Print("What for?");
  },
  CanGet: function(world) {
    world.Print("Uhm, I don't understand that.");
    return false;
  },
});

murd.CONTROL_ROOM_POSTER = MakeFixedObject({
  NAME: "poster",
  TITLE: "a photo attached to the wall",
  // TODO: Get rid of "new".
  ALIASES: ["new", "new brasilia", "photo"],
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    var description =
        (murd.CONTROL_ROOM.sitting ? "You stand up and " : "You ")
        + "walk to the poster that's fixed to the wall and take a good look "
        + "at it. "
        + "It's a photo of the beautiful beaches in New Brasilia, the "
        + "planet in which you were born, ninety-seven years ago."
        + (murd.CONTROL_ROOM.music_playing
               ? " New Brasilia is the best place ever!" : "")
        + " You haven't been there in several decades."
        + " Looking at it helps you relax."
        + " There's a closet next to the poster.";
    murd.CONTROL_ROOM.sitting = false;
    return description;
  },
  Use: function(world, onWhat) {
    world.Print(this.Detail(world));
  },
  CanGet: function(world) {
    world.Print("It's glued to the wall. I don't want to damage it, it has "
        + "special value for me.");
    return false;
  },
});

murd.CONTROL_ROOM_WINDOW = MakeFixedObject({
  NAME: "window",
  TITLE: "the window of your spaceship",
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    if (murd.CONTROL_ROOM.landed) {
      return "You look at of the window and see the piles and piles of garbage "
          + "out there in Junkardia that you came here for."
          + (murd.CONTROL_ROOM.music_playing
                 ? " It looks " + awesome() + "!" : "");
    }
    if (murd.CONTROL_ROOM.used_controls) {
      return "Looking out of the window you see Junkardia growing and growing "
          + "as we're approaching it fast."
          + (murd.CONTROL_ROOM.music_playing ? " Junkardia rocks!" : "")
          + " After a long trip, we're almost "
          + "there now. It's probably time to land: once you press the Land "
          + "button, the ship should do the rest."
    }
    return "You take a good look out of the window and you see Junkardia out "
        + "there. Somehow, it still looks as majestic as always to you; this "
        + "will be the fourth time you land on it. "
        + "After a long trip, we're almost there now. It's probably "
        + "time to land.";
  },
  Use: function(world, onWhat) {
    world.Print(this.Detail(world));
  },
  HandleAction: function(world, parsed) {
    if (parsed.Match({verb: /open/, entities: [this]})) {
      world.Print("You can't open the window in the space ship!");
      return true;
    }
    if (parsed.Match({verb: /close/, entities: [this]})) {
      world.Print("The window is hermetically closed.");
      return true;
    }
    return false;
  }
});

murd.CONTROL_ROOM_JUNKARDIA = MakeFixedObject({
  NAME: "Junkardia",
  TITLE: "the majestic planet Junkardia",
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    return murd.CONTROL_ROOM_WINDOW.Detail(world);
  },
  Use: function(world, onWhat) {
    world.Print(
        murd.CONTROL_ROOM.landed
            ? "That's what we came here for! But ... you'll need to be a bit "
              + "more specific."
            : "Well, that's the whole point we're here. But we'll need to land "
              + "the ship first.");
  },
});

murd.CONTROL_ROOM_SHIP = MakeFixedObject({
  NAME: "ship",
  TITLE: "your rusty old space ship",
  ALIASES: ["eliza"],
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    return "The Eliza is your rusty old space ship. "
        + "You take a look around you. "
        + murd.CONTROL_ROOM.Description(world);
  },
  Use: function(world, onWhat) {
    world.Print(
        murd.CONTROL_ROOM.landed
        ? "You've already used: you've landed in Junkardia."
        : "You are already using it: you're flying in it towards Junkardia.");
  },
  CanGet: function(world) {
    world.Print("You are already in it.");
    return false;
  }
});

murd.CONTROL_ROOM_LAND_BUTTON = MakeFixedObject({
  NAME: "landbutton",
  TITLE: "the button that activates the module that tells the ship to land "
         + "itself.",
  ALIASES: ["land", "land button", "land module"],
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    return "The Land button is an unremarkable button other than for the fact "
        + "that it activates the Land module, which makes the ship land "
        + "itself."
        + (murd.CONTROL_ROOM.music_playing
               ? " OK, so not that unremarkable then, eh?"
               : "");
  },
  Use: function(world, onWhat) {
    if (!murd.CONTROL_ROOM.sitting) {
      world.Print("You sit down on your chair and face the controls.");
      murd.CONTROL_ROOM.sitting = true;
    }
    if (murd.CONTROL_ROOM.landed) {
      world.Print("You press the Land button. Nothing happens. Oh, yeah, maybe "
          + "because we've already landed?");
      return true;
    }
    var prefix = "";
    if (!murd.CONTROL_ROOM.used_controls) {
      murd.CONTROL_ROOM_CONTROLS.Use(world, onWhat);
      prefix = "You wait for a few minutes as the ship approaches Junkardia."
    }
    world.Print(prefix
        + "You press the Land button. It doesn't do anything at first, so "
        + "you press it again a few times, until it finally clicks. "
        + "Eliza stirs again as it rights itself and approaches Junkardia. "
        + "You wait for a few minutes until you hear a loud *thud* that "
        + "announces that Eliza has landed."
        + (murd.CONTROL_ROOM.music_playing ? " Fuck, that was loud!" : ""));
    murd.CONTROL_ROOM.landed = true;
  },
  CanGet: function(world) {
    world.Print("The button is fixed on the panel.");
    return false;
  },
  HandleAction: function(world, parsed) {
    if (parsed.Match({verb: /press|push/, entities: [this]})) {
      this.Use(world, null);
      return true;
    }
  }
});

murd.CONTROL_ROOM_MUSIC = MakeFixedObject({
  NAME: "music",
  TITLE: "the awesome rock music",
  ALIASES: ["rock"],
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    return "That makes no sense.";
  },
  Use: function(world, onWhat) {
    murd.CONTROL_ROOM_SPEAKERS.Use(world, onWhat);
  },
  HandleAction: function(world, parsed) {
    if (parsed.Match({verb: /turn/, entities: [this], modifiers: [/on/]})) {
      if (murd.CONTROL_ROOM.music_playing) {
        world.Print("The music is already playing.");
      } else {
        while(!murd.CONTROL_ROOM.music_playing) {
          murd.CONTROL_ROOM_CONTROLS.Use(world, null);
        }
      }
      return true;
    }

    if (parsed.Match({verb: /turn/, entities: [this], modifiers: [/off/]})) {
      if (murd.CONTROL_ROOM.music_playing) {
        murd.CONTROL_ROOM_CONTROLS.Use(world, null);
      } else {
        world.Print("The music is already off.");
      }
      return true;
    }

    if (parsed.Match({verb: /turn/, entities: [this], modifiers: [/louder/]})) {
      if (murd.CONTROL_ROOM.music_playing) {
        world.Print("It's already as loud as it can be! " + Awesome());
      } else {
        world.Print("There's no music playing right now.");
      }
      return true;
    }

    if (parsed.Match({verb: /listen|enjoy/, entities: [this]})) {
      if (murd.CONTROL_ROOM.music_playing) {
        murd.CONTROL_ROOM_SPEAKERS.Use(world, null);
      } else {
        world.Print("There's no music playing right now.");
      }
      return true;
    }
    return false;
  },
});

murd.CONTROL_ROOM_SPEAKERS = MakeFixedObject({
  NAME: "speakers",
  TITLE: "two old speakers attached to the ceiling",
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    return "Two old speakers attached to the ceiling of the ship."
        + (murd.CONTROL_ROOM.music_playing
               ? " One of them still works; "
                 + awesome() + " old rock is playing out of it!"
               : "");
  },
  Use: function(world, onWhat) {
    if (murd.CONTROL_ROOM.landed) {
      world.Print(
          "There's no time to listen to music right now, we have to get busy "
          + "before it gets dark.");
      return;
    }
    if (!murd.CONTROL_ROOM.music_playing) {
      if (!murd.CONTROL_ROOM.used_controls) {
        world.Print("No music is playing now.");
        return;
      }
      murd.CONTROL_ROOM_CONTROLS.Use(world, onWhat);
    }
    world.Print(
        "You close your eyes and listen to the " + awesome()
        + " old earth rock!");
  },
  CanGet: function(world) {
    world.Print("The speakers are fixed to the wall.");
    return false;
  }
});

murd.CONTROL_ROOM_CEILING = MakeFixedObject({
  NAME: "ceiling",
  TITLE: "the ceiling of the spaceship",
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    return "The ceiling looks a bit dirty, with stains of "
        + pickRandomMessage(["oil", "wine", "beer", "blood", "sewage",
                             "dead insects"])
        + " and other undescribable filth."
        + (murd.CONTROL_ROOM.music_playing
               ? " Two speakers are attached to it, one of them blasting out "
                 + awesome() + " rock music!"
               : "");
  },
  Use: function(world, onWhat) {
    world.Print("You have no use for the ceiling now.");
  },
  HandleAction: function(world, parsed) {
    if (parsed.Match({verb: /clean/, entities: [this]})) {
      world.Print("Are you kidding me? I don't have time for that.");
      return true;
    }
  }
});

murd.CONTROL_ROOM_CLOSET = MakeFixedObject({
  NAME: "closet",
  TITLE: "the closet",
  INITIAL_LOCATION: murd.CONTROL_ROOM,
  Detail: function(world) {
    return "The closet where you keep your clothes, right next to the poster "
        + "of New Brasilia.";
  },
  Use: function(world, onWhat) {
    world.Print("You have no use for the closet.");
  },
});

function MakeClothes(data) {
  data["Use"] = function(world, onWhat) {
    if (this.location != world.INVENTORY) {
      if (this.CanGet(world)) {
        world.INVENTORY.Add(this);
      }
      return true;
    }
    world.Print("You are already wearing " + this.TITLE);
    return true;
  };
  data["HandleAction"] = function(world, parsed) {
    if (parsed.Match({verb: /clean/, entities: [this]})) {
      world.Print("You dust it off a bit, but it doesn't seem to do much.");
      return true;
    }
    if (parsed.MatchAny([
            {verb: /wear/, entities: [this]},
            {verb: /put/, entities: [this], modifiers: [/on/]}])) {
      this.Use(world, null);
      return true;
    }
    // TODO: This doesn't seem to work.
    if (parsed.Match(
            {verb: /take/, entities: [this], modifiers: [/off/]})) {
      if (this.location == world.INVENTORY) {
        world.Print("You take " + this.TITLE
                    + " off and store it in the closet.");
        this.location = murd.CONTROL_ROOM_CLOSET;
      } else {
        world.Print("You aren't wearing it.");
      }
      return true;
    }
    return false;
  };
  return MakeObject(data);
}

murd.CONTROL_ROOM_SPACE_SUIT = MakeClothes({
  NAME: "spacesuit",
  TITLE: "your space suit",
  // TODO: Get rid of `space`.
  ALIASES: ["space", "space suit"],
  INITIAL_LOCATION: murd.CONTROL_ROOM_CLOSET,
  Detail: function(world) {
    return (this.location == world.INVENTORY
                ? "You stretch your arms and take a good look."
                : "You open the closet and take a look at it.")
        + " It's a good space suit, in prime condition, if a bit dirty.";
  },
  CanGet: function(world) {
    if (!murd.CONTROL_ROOM.landed) {
      world.Print("Not before I land Eliza. My uniform is more comfortable.");
      return false;
    }
    world.Print(
        "You put the space suit on. It fits a bit tight."
        + (murd.CONTROL_ROOM.music_playing
               ? " This " + awesome()
                 + " space suit is one of your most prized posessions!"
                 + " The old earth rock plays through the headphones."
               : "")
        + " You stow your uniform in the closet.");
    murd.CONTROL_ROOM_CLOSET.Add(murd.CONTROL_ROOM_SPACE_UNIFORM);
    return true;
  },
});

murd.CONTROL_ROOM_SPACE_UNIFORM = MakeClothes({
  NAME: "uniform",
  TITLE: "your uniform",
  // TODO: Add "space uniform"
  ALIASES: ["uniform"],
  INITIAL_LOCATION: engine.INVENTORY,
  Detail: function(world) {
    return (this.location == world.INVENTORY
                ? "You stretch your arms and take a good look."
                : "You open the closet and take a look at it.")
        + " It's just your regular uniform, in which you've traveled wide "
        + "across space. It's comfortable and warm, but it's only good inside "
        + "the Eliza. "
        + (murd.CONTROL_ROOM.music_playing
               ? ("OK, it really is more like a pair of P.J.s than a uniform, "
                  + "but who cares?")
               : "");
  },
  CanGet: function(world) {
    world.Print(
        "You put your uniform on and stow the space suit back in the "
        + "closet. "
        + (murd.CONTROL_ROOM.music_playing
               ? " Your " + awesome() + " uniform is quite comfortable."
               : ""));
    murd.CONTROL_ROOM_CLOSET.Add(murd.CONTROL_ROOM_SPACE_SUIT);
    return true;
  },
});

murd.GARBAGE = MakeFixedObject({
  NAME: "garbage",
  TITLE: "a pile of garbage",
  ALIASES: ["crap"],
  INITIAL_LOCATION: murd.JUNKARDIA,
  Detail: function(world) {
    return "You see a mountain of garbage.";
  },
  CanGet: function(world) {
    world.Print("What parts of the garbage?");
    return false;
  },
});

murd.GARBAGE_ROBOT = MakeObject({
  NAME: "robot",
  TITLE: "a broken robot",
  INITIAL_LOCATION: murd.GARBAGE,
  Detail: function(world) {
    return "It is a discarded robot."
        + (murd.JUNKARDIA.robot_on
               ? " The robot smiles at you."
               : " It probably hasn't been turned on in decades.")
        + " It looks ... friendly."
        + (murd.CONTROL_ROOM.music_playing
               ? " It also looks kind of " + awesome() + ", in a strange way."
               : "")
        + (murd.JUNKARDIA.robot_on
           ? ""
           : (murd.JUNKARDIA.robot_powered
                 ? (" The robot is currently plugged in to the Eliza's main "
                    + "battery.")
                 : " Who knows if it can be powered on?"));
  },
  CanGet: function(world) {
    world.Print("You try to lift it but it's very heavy. You give up.");
    return false;
  },
  Use: function(world, onWhat) {
    if (!murd.JUNKARDIA.robot_powered) {
      world.Print("You try to turn it on, but ... the robot is out of battery. "
          + "Maybe connect it to ship's battery?");
      return true;
    }
    if (!murd.JUNKARDIA.turret_active) {
      world.Print("No way I'll power it on before I activate the Base2XL!");
      return true;
    }
    world.Print(
        "You press the ON switch on the robot. Its head turns towards you and "
        + "its electric eyes make a metalic noise. \"Hello,\", it says, with "
        + "a metalic voice. \"I have a terrible headache.\"");
    murd.JUNKARDIA.robot_on = true;
    world.Print("YOU HAVE WON!!!!");
    return true;
  },
  HandleAction: function(world, parsed) {
    if (parsed.MatchAny([
            {verb: /activate/, entities: [this]},
            {verb: /turn/, entities: [this], modifiers: [/on/]},
            {verb: /power/, entities: [this], modifiers: [/on/]},])) {
      this.Use(world, null);
      return true;
    }
    if (parsed.Match(
            {verb: /connect/, entities: [this, murd.JUNKARDIA_SHIP_BATTERY]})) {
      murd.JUNKARDIA_SHIP_BATTERY.Use(world, this);
      return true;
    }
  },
});

murd.GARBAGE_ROBOT_EYES = MakeFixedObject({
  NAME: "eyes",
  TITLE: "the eyes of the discarded robot",
  INITIAL_LOCATION: murd.GARBAGE_ROBOT,
  Detail: function(world) {
    return (murd.JUNKARDIA.robot_on
                ? "You look into the robot's eyes and it looks back at you."
                : (murd.JUNKARDIA.robot_powered
                       ? ("A pale blue light shines in the eyes of the robot "
                          + "every couple seconds, indicating that the robot "
                          + "is charging.")
                       : "The robot's eyes are dead."));
  },
  Use: function(world, onWhat) {
    world.DescribeRoom();
    return true;
  },
});

murd.GARBAGE_SNOWBOARD = MakeObject({
  NAME: "snowboard",
  TITLE: "a broken snowboard",
  INITIAL_LOCATION: murd.GARBAGE,
  Detail: function(world) {
    return "It is a piece of a broken snowboard. Does it ever snow in "
        + "Junkardia?";
        + (murd.CONTROL_ROOM.music_playing
               ? "It's been many years since you last went snowboarding, in "
                 + "the gorgeous mountains of New Brasilia."
               : "");
  },
  Use: function(world, onWhat) {
    world.Print("Nah. There's no snow here and ... it's quite broken anyway.");
    return true;
  }
});

murd.GARBAGE_NEWSPAPER = MakeObject({
  NAME: "newspaper",
  TITLE: "fragments of an old newspaper",
  INITIAL_LOCATION: murd.GARBAGE,
  Detail: function(world) {
    return "You take a look. It's twenty-seven years old and talks about "
        + "politicians of yore.";
  },
  Use: function(world, onWhat) {
    world.Print(
        "You don't really want to read some boring reports about the "
        + "corruption of decades ago in some random planet you've never even "
        + "heard of.");
    return true;
  },
});

murd.GARBAGE_BOTTLE = MakeObject({
  NAME: "bottle",
  TITLE: "an empty bottle",
  INITIAL_LOCATION: murd.GARBAGE,
  Detail: function(world) {
    return "It's an empty bottle of wine. It isn't broken, but the label has "
        + "mostly rotten away.";
  },
  Use: function(world, onWhat) {
    world.Print("You have no use for the bottle.");
    return true;
  },
});

murd.GARBAGE_BOTTLE = MakeObject({
  NAME: "tshirt",
  TITLE: "an old tshirt",
  INITIAL_LOCATION: murd.GARBAGE,
  Detail: function(world) {
    return "It's quite filty. It says \"Bora 2303\". It has a few holes.";
  },
  Use: function(world, onWhat) {
    world.Print("No way I'll put on the tshirt!");
    return true;
  },
  CanGet: function(world) {
    world.Print("I'd rather not touch it, it's quite dirty.");
    return false;
  },
});

murd.JUNKARDIA_SHIP = MakeObject({
  NAME: "ship",
  TITLE: "the Eliza",
  ALIASES: ["eliza"],
  INITIAL_LOCATION: murd.JUNKARDIA,
  Detail: function(world) {
    return "The Eliza, your ship, is standing here, peacefully, over a"
        + " wonderful pile of garbage."
        + (murd.JUNKARDIA.turret_active
               ? " The Base2XL is standing close to it, scanning the territory."
               : " The Base2XL is still attached to it, inactive.");
  },
  Use: function(world, onWhat) {
    world.Print(
        "What, leave already?! After all it took me to get here? Not before "
        + "I've collected some goodies!");
    return true;
  },
});

murd.JUNKARDIA_SHIP_BATTERY = MakeFixedObject({
  NAME: "battery",
  TITLE: "the battery of the Eliza",
  ALIASES: ["power"],
  INITIAL_LOCATION: murd.JUNKARDIA_SHIP,
  Detail: function(world) {
    var description = "The battery of the Eliza is your main source of power. ";
    if (murd.JUNKARDIA.turret_active && murd.JUNKARDIA.robot_powered) {
      description += "The battery is currently powering the Base2XL and the "
          + "garbage robot. ";
    } else if (murd.JUNKARDIA.turret_active) {
      description += "The battery is currently powering the Base2XL. ";
    } else if (murd.JUNKARDIA.robot_powered) {
      description += "The battery is currently powering the "
          + "garbage robot. ";
    }
    var power = 43
        - (murd.JUNKARDIA.robot_has_been_powered ? 3 : 0)
        - (murd.JUNKARDIA.turret_has_been_active ? 2 : 0);
    description += "The battery is at " + power + "%.";
    return description;
  },
  Use: function(world, onWhat) {
    if (onWhat == murd.GARBAGE_ROBOT) {
      world.Print(
          "You take out a cable and connect the main battery of the Eliza to "
          + "the robot. Its eyes blink briefly in a light blue light.");
      murd.JUNKARDIA.robot_has_been_powered = true;
      murd.JUNKARDIA.robot_powered = true;
      return true;
    }
    world.Print("I don't understand.");
    return true;
  },
  HandleAction: function(world, parsed) {
    if (parsed.Match(
            {verb: /connect/, entities: [this, murd.GARBAGE_ROBOT]})) {
      murd.JUNKARDIA_SHIP_BATTERY.Use(world, murd.GARBAGE_ROBOT);
      return true;
    }
  }
});

murd.DEFENSE_TURRET = MakeFixedObject({
  NAME: "base2xl",
  TITLE: "Base2XL defense turret",
  ALIASES: [ "turret", "defense turret" ],
  INITIAL_LOCATION: murd.JUNKARDIA,
  Detail: function(world) {
    if (murd.JUNKARDIA.turret_active) {
      return "The Base2XL is active and scanning the territory around the "
          + "ship."
          + (murd.CONTROL_ROOM.music_playing
                 ? " It makes you feel safer."
                 : "");
    }
    return "The Base2XL is a defense turret that constantly scans the "
        + "territory around the ship and will shoot any hostile creatures that "
        + "dare to approach. But it is still attached to the ship, you should "
        + "probably activate it before it gets dark.";
  },
  Use: function(world, onWhat) {
    if (murd.JUNKARDIA.turret_active) {
      world.Print("The Base2XL is already active, scanning eagerly for hostile "
          + "activity."
          + (murd.CONTROL_ROOM.music_playing ? + " " + Awesome() + "!" : ""));
      return true;
    }
    murd.JUNKARDIA.turret_active = true;
    murd.JUNKARDIA.turret_has_been_active = true;
    world.Print(
        "You walk over to the side of the ship and detach the Base2XL from it. "
        + "You wheel it down over the pile of garbage a few steps away from "
        + "the ship. A cable connects it to the ship. You press the Activate "
        + "button on it. It rights itself and a large antena comes out and "
        + "starts spinning around, scanning the territory for hostile "
        + "activity."
        + (murd.CONTROL_ROOM.music_playing ? " You feel safer!" : ""));
    return true;
  },
  HandleAction: function(world, parsed) {
    if (parsed.MatchAny([
            {verb: /turn/, entities: [this], modifiers: [/on/]},
            {verb: /activate/, entities: [this]}])) {
      this.Use(world, null);
      return true;
    }
  },
});

// End of objects

murd.Game.prototype.InitState = function(world) {
  world.SetFlag(murd.flags.foodEaten, 0);
};

murd.Game.prototype.HandleAction = function(world, parsed) {
  if (murd.CONTROL_ROOM_SPACE_UNIFORM.location != world.INVENTORY &&
      murd.CONTROL_ROOM_SPACE_UNIFORM.location !=
          murd.CONTROL_ROOM_SPACE_CLOSET) {
    // world.INVENTORY.Add(murd.CONTROL_ROOM_SPACE_UNIFORM);
  }
  if (parsed.verb == "") {
    world.Print("What do you want to do?");
    return true;
  }
  if (parsed.MatchAny([
          {verb: /take/, entities: [murd.CONTROL_ROOM_SPACE_SUIT],
           modifiers: [/off/]},
          {verb: /drop/, entities: [murd.CONTROL_ROOM_SPACE_SUIT]}])) {
    if (murd.CONTROL_ROOM_SPACE_SUIT.location != world.INVENTORY) {
      world.Print("You aren't wearing it.");
    } else if (world.location == murd.CONTROL_ROOM) {
      murd.CONTROL_ROOM_SPACE_UNIFORM.Use(world, null);
    } else {
      world.Print("Taking your space suit off in Junkardia would be insane!");
    }
    return true;
  }
  if (parsed.MatchAny([
          {verb: /take/, entities: [murd.CONTROL_ROOM_SPACE_SUIT],
           modifiers: [/off/]},
          {verb: /drop/, entities: [murd.CONTROL_ROOM_SPACE_UNIFORM]}])) {
    if (murd.CONTROL_ROOM_SPACE_UNIFORM.location != world.INVENTORY) {
      world.Print("You aren't wearing it.");
    } else if (world.location == murd.CONTROL_ROOM) {
      murd.CONTROL_ROOM_SPACE_SUIT.Use(world, null);
    } else {
      world.Print(
          "How did you manage to be in Junkardia wearing your uniform?");
    }
    return true;
  }
  return false;
};

murd.Game.prototype.ROOMS = [
  murd.CONTROL_ROOM,
  murd.JUNKARDIA,
];
