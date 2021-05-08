// must include stat.js

class perfCounter {
    // TODO: use performance.now() to replace new Date().getTime()
    constructor(enabled) {
        this.reset();
        this.enabled = enabled;
        this.timeOffset = new Date().getTime() - performance.now();
    }
    reset() {
        this.callList = []; // each item is [0=processName, 1=refKey, 2=child, 3=startTime, 4=endTime, 5=refValue]
        this.listStack = [this.callList]; // each item is a callList (use unshift+shift)
        this.procStack = []; // each item is a process (use unshift+shift)
    }
    start(procName, refKey, logType) {
        if (!this.enabled) return;
        var proc = [procName, refKey, [], performance.now(), null, null];
        perfCounter.logMessage(perfCounter.procDescription(proc)+' is started.', logType);
        this.listStack[0].push(proc);
        this.listStack.unshift(proc[2]);
        this.procStack.unshift(proc);
        return proc;
    }
    end(refValue=0, logType) {
        if (!this.enabled) return;
        var proc = this.procStack[0];
        proc[4] = performance.now();
        proc[5] = refValue;
        perfCounter.logMessage(perfCounter.procDescription(proc)+' is ended '+Math.ceil(proc[4]-proc[3])+'ms from start.', logType);
        this.procStack.shift();
        this.listStack.shift();
        return proc;
    }
    logLapse(proc, checkName, logType) {
        if (!this.enabled) return;
        perfCounter.logMessage([perfCounter.procDescription(proc), checkName, Math.ceil(performance.now()-proc[3])], logType);
    }
    static procDescription(proc) {
        return proc[0]+((proc[1] && '('+proc[1]+')') || '')
    }
    static logMessage(message, logType) {
        if (logType == null) return;
        console[logType](message);
    }
    static roundedCost(proc, prec=1) {return Math.ceil((proc[4]-proc[3])*prec)/prec;}
    list() {
        function getList(callList) {
            return callList.map(x=>[x[0],x[1],perfCounter.roundedCost(x, 100),getList(x[2])]);
        }
        return getList(this.callList);
    }
    perName() {
        var cost = new Accumulator();
        function costOfList(cost, callList) {
            var grossCost = 0;
            callList.forEach(proc=>{
                var procCost = proc[4]-proc[3];
                if (procCost < 0) console.error('Strange proc:', proc);
                grossCost += procCost;
                cost.add(proc[0], procCost - costOfList(cost, proc[2]));
            });
            return grossCost;
        }
        costOfList(cost, this.callList);
        return cost.base;
    }
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        perfCounter: perfCounter
    }
}
