var engine = {};

engine.Engine = function(screen, input) {
  this.screen_ = screen;
  this.input_ = input;
};

engine.World = function(eng) {
  this.engine = eng;
};

engine.World.prototype.Init = function(game) {
  this.InitActions();
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

engine.World.prototype.Destroy = function(obj) {
  if (obj.location != this.INVENTORY) {
    console.log('Error: trying to destroy object "' + obj.NAME + '",' +
        'but it is not in the inventory.')
    return;
  }
  var inv = this.INVENTORY.objects;
  inv.splice(inv.indexOf(obj), 1);
  obj.location = null;
};

engine.World.prototype.DescribeRoom = function() {
  this.Print(this.location.Description(this));

  var objects = this.roomObjects[this.location.NAME].slice(0);
  this.DescribeObjects(objects);
};

engine.World.prototype.DescribeObjects = function(objects) {
  objects = this.location.DescribeObjects(this, objects);
  this.game.DescribeObjects(this, objects);
}

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
  this.DescribeRoom();
};

engine.World.prototype.SetFlag = function(key, value) {
  this.flags[key] = value;
};

engine.World.prototype.GetFlag = function(key) {
  return this.flags[key];
};

engine.World.prototype.LookAction = function(words) {
  if (words.length === 0) {
    this.DescribeRoom();
  } else {
    var obj = this.LocateObject(words);
    if (obj != null) {
      if (obj.location == this.INVENTORY) {
        this.Print(obj.Description(this));
      } else if (obj.location != this.location) {
        this.game.NotHere(this, obj);
      } else {
        this.DescribeObjects([obj]);
      }
    } else {
      this.game.UnknownObject(this, words.join(' '));
    }
  }
};

engine.World.prototype.UseAction = function(words) {
  var obj = this.LocateObject(words);
  if (obj == null) {
    this.game.UnknownObject(this, words.join(' '));
    return;
  }
  if (obj.location != this.INVENTORY) {
    this.game.NotHave(this, obj);
    return;
  }
  words.shift();
  var onWhat = null;
  if (words.length > 0) {
    if (words[0] == 'on' && words.length > 1) {
      words.shift();
    }
    onWhat = this.LocateObject(words);
    if (onWhat != null) {
      if (onWhat.location != this.INVENTORY &&
          onWhat.location != this.location) {
        this.game.NotHere(this, onWhat);
        return
      }
    }
  }
  obj.Use(this, onWhat);
};

engine.World.prototype.GetAction = function(words) {
  var obj = this.LocateObject(words);
  if (obj != null) {
    if (obj.location == this.INVENTORY) {
      this.game.AlreadyHave(this, obj);
    } else if (obj.location != this.location) {
      this.game.NotHere(this, obj);
    } else {
      this.Get(obj);
    }
  } else {
    this.game.UnknownObject(this, words.join(' '));
  }
};

engine.World.prototype.DropAction = function(words) {
  var obj = this.LocateObject(words);
  if (obj != null) {
    if (obj.location == this.INVENTORY) {
      this.Drop(obj);
    } else {
      this.game.NotHave(this, obj);
    }
  } else {
    this.game.UnknownObject(this, words.join(' '));
  }
};

engine.World.prototype.InvAction = function(words) {
  this.game.ListInventory(this, this.INVENTORY.objects.slice(0));
};

engine.World.prototype.GoAction = function(words) {
  room = this.LocateRoom(words);
  if (room !== null) {
    this.Enter(room);
  } else {
    this.game.UnknownRoom(this, words.join(' '));
  }
};

engine.World.prototype.InitActions = function() {
  this.ACTIONS = {
    'look': this.LookAction,
    'go': this.GoAction,
    'get': this.GetAction,
    'drop': this.DropAction,
    'inv': this.InvAction,
    'use': this.UseAction,
  };
};
engine.World.prototype.HandleAction = function(verb, words) {
  if (this.location.HandleAction(this, verb, words)) {
    return true;
  }
  if (!(verb in this.ACTIONS)) {
    return false;
  }
  this.ACTIONS[verb].bind(this)(words);
  return true;
}


engine.Engine.prototype.Start = function(game) {
  this.screen_.innerHTML = '';
  this.game = game;
  this.world = new engine.World(this);
  this.world.Init(game);

  this.actionHistory = [];
  this.actionIndex = -1;
  this.input_.onkeydown = this.KeyDown.bind(this);
  this.input_.focus();
};

engine.Engine.prototype.Print = function(line) {
  this.screen_.innerHTML += line + '<br>';
  this.screen_.scrollTop = this.screen_.scrollHeight;
};

engine.Engine.prototype.KeyDown = function(e) {
  if (e.keyCode === 38) {
    if (this.actionIndex >= 0) {
      this.input_.value = this.actionHistory[this.actionIndex];
      this.actionIndex--;
    }
  } else if (e.keyCode === 13) {
    this.Action();
  }
};

engine.Engine.prototype.Action = function() {
  if (this.world.gameOver) {
    this.Start(this.game);
    this.input_.value = '';
    return;
  } 
  var action = this.input_.value;
  this.ProcessAction(action);
  this.input_.value = '';
};

engine.Engine.prototype.ProcessAction = function(action) {
  this.Print('');
  this.Print('> ' + action);
  var words = action.toLowerCase().split(/\s+/);
  var verb = words.shift();
  var handled = this.game.HandleAction(this.world, verb, words);
  if (!handled) {
    handled = this.world.HandleAction(verb, words);
  }
  if (!handled) {
    this.game.UnknownAction(this.world, action);
  }
  if (this.actionHistory[this.actionHistory.length - 1] != action) {
    this.actionHistory.push(action);
  }
  this.actionIndex = this.actionHistory.length - 1;
};

engine.Entity = function() {};
engine.Entity.prototype.NAME = null;
engine.Entity.prototype.TITLE = null;
engine.Entity.prototype.Init = function(world) {};
engine.Entity.prototype.Description = function(world) {
  return '';
};

engine.MakeEntity = function(superclass, data) {
  newClass = function() {
    this.Init();
  };
  newClass.prototype = new superclass();
  for (key in data) {
    newClass.prototype[key] = data[key];
  }
  return new newClass();
};

engine.Room = function() {};
engine.Room.prototype = new engine.Entity();
engine.Room.prototype.CanLeave = function(world, toRoom) {
  return true;
};

engine.Room.prototype.CanEnter = function(world) {
  return true;
};

engine.Room.prototype.Exits = function(world) {
  return {};
};
engine.Room.prototype.DescribeObjects = function(world, objects) {
  return objects;
};
engine.Room.prototype.HandleAction = function(world, verb, words) {
  return false;
};

engine.MakeRoom = function(data) {
  return engine.MakeEntity(engine.Room, data);
};

engine.Object = function() {};
engine.Object.prototype = new engine.Entity();
engine.Object.prototype.INITIAL_LOCATION = null;
engine.Object.prototype.CanGet = function(world) {
  return true;
};
engine.Object.prototype.Use = function(world, onWhat) {
  world.Print('I don\'t know how to use ' + this.TITLE + '.');
};
engine.MakeObject = function(data) {
  return engine.MakeEntity(engine.Object, data);
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


