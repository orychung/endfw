// must include text.js

// useful templates
bannerTemplate = new ParamText(`
<g class="banner">
    <rect x="[[rect_x]]" y="[[rect_y]]" width="[[width]]" height="[[height]]" rx="[[rx]]" ry="[[ry]]" fill="[[fill]]" stroke="[[stroke]]" stroke-width="[[stroke-width]]"/>
    <text x="0" y="[[text_y]]" font-size="[[font-size]]" text-anchor="[[text-anchor]]">[[text]]</text>
</g>
`,
{
    "width":"200","height":"100","rx":"10",
    "font-size": 20,
    "text-anchor": "middle",
    "fill": "white",
    "stroke": "black", "stroke-width": 1,
    "rect_x":(p) => - (p['width'] / 2),
    "rect_y":(p) => - (p['height'] / 2),
    "text_y":(p) => (p['font-size'] / 4),
    "ry":(p) => p['rx']
});
buttonTemplate = new ParamText(`
<style type="text/css">
    #[[id]] text {text-anchor: middle; user-select:none;}
    .button {color: white;}
    .button:hover {animation: blinkingYellow 1s infinite;}
    .button > rect {fill: currentColor;}
</style>
<g class="button" onclick="[[onclick]]">
    <rect x="[[rect_x]]" y="[[rect_y]]" width="[[width]]" height="[[height]]" rx="[[rx]]" ry="[[ry]]" fill="[[fill]]" stroke="[[stroke]]" stroke-width="[[stroke-width]]"/>
    <text x="0" y="[[text_y]]" font-size="[[font-size]]" font-weight="[[font-weight]]" text-anchor="[[text-anchor]]">[[text]]</text>
</g>
`,
{
    "width":"100","height":"30","rx":"5",
    "font-size": 14,
    "font-weight": "bold",
    "text-anchor": "middle",
    "onclick": "",
    "fill": "white",
    "stroke": "black", "stroke-width": 2,
    "rect_x":(p) => - (p['width'] / 2),
    "rect_y":(p) => - (p['height'] / 2),
    "text_y":(p) => (p['font-size'] / 4),
    "ry":(p) => p['rx']
});

var svg_gen = Object();
svg_gen.samplePattern = function(id, newId) {
    if (id == 1) {
        return `
        <pattern id="[[newId]]" width="10" height="10" viewBox="0 0 100 100" patternUnits="userSpaceOnUse" patternTransform="rotate(45 0,0)">
            <rect x="50" y="0" width="50" height="100" fill="green" fill-opacity="0.25"/>
            <rect x="0" y="50" width="100" height="50" fill="green" fill-opacity="0.5"/>
        </pattern>`
        .replace('[[newId]]',newId);
    }
};
svg_gen.checkPattern = function(newId, color, rotate=0, scale=1, hOpacity=0.25, vOpacity=0.5) {
    return `
    <pattern id="[[newId]]" width="10" height="10" color="[[color]]" viewBox="0 0 100 100" patternUnits="userSpaceOnUse" patternTransform="rotate([[rotate]] 0,0) scale([[scale]])">
        <rect x="50" y="0" width="50" height="100" fill="currentColor" fill-opacity="[[hOpacity]]"/>
        <rect x="0" y="50" width="100" height="50" fill="currentColor" fill-opacity="[[vOpacity]]"/>
    </pattern>`
    .replace('[[newId]]',newId)
    .replace('[[color]]',color)
    .replace('[[rotate]]',rotate)
    .replace('[[scale]]',scale)
    .replace('[[hOpacity]]',hOpacity)
    .replace('[[vOpacity]]',vOpacity);
};

class svg_x extends ParamText {
    constructor(id, format = {}, style = {}, action = []) {
        super('',{});
        this.id = id; // id to be used in svg element to be attached
        this.setFormat(format); // object to define various content formulation
        this.style = JSON.stringify(style).replace(/"/g,''); // object to define per-instance style
        this.setAction(action); // array to define various content formulation
        
        this.header = '';
        this.text = '';
    }
    // Create new instance, using new ID, removing the container
    copyAs(newId) {
        let copy = Object.assign(Object.create(Object.getPrototypeOf(this)),this);
        copy.container = null;
        copy.id = newId;
        return copy;
    }
    // Move svg to be child of an element
    attachTo(container) {
        var e;
        if (this.container == null) {
            e = document.createElement('svg');
            e.id = this.id;
        } else {
            e = this.element;
        }
        
        container.appendChild(e);
        this.container = container;
        return this.updateHTML();
    }
    // Dynamic format update (and the interpretation)
    setFormat(format) {
        this.format = format; // object to define various content formulation
        this.viewBoxUsingPreset =
        {
            "+":"0 0 100 100",
            "0":"-50 -50 100 100",
            "-":"-100 -100 100 100",
            "+-":"0 -100 100 100",
            "-+":"-100 0 100 100",
        }[(format.viewBoxPreset == null)?"+":format.viewBoxPreset];
        this.viewBox = format.viewBox || this.viewBoxUsingPreset;
        this.class = format.class || "";
        this.width = format.width || 200;
        this.height = format.height || 200;
        // for use as external SVG, declare namespace as: xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
        this.layout = new ParamText(format.layout || `
        <svg id="[[id]]" viewBox="[[viewBox]]" class="[[class]]" width="[[width]]" height="[[height]]">
            <style type="text/css">#[[id]] [[style]]</style>
            [[header]]
            [[content]]
        </svg>`, format.defaults);
        return this.updateHTML();
    }
    // Dynamic action update (and the interpretation)
    setAction(action) {
        this.action = action;
        this.contentAction = [];
        this.actionReplacer = [];
        action.forEach(function(act){
            if (act.method == "regular") {
                act.anchors.forEach(function(anc){
                    var rep = {
                        "find": anc[0],
                        "template": ParamText.parse(anc[1]),
                        "replaceAs": ParamText.parse(anc[1]),
                        "working": ""
                    };
                    act.layers.reverse().forEach(function(lay){
                        lay.values.forEach(function(val){
                            var working = rep.replaceAs.copy();
                            for (var i = 0; i < lay.fields.length; i++) {
                                working.setParam(lay.fields[i], val[i]);
                            };
                            rep.working = rep.working + working.v;
                        },this);
                        rep.replaceAs = new ParamText(rep.working);
                        rep.working = "";
                    },this);
                    this.actionReplacer.push(rep);
                },this);
            } else {
                this.contentAction.push(act)
            }
        },this);
        return this.updateHTML();
    }
    // Dynamic content updates
    setText(text) {this.text = text;return this.updateHTML();}
    setContent(content) {
        if (content instanceof ParamText) {
            var newCopy = content.copy();
            this.template = newCopy.template;
            this.defaults = newCopy.defaults;
            this.defaultOrder = newCopy.defaultOrder;
            this.params = newCopy.params;
        } else {
            this.template = content
        }
        return this.updateHTML();
    }
    // Shortcut returns
    get element() {return document.getElementById(this.id);}
    // Refresh HTML after update
    updateHTML() {
        if (this.container == null) {
            // do nothing (no HTML applied to document yet)
        } else {
            let finalContent = this.v.replace('[[text]]',this.text);
            this.actionReplacer.forEach(function(rep){
                finalContent = finalContent.split(rep.find).join(rep.replaceAs);
            });
            this.element.outerHTML
            = this.layout
                  .v
                  .replace('[[style]]',this.style)
                  .replace('[[class]]',this.class)
                  .replace('[[viewBox]]',this.viewBox)
                  .replace('[[width]]',this.width)
                  .replace('[[height]]',this.height)
                  .replace('[[header]]',this.header)
                  .replace('[[content]]',finalContent)
                  .replace(/\[\[id]]/g,this.id)
                  ;
        }
        return this;
    }
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        svg_x: svg_x,
        svg_gen: svg_gen
    }
}
