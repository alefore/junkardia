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
  this.location.visited = true;
  this.INVENTORY = new engine.Entity();
  this.LIMBO = new engine.Entity();
  this.game.InitState(this);
  
  for (var i in game.OBJECTS) {
    var obj = game.OBJECTS[i];
    var loc = obj.INITIAL_LOCATION;
    if (loc === engine.INVENTORY) {
      loc = this.INVENTORY;
    } else if (loc === null) {
      loc = this.LIMBO;
    }
    obj.location = null;
    loc.Add(obj);
  }

  this.Print('<div class="msg"><article class="reply">' +
      game.INTRO + '</article></div>', true);
};

engine._FindWord

engine.World.prototype.LocateRoom = function(words) {
  var exitNames = this.location.Exits(this);
  var exits = [];

  // First look for an exact name match.
  for (var i in this.game.ROOMS) {
    room = this.game.ROOMS[i];
    if (room.NAME == words[0]) {
      return room;
    }
    if (room.NAME in exitNames) {
      exits.push(room);
    }
  }

  // Look for aliases in exits.
  var matches = [];
  for (var i in exits) {
    room = exits[i];
    if (room.ALIASES.indexOf(words[0]) >= 0) {
      matches.push(room);
    }
  }

  if (matches.length == 1) {
    return matches[0];
  }

  // Look aliases everywhere.
  matches = [];
  for (var i in this.game.ROOMS) {
    room = this.game.ROOMS[i];
    if (room.ALIASES.indexOf(words[0]) >= 0) {
      matches.push(room);
    }
  }
  if (matches.length == 1) {
    return matches[0];
  }

  // TODO(bubble): Handle ambiguity.
  return null;
};

engine.World.prototype.LocateObject = function(words) {
  // Look for exact name matches.
  for (var i in this.game.OBJECTS) {
    var obj = this.game.OBJECTS[i];
    if (obj.NAME == words[0]) {
      return obj;
    }
  }

  // Look for aliases in the inventory.
  var matches = [];
  var inv = this.INVENTORY.GetReachableObjects();
  for (var i in inv) {
    var obj = inv[i];
    if (obj.ALIASES.indexOf(words[0]) >= 0) {
      matches.push(obj);
    }
  }
  if (matches.length == 1) {
    return matches[0];
  }

  // Look for aliases in the current room.
  matches = [];
  var loc = this.location.GetReachableObjects();
  for (var i in loc) {
    var obj = loc[i];
    if (obj.ALIASES.indexOf(words[0]) >= 0) {
      matches.push(obj);
    }
  }
  if (matches.length == 1) {
    return matches[0];
  }

  // Look for aliases everywhere.
  for (var i in this.game.OBJECTS) {
    var obj = this.game.OBJECTS[i];
    if (obj.ALIASES.indexOf(words[0]) >= 0) {
      matches.push(obj);
    }
  }
  if (matches.length == 1) {
    return matches[0];
  }

  // TODO(bubble): Handle ambiguity.
  return null;
};

engine.World.prototype.Print = function(line, opt_stay) {
  this.engine.Print(line, opt_stay);
};

engine.World.prototype.Get = function(obj) {
  if (!obj.CanGet(this)) {
    return;
  }
  this.INVENTORY.Add(obj);
  this.game.Got(this, obj);
};

engine.World.prototype.Drop = function(obj) {
  this.location.Add(obj);
  this.game.Dropped(this, obj);
};

engine.World.prototype.Destroy = function(obj) {
  if (obj.location != this.INVENTORY) {
    console.log('Error: trying to destroy object "' + obj.NAME + '",' +
        'but it is not in the inventory.')
    return;
  }
  this.LIMBO.Add(obj);
};

engine.World.prototype.DescribeContents = function(container) {
  var objects = container.objects;
  objects = container.DescribeContents(this, objects);
  for (var i in objects) {
    var obj = objects[i];
    this.Print(obj.Overview(this));
  }
};

engine.World.prototype.DescribeRoom = function() {
  this.Print(this.location.Description(this));
  this.DescribeContents(this.location);
};

engine.World.prototype.DescribeObject = function(obj) {
  this.Print(obj.Detail(this));
  this.DescribeContents(obj);
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
  this.location.visited = true;
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
      // TODO(bubble): rework inventory.
      if (!this.location.IsReachable(obj)
          && !this.INVENTORY.IsReachable(obj)) {
        this.game.NotHere(this, obj);
      } else {
        this.DescribeObject(obj);
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
  if (!this.location.IsReachable(obj)
      && !this.INVENTORY.IsReachable(obj)) {
    this.game.NotHere(this, obj);
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
      if (!this.location.IsReachable(onWhat)
          && !this.INVENTORY.IsReachable(onWhat)) {
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
    if (this.INVENTORY.IsReachable(obj)) {
      this.game.AlreadyHave(this, obj);
    } else if (!this.location.IsReachable(obj)) {
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
    if (this.INVENTORY.IsReachable(obj)) {
      this.Drop(obj);
    } else {
      this.game.NotHave(this, obj);
    }
  } else {
    this.game.UnknownObject(this, words.join(' '));
  }
};

engine.World.prototype.InvAction = function(words) {
  this.game.ListInventory(this, this.INVENTORY.GetReachableObjects());
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

engine.INVENTORY = 'INVENTORY';

engine.Engine.prototype.Start = function(game) {
  this.screen_.innerHTML = '';
  this.screenBuffer_ = '';
  this.game = game;
  this.world = new engine.World(this);
  this.world.Init(game);
  this.Flush();

  this.actionHistory = [];
  this.actionIndex = -1;
  this.input_.onkeydown = this.KeyDown.bind(this);
  this.input_.focus();
};

engine.Engine.prototype.Print = function(line, opt_stay) {
  opt_stay = opt_stay || false;
  var br;
  br = opt_stay ? '': '<br>';
  this.screenBuffer_ += line + br;
};

engine.Engine.prototype.Flush = function() {
  this.screen_.innerHTML += this.screenBuffer_;
  this.screenBuffer_ = '';
  this.screen_.scrollTop = this.screen_.scrollHeight;
};

engine.Engine.prototype.KeyDown = function(e) {
  if (e.keyCode === 38) {
    if (this.actionIndex > 0) {
      this.actionIndex--;
      this.input_.value = this.actionHistory[this.actionIndex];
      var len = this.input_.value.length
      this.input_.selectionStart = this.input_.selectionEnd = len;
      e.stopPropagation();
      return false;
    }
  } else if (e.keyCode === 40) {
    if (this.actionIndex < this.actionHistory.length) {
      this.actionIndex++;
      if (this.actionIndex < this.actionHistory.length) {
        this.input_.value = this.actionHistory[this.actionIndex];
      } else {
        this.input_.value = '';
      }
      var len = this.input_.value.length
      this.input_.selectionStart = this.input_.selectionEnd = len;
      e.stopPropagation();
      return false;
    }
  } else if (e.keyCode === 13) {
    this.Action();
    return false;
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
  this.Print('<div class="msg"><article class="command">'
      + action + '</article></div>', true);
  this.Print('<div class="msg"><article class="reply">', true);
  var words = action.toLowerCase().split(/\s+/);
  var verb = words.shift();
  var handled = this.game.HandleAction(this.world, verb, words);
  if (!handled) {
    handled = this.world.HandleAction(verb, words);
  }
  if (!handled) {
    this.game.UnknownAction(this.world, action);
  }
  this.Print('</article></div>', true);
  this.Flush();
  if (this.actionHistory[this.actionHistory.length - 1] != action) {
    this.actionHistory.push(action);
  }
  this.actionIndex = this.actionHistory.length;
  this.input_.focus();
};

engine.Entity = function() {
  this.objects = [];
};
engine.Entity.prototype.NAME = null;
engine.Entity.prototype.TITLE = null;
engine.Entity.prototype.ALIASES = [];
engine.Entity.prototype.Init = function(world) {};
engine.Entity.prototype.Description = function(world) {
  return '';
};
engine.Entity.prototype.Add = function(obj) {
  if (obj.location !== null) {
    var old = obj.location;
    old.objects.splice(old.objects.indexOf(obj), 1);  
  }
  this.objects.push(obj);
  obj.location = this;
};
engine.Entity.prototype.IsReachable = function(obj) {
  if (obj.location === this) {
    return true;
  }
  for (var i in this.objects) {
    var o = this.objects[i];
    if (o.IsReachable(obj)) {
      return true;
    }
  }
  return false;
};
engine.Entity.prototype.GetReachableObjects = function() {
  result = this.objects.slice(0);
  for (var i in this.objects) {
    var o = this.objects[i];
    result = result.concat(o.GetReachableObjects());
  }
  return result;
};
engine.Entity.prototype.DescribeContents = function(world, objects) {
  return objects;
};

engine.MakeEntity = function(superclass, data) {
  newClass = function() {
    this.Init();
    superclass.call(this);
  };
  newClass.prototype = new superclass();
  newClass.prototype.constructor = newClass;
  for (key in data) {
    newClass.prototype[key] = data[key];
  }
  return new newClass();
};

engine.Room = function() {
  engine.Entity.call(this);
};
engine.Room.prototype = new engine.Entity();
engine.Room.prototype.constructor = engine.Room;
engine.Room.prototype.visited = false;
engine.Room.prototype.CanLeave = function(world, toRoom) {
  return true;
};

engine.Room.prototype.CanEnter = function(world) {
  return true;
};

engine.Room.prototype.Exits = function(world) {
  return {};
};
engine.Room.prototype.HandleAction = function(world, verb, words) {
  return false;
};

engine.MakeRoom = function(data) {
  return engine.MakeEntity(engine.Room, data);
};

engine.Object = function() {
  engine.Entity.call(this);
};
engine.Object.prototype = new engine.Entity();
engine.Object.prototype.constructor = engine.Object;
engine.Object.prototype.INITIAL_LOCATION = null;
engine.Object.prototype.Overview = function(world) {
  if (this.location instanceof engine.Object) {
    return "You see " + this.TITLE + ' in ' + this.location.TITLE + '.';
  }
  return 'You see ' + this.TITLE + ' here.';
};
engine.Object.prototype.Detail = function(world) {
  return this.Overview(world);
};
engine.Object.prototype.CanGet = function(world) {
  return true;
};
engine.Object.prototype.Use = function(world, onWhat) {
  world.Print('I don\'t know how to use ' + this.TITLE + '.');
};
engine.MakeObject = function(data) {
  return engine.MakeEntity(engine.Object, data);
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


