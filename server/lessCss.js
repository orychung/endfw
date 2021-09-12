
const less = require('less');
const fs = require('fs');

compiledCache = {};
async function lessCss(req, res, next) {try{
    if (!lessCss.server) throw Error('lessCss.server must be specified!');
    var remainingPath = req.parsedUrl.remainingPath();
    if (!remainingPath.startsWith(lessCss.contextPath)) {
        throw Error('unexpected context path.', {
            "path": remainingPath,
            "expected context": lessCss.contextPath
        });
    }
    if (remainingPath.slice(-4).toLowerCase() != '.css') return next();
    var cssFile = remainingPath.replace(lessCss.contextPath,'').slice(0,-4);
    if (!(cssFile in compiledCache)) {
        var lessPath = lessCss.server.checkResource(`${lessCss.lessFolder}/${cssFile}.less`);
        if (lessPath) {
            var lessBody = fs.readFileSync(lessPath).toString();
            compiledCache[cssFile] = (await less.render(lessBody, {modifyVars: lessCss.modifyVars})).css;
        } else {
            return next();
        }
    }
    return res.returner.success(compiledCache[cssFile],200,'text/css');
} catch (e) {console.error(e);}}
lessCss.modifyVars = {};
lessCss.lessFolder = '/css';
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
