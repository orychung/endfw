// must include builtin.js

var combin = Object();
combin.nCr = function(n, r) {
    if ((n >= 0) && (n < 2*r)) r = n - r;
    if (r < 0) return 0;
    var x = 1;
    for (var i=1;i<=r;i++) x = x * (n + 1 - i) / i;
    return x;
};
combin.pickInt = (bound) => Math.floor(Math.random() * bound);
combin.range = function (start, end = NaN, step = 1) {
    if (isNaN(end)) {
        end = start;
        start = 0;
    };
    var array = [];
    for (var i = start; (end - i) * Math.sign(step) > 0; i+= step) {array.push(i);};
    return array;
};
combin.rangeShuffled = (start, end = NaN, step = 1) => combin.range(start, end, step).shuffle();

function bulkCalculate(f, outArray, ...inArrays) {
    outArray.convert((x,i)=>f(i, ...inArrays.map(x=>x[i])));
}

// function Counter(target={}) {
    // return new Proxy(target, {
        // get: function(target, key) {
            // return target[key] || 0;
        // }
    // });
// }

class Accumulator {
    constructor(base={}) {
        this.base = base;
    }
    set(key, value) {this.base[key] = value;}
    add(key, value) {
        if (!(key in this.base)) this.base[key] = 0;
        this.base[key] += value;
    }
    reduce(key, value) {
        if (!(key in this.base)) this.base[key] = 0;
        this.base[key] -= value;
    }
}

class pmf {
    // Probability Mass Function
    /* As a parent distribution, the flow of use:
        1. compute parent-prior
        2. compute parent-child (child can be another pmf)
        3. compute parent-post
        4. pick parent
        5. pick child
    */
    constructor(base) {
        this.base = base; // expect key-value = caseName-probability
        this.priorSum = this.base.sum(x=>x);
        // TODO: add measure to improve precision of minority
    }
    initSampling() {
        if (!this.unsortedCDF) {
            this.unsortedCDF = this.base.mapArray((x,i)=>[x,i]); // don't sort to favor binary search
            for (var i=1;i<this.unsortedCDF.length;i++) this.unsortedCDF[i][0] += this.unsortedCDF[i-1][0];
            this.count = this.unsortedCDF.length;
        }
    }
    drawResult(draw, min, max) {
        // binary search
        if (max <= min) return min;
        var mid = quotient(max + min, 2);
        if (draw > this.unsortedCDF[mid][0]) {
            return this.drawResult(draw, mid + 1, max);
        } else {
            return this.drawResult(draw, min, mid);
        }
    }
    sample() {
        this.initSampling();
        var draw = this.priorSum * Math.random();
        var result = this.drawResult(draw, 0, this.count);
        return this.unsortedCDF[result][1];
    }
    empiricalTest(size=1000000) {
        var data = this.base.mapObject(x=>0);
        for (var i=0;i<size;i++) data[this.sample()] += 1;
        return data;
    }
    normalize() {
        delete this.unsortedCDF;
        this.base.convert(x => x / this.priorSum);
        this.priorSum = 1;
        return this;
    }
    project(f) {
        return new pmf(Object.keys(this.base).reduce((p, x) => p.attr(f(x), (p[f(x)] || 0) + this.base[x]), Object()));
    }
    static fromSample(sample) {
        return new pmf(sample.reduce((p,x)=>p.attr(x, (p[x] || 0)+1), Object()));
    }
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        combin: combin,
        pmf: pmf,
    }
}
