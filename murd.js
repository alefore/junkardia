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
          " The restroom stinks a bit. There's a window and a" + isShowerWet
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
      world.Print('A cold draft of Swiss air makes you shiver.');
    } else {
      world.Print('A foul smell penetrates your nostrils.');
    }
    return true;
  },
  Exits: function(world) {
    return {'bedroom': true}
  },
});

murd.STREET = engine.MakeRoom({
  NAME: 'street',
  TITLE: 'the street',
  Description: function(world) {
    return "There's a small park in front of your apartment (bedroom).";
  },
  CanEnter: function(world) {
    world.Print(
        "You unlock the door and take the stairs down. The sun is shinning, "
        + "it's a beautiful day.");
    return true;
  },
  Exits: function(world) {
    return {'bedroom': true};
  }
});

murd.AIRPORT = engine.MakeRoom({
  NAME: 'airport',
  TITLE: 'the airport',
  Description: function(world) {},
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
  murd.AIRPORT,
];
