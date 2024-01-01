"use strict";
// library to add feature to built-in types
Function.prototype.defineMethod = function defineMethod(prop, details) {
  let finalDetails = Object();
  if (details instanceof Function) {
    Object.assign(finalDetails, {
      writable: true,
      value: details
    });
  } else {
    Object.assign(finalDetails, details);
  }
  finalDetails.enumerable = false;
  Object.defineProperty(this.prototype, prop, finalDetails);
}

// early availability
if (!Array.prototype.at) Array.defineMethod('at', function at(index) {
  if (index < 0) index += this.length;
  return this[index];
});

// custom
Array.defineMethod('done', async function done() {
  var out = this.constructor(this.length);
  for (var i=0;i<out.length;i++) {out[i] = await this[i];}
  return out;
});
Array.defineMethod('lookupOf', function lookupOf(key, f=v=>v) {
  if (!key) throw '[lookupOf]: key (parameter 0) must be specified!';
  return this.mapKeyValue((k,v)=>v[key],v=>f(v));
});
Array.defineMethod('sortBy', function sortBy(f, desc=false) {
  var d = desc?[1,-1]:[-1,1];
  this.sort((x1,x2) => ((x,y) => (y>x)?d[0]:(x>y)?d[1]:0)(f(x1), f(x2)));
  return this;
});
Array.defineMethod('shuffle', function shuffle() {
  for (var i = this.length - 1; i > 0; i--) {
    var cur = Math.floor(Math.random() * (i + 1));
    if (cur != i) {
      var ptr = this[cur];
      this[cur] = this[i];
      this[i] = ptr;
    };
  };
  return this;
});
Object.defineMethod('pushTo', function pushTo(target, key) {
  if (key) {
    target[key] = this;
  } else if (target instanceof Array) {
    target.push(this);
  } else {
    throw Error('key-less pushTo only allow Array target');
  }
  return this;
});
Object.defineMethod('touch', function touch(key, defaultValue={}) {
  if (!(key in this)) this[key] = defaultValue;
  return this[key];
});
Object.defineMethod('undergo', function undergo(method, output=(t,r)=>r) {
  if (output == 'i') output = x=>x;
  if (method instanceof Array) {
    return method.map(x=>output(this,x(this)));
  } else {
    return output(this,method(this));
  }
});

// jQuery methods
Object.defineMethod('attr', function attr(key, value) {
  // do not support key-only use:
    // 1. it is unlikely that the full alignment with jQuery can be useful
    // 2. it is silly to use x.attr(key) when it is the same as x[key]
  this[key] = value;
  return this;
});

// Array methods
Object.defineMethod('filterArray', function filterArray(fF, fV=(v=>v)) {
  return Object.keys(this).filter((x) => fF(this[x], x, this)).map(x => fV(this[x], x, this));
});
Object.defineMethod('filterObject', function filterObject(fF, fV=(v=>v)) {
  return Object.keys(this).filter((x) => fF(this[x], x, this)).reduce((p, x) => p.attr(x, fV(this[x], x, this)), Object());
});
Object.defineMethod('mapArray', function mapArray(f=(x=>x)) {
  return Object.keys(this).map((x) => f(this[x], x, this));
});
Object.defineMethod('mapObject', function mapObject(f=(x=>x)) {
  return Object.keys(this).reduce((p, x) => p.attr(x, f(this[x], x, this)), Object());
});
Object.defineMethod('mapKeyValue', function mapKeyValue(fK=(k=>k), fV=(v=>v)) {
  return Object.keys(this).reduce((p, k) => p.attr(fK(k, this[k], this), fV(this[k], k, this)), Object());
});
Object.defineMethod('reduce', function reduce(f, p) {
  return Object.keys(this).reduce((p, x) => f(p, this[x], x, this), p);
});

// SQL aggregation functions
Object.defineMethod('exists', function exists(f) {
  return Object.keys(this).reduce((p, x) => p || f(this[x], x, this), false);
});
Object.defineMethod('first', function first(f=(x=>x), c=(x=>true)) {
  for (var x in Object.keys(this)) if (c(this[x], x, this)) return f(this[x], x, this);
  return null;
});
Object.defineMethod('max', function max(f=(x=>x)) {
  return Object.keys(this).reduce((p, x) => ((p == null) || f(this[x], x, this) > p)?f(this[x], x, this):p, null);
});
Object.defineMethod('min', function min(f=(x=>x)) {
  return Object.keys(this).reduce((p, x) => ((p == null) || f(this[x], x, this) < p)?f(this[x], x, this):p, null);
});
Object.defineMethod('sum', function sum(f=(x=>x)) {
  return Object.keys(this).reduce((p, x) => p + parseFloat(f(this[x], x, this)), 0);
});
Object.defineMethod('loopJoin', function loopJoin(
  t,
  fK = (k1,k2)=>[k1,k2],
  fV = (x1,x2)=>x2.reduce((p,v2,k2)=>p.attr(k2,v2),x1.mapObject()),
  fF = ()=>true
) {
  var k = Object.keys(t);
  return Object.keys(this).reduce((p, k1) => k.reduce((p, k2) => 
    fF(this[k1], t[k2], k1, k2)?p.attr(fK(k1, k2, this[k1], t[k2]), fV(this[k1], t[k2], k1, k2)):p
  , p), Object());
});

// custom
Object.defineMethod('convert', function convert(f) {
  Object.keys(this).map((x) => this[x] = f(this[x], x, this));
  return this;
});
Object.defineMethod('asPMF', function asPMF() {
  return new pmf(this);
});
Object.defineMethod('logDebug', function log(f) {
	console.log(f(this));
	return this;
});
Object.defineMethod('logThis', {
  get() {
		console.log(this);
		return this;
	}
});
if ('jQuery' in globalThis) Object.defineMethod('$', {
  get() {return $(this);}
});

// custom
String.defineMethod('likeRE', function likeRE(re) {
  return (this.search(new RegExp('^'+re+'$')) >= 0);
});
String.defineMethod('splitNum', function splitNum(delimiter) {
  return (this.split(delimiter).map(x => parseInt(x)));
});

// custom
JSON.serialCopy = function(obj) {return JSON.parse(JSON.stringify(obj));}
JSON.listify = function(objBody, objName, index) {
  let prefix = '<b>'+objName+((index==null)?'':('['+index+']'))+': </b>'
  try {
    if (objBody instanceof Array) {
      return objBody.map((x,i)=>'<li>'+JSON.listify(x, objName, i)+'</li>').join('').slice(4, -5);
    } else if (objBody instanceof Object && objBody['mapArray'] instanceof Function) {
      return prefix+'<ul>'+objBody.mapArray((x,i)=>'<li>'+JSON.listify(x, i)+'</li>').join('')+'</ul>';
    } else {
      return prefix+amp_encode(''+objBody);
    }
  } catch (e) {
    JSON.listify.lastError = e;
    console.warn('Excpetion when handling objBody:', objBody);
    return prefix+('(non-string object)');
  }
}

// documentation about what is done
var builtin_doc = {
  Array: {
    at: "early availability for ES 2022",
    lookupOf: "form a key > value map",
    sortBy: "sort by value of single-param function",
    shuffle: "reorder items randomly"
  },
  Object: {
    $: "init object with jQuery $",
    attr: "quasi-analog of jQuery attr, do not support single param use",
    filterArray: "quasi-analog of Array.filter, return an Array of Object.keys order",
    filterObject: "quasi-analog of Array.filter, return an Object",
    mapArray: "quasi-analog of Array.map, return an Array of Object.keys order",
    mapObject: "quasi-analog of Array.map, return an Object",
    mapKeyValue: "quasi-analog of Array.map, return an Object fKey, fVal",
    reduce: "analog of Array.reduce",
    first: "analog of SQL first f(x,i,w) to make c(x,i,w) true",
    max: "analog of SQL max f(x,i,w)",
    min: "analog of SQL min f(x,i,w)",
    sum: "analog of SQL sum f(x,i,w)",
    loopJoin: "analog of SQL nested loop join o2, fKey(k1, k2), fVal(x1, x2, k1, k2), fFil(x1, x2, k1, k2)",
    asPMF: "bridge to apply stat.js", // require stat.js
    convert: "similar to Array.map, but store the outcome in place",
    logDebug: "[debug use] log function of this (useful for method chain)",
    logThis: "[debug use] log this (useful for method chain)",
    pushTo: "add this to an array or an object",
    touch: "locate an attribute and allow fitting a default if not existing",
    undergo: "pass this to a function (or array of functions) and return the result",
  },
  String: {
    likeRE: "analog of SQL like, changed to use RE as pattern",
    splitNum: "split but added parseInt",
  },
  JSON: {
    serialCopy: "copy object by stringify and parse",
    listify: "output JSON as a list",
  }
}

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    builtin_doc: builtin_doc
  };
}
