function loadNamespaceMath(nsContainer) {
    loadNamespaceMathMatrix(nsContainer);
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        loadNamespaceMath: loadNamespaceMath
    }
}
