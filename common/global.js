var g = Object(); // global local information container

function pass() { return; };

sequenceGenerator = function* (i = 1) {while (true) yield i++;};

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        pass: pass,
        sequenceGenerator: sequenceGenerator,
        g: g
    };
}
