// library to add feature to built-in types
function addMethod(f) {
    return {
        enumerable: false,
        writable: true,
        value: f
    };
}

// custom
Object.defineProperty(Array.prototype, 'done', addMethod(async function done() {
    var out = this.constructor(this.length);
    for (var i=0;i<out.length;i++) {out[i] = await this[i];}
    return out;
}));
Object.defineProperty(Array.prototype, 'sortBy', addMethod(function sortBy(f, desc=false) {
    var d = desc?[1,-1]:[-1,1];
    this.sort((x1,x2) => ((x,y) => (y>x)?d[0]:(x>y)?d[1]:0)(f(x1), f(x2)));
    return this;
}));
Object.defineProperty(Array.prototype, 'shuffle', addMethod(function shuffle() {
    for (var i = this.length - 1; i > 0; i--) {
        var cur = Math.floor(Math.random() * (i + 1));
        if (cur != i) {
            var ptr = this[cur];
            this[cur] = this[i];
            this[i] = ptr;
        };
    };
    return this;
}));
Object.defineProperty(Object.prototype, 'touch', addMethod(function touch(key, defaultValue={}) {
    if (!(key in this)) this[key] = defaultValue;
    return this[key];
}));

// jQuery methods
Object.defineProperty(Object.prototype, 'attr', addMethod(function attr(key, value) {
    // do not support key-only use:
        // 1. it is unlikely that the full alignment with jQuery can be useful
        // 2. it is silly to use x.attr(key) when it is the same as x[key]
    this[key] = value;
    return this;
}));

// Array methods
Object.defineProperty(Object.prototype, 'filterArray', addMethod(function filterArray(fF, fV=(v=>v)) {
    return Object.keys(this).filter((x) => fF(this[x], x, this)).map(x => fV(this[x], x, this));
}));
Object.defineProperty(Object.prototype, 'filterObject', addMethod(function filterObject(fF, fV=(v=>v)) {
    return Object.keys(this).filter((x) => fF(this[x], x, this)).reduce((p, x) => p.attr(x, fV(this[x], x, this)), Object());
}));
Object.defineProperty(Object.prototype, 'mapArray', addMethod(function mapArray(f=(x=>x)) {
    return Object.keys(this).map((x) => f(this[x], x, this));
}));
Object.defineProperty(Object.prototype, 'mapObject', addMethod(function mapObject(f=(x=>x)) {
    return Object.keys(this).reduce((p, x) => p.attr(x, f(this[x], x, this)), Object());
}));
Object.defineProperty(Object.prototype, 'mapKeyValue', addMethod(function mapKeyValue(fK=(k=>k), fV=(v=>v)) {
    return Object.keys(this).reduce((p, k) => p.attr(fK(k, this[k], this), fV(this[k], k, this)), Object());
}));
Object.defineProperty(Object.prototype, 'reduce', addMethod(function reduce(f, p) {
    return Object.keys(this).reduce((p, x) => f(p, this[x], x, this), p);
}));

// SQL aggregation functions
Object.defineProperty(Object.prototype, 'exists', addMethod(function exists(f) {
    return Object.keys(this).reduce((p, x) => p || f(this[x], x, this), false);
}));
Object.defineProperty(Object.prototype, 'first', addMethod(function first(f=(x=>x), v=(x=>x)) {
    for (var x in Object.keys(this)) if (f(this[x], x, this)) return v(this[x], x, this);
    return null;
}));
Object.defineProperty(Object.prototype, 'max', addMethod(function max(f=(x=>x)) {
    return Object.keys(this).reduce((p, x) => ((p == null) || f(this[x], x, this) > p)?f(this[x], x, this):p, null);
}));
Object.defineProperty(Object.prototype, 'min', addMethod(function min(f=(x=>x)) {
    return Object.keys(this).reduce((p, x) => ((p == null) || f(this[x], x, this) < p)?f(this[x], x, this):p, null);
}));
Object.defineProperty(Object.prototype, 'sum', addMethod(function sum(f=(x=>x)) {
    return Object.keys(this).reduce((p, x) => p + parseFloat(f(this[x], x, this)), 0);
}));
Object.defineProperty(Object.prototype, 'loopJoin', addMethod(function loopJoin(
    t,
    fK = (k1,k2)=>[k1,k2],
    fV = (x1,x2)=>x2.reduce((p,v2,k2)=>p.attr(k2,v2),x1.mapObject()),
    fF = ()=>true
) {
    var k = Object.keys(t);
    return Object.keys(this).reduce((p, k1) => k.reduce((p, k2) => 
        fF(this[k1], t[k2], k1, k2)?p.attr(fK(k1, k2, this[k1], t[k2]), fV(this[k1], t[k2], k1, k2)):p
    , p), Object());
}));

// custom
Object.defineProperty(Object.prototype, 'convert', addMethod(function convert(f) {
    Object.keys(this).map((x) => this[x] = f(this[x], x, this));
    return this;
}));
Object.defineProperty(Object.prototype, 'asPMF', addMethod(function asPMF() {
    return new pmf(this);
}));
Object.defineProperty(Object.prototype, 'logDebug', addMethod(function log(f) {
	console.log(f(this));
	return this;
}));
Object.defineProperty(Object.prototype, 'logThis', {
    get() {
		console.log(this);
		return this;
	}
});

// custom
Object.defineProperty(String.prototype, 'likeRE', addMethod(function likeRE(re) {
    return (this.search(new RegExp('^'+re+'$')) >= 0);
}));
Object.defineProperty(String.prototype, 'splitNum', addMethod(function splitNum(delimiter) {
    return (this.split(delimiter).map(x => parseInt(x)));
}));

// custom
JSON.serialCopy = function(obj) {return JSON.parse(JSON.stringify(obj));}
JSON.listify = function(objBody, objName, index) {
    var prefix = '<b>'+objName+((index==null)?'':('['+index+']'))+': </b>'
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
        sortBy: "sort by value of single-param function",
        shuffle: "reorder items randomly"
    },
    Object: {
        attr: "quasi-analog of jQuery attr, do not support single param use",
        filterArray: "quasi-analog of Array.filter, return an Array of Object.keys order",
        filterObject: "quasi-analog of Array.filter, return an Object",
        mapArray: "quasi-analog of Array.map, return an Array of Object.keys order",
        mapObject: "quasi-analog of Array.map, return an Object",
        mapKeyValue: "quasi-analog of Array.map, return an Object fKey, fVal",
        reduce: "analog of Array.reduce",
        first: "analog of SQL first v(x,i,w) to make f(x,i,w) true",
        max: "analog of SQL max f(x,i,w)",
        min: "analog of SQL min f(x,i,w)",
        sum: "analog of SQL sum f(x,i,w)",
        loopJoin: "analog of SQL nested loop join o2, fKey(k1, k2), fVal(x1, x2, k1, k2), fFil(x1, x2, k1, k2)",
        asPMF: "bridge to apply stat.js", // require stat.js
        convert: "similar to Array.map, but store the outcome in place",
		logDebug: "[debug use] log function of this (useful for method chain)",
		logThis: "[debug use] log this (useful for method chain)",
        touch: "locate an attribute and allow fitting a default if not existing"
    },
    String: {
        likeRE: "analog of SQL like, changed to use RE as pattern",
        splitNum: "split but added parseInt"
    },
    JSON: {
        serialCopy: "copy object by stringify and parse",
        listify: "output JSON as a list"
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
