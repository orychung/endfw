"use strict";

const {Returner} = require('../server/server.js');

let ingestRequest = {
  parsedUrl_p: (server)=>(async function ingestRequest(req, res, next) {
    res.returner = new Returner(res, server);
    req.parsedUrl = require('url').parse(req.url, true);
    if (req.parsedUrl.pathname.indexOf('../') != -1) return; // ignore ever any request attempting a folder traversal
    
    req.parsedUrl.contextDepth = 0;
    req.parsedUrl.rawSeg = req.parsedUrl.pathname.slice(1).split('/');
    req.parsedUrl.seg = function(start, length=1) {
      return this.rawSeg.slice(this.contextDepth + start, this.contextDepth + start + length).join('/');
    }
    req.parsedUrl.remainingPath = function(skip=0) {
      return '/' + this.rawSeg.slice(this.contextDepth + skip).join('/');
    }
    req.p = req.method=='GET'?req.query:req.body; // Limitation is ignoring POST querystring.
    
    next();
  })
}

let logRequest = {
  ip_method_url: async function logRequest(req, res, next) {
    req.clientIp = req.connection.remoteAddress;
    req.now_ms = Date.now();
    req.now_s = Math.floor(req.now_ms/1000);
    res.returner.server.log(req.clientIp+' '+req.method+' '+req.url);
    next();
  }
}

let authFree = {
  cache_path_inventory: (options)=>(async function authFree(req, res, next) {
    var ret = res.returner;
    var url = req.parsedUrl;
    if (url.seg(0) in options.versionedResourceMap) {
      var match = options.versionedResourceMap[url.seg(0)];
      if (options.versionPattern.test(url.seg(1))) {
        ret.setCache(86400*match[0]);
        return ret.file([match[2], match[1] + url.remainingPath(2)]);
      }
      return ret.file([match[2], match[1] + url.remainingPath(1)]);
    } else if (url.seg(0) in options.resourceMap) {
      var match = options.resourceMap[url.seg(0)];
      if (match[0] != 0) ret.setCache(86400*match[0]);
      return ret.file([match[2], match[1] + url.remainingPath(1)]);
    } else {
      next();
    }
  })
}

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    ingestRequest,
    logRequest,
    authFree,
  }
}
