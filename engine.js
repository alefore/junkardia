var engine = {};

engine.Engine = function(screen, input) {
  this.screen_ = screen;
  this.input_ = input;
  this.InitActionParsers();
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

engine.World.prototype.LargestMatch = function(words, entities) {
  var largestMatch = null;
  var largestMatchSize = 0;
  for (var i in entities) {
    var entity = entities[i];
    var matchSize = entity.MatchWords(words);
    if (matchSize > largestMatchSize) {
      largestMatch = entity;
      largestMatchSize = matchSize;
    }
  }
  return {match: largestMatch, matchSize: largestMatchSize};
}

engine.World.prototype.LocateEntity = function(words) {
  if (words[0] === 'the') {
    words.shift();
  }

  // Look for aliases in the inventory.
  var m = this.LargestMatch(words, this.INVENTORY.GetReachableObjects());
  if (m.match !== null) {
    words.splice(0, m.matchSize);
    return m.match;
  }

  // Look for aliases in the current room.
  var m = this.LargestMatch(words, this.location.GetReachableObjects());
  if (m.match !== null) {
    words.splice(0, m.matchSize);
    return m.match;
  }

  // Look for aliases in the exits.
  var exits = this.location.Exits(this);
  var m = this.LargestMatch(words, exits);
  if (m.match !== null) {
    words.splice(0, m.matchSize);
    return m.match.TO;
  }
  var rooms = [this.location];
  for (var i in exits) {
    rooms.push(exits[i].TO);
  }
  var m = this.LargestMatch(words, rooms);
  if (m.match !== null) {
    words.splice(0, m.matchSize);
    return m.match;
  }

  // This is limited to reachable rooms and objects.
  // Should we search the rest?
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
  this.LIMBO.Add(obj);
};

engine.World.prototype.DescribeContents = function(container) {
  var objects = container.objects;
  objects = container.DescribeContents(this, objects);
  for (var i in objects) {
    var overview = objects[i].Overview(this);
    if (overview) {
      this.Print(overview);
    }
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

  var exits = this.location.Exits(this);
  var exit = null;
  for (var i in exits) {
    if (exits[i].TO === room) {
      exit = exits[i];
    }
  }

  if (exit == null) {
    this.game.NoExit(this, room);
    return;
  }

  if (!this.location.CanLeave(this, room)) {
    return;
  }

  if (!room.CanEnter(this)) {
    return;
  }

  // Execute custom code for this transition.
  exit.Transition(this);

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

engine.World.prototype.LookAction = function(parsed) {
  if (parsed.MatchAny([
        {entities: [], modifiers: []},
        {entities: [], modifiers: [/around/]},
        {entities: [this.location], modifiers: [/(?:at)?/]},
  ])) {
      this.DescribeRoom();
      return true;
  }

  if (!parsed.Match({entities: [engine.ANY_OBJECT], modifiers: [/(?:at)?/]})) {
    return false;
  }

  var obj = parsed.entities[0];
  if (!this.location.IsReachable(obj)
      && !this.INVENTORY.IsReachable(obj)) {
    this.game.NotHere(this, obj);
  } else {
    this.DescribeObject(obj);
  }
  return true;
};

engine.World.prototype.UseAction = function(parsed) {
  if (!parsed.MatchAny([
        {entities: [engine.ANY_OBJECT], modifiers: [/(?:)/]},
        {entities: [engine.ANY_OBJECT, engine.ANY_OBJECT],
          modifiers: [/(?:)/, /(?:on)?/]},
  ])) {
    return false;
  }
  var obj = parsed.entities[0];
  if (!this.location.IsReachable(obj)
      && !this.INVENTORY.IsReachable(obj)) {
    this.game.NotHere(this, obj);
    return true;
  }
  var onWhat = null;
  if (parsed.entities.length > 1) {
    onWhat = parsed.entities[1];
    if (!this.location.IsReachable(onWhat)
        && !this.INVENTORY.IsReachable(onWhat)) {
      this.game.NotHere(this, onWhat);
      return true;
    }
  }
  obj.Use(this, onWhat);
  return true;
};

engine.World.prototype.GetAction = function(parsed) {
  if (!parsed.Match({entities: [engine.ANY_OBJECT], modifiers: [/(?:)/]})) {
    return false;
  }
  var obj = parsed.entities[0];
  if (this.INVENTORY.IsReachable(obj)) {
    this.game.AlreadyHave(this, obj);
  } else if (!this.location.IsReachable(obj)) {
    this.game.NotHere(this, obj);
  } else {
    this.Get(obj);
  }
  return true;
};

engine.World.prototype.DropAction = function(parsed) {
  if (!parsed.Match({entities: [engine.ANY_OBJECT], modifiers: [/(?:)/]})) {
    return false;
  }
  var obj = parsed.entities[0];
  if (this.INVENTORY.IsReachable(obj)) {
    this.Drop(obj);
  } else {
    this.game.NotHave(this, obj);
  }
  return true;
};

engine.World.prototype.InvAction = function(parsed) {
  this.game.ListInventory(this, this.INVENTORY.GetReachableObjects());
  return true;
};

engine.World.prototype.GoAction = function(parsed) {
  if (!parsed.Match({entities: [engine.ANY_ROOM], modifiers: [/(?:to)?/]})) {
    return false;
  }
  this.Enter(parsed.entities[0]);
  return true;
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
engine.World.prototype.HandleAction = function(parsed) {
  if (parsed.entities.length > 0 &&
      parsed.entities[0] instanceof engine.Object) {
    var obj = parsed.entities[0];
    if (this.INVENTORY.IsReachable(obj) || this.location.IsReachable(obj)) {
      if (obj.HandleAction(this, parsed)) {
        return true;
      }
    }
  }

  if (this.location.HandleAction(this, parsed)) {
    return true;
  }
  if (!(parsed.verb in this.ACTIONS)) {
    return false;
  }
  return this.ACTIONS[parsed.verb].bind(this)(parsed);
}

engine.INVENTORY = 'INVENTORY';

engine.Engine.prototype.Start = function(game) {
  this.screen_.innerHTML = '';
  this.screenBuffer_ = '';
  this.game = game;
  this.recording = false;
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
  if (action === '/rec') {
    this.StartRecording();
    return;
  } 
  if (action === '/stoprec') {
    this.StopRecording();
    return;
  }
  if (this.recording) {
    this.RecordAction(action);
  }
  this.Print('<div class="msg"><article class="command">'
      + action + '</article></div>', true);
  this.Print('<div class="msg"><article class="reply">', true);
  var words = action.trim().toLowerCase().split(/\s+/);
  var verb = words.shift();
  var parsed = this.ParseAction(this.world, verb, words);
  if (parsed === null) {
    this.game.UnknownAction(this.world, action);
  } else {
    var handled = this.game.HandleAction(this.world, parsed);
    if (!handled) {
      handled = this.world.HandleAction(parsed);
    }
    if (!handled) {
      this.game.UnknownAction(this.world, action);
    }
  }
  this.Print('</article></div>', true);
  this.Flush();
  if (this.actionHistory[this.actionHistory.length - 1] != action) {
    this.actionHistory.push(action);
  }
  this.actionIndex = this.actionHistory.length;
  this.input_.focus();
};

engine.Engine.prototype.StartRecording = function() {
  this.recording = true;
  document.getElementById('recording').style.display = 'block';
};

engine.Engine.prototype.StopRecording = function() {
  this.recording = false;
  document.getElementById('recording').style.display = 'none';
};

engine.Engine.prototype.RecordAction = function(action) {
  req = new XMLHttpRequest();
  req.open('POST', 'https://docs.google.com/forms/d/' + 
      '1lA2zFDOPsvBFqbnKtbtApLFq3GxwKnuYb3JdvF4VuJo/formResponse', true);
  req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  req.send('entry.222425830=' + encodeURIComponent(action));
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
  var result = this.objects.slice(0);
  for (var i in this.objects) {
    var o = this.objects[i];
    result = result.concat(o.GetReachableObjects());
  }
  return result;
};
engine.Entity.prototype.DescribeContents = function(world, objects) {
  return objects;
};
engine.Entity.prototype.HandleAction = function(world, parsed) {
  return false;
};
engine.AliasNode = function() {
  this.aliasTree = {};
  this.terminal = false;
};
engine.AliasNode.prototype.Add = function(words) {
  if (words.length <= 0) {
    this.terminal = true;
    return;
  }
  var word = words[0];
  if (!(word in this.aliasTree)) {
    this.aliasTree[word] = new engine.AliasNode();
  }
  this.aliasTree[word].Add(words.slice(1));
};
engine.AliasNode.prototype.Match = function(words) {
  var baseValue = this.terminal ? 1 : 0;
  if (words.length <= 0) {
    return baseValue;
  }
  var word = words[0];
  if (!(word in this.aliasTree)) {
    return baseValue;
  }
  return baseValue + this.aliasTree[word].Match(words.slice(1));
};
engine.Entity.prototype.BuildAliasTree = function() {
  this.aliasRoot = new engine.AliasNode();
  for (var i in this.ALIASES) {
    var alias = this.ALIASES[i];
    var words = alias.toLowerCase().split(/\s+/);
    this.aliasRoot.Add(words);
  }
  if (this.NAME !== null) {
    var words = this.NAME.toLowerCase().split(/\s+/);
    this.aliasRoot.Add(words);
  }
};
engine.Entity.prototype.MatchWords = function(words) {
  return this.aliasRoot.Match(words);
};

engine.MakeEntity = function(superclass, data) {
  var newClass = function() {
    this.Init();
    this.BuildAliasTree();
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
  return [];
};

engine.MakeRoom = function(data) {
  return engine.MakeEntity(engine.Room, data);
};

engine.Exit = function() {
  engine.Entity.call(this);
};
engine.Exit.prototype = new engine.Entity();
engine.Exit.prototype.constructor = engine.Exit;
engine.Exit.prototype.TO = null;
engine.Exit.prototype.Transition = function(world) {};

engine.MakeExit = function(data) {
  return engine.MakeEntity(engine.Exit, data);
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
engine.MakeFixedObject = function(data) {
  var d = {
    CanGet: function(world) {
      world.Print('You can\'t.');
      return false;
    },
    Overview: function(world) {
      // We assume that the overview is in the room description.
      return '';
    },
    Detail: function(world) {
      return 'You see ' + this.TITLE + ' here.';
    },
  };
  for (var i in data) {
    d[i] = data[i];
  }
  return engine.MakeObject(d);
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

engine.Game.prototype.HandleAction = function(world, parsed) {
  return false;
};

engine.Game.prototype.AlreadyThere = function(world) {
  world.Print('You\'re already there.');
};

engine.Game.prototype.NoExit = function(world, room) {
  world.Print('You can\'t see a way to get from ' + world.location.TITLE +
      ' to ' + room.TITLE + '.');
};


