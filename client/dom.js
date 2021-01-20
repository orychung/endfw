// must include jquery.js
// must include global.js

/* Usage to support: 

=== Turn DOM UI as JS Objects ===
- define JS Objects to behaviour as DOM UI

*/

g.handlers = {}
function callHandler(e) {try {
    var handlerName = $(e.currentTarget).attr('@'+e.type);
    if (handlerName) g.handlers[handlerName](e);
} catch (err) {
    console.log('Error on attempt to use handler %s for object.', '@'+e.type);
    console.log(e.currentTarget);
    console.log(err);
}}

class dom {
    constructor(element, innerTemplate, handlers={}) {
        this.element = element;
        this.innerTemplate = innerTemplate;
        this.handlers = handlers;
        
        Array.from(element.attributes).map(x => this.innerTemplate.setParam(x.name, x.value));
        this.params = this.innerTemplate.params;
        this.element.innerHTML = this.innerTemplate.v;
        this.element.dom = this;
        
        if ($(this.element).attr('@input')) $(this.element).on('input', callHandler);
        if ($(this.element).attr('@click')) $(this.element).on('click', callHandler);
        
        $(this.element).find('combo').each(function() {
            new comboClass[$(this).attr('type')](this);
        });
    }
    // TODO: add method to construct element from nothing
}

class tagHTML {
    constructor(tagName, id, classList) {
        this.tagName = tagName;
        this.id = id;
        if (classList instanceof Array) {
            this.classList = classList;
        } else {
            this.classList = [classList];
        }
        this.content = '';
        this.thead = '';
    }
    add(item) {
        if (item instanceof Array) {
            this.content += item.map(x=>x.toString()).join('');
        } else {
            this.content += item.toString();
        }
        return this;
    }
    setTHead(headings) {
        this.headings = headings;
        this.thead = new tagHTML('thead').add(
            headings.map(x=>
                new tagHTML('th').add(x)
            )
        );
        return this;
    }
    setTData(data) {
        return this.add(data.map(entry=>
            new tagHTML('tr').add(this.headings.map(heading=>
                new tagHTML('td').add(entry[heading] || '')
            ))
        ));
    }
    get innerHTML() {
        if (this.tagName == 'table') {
            return this.thead.toString() + '<tbody>' + this.content + '</tbody>'
        } else {
            return this.content;
        }
    }
    get startTag() {
        return (
            '<'
            +this.tagName
            +(this.id && (' id="'+this.id+'"') || '')
            +(this.classList && (' class="'+this.classList.join(' ')+'"') || '')
            +'>'
        );
    }
    get endTag() {return '</'+this.tagName+'>';}
    get outerHTML() {return this.startTag + this.innerHTML + this.endTag;}
    toString() {return this.outerHTML;}
}

function convertDOM(selector, innerTemplate, collection, keyAttr='key') {
// convert existing DOM items to JS object
    $(selector).each(function() {
        var o = new dom(this, innerTemplate.copy());
        if (collection && (keyAttr in o.params)) collection[o.params[keyAttr]] = o;
    });
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        dom: dom,
        convertDOM: convertDOM
    }
}
