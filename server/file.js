"use strict";

let lib = {
  fs: require('fs'),
  path: require('path'),
}

class FileSegment {
  static doneCallback(res, data) {
    ret.json({data: data, result: "success"});
  }
  static errorCallback(res, e, defaultCode, defaultMessage) {
    console.error(e);
    ret.jsonError(defaultCode, defaultMessage);
  }
  constructor(options = {}) {
    this.basePath = options.basePath;
    if (!options.basePath) throw '[FileSegment] basePath must be specified';
    this.regExp = options.regExp??this.basePath + '(/.*)?'; // no regExp means all paths allowed
    this.ingestRegExp = options.ingestRegExp??this.regExp; // no regExp means all paths allowed
    this.paramExp = options.paramExp??(req=>req.p); // ingest.js loads params to req.p
    this.pathExp = options.pathExp??(req=>req.p.path);
    this.actionExp = options.actionExp??(req=>req.parsedUrl.seg(0)); // ingest.js creates req.parsedUrl
    this.blockGet = options.blockGet??true; // block GET to avoid Lax cookie being abused
    
    this.doneCallback = options.doneCallback??FileSegment.doneCallback;
    this.errorCallback = options.errorCallback??FileSegment.errorCallback;
    
    this.tokenExp = options.tokenExp; // no tokenExp means no authentication needed
    this.token = options.token;
    this.tokenValidator = options.tokenValidator??(function (token, req) {return token==this.token;});
  }
  get handler() {
    return async (req, res, next)=>{
      let unresolvedPath = this.pathExp(req)
        .replace(/[\\]/g, '/')
        .replace(/^\.([\/$])/, this.basePath+'$1');
      let path = lib.path.resolve(unresolvedPath);
      if (!this.regExp.test(path)) return next();
      if (this.blockGet) {
        if (req.method=='GET') return this.errorCallback(res, 405, "method not allowed");
      }
      if (this.tokenExp) {
        let token = this.tokenExp(req);
        if (!this.tokenValidator(token, req)) return this.errorCallback(res, 403, "not authorised");
      }
      let action = this.actionExp(req);
      let param = this.paramExp(req);
      if (!(typeof this[action] == 'function')) return this.errorCallback(res, 404, "action not found");
      return this[action](req, param);
    };
  }
  async readdir(req, res, path, param) {
    try {
      let data = await lib.fs.promises.readdir(path,{withFileTypes:true});
      // at Node.js 21, Dirent keys: [name, parentPath, path, Symbol(type)]
      let s = Reflect.ownKeys(new lib.fs.Dirent()).filter(x=>(typeof x) == 'symbol')[0];
      await Promise.all(data.map(async d=>{
        // REF: https://stackoverflow.com/questions/62837749/nodejs-14-5-filesystem-api-what-is-the-dirent-symboltype-property
        d.type = ['unknown','file','dir','link','fifo','socket','char','block'][d[s]];
        try {
          d.stat = await lib.fs.promises.stat(path+'/'+d.name);
        } catch(e) {
          if (e.code == 'EPERM') 0
          else console.error(e);
        }
      }));
      return this.doneCallback(res, data);
    }
    catch (e) { return this.errorCallback(res, 400, "unknown failure"); }
  }
  readFile(req, res, path, param) {
    try {
      res.returner.closeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition" : "attachment; filename=" + encodeURIComponent(lib.path.basename(path))
      });
      let readStream = lib.fs.createReadStream(path);
      readStream.on('error', console.error);
      readStream.pipe(res);
      return;
    }
    catch (e) { return this.errorCallback(res, 400, "unknown failure"); }
  }
  writeFile(req, res, path, param) {
    try {
      let writeStream = lib.fs.createWriteStream(path);
      writeStream.on('error', console.error);
      req.on('end', ()=>{
        this.doneCallback(res, undefined);
        writeStream.end();
      });
      req.pipe(writeStream);
      return;
    }
    catch (e) { return this.errorCallback(res, 400, "unknown failure"); }
  }
}

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    FileSegment,
  }
}
