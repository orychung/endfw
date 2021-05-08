// must include jquery.js
// must include quick_tool.js
// must include quick_svg.js
// must include event.js
// must include dom.js

/* Usage to support: 

=== Custom Input Types ===
- define UI items that are input types

*/

var comboTemplate = {};

comboTemplate.range_slider = new param_text(`
<input type="range" min="0" max="1" value="1" class="range_slider outer"></input>
<input type="range" min="0" max="1" value="1" class="range_slider inner"></input>
<input type="range" min="0" max="13" value="13" class="range_slider max"></input>
<input type="range" min="0" max="7" value="0" class="range_slider min"></input>
<input type="text" class="width_2_char min" value="0"></input>
<input type="text" class="width_2_char max" value="13"></input>
`);

var comboClass = {};
comboClass.range_slider = class extends dom {
    /* the HTML input type range is wrongly taking its name
       because it is for inputting a value, but not a range */
    constructor(element, handlers={}) {
        super(element, comboTemplate.range_slider, handlers);
        var obj = $(this.element);
        obj.find('input[type=range]').on('input', e => this.input(e));
        obj.find('input[type=text]').on('input', e => this.input(e));
        this.maxRange = obj.find('input.max[type="range"]');
        this.minRange = obj.find('input.min[type="range"]');
        this.maxText = obj.find('input.max[type="text"]');
        this.minText = obj.find('input.min[type="text"]');
        this.innerBar = obj.find('input.inner');
        this.outerBar = obj.find('input.outer');
        this.refresh();
        this.refresh(); //by only 1 round the .css() of jQuery 3.4.1 updates things to 0px.
    }
    input(e) {
        var type = $(e.target).attr('type');
        this.refreshValue(type);
        return true; //means to propagate
    }
    refresh() {
        var obj = $(this.element);
        this.rangeMin = parseInt(obj.attr('range-min'));
        this.rangeMax = parseInt(obj.attr('range-max'));
        this.barWidth = obj.width() - 60;
        this.unitWidth = (this.barWidth - 20) / (this.rangeMax - this.rangeMin);
        this.outerBar.css('width', this.barWidth+'px');
        this.minRange[0].min = this.rangeMin;
        this.maxRange[0].min = this.rangeMin;
        this.maxRange[0].max = this.rangeMax;
        this.minRange[0].value = obj.attr('value-min');
        this.maxRange[0].value = obj.attr('value-max');
        this.minText[0].value = obj.attr('value-min');
        this.maxText[0].value = obj.attr('value-max');
        //WIP: refresh of inner setting
        
        this.refreshValue(); //reuse method to refresh attributes varying on value change
    }
    refreshValue(type='range') {
        var obj = $(this.element);
        var min = parseInt(obj.find('input.min[type="'+type+'"]')[0].value);
        var max = parseInt(obj.find('input.max[type="'+type+'"]')[0].value);
        if (max > this.rangeMax) max = this.rangeMax;
        if (min > max) min = max;
        obj.attr('value-min', min);
        obj.attr('value-max', max);
        
        this.innerBar.css('left', ((min-this.rangeMin)*this.unitWidth+50)+'px');
        this.innerBar.css('width', ((max-min)*this.unitWidth+20)+'px');
        var maxMin = quotient(1+max-min,2)+min;
        this.minRange.css('width', ((maxMin-this.rangeMin)*this.unitWidth+10)+'px');
        this.minRange[0].max = maxMin;
        this.maxRange.css('left', ((min-this.rangeMin)*this.unitWidth+60)+'px');
        this.maxRange.css('width', ((this.rangeMax-min)*this.unitWidth+10)+'px');
        this.maxRange[0].min = min;
        
        this.minRange[0].value = min;
        this.minText[0].value = min;
        this.maxRange[0].value = max;
        this.maxText[0].value = max;
    }
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        comboClass: comboClass
    }
}
