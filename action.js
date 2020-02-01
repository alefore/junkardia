engine.Engine.prototype.RegisterActionParser = function(parser) {
  for (var i in parser.ALIASES) {
    this.parsers[parser.ALIASES[i]] = parser;
  }
};

engine.Engine.prototype.InitActionParsers = function() {
  this.parsers = {
    UNKNOWN: new engine.ActionParser(),
  };
  this.RegisterActionParser(engine.LookActionParser);
  this.RegisterActionParser(engine.TurnActionParser);
  this.RegisterActionParser(engine.GetActionParser);
  this.RegisterActionParser(engine.GoActionParser);
};

engine.ParsedAction = function(verb, entities, modifiers) {
  this.verb = verb;
  this.entities = entities;
  this.modifiers = modifiers;
};

engine.ANY = 'ANY';
engine.ANY_OBJECT = 'ANY_OBJECT';
engine.ANY_ROOM = 'ANY_ROOM';
engine.FullMatch = function(pattern, str) {
  pattern = new RegExp('^(?:' + pattern.source + ')$');
  return pattern.test(str);
};

engine.ParsedAction.prototype.MatchAny = function(argsList) {
  for (var i in argsList) {
    args = argsList[i];
    if (this.Match(args)) {
      return true;
    }
  }
  return false;
};

engine.ParsedAction.prototype.Match = function(args) {
  if ('verb' in args) {
    if (!engine.FullMatch(args.verb, this.verb)) {
      return false;
    }
  }
  if ('entities' in args) {
    if (this.entities.length !== args.entities.length) {
      return false;
    }
    for (var i in args.entities) {
      if (args.entities[i] === engine.ANY) {
        continue;
      }
      if (args.entities[i] === engine.ANY_OBJECT) {
        if (this.entities[i] instanceof engine.Object) {
          continue;
        }
        return false;
      }
      if (args.entities[i] === engine.ANY_ROOM) {
        if (this.entities[i] instanceof engine.Room) {
          continue;
        }
        return false;
      }
      if (args.entities[i] !== this.entities[i]) {
        return false;
      }
    }
  }
  if ('modifiers' in args) {
    if (this.modifiers.length !== args.modifiers.length) {
      return false;
    }
    for (var i in args.modifiers) {
      if (args.modifiers[i] === engine.ANY) {
        continue;
      }
      if (!engine.FullMatch(args.modifiers[i], this.modifiers[i])) {
        return false;
      }
    }
  }
  return true;
};

// Returns null if failed to parse.
// Else, returns an object with:
//   verb: canonical verb
//   entities: list of entities involved
//   modifiers: list of modifiers
engine.Engine.prototype.ParseAction = function(world, verb, words) {
  var parser;
  if (!(verb in this.parsers)) {
    parser = this.parsers['UNKNOWN'];
  } else {
    parser = this.parsers[verb];
    // Canonicalize verb
    verb = parser.ALIASES[0];
  }
  var parsed = parser.Parse(world, parser.Normalize(words));
  if (parsed != null) {
    parsed = new engine.ParsedAction(verb, parsed.entities, parsed.modifiers);
  }
  return parsed;
};

engine.ActionParser = function() {};
engine.ActionParser.prototype.ALIASES = [];
engine.ActionParser.prototype.Normalize = function(words) {
  if (words.length <= 1) {
    return words;
  }
  // Move preposition from ending to first place.
  if (this.IsPreposition(words[words.length - 1])) {
    words.unshift(words.pop());
  }
  return words;
};
engine.ActionParser.prototype.Parse = function(world, words) {
  var result = {
    entities: [],
    modifiers: [],
  };
  while (words.length > 0) {
    if (this.IsPreposition(words[0])) {
      result.modifiers.push(words.shift());
    } else {
      result.modifiers.push('');
    }

    if (words.length > 0) {
      var ent = world.LocateEntity(words);
      if (ent === null) {
        return null;
      }
      result.entities.push(ent);
    }
  }
  return result;
}

engine.ActionParser.prototype.PREPOSITIONS = [
  'in',
  'at',
  'away',
  'over',
  'out',
  'from',
  'under',
  'louder',
  'inside',
  'into',
  'on',
  'off',
  'around',
  'up',
  'down',
  'to',
  'with',
];

engine.ActionParser.prototype.IsPreposition = function(word) {
  return this.PREPOSITIONS.indexOf(word) >= 0;
};

engine.MakeActionParser = function(data) {
  var newClass = function() {
    engine.ActionParser.call(this);
  };
  newClass.prototype = new engine.ActionParser();
  newClass.prototype.constructor = newClass;
  for (key in data) {
    newClass.prototype[key] = data[key];
  }
  return new newClass();
};

engine.LookActionParser = engine.MakeActionParser({
  ALIASES: ['look', 'see', 'examine'],
});

engine.TurnActionParser = engine.MakeActionParser({
  ALIASES: ['turn'],
});

engine.GetActionParser = engine.MakeActionParser({
  ALIASES: ['get', 'take'],
});

engine.GoActionParser = engine.MakeActionParser({
  ALIASES: ['go', 'walk', 'run'],
});
