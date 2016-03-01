var engine = {};

engine.LookAction = function(world, words) {
  if (words.length === 0) {
    world.Print(world.location.Description(world));
  }
};

engine.GoAction = function(world, words) {
  room = world.LocateRoom(words);
  if (room !== null) {
    world.Enter(room);
  } else {
    world.UnknownRoom(words.join(' '));
  }
};

engine.Engine = function(screen, input) {
  this.screen_ = screen;
  this.input_ = input;
};

engine.World = function(eng) {
  this.engine = eng;
};

engine.World.prototype.Init = function(game) {
  this.game = game;
  this.gameOver = false;
  this.flags = {};
  this.location = game.START_LOCATION;
  this.game.InitState(this);
  this.Print(game.INTRO);
};

engine.World.prototype.LocateRoom = function(words) {
  for (var i in this.game.ROOMS) {
    room = this.game.ROOMS[i];
    if (room.NAME == words[0]) {
      return room;
    }
  }
  return null;
};

engine.World.prototype.Print = function(line) {
  this.engine.Print(line);
};

engine.World.prototype.UnknownRoom = function(room) {
  this.game.UnknownRoom(this, room);
};

engine.World.prototype.Enter = function(room) {
  if (room === this.location) {
    this.game.AlreadyThere(this);
    return;
  }

  if (!(room.NAME in this.location.Exits(this))) {
    this.game.NoExit(this, room);
    return;
  }

  if (!room.CanEnter(this)) {
    return;
  }

  this.location = room;
};

engine.World.prototype.SetFlag = function(key, value) {
  this.flags[key] = value;
};

engine.World.prototype.GetFlag = function(key) {
  return this.flags[key];
};

engine.Engine.prototype.Start = function(game) {
  this.screen_.innerHTML = '';
  this.game = game;
  this.world = new engine.World(this);
  this.world.Init(game);

  this.input_.onchange = this.Action.bind(this);
  this.input_.focus();
};

engine.Engine.prototype.Print = function(line) {
  this.screen_.innerHTML += line + '<br>';
  this.screen_.scrollTop = this.screen_.scrollHeight;
};

engine.Engine.prototype.Action = function() {
  if (this.world.gameOver) {
    this.Start(this.game);
    this.input_.value = '';
    return;
  } 
  var action = this.input_.value;
  this.Print('');
  this.Print('> ' + action);
  var words = action.toLowerCase().split(/\s+/);
  var verb = words.shift();
  if (!this.game.HandleAction(this.world, verb, words)) {
    if (verb in this.ACTIONS) {
      this.ACTIONS[verb](this.world, words);
    } else {
      this.game.UnknownAction(this.world, action);
    }
  }
  this.input_.value = '';
};

engine.Engine.prototype.ACTIONS = {
  'look': engine.LookAction,
  'go': engine.GoAction,
};

engine.Room = function() {
};

engine.Room.prototype.NAME = null;
engine.Room.prototype.TITLE = null;

engine.Room.prototype.ProcessAction = function(action, world) {
  return false;
};

engine.Room.prototype.Description = function(world) {
  return '';
};

engine.Room.prototype.CanEnter = function(world) {
  world.Print('Ok.');
  return true;
};

engine.Room.prototype.Exits = function(world) {
  return {};
};

engine.Game = function() {};
engine.Game.prototype.START_LOCATION = null;
engine.Game.prototype.INTRO = null;
engine.Game.prototype.ROOMS = [];

engine.Game.prototype.UnknownAction = function(world, action) {
  world.Print('I have no idea how to ' + action + '.');
}
engine.Game.prototype.UnknownRoom = function(world, room) {
  world.Print('Where?');
};

engine.Game.prototype.HandleAction = function(world, verb, words) {
  return false;
};

engine.Game.prototype.AlreadyThere = function(world) {
  world.Print('You\'re already there.');
};

engine.Game.prototype.NoExit = function(world, room) {
  world.Print('You can\'t see a way to get from ' + world.location.TITLE +
      ' to ' + room.TITLE + '.');
};


