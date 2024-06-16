
var trigs = {};
function triggerFactory(name) {
  var resolveCall = undefined;
  var rejectCall = undefined;
  var trigger = {
    fired: false,
    fire(result) {
      if (this.fired) {throw Error('Trigger is already fired!');}
      this.fired = true;
      this.result = result;
      resolveCall(result);
    },
    cancel(e) {rejectCall(e);},
    promise: new Promise((s,f) => [resolveCall,rejectCall] = [s,f])
  };
  if (name != null) trigs[name] = trigger;
  return trigger;
}

async function doAsync(syncMethod, timeout) {
  try {
    var trigger = triggerFactory();
    if (timeout != null) {
      setTimeout(()=>{
        syncMethod();
        trigger.fire();
      }, timeout)
    } else syncMethod();
    return trigger.promise;
  } catch (e) {console.error(e);}
}

class comPromise extends Promise {
  constructor(resolver) {
    var outBox = undefined;
    super((resolve, reject)=>outBox={resolve:resolve, reject:reject});
    this.promiseList = [new Promise(resolver)];
    this.quantifier = 'race';
    this.needReplacement = false;
    this.state = 'pending';
    (async ()=>{
      try {
        while (true) {
          this.replacer = triggerFactory();
          var result = await Promise.race([
            Promise[this.quantifier](this.promiseList),
            this.replacer.promise
          ]);
          if (this.state == 'aborted') {
            return;
          } else if (!this.needReplacement) {
            this.state = 'fulfilled';
            return outBox.resolve(result);
          } else {
            this.needReplacement = false;
          }
        }
      } catch(e) {return outBox.reject(e);}
    })();
  }
  refreshCondition() {
    this.needReplacement = true;
    this.replacer.fire();
  }
  testQuantifier() {
    console.log(this.quantifier);
    console.log(this.promiseList);
    return Promise[this.quantifier](this.promiseList);
  }
  forceOutcome(action) {
    if (this.state == 'fulfilled') {
      throw Error('Promise is already fulfilled!');
    } else {
      this.needReplacement = false;
      action();
      return this;
    }
  }
  then(onResult, onError) {
    // TODO: manually control the then-list
    return Promise.prototype.then.call(this, onResult, onError);
  }
  catch(onError) {
    // TODO: manually control the catch-list
    return Promise.prototype.catch.call(this, onError);
  }
  abort() {return this.forceOutcome(()=>{this.state='aborted'; this.replacer.fire();});}
  forceResolve(result) {return this.forceOutcome(()=>this.replacer.fire(result));}
  forceReject(error) {return this.forceOutcome(()=>this.replacer.cancel(error));}
  redefine(promiseList, quantifier) {
    this.promiseList = promiseList;
    this.quantifier = quantifier;
    this.refreshCondition();
    return this;
  }
  static composite(promiseList, quantifier) {
    var cp = new comPromise(s=>'never resolve or reject');
    cp.quantifier = quantifier;
    cp.promiseList = promiseList;
    cp.refreshCondition();
    return cp;
  }
  static all(promiseList) {return this.composite(promiseList, 'all');}
  static allSettled(promiseList) {return this.composite(promiseList, 'allSettled');}
  static any(promiseList) {return this.composite(promiseList, 'any');}
  static race(promiseList) {return this.composite(promiseList, 'race');}
}

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    triggerFactory: triggerFactory,
    doAsync: doAsync,
    comPromise: comPromise
  }
}

// // Example 1
// var manualTrigger = Promise.any([new Promise(()=>'never resolve or reject'), triggerFactory('manual').promise]);
// manualTrigger.then(res=>{
  // console.log('Core trigger done!', res);
// });
// trigs['manual'].fire('manualTrigger resolved by manual trigger');

// // Example 2
// var cpNever = new comPromise(()=>'never resolve or reject');
// cpNever.then(x=>console.log(x));
// doAsync(()=>{
  // cpNever.promiseList.push(new Promise(s=>s('cpNever resolved by this new promise')));
  // cpNever.quantifier = 'any';
  // cpNever.refreshCondition();
// }, 1000);

// // Example 3
// var allAB = comPromise.all([triggerFactory('A').promise, triggerFactory('B').promise]);
// allAB.then(x=>console.log('All A and B fulfilled',x)).catch(e=>console.error(e));
// doAsync(()=>{
  // trigs['A'].fire('result of A');
  // trigs['B'].fire('result of B');
// }, 2000);

// // Example 4
// var anyCD = comPromise.any([triggerFactory('C').promise, triggerFactory('D').promise]);
// anyCD.then(x=>console.log('Any of C and D fulfilled',x)).catch(e=>console.error(e));
// doAsync(()=>{
  // trigs['C'].cancel('cancelling C');
  // trigs['D'].fire('result of D');
// }, 3000);
