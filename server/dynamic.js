
function requireLatest(lib_path) {
    if (!lib_path.endsWith('.js')) {
        if (lib_path+'.js' in require.cache) delete require.cache[lib_path+'.js'];
    }
    if (lib_path in require.cache) delete require.cache[lib_path];
    return require(lib_path);
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        requireLatest: requireLatest
    }
}
