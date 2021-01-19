
function amp_encode(text) {
    var newText = text;
    newText = newText.replace(/&/g,'&amp;');
    newText = newText.replace(/</g,'&lt;');
    newText = newText.replace(/>/g,'&gt;');
    return newText;
}

var now = Object();
now.format = function (str){
    var true_now = new Date();
    var display_now = new Date(true_now.getTime() - (true_now.getTimezoneOffset() * 60000)).toISOString();
    str = str.replace(':Y4',display_now.substring(0,4));
    str = str.replace(':Y2',display_now.substring(2,4));
    str = str.replace(':M',display_now.substring(5,7));
    str = str.replace(':D',display_now.substring(8,10));
    str = str.replace(':h',display_now.substring(11,13));
    str = str.replace(':m',display_now.substring(14,16));
    str = str.replace(':s',display_now.substring(17,19));
    return str;
};
now.t01 = function (){return now.format('[:h:m:s] ')};
now.t02 = function (){return now.format('[:Y4:M:DT:h:m:s] ')};

class param_text {
    constructor(template, defaults = {}) {
        this.template = template;
        this.defaults = defaults;
        this.defaultOrder = [];
        for (var param in this.defaults) {this.defaultOrder.push(param)};
        this.resetAllParams();
    };
    setTemplate(template) {
        this.template = template;
        return this;
    }
    resetAllParams() {
        this.params = {};
        for (var param in this.defaults) {this.params[param] = this.defaults[param]};
        return this;
    };
    resetParam(param) {
        delete this.params[param];
        if (param in this.defaults) {this.params[param] = this.defaults[param];}
        return this;
    };
    setParam(param, value) {
        this.params[param] = value;
        return this;
    };
    setParams(params) {
        for (var i in params) this.params[i] = params[i];
        return this;
    };
    evalParam(param, value) {
        var remain_recur = 100;
        while (typeof(value) == 'function') {
            value = value(this.params, param);
            remain_recur = remain_recur - 1;
            if (remain_recur <= 0) break;
        }
        return value;
    };
    fixParam(param, value = ((ps,p) => ps[p])) {
    // fixParam will actualize the final param value from potential functions
    // (if needed, provide option to eliminate the param instead of actualizing it)
        this.params[param] = this.evalParam(param, value);
        this.template = this.template.split('[['+param+']]').join(this.params[param])
        return this;
    };
    finalise(template = this.template) {
        // KIV: below is a safer version, but fails to handle nested param default function dependency
        // var output = template;
        // for (var param in this.params) {
            // output = output.split('[['+param+']]').join(this.evalParam(param, this.params[param]));
        // };
        // return output;
        
        // KIV: below is a more featured version, but affected by completeness of copy and may be worse in performance
        var workingCopy = this.copy();
        workingCopy.template = template;
        this.defaultOrder.forEach((p) => {workingCopy.fixParam(p);});
        for (var p in workingCopy.params) {workingCopy.fixParam(p);};
        return workingCopy.template;
    };
    get v() {return this.finalise();};
    toString() {return this.v;};
    // Create new instance
    copy() {
        var newCopy = new param_text(this.template);
        for (var param in this.defaults) {newCopy.defaults[param] = this.defaults[param]};
        newCopy.defaultOrder = Array.from(this.defaultOrder);
        for (var param in this.params) {newCopy.params[param] = this.params[param]};
        return newCopy;
    };
    static parse(content, defaults = {}) {
        if (content instanceof param_text) {
            return content;
        } else {
            return (new param_text(content, defaults));
        }
    };
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        amp_encode: amp_encode,
        param_text: param_text,
        now: now
    };
}
