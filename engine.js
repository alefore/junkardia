var engine = {};

engine.LookAction = function(world, words) {
  if (words.length === 0) {
    world.Print(world.location.Description(world));

    var objects = world.roomObjects[world.location.NAME].slice(0);
    objects = world.location.DescribeObjects(world, objects);
    world.DescribeObjects(objects);
  } else {
    obj = world.LocateObject(words);
    if (obj != null) {
      if (obj.location == world.INVENTORY) {
        world.Print(obj.Description(world));
      } else if (obj.location != world.location) {
        world.NotHere(obj);
      } else {
        var objs = world.location.DescribeObjects(world, [obj]);
        world.DescribeObjects(objs);
      }
    } else {
      world.UnknownObject(words.join(' '));
    }
  }
};

engine.GetAction = function(world, words) {
  obj = world.LocateObject(words);
  if (obj != null) {
    if (obj.location == world.INVENTORY) {
      world.AlreadyHave(obj);
    } else if (obj.location != world.location) {
      world.NotHere(obj);
    } else {
      world.Get(obj);
    }
  } else {
    world.UnknownObject(words.join(' '));
  }
};

engine.DropAction = function(world, words) {
  obj = world.LocateObject(words);
  if (obj != null) {
    if (obj.location == world.INVENTORY) {
      world.Drop(obj);
    } else {
      world.NotHave(obj);
    }
  } else {
    world.UnknownObject(words.join(' '));
  }
};

engine.InvAction = function(world, words) {
  world.ListInventory();
}

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
  this.INVENTORY = new engine.Inventory();
  this.game.InitState(this);
  
  this.roomObjects = {}
  for (var i in game.ROOMS) {
    var room = game.ROOMS[i];
    this.roomObjects[room.NAME] = [];
  }
  for (var i in game.OBJECTS) {
    var obj = game.OBJECTS[i];
    obj.location = obj.INITIAL_LOCATION;
    if (obj.location == null) {
      obj.location = this.INVENTORY;
      this.INVENTORY.objects.push(obj);
    } else {
      this.roomObjects[obj.location.NAME].push(obj);
    }
  }

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

engine.World.prototype.LocateObject = function(words) {
  for (var i in this.game.OBJECTS) {
    obj = this.game.OBJECTS[i];
    if (obj.NAME == words[0]) {
      return obj;
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

engine.World.prototype.UnknownObject = function(obj) {
  this.game.UnknownObject(this, obj);
};

engine.World.prototype.AlreadyHave = function(obj) {
  this.game.AlreadyHave(this, obj);
};

engine.World.prototype.NotHere = function(obj) {
  this.game.NotHere(this, obj);
};
engine.World.prototype.NotHave = function(obj) {
  this.game.NotHave(this, obj);
};

engine.World.prototype.Get = function(obj) {
  if (!obj.CanGet(this)) {
    return;
  }
  var ro = this.roomObjects[obj.location.NAME]
  ro.splice(ro.indexOf(obj), 1);
  obj.location = this.INVENTORY;
  this.INVENTORY.objects.push(obj);
  this.game.Got(this, obj);
};

engine.World.prototype.Drop = function(obj) {
  var inv = this.INVENTORY.objects;
  inv.splice(inv.indexOf(obj), 1);
  obj.location = this.location;
  var ro = this.roomObjects[this.location.NAME];
  ro.push(obj);
  this.game.Dropped(this, obj);
};

engine.World.prototype.ListInventory = function() {
  this.game.ListInventory(this, this.INVENTORY.objects.slice(0));
};

engine.World.prototype.DescribeObjects = function(objects) {
  this.game.DescribeObjects(this, objects);
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

  if (!this.location.CanLeave(this, room)) {
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
  'get': engine.GetAction,
  'drop': engine.DropAction,
  'inv': engine.InvAction,
};

engine.Room = function() {};

engine.Room.prototype.NAME = null;
engine.Room.prototype.TITLE = null;

engine.Room.prototype.ProcessAction = function(action, world) {
  return false;
};

engine.Room.prototype.Init = function(world) {
};

engine.Room.prototype.Description = function(world) {
  return '';
};

engine.Room.prototype.CanLeave = function(world, toRoom) {
  return true;
};

engine.Room.prototype.CanEnter = function(world) {
  world.Print('Ok.');
  return true;
};

engine.Room.prototype.Exits = function(world) {
  return {};
};
engine.Room.prototype.DescribeObjects = function(world, objects) {
  return objects;
};

engine.MakeRoom = function(data) {
  newRoomClass = function() {
    this.Init();
  };
  newRoomClass.prototype = new engine.Room();
  for (key in data) {
    newRoomClass.prototype[key] = data[key];
  }
  return new newRoomClass();
};

engine.Object = function() {};
engine.Object.NAME = null;
engine.Object.TITLE= null;
engine.Object.INITIAL_LOCATION = null;
engine.Object.prototype.Init = function() {};
engine.Object.prototype.Description = function(world) {
  return '';
};
engine.Object.prototype.CanGet = function(world) {
  return true;
};
engine.MakeObject = function(data) {
  newObjectClass = function() {
    this.Init();
  }
  newObjectClass.prototype = new engine.Object();
  for (key in data) {
    newObjectClass.prototype[key] = data[key];
  }
  return new newObjectClass();
};

engine.Inventory = function() {
  this.objects = [];
};

engine.Game = function() {};
engine.Game.prototype.START_LOCATION = null;
engine.Game.prototype.INTRO = null;
engine.Game.prototype.ROOMS = [];
engine.Game.prototype.OBJECTS = [];

engine.Game.prototype.UnknownAction = function(world, action) {
  world.Print('I have no idea how to ' + action + '.');
}

engine.Game.prototype.UnknownRoom = function(world, room) {
  world.Print('Where?');
};

engine.Game.prototype.UnknownObject = function(world, obj) {
  world.Print('What ' + obj + '?');
};

engine.Game.prototype.NotHere = function(world, obj) {
  world.Print('You can\'t see ' + obj.TITLE + '.');
};

engine.Game.prototype.NotHave = function(world, obj) {
  world.Print('You don\'t have ' + obj.TITLE + '.');
};

engine.Game.prototype.AlreadyHave = function(world, obj) {
  world.Print('You already have ' + obj.TITLE + '.');
};

engine.Game.prototype.Got = function(world, obj) {
  world.Print('Ok.');
};

engine.Game.prototype.Dropped = function(world, obj) {
  world.Print('Ok.');
};

engine.Game.prototype.ListInventory = function(world, objects) {
  world.Print('You have:');
  if (objects.length === 0) {
    world.Print('Nothing.');
  }
  for (var i in objects) {
    world.Print(objects[i].TITLE + '.');
  }
};

engine.Game.prototype.DescribeObjects = function(world, objects) {
  for (var i in objects) {
    var obj = objects[i];
    world.Print('You see ' + obj.TITLE + ' here.');
  }
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


