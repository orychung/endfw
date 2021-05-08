
const path = require('path');

function requireLatest(libFullPath) {
    if (!libFullPath.endsWith('.js')) {
        if (libFullPath+'.js' in require.cache) delete require.cache[libFullPath+'.js'];
    }
    if (libFullPath in require.cache) delete require.cache[libFullPath];
    return require(libFullPath);
}

function dynamicLibFor(projPath) {
    return function (pathInProj) {
        var libFullPath = path.resolve(projPath+pathInProj);
        return requireLatest(libFullPath);
    }
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        requireLatest: requireLatest,
        dynamicLibFor: dynamicLibFor
    }
}
