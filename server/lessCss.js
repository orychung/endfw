
const less = require('less');
const fs = require('fs');
const path = require('path');
const {Returner} = require('./server');

function cssToLess(cssPath) {
    if (cssPath.slice(-4).toLowerCase() == '.css') {
        return cssPath.slice(0,-4) + '.less';
    } else {
        return cssPath;
    }
}
function convertFilePath(filePath) {
    var inventoryName = 'default';
    if (filePath instanceof Array) {
        inventoryName = filePath[0];
        filePath = filePath[1];
    }
    return [inventoryName, cssToLess(filePath)];
}
async function makeCacheReady(lessPath) {
    if (!(lessPath in compiledCache)) {
        var lessBody = fs.readFileSync(lessPath).toString();
        compiledCache[lessPath] = (await less.render(lessBody, {
            filename: path.resolve(lessPath),
            modifyVars: lessCss.modifyVars
        })).css;
    }
}

// for use as Returner method
Returner.prototype.less = async function (filePath) {
    try {
        var lessPath = this.server.checkResource(convertFilePath(filePath), e=>this.file(filePath));
        if (!lessPath) return;
        await makeCacheReady(lessPath);
        return this.success(compiledCache[lessPath],200,'text/css');
    } catch (e) {console.error(e);}
};

compiledCache = {};

// for use as Router factory
function lessCss(server, pathFromReq) {
    return async function (req, res, next) {
        try {
            var cssPath = pathFromReq(req);
            if (!cssPath.startsWith(lessCss.contextPath)) {
                throw Error('unexpected context path.', {
                    "path": cssPath,
                    "expected context": lessCss.contextPath
                });
            }
            var lessPath = server.checkResource(convertFilePath(cssPath), e=>next());
            if (!lessPath) return;
            await makeCacheReady(lessPath);
            return res.returner.success(compiledCache[lessPath],200,'text/css');
        } catch (e) {console.error(e);}
    };
}

lessCss.modifyVars = {};
lessCss.contextPath = '/css';
lessCss.clearCache = function() {
    compiledCache = {};
};

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = lessCss;
}
