"use strict";
// library for statistical operations
var Combin = class Combin {
  static nCr(n, r) {
    if ((n >= 0) && (n < 2*r)) r = n - r;
    if (r < 0) return 0;
    var x = 1;
    for (var i=1;i<=r;i++) x = x * (n + 1 - i) / i;
    return x;
  }
  static pickInt = (bound) => Math.floor(Math.random() * bound)
  static range = function (start, end = NaN, step = 1) {
    if (isNaN(end)) {
      end = start;
      start = 0;
    };
    const length = Math.max(0, Math.ceil((end - start) / step));
    const arr = Array(length);
    if (arr.length > 0) arr[0] = start;
    for (var i = 1; i < arr.length; i++) {arr[i] = arr[i-1] + step;};
    return arr;
  }
  static rangeShuffled = (start, end = NaN, step = 1) => Combin.range(start, end, step).shuffle()
}

var Accumulator = class Accumulator {
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

var PMF = class PMF {
  // Probability Mass Function
  /* As a parent distribution, the flow of use:
      1. compute parent-prior
      2. compute parent-child (child can be another PMF)
      3. compute parent-post
      4. pick parent
      5. pick child
  */
  constructor(base) {
    this.base = base; // expect key-value = caseName-probability
    this.priorSum = Object.entries(this.base).reduce((p,x)=>p+x[1], 0);
    // TODO: add measure to improve precision of minority
  }
  initPercentile() {
    if (!this.sortedCDF) {
      this.sortedCDF = Object.keys(this.base).sort((a,b)=>Number(a)-Number(b)).map(x=>[Number(x), this.base[x]]);
      for (var i=1;i<this.sortedCDF.length;i++) this.sortedCDF[i][1] += this.sortedCDF[i-1][1];
      this.count = this.sortedCDF.length;
    }
  }
  percentile(p) {
    if (p>1 || p<0) throw 'p must be between 0 and 1!';
    this.initPercentile();
    return this.matchPercentile(p * this.priorSum, 0, this.count);
  }
  matchPercentile(p, min, max) {
    // binary search
    if (max <= min) return this.sortedCDF[min][0];
    var mid = Math.trunc((max + min) / 2);
    if (p > this.sortedCDF[mid][1]) {
      return this.matchPercentile(p, mid + 1, max);
    } else if (p < this.sortedCDF[mid][1]) {
      return this.matchPercentile(p, min, mid);
    } else {
      return (Number(this.sortedCDF[mid][0]) + Number(this.sortedCDF[mid+1][0])) / 2;
    }
  }
  initSampling() {
    if (!this.unsortedCDF) {
      this.unsortedCDF = Object.entries(this.base); // don't sort to favor binary search
      for (var i=1;i<this.unsortedCDF.length;i++) this.unsortedCDF[i][1] += this.unsortedCDF[i-1][1];
      this.count = this.unsortedCDF.length;
    }
  }
  drawResult(draw, min, max) {
    // binary search
    if (max <= min) return min;
    var mid = Math.trunc((max + min) / 2);
    if (draw > this.unsortedCDF[mid][1]) {
      return this.drawResult(draw, mid + 1, max);
    } else {
      return this.drawResult(draw, min, mid);
    }
  }
  sample() {
    this.initSampling();
    var draw = this.priorSum * Math.random();
    var result = this.drawResult(draw, 0, this.count);
    return this.unsortedCDF[result][0];
  }
  empiricalTest(size=1000000) {
    var data = Object.fromEntries(Object.keys(this.base).map(x=>[x,0]));
    for (var i=0;i<size;i++) data[this.sample()] += 1;
    return new PMF(data);
  }
  normalize(targetSum = 1) {
    delete this.unsortedCDF;
    const scale = this.priorSum / targetSum;
    Object.keys(this.base).forEach(k=>this.base[k]/=scale);
    this.priorSum = targetSum;
    return this;
  }
  project(f) {
    // project distribution of f(base) or apply scalar operation on values
    let accumulator = new Accumulator();
    Object.entries(this.base).forEach(([v, p])=>accumulator.add(f(v), p));
    return new PMF(accumulator.base);
  }
  join(pmf, f=(v1,v2)=>`${v1},${v2}`) {
    let accumulator = new Accumulator();
    Object.entries(this.base).forEach(([v1, p1]) => {
      Object.entries(pmf.base).forEach(([v2, p2]) => {
        accumulator.add(f(v1, v2), p1 * p2);
      });
    });
    return new PMF(accumulator.base);
  }
  concat(pmf) {
    // form new pmf by concatenating 2 pmfs
    let accumulator = new Accumulator();
    Object.entries(this.base).forEach(([v, p]) => accumulator.add(v, p));
    Object.entries(pmf.base).forEach(([v, p]) => accumulator.add(v, p));
    return new PMF(accumulator.base);
  }
  filter(f) {
    // form new pmf by entries where f(case, prob) is truthy
    let accumulator = new Accumulator();
    Object.entries(this.base).forEach(([v, p]) => {
      if (f(v)) accumulator.add(v, p);
    });
    return new PMF(accumulator.base);
  }
  expectation(f) {
    return Object.entries(this.base).reduce((p,x)=>p+f(x[0])*x[1],0)/this.priorSum;
  }
  static fromSample(sample) {
    let accumulator = new Accumulator();
    sample.forEach(x=>accumulator.add(x, 1));
    return new PMF(accumulator.base);
  }
  static fromDice(number, face) {
    let dice = PMF.fromSample(Combin.range(1, face + 1)).normalize();
    let newPMF = dice;
    for (var i=1; i<number; i++) {
      newPMF = newPMF.join(dice, (v1,v2)=>parseInt(v1)+parseInt(v2));
    }
    return newPMF;
  }
}

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    Accumulator: Accumulator,
    Combin: Combin,
    PMF: PMF,
  }
}
