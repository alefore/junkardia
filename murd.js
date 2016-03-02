var murd = {};

murd.flags = { 'alarmClockOff': 'alarmClockOff' };

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
      " Two doors are here, one leads to the toilet and one to the street.";
  return description;
};
murd.Bedroom.prototype.Exits = function(world) {
  return {'toilet': true, 'street': true}
};
murd.BEDROOM = new murd.Bedroom();

murd.Toilet = function() {
  this.NAME = 'toilet';
  this.TITLE = 'the filthy toilet';
};
murd.Toilet.prototype = new engine.Room();
murd.Toilet.prototype.Description = function(world) {
  return 'This is cleaner than your bedroom.';
};
murd.Toilet.prototype.CanEnter = function(world) {
  if (!world.GetFlag('toiletDoorOpen')) {
    world.Print('The door is closed.');
    return false;
  }
   world.Print('You enter the toilet.<br>' + 
       'A foul smell penetrates your nostrils.');
   return true;
};
murd.Toilet.prototype.Exits = function(world) {
  return {'bedroom': true}
};
murd.TOILET = new murd.Toilet();

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
  world.SetFlag('toiletDoorOpen', false);
};

murd.Game.prototype.HandleAction = function(world, verb, words) {
  if (verb == 'open') {
    if (words[0] !== 'door') {
      return false;
    }
    if (!('toilet' in world.location.Exits())) {
      return false;
    }
    world.SetFlag('toiletDoorOpen', true);
    world.Print('Ok');
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
  murd.TOILET,
  murd.STREET,
  murd.AIRPORT,
];
