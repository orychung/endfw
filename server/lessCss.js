
const less = require('less');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
function hashSha256(content, format) {
    var hash = crypto.createHash('sha256');
    return hash.update(content).digest(format)
};
async function makeCacheReady(lessPath) {
    if (!(lessPath in compiledCache)) {
        var lessBody = fs.readFileSync(lessPath).toString();
        compiledCache[lessPath] = (await less.render(lessBody, {
            filename: path.resolve(lessPath),
            modifyVars: lessCss.modifyVars
        })).css;
        compiledCacheETag[lessPath] = '"'+hashSha256(compiledCache[lessPath], 'base64')+'"';
    }
}
async function makeResponse(returner, path, errorCallback) {
    try {
        var lessPath = returner.server.checkResource(convertFilePath(path), errorCallback);
        if (!lessPath) return;
        await makeCacheReady(lessPath);
        if (lessCss.useETag) {
            var tag = returner.req.headers['if-none-match'];
            if (tag && tag == compiledCacheETag[lessPath]) return returner.success(null,304);
            returner.setHead({ETag: compiledCacheETag[lessPath]});
        }
        return returner.success(compiledCache[lessPath],200,'text/css');
    } catch (e) {console.error(e);}
}

// for use as Returner method
Returner.prototype.less = function (filePath) {
    return makeResponse(this, filePath, e=>this.file(filePath));
};

compiledCache = {};
compiledCacheETag = {};

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
            return makeResponse(res.returner, cssPath, e=>next());
            // var lessPath = server.checkResource(convertFilePath(cssPath), e=>next());
            // if (!lessPath) return;
            // await makeCacheReady(lessPath);
            // return res.returner.success(compiledCache[lessPath],200,'text/css');
        } catch (e) {console.error(e);}
    };
}

lessCss.modifyVars = {};
lessCss.contextPath = '/css';
lessCss.useETag = false;
lessCss.clearCache = function() {
    compiledCache = {};
    compiledCacheETag = {};
};

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = lessCss;
}
