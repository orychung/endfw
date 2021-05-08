// must include jquery.js

parent_event = function(selector, action) {
    return (e) => {
        var parent = $(e.target).parents(selector)[0];
        if (parent != undefined) {
            action(parent);
        } else {
            console.warn('Cannot find parent: (' + selector + ') for target');
        };
    };
};

function hideMe(x) {$(x).hide();}
