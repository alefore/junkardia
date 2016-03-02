var murd = {};

murd.flags = {};
murd.flags.alarmClockOff = 'alarmClockOff';
murd.flags.showered = 'showered';

murd.Bedroom = function() {
  this.NAME = 'bedroom';
  this.TITLE = 'your bedroom';
};
murd.Bedroom.prototype = new engine.Room();
murd.Bedroom.prototype.Description = function(world) {
  var description = "Your bedroom is a bit messy.";
  if (!world.GetFlag('alarmClockOff')) {
    description += " The annoying alarm clock is beeping loudly."
  }
  description +=
      " Two doors are here, one leads to the restroom and one to the street.";
  return description;
};
murd.Bedroom.prototype.Exits = function(world) {
  return {'restroom': true, 'street': true}
};
murd.BEDROOM = new murd.Bedroom();

murd.flags.restroomWindowOpen = 'restroomWindowOpen';
murd.Restroom = function() {
  this.NAME = 'restroom';
  this.TITLE = 'the restroom';
};
murd.Restroom.prototype = new engine.Room();
murd.Restroom.prototype.Description = function(world) {
  var description = "The blue tiles in the restroom are a bit cold.";
  var isShowerWet = world.GetFlag(murd.flags.showered) ? " wet" : "";
  if (world.GetFlag(murd.flags.restroomWindowOpen)) {
    description +=
        " A refreshing current of fresh air blows in from the open window."
        + " There's a" + isShowerWet + " shower here.";
  } else {
    description +=
        " The restroom stinks a bit. There's a window and a" + isShowerWet
        + " shower here.";
  }
  return description;
};
murd.Restroom.prototype.CanEnter = function(world) {
  if (!world.GetFlag('restroomDoorOpen')) {
    world.Print('The door is closed.');
    return false;
  }
   world.Print('You enter the restroom.<br>'
               + 'A foul smell penetrates your nostrils.');
   return true;
};
murd.Restroom.prototype.Exits = function(world) {
  return {'bedroom': true}
};
murd.RESTROOM = new murd.Restroom();

murd.Street = function() {
  this.NAME = 'street';
  this.TITLE = 'the street';
};
murd.Street.prototype = new engine.Room();
murd.Street.prototype.Description = function(world) {
  return "There's a small park in front of your apartment (bedroom).";
};
murd.Street.prototype.CanEnter = function(world) {
  if (!world.GetFlag(murd.flags.alarmClockOff)) {
    world.Print('You should turn that stupid alarm clock off first.');
    return false;
  }
  if (!world.GetFlag(murd.flags.showered)) {
    world.Print(
        "Hmm, you should probably take a shower first. You smell a bit.");
    return false;
  }
  world.Print(
      "You unlock the door and take the stairs down. The sun is shinning, "
      + "it's a beautiful day.");
  return true;
};
murd.Street.prototype.Exits = function(world) {
  return {'bedroom': true};
};
murd.STREET = new murd.Street();

murd.Airport = function() {
  this.NAME = 'airport';
  this.TITLE = 'the airport';
};
murd.Airport.prototype = new engine.Room();
murd.Airport.prototype.Description = function(world) {};
murd.AIRPORT = new murd.Airport();

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
      world.SetFlag(murd.flags.restroomWindowOpen, true);
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
    world.SetFlag(murd.flags.alarmClockOff, true);
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
