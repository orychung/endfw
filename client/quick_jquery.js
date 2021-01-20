// must include jquery.js

var ajax = Object();
ajax.failMethods = {
    console: (jqXHR, textStatus, errorThrown) => {
        console.log('jqXHR: ' + JSON.stringify(jqXHR));
        console.log('errorThrown: ' + errorThrown);
    },
    page: (jqXHR, textStatus, errorThrown) => {
        document.open(jqXHR);
    },
    none: (jqXHR, textStatus, errorThrown) => null
};
ajax.forHTML = function(selector, method, url, data, failMethod = "none") {
    this.anyMethod(method, url, data, failMethod)
    .done((data) => $(selector).html(JSON.stringify(data)))
    .fail((xhr) => $(selector).html(JSON.stringify(xhr)));
};
ajax.forCSV = function(selector, method, url, data, failMethod = "none") {
    this.anyMethod(method, url, data, failMethod)
    .done((data) => $(selector).html(((d)=>{
        if (d.length == 0) return '';
        var keys = Object.keys(d[0]);
        return d.map(x=>
            keys.map(xKey=>x[xKey]).join('\t')
        ).join('\n');
    })(data.data)))
    .fail((xhr) => $(selector).html(JSON.stringify(xhr)));
};
ajax.forList = function(selector, method, url, data, failMethod = "none") {
    this.anyMethod(method, url, data, failMethod)
    .done((data) => $(selector).html(JSON.listify(data, 'responseData')))
    .fail((xhr) => $(selector).html(JSON.listify(xhr, 'XHR')));
};
ajax.forCache = function(method, url, data, failMethod = "console") {
    this.anyMethod(method, url, data, failMethod)
    .done((data) => g.cache = data)
    .fail((xhr) => g.cache = xhr);
};
ajax.anyMethod = function(method, url, data, failMethod = "console") {
    return $.ajax({
        url: url,
        data: data,
        method: method,
        error: ajax.failMethods[failMethod]
    });
};
ajax.get = function(url, data, failMethod) {return ajax.anyMethod("GET", url, data, failMethod);};
ajax.post = function(url, data, failMethod) {return ajax.anyMethod("POST", url, data, failMethod);};

var frame = Object();
frame.newTab = function(url) {
    $('<a />', {
        href: url,
        target: '_blank'
    })[0].click();
};

$.prototype.showOrHide = function(show = true) {
    if (show) {this.show();} else {this.hide();}
};

$.prototype.computedProperty = function(propertyName = ['color', 'background-color']) {
    if (propertyName instanceof Array) return propertyName.reduce((p,x) => p.attr(x, this.computedProperty(x)), Object());
    return window.getComputedStyle(this[0]).getPropertyValue(propertyName);
};

try {
    svg_x.prototype.hide = function() {$(this.element).hide();}
    svg_x.prototype.show = function() {$(this.element).show();}
    svg_x.prototype.showOrHide = function() {$(this.element).showOrHide();}
} catch (e) {if (!(e instanceof ReferenceError)) console.error(e);}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        ajax: ajax,
        frame: frame
    };
}
