const secureRandom = require('secure-random');

var exports = {};
exports.ready = import('node-fetch').then(nf=>{
  exports.fetch = nf.default;
  return true;
});

exports.randBuffer = function randBuffer(byteLength) {
    return secureRandom(byteLength, {type: 'Buffer'});
}
exports.randBase64 = function randBase64(length) {
    return exports.randBuffer(Math.ceil(length/4*3)).toString('base64').slice(0,length);
}
exports.randHex = function randHex(length) {
    return exports.randBuffer(Math.ceil(length/2)).toString('hex').slice(0,length);
}
exports.pipeToBuffer = function pipeToBuffer(pipe) {
    var chunks = [];
    return new Promise(resolve=>{
        pipe.on('data', chunk=>chunks.push(chunk));
        pipe.on('end', ()=>resolve(Buffer.concat(chunks)));
    });
}
exports.pipeToString = function pipeToString(pipe, encoding='utf8') {
    return exports.pipeToBuffer(pipe).then(buf=>buf.toString(encoding));
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = exports;
}
