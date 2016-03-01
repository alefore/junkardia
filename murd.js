var murd = {}

murd.Bedroom = function() {
  this.NAME = 'bedroom';
  this.TITLE = 'your bedroom';
};
murd.Bedroom.prototype = new engine.Room();
murd.Bedroom.prototype.Description = function(world) {
  return 'Your bedroom could use some cleaning.<br>' +
    'There\'s a toilet nearby.';
};
murd.Bedroom.prototype.Exits = function(world) {
  return {'toilet': true}
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
  if (verb !== 'open' || words[0] !== 'door') {
    return false;
  }
  if (!('toilet' in world.location.Exits())) {
    return false;
  }
  world.SetFlag('toiletDoorOpen', true);
  world.Print('Ok');
  return true;
};

murd.Game.prototype.ROOMS = [
  murd.BEDROOM,
  murd.TOILET,
  murd.AIRPORT,
];
