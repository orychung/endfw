// must include jquery.js
// must include text.js
// must include quick_svg.js
// must include event.js

/* Usage to support: 

=== Right-click Menu Feature ===
- define an object as a list of menu
- define menu items
- define conditions (as function) to display each item per-relation
- define conditions (as function) to enable each menu item

=== Other Right-click Effects ===
- shortcuts to apply jQuery to alter the right click effects

*/

class menu extends param_text {
    constructor(id) {
        super('<menu id="[[id]]" tabindex="-1" onfocusout="hideMe(this);"></menu>',
        {
            id: (p) => p.id
        });
        this.id = id;
        this.params.id = id;
        this.items = [];
    }
    // Move to be child of an element
    attachTo(container) {
        var e;
        if (this.container == null) {
            e = document.createElement('menu');
            e.id = this.id;
        } else {
            e = this.element;
        }
        
        container.appendChild(e);
        this.container = container;
        this.updateHTML();
        this.items.forEach((x) => {
            delete x.container;
            x.attachTo(this.element);
        });
        return this;
    }
    show(container, x, y) {
        var showCount = 0;
        if (this.container != container) {
            this.attachTo(container);
        }
        this.items.forEach((x) => {
            if (x.isHidden()) {
                $(x.element).hide();
            } else {
                $(x.element).show();
                showCount += 1;
            }
        });                                                                                                            
        if (showCount > 0) {
            var e = this.element;
            $(e).show();
            e.style.left = x+'px';
            e.style.top = y+'px';
            e.focus();
        }
        return this;
    }
    cancel() {
        
    }
    // Shortcut returns
    get element() {return document.getElementById(this.id);}
    // Refresh HTML after update
    updateHTML() {
        if (this.container == null) {
            // do nothing (no HTML applied to document yet)
        } else {
            this.element.outerHTML = this.v;
        }
        return this;
    }
}

class menuItem extends svg_x {
    constructor(id, caption, onclick = '', isHidden = () => false) {
        super(id,{width: 200, height: 30, viewBox: "-100 -15 200 30"});
        this.caption = caption;
        this.onclick = onclick;
        this.isHidden = isHidden;
        this.setContent(buttonTemplate
                        .copy()
                        .setParam('width',200)
                        .setParam('text',caption)
                        .setParam('onclick',onclick));
    }
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        menu: menu,
        menuItem: menuItem
    }
}
