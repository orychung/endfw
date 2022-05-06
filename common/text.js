
function amp_encode(text, replaceBreaks=false) {
    if (!text) return text;
    var newText = text;
    newText = newText.replace(/&/g,'&amp;');
    newText = newText.replace(/</g,'&lt;');
    newText = newText.replace(/>/g,'&gt;');
    if (replaceBreaks) newText = newText.replace(/\n/g,'<br/>');
    return newText;
}

function html_tag(name, content='', attrs=[], opt={}) {
    var useLineBreak = (opt.baseIndent!=null) || (opt.contentIndent!=null);
    var baseIndentStr = ''.padStart(opt.baseIndent || 0,' ');
    var contentIndentStr = ''.padStart(opt.contentIndent || 0,' ');
    return [
        `<${name}${
        attrs.map(x=>' '+x.name+'="'+(''+x.value).replace(/"/g,'&quot;')+'"').join('')
        }>`,
        useLineBreak?(contentIndentStr+content.replace(/\n/g,'\n'+contentIndentStr)):content,
        `</${name}>`
    ].map(x=>useLineBreak?(baseIndentStr+x.replace(/\n/g,'\n'+baseIndentStr)):x).join(useLineBreak?'\n':'');
}

function html_table(data, opt={}) {
    if (!(data instanceof Array) || data.length==0) return opt.emptyReturn || '';
    var useLineBreak = (opt.baseIndent!=null) || (opt.levelIndent!=null);
    var lineJoint = useLineBreak?'\n':''
    var tableAttrs = opt.tableAttrs || [];
    var tdMapper = opt.tdMapper || (x=>x);
    var tdAttrsMapper = opt.tdAttrsMapper || (x=>[]);
    var tdEscaper = opt.tdEscaper || (x=>x && amp_encode(''+x).replace(new RegExp('\n','g'),'<br/>'));
    var thMapper = opt.thMapper || (x=>x);
    var thEscaper = opt.thEscaper || (x=>x && amp_encode(''+x).replace(new RegExp('\n','g'),'<br/>'));
    var trSuffix = opt.trSuffix || (x=>'');
    var cols = [];
    var attrs = [];
    Object.keys(data[0]).forEach(x=>(x.startsWith('@')?attrs:cols).push(x));
    return html_tag(
        'table',
        html_tag(
            'tbody',
            [
                html_tag(
                    'tr',
                    cols.map(c=>c.split('|')).map(c=>html_tag(
                        'th',
                        thEscaper(thMapper((1 in c)?c[1]:c[0]))
                    )).join(lineJoint),
                    [], {contentIndent:opt.levelIndent}
                ),
                ...data.map(r=>html_tag(
                    'tr',
                    cols.map(c=>html_tag(
                        'td',
                        tdEscaper(tdMapper(r[c],c)),
                        tdAttrsMapper(r[c],c)
                    )).join(lineJoint),
                    attrs.map(a=>Object({name:a.slice(1),value:r[a]})), {contentIndent:opt.levelIndent}
                )+trSuffix(r)),
            ].join(lineJoint),
            [], {contentIndent:opt.levelIndent}
        ),
        tableAttrs, {baseIndent:opt.baseIndent}
    );
}

var now = Object();
now.format = function (str){
    var true_now = new Date();
    var display_now = new Date(true_now.getTime() - (true_now.getTimezoneOffset() * 60000)).toISOString();
    str = str.replace(':ms',display_now.substring(20,23));
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

class ParamText {
    constructor(template, defaults = {}) {
        this.template = template;
        this.defaults = defaults;
        this.defaultOrder = [];
        for (var key in this.defaults) {this.defaultOrder.push(key)};
        this.resetAllParams();
    };
    setTemplate(template) {
        this.template = template;
        return this;
    }
    resetAllParams() {
        this.params = {};
        for (var key in this.defaults) {this.params[key] = this.defaults[key]};
        return this;
    };
    resetParam(key) {
        delete this.params[key];
        if (key in this.defaults) {this.params[key] = this.defaults[key];}
        return this;
    };
    setParam(key, value) {
        this.params[key] = value;
        return this;
    };
    setParams(params) {
        for (var key in params) this.params[key] = params[key];
        return this;
    };
    evalParam(key, value) {
        var remain_recur = 100;
        while (typeof(value) == 'function') {
            value = value(this.params, key);
            remain_recur = remain_recur - 1;
            if (remain_recur <= 0) {
                console.error('evalParam recursion limit of 100 exceeded')
                break;
            }
        }
        return value;
    };
    fixParam(key, value = ((ps,p) => ps[p])) {
    // fixParam will actualize the final param value from potential functions
    // (if needed, provide option to eliminate the param instead of actualizing it)
        this.params[key] = this.evalParam(key, value);
        this.template = this.template.split('[['+key+']]').join(this.params[key])
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
        this.defaultOrder.forEach(key => {workingCopy.fixParam(key);});
        for (var key in workingCopy.params) {workingCopy.fixParam(key);};
        return workingCopy.template;
    };
    get v() {return this.finalise();};
    toString() {return this.v;};
    // Create new instance
    copy() {
        var newCopy = new ParamText(this.template);
        newCopy.defaults = Object.assign({}, this.defaults);
        newCopy.defaultOrder = Array.from(this.defaultOrder);
        newCopy.params = Object.assign({}, this.params);
        return newCopy;
    };
    static parse(content, defaults = {}) {
        if (content instanceof ParamText) {
            return content;
        } else {
            return (new ParamText(content, defaults));
        }
    };
}
const param_text = ParamText;

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        amp_encode: amp_encode,
        html_tag: html_tag,
        html_table: html_table,
        now: now,
        ParamText: ParamText,
    };
}
