"use strict";

const express = require('express');
const os = require('os');
const fs = require('fs');
const path = require('path');
const contentType = require('content-type');
const mime = require('mime');
const WebSocketServer = require('websocket').server;
const {fetch} = require('../server/serverUtil.js');
const Subroute = require('../server/subroute.js');

class Server {
  static compileCspHeader(directives) {
    var fields = Object.keys(directives).map(i=>{
      var category = {
        defaultSrc: 'default-src',
        baseUri: 'base-uri',
        blockAllMixedContent: 'block-all-mixed-content',
        connectSrc: 'connect-src',
        fontSrc: 'font-src',
        frameAncestors: 'frame-ancestors',
        frameSrc: 'frame-src',
        imgSrc: 'img-src',
        objectSrc: 'object-src',
        scriptSrc: 'script-src',
        scriptSrcAttr: 'script-src-attr',
        styleSrc: 'style-src',
        upgradeInsecureRequests: 'upgrade-insecure-requests',
      }[i];
      if (!category) throw `Directive ${i} is not supported`;
      var values = directives[i];
      if (!(values instanceof Array)) values = [values];
      return [category].concat(values).join(' ');
    })
    return fields.join(';');
  }
  cspHeaderSets = {}
  constructor(options = {}) {
    this.project = options.project || 'noProject';
    this.domain = options.domain || 'localhost';
    this.port = options.port || 443;
    this.context = options.context || '';
    
    this.log = options.log || (()=>{});
    this.peerDisposal = options.peerDisposal || (()=>{});
    this.cookieSecret = options.cookieSecret || '<abc>this is the secret</abc>';
    this.cspHeaderSets.default = Server.compileCspHeader(
      options.cspDirectives
      || JSON.serialCopy(Server.defaultCspDirectives));
    this.fileInventories = {
      default: {
        paths: ['./proj/'+this.project, '.'],
        regExp: null
      }
    };
    
    this.initApp();
  }
  initApp() {
    var cookieParser = require('cookie-parser');
    this.app = express();
    this.app.use(cookieParser(this.cookieSecret));
  }
  startHTTP(options = {}) {
    var http = require('http');
    this.httpServer = http.createServer(this.app);
    this.httpServer.listen(this.port, this.domain, () => this.log('Server running at '+this.httpUrl));
  }
  startHTTPS(options = {}) {
    const httpsOptions = {
      key: fs.readFileSync(options.keyPath || '../ssl/key.pem'),
      cert: fs.readFileSync(options.certPath || '../ssl/cert.pem'),
      passphrase: options.passphrase || 'changeit'
    };
    var https = require('https');
    this.httpsServer = https.createServer(httpsOptions, this.app);
    this.httpsServer.listen(this.port, this.domain, () => this.log('Server running at '+this.url));
    
    this.selfAgent = new https.Agent({
      rejectUnauthorized: false,
    });
  }
  initWS() {
    this.ws = new WebSocketServer({
      httpServer: this.httpServer,
      autoAcceptConnections: false
    });
  }
  initWSS() {
    this.wss = new WebSocketServer({
      httpServer: this.httpsServer,
      autoAcceptConnections: false
    });
  }
  disposePeer(peer) {this.peerDisposal(peer);}
  checkResource(filePath, callback=(()=>{})) {
    var inventoryName = 'default';
    if (filePath instanceof Array) {
      inventoryName = filePath[0];
      filePath = filePath[1];
    }
    var inventory = this.fileInventories[inventoryName];
    if (inventory.regExp) {
      if (!inventory.regExp.test(filePath)) return callback('path_rejected');
    }
    return inventory.paths.reduce((p, x) => (p || (fs.existsSync(x+filePath)?(x+filePath):null)), null) || callback('path_not_found');
  }
  get url() {return 'https://'+this.domain+':'+this.port;}
  get httpUrl() {return 'http://'+this.domain+':'+this.port;}
}
Server.defaultCspDirectives = {
	defaultSrc: ["'self'"],
	scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
	styleSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
	imgSrc: ["'self'", "data:"],
	frameSrc: ["'self'"]
};
Server.extractContentType = function(req, res, next) {
  req.contentType = req.headers['content-type'] && contentType.parse(req.headers['content-type']);
  next();
};
Server.cbNotFound = function(ret, filePath) {
  return function(e) {
    ret.server.log(e+": "+filePath);
    ret.error(404);
    return null;
  }
};

class Returner {
  constructor(res, server) {
    this.res = res;
    this.server = server;
		this.addHeader = {};
		this.headClosed = false;
    this.variableAssignment = {};
    this.variablePlaceholder = (name) => '[['+name+']]';
  }
  static messages = {
    paramNotEnough : {code: 400, msg: 'insufficient parameters'},
    noLogin    : {code: 401, msg: 'not logged in'},
    methodNotFound : {code: 404, msg: 'method not found'},
    dataNotReady   : {code: 500, msg: 'fail to get data'}
  }
  fillVariable(key, value) {
    this.variableAssignment[key] = value;
    return this;
  }
	closeHead(httpCode, extraHeader) {
		if (this.headClosed) {
			console.warn('Returner header is previously closed. Ignore this closeHead call.');
			return false;
		}
		Object.assign(this.addHeader, extraHeader);
		this.res.writeHead(httpCode, this.addHeader);
		this.headClosed = true;
    return this;
	}
  setCsp(index="default") {
    this.setHead({'Content-Security-Policy': this.server.cspHeaderSets[index]});
    return this;
  }
  setHead(header) {
		Object.assign(this.addHeader, header);
    return this;
  }
	setCache(maxAge=0, isPublic=false) {
		this.addHeader['Cache-Control'] = [
			isPublic?'public,':'private,',
			'max-age=' + maxAge
		].join('');
		return this;
	}
  download(filePath, fileName) {
    // this.server.log('[200] return download: '+filePath);
    var resourcePath = this.server.checkResource(filePath, Server.cbNotFound(this, filePath));
    if (resourcePath) {
      this.closeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment; filename=" + encodeURIComponent(fileName || path.basename(resourcePath))
      });
      fs.createReadStream(resourcePath).pipe(this.res);
    }
  }
  async file(filePath, mimeType='auto', standalone=false) {
    // this.server.log('[200] return file: '+filePath);
    var resourcePath = this.server.checkResource(filePath, Server.cbNotFound(this, filePath));
    if (resourcePath) {
      if (mimeType == 'auto') {
        var ext = resourcePath.split('.').slice(-1)[0].toLowerCase();
        mimeType = mime.getType(ext) || 'text/plain';
      }
      if (!mimeType.startsWith('text/')) {
        this.closeHead(200, {'Content-Type': mimeType});
        fs.createReadStream(resourcePath).pipe(this.res);
        return;
      }
      try {
        var html = fs.readFileSync(resourcePath).toString();
        if (standalone) {
        // perform content substitution to make the page standalone
          var re = new RegExp('<link rel="stylesheet" type="text/css" href="[.][.]([^"]+)" />', 'g');
          var matches = html.match(re);
          matches && await matches.map(async x=>{
            var name = x.replace(re, '$1').replace('/[[buildHash]]/','/');
            var cssContent = await (await fetch(this.server.url+name, {
              agent: this.server.selfAgent
            })).text();
            html = html.split(x).join('<style type="text/css">'+cssContent+'</style>');
          }).done();
          
          var re = new RegExp('<script type="text/javascript" src="[.][.]([^"]+)"( charset="utf-8")?></script>', 'g');
          var matches = html.match(re);
          matches && await matches.map(async x=>{
            var name = x.replace(re, '$1').replace('/[[buildHash]]/','/');
            var jsContent = await (await fetch(this.server.url+name, {
              agent: this.server.selfAgent
            })).text();
            html = html.split(x).join('<script type="text/javascript">'+jsContent+'</script>');
          }).done();
          
          var re = new RegExp(`await http.get[(]'[.][.]([^']+)'[)]`, 'g');
          var matches = html.match(re);
          matches && await matches.map(async x=>{
            var name = x.replace(re, '$1').replace('/[[buildHash]]/','/');
            var xmlContent = await (await fetch(this.server.url+name, {
              agent: this.server.selfAgent
            })).text();
            xmlContent = xmlContent
              .split('\\').join('\\\\')
              .split('$').join('\\$')
              .split('`').join('\\`');
            html = html.split(x).join('`'+xmlContent+'`');
          }).done();
        }
        for (var key in this.variableAssignment) {
          html = html.split(this.variablePlaceholder(key)).join(this.variableAssignment[key]);
        }
      } catch (err) {
        this.server.log("[Returner.file] error loading file: "+resourcePath);
        this.server.log(err);
        return this.error(500);
      }
      this.closeHead(200, {'Content-Type': mimeType});
      this.res.end(html);
    }
  }
  error(code=400, message, data=null, mimeType='text/html') {
    this.server.log('['+code+'] '+message);
    if (!this.closeHead(code, {'Content-Type': 'text/html'})) return;
    this.res.end(data);
  }
	xmlError(code, message, data) {this.error(code, message, data, 'text/xml');}
	success(data='', code=200, mimeType='text/html') {
    this.closeHead(code, {'Content-Type': mimeType});
		this.res.end(data);
	}
  html(data='', code=200) {this.success(data, code, 'text/html');}
	xml(data='', code=200) {this.success(data, code, 'text/xml');}
  get jsonMsg() {
    return new Proxy(this, {get: function(x, name) {
      return () => x.jsonError(
        Returner.messages[name].code,
        Returner.messages[name].msg
      );
    }});
  }
  jsonError(code, message, data=Object(), mimeType='application/json') {
    data.errorMessage = message;
    this.error(code, message, JSON.stringify(data), mimeType);
  }
  json(data=Object(), code=200, mimeType='application/json') {
    this.closeHead(code, {'Content-Type': mimeType});
    this.res.end(JSON.stringify(data));
  }
}

class Session {
  constructor(id, server, ip) {
    this.id = id;
    this.server = server;
    this.ip = ip; // TODO: support ip change detection
    this.peers = {};
    this.cache = {};
    this.reqHistory = [];
  }
  toJSON() {
    return {
      id: this.id,
      ip: this.ip,
      peers: Object.keys(this.peers)
    }
  }
}

class Peer {
  constructor(id, connection, server, session) {
    this.id = id;
    this.connection = connection;
    this.server = server;
    this.session = session;
  }
  // TODO: support peer self-decided name and color
  get name() {
    if (this.session.user != null) return this.session.user.name;
    if (this.selectedName != null) return this.selectedName;
    return `Peer#${this.id}`;
  }
}

function localIP() {
  var ifaces = os.networkInterfaces();
  return (
    Object.keys(ifaces)
    .flatMap(k=>ifaces[k])
    .filter(x=>x.family == 'IPv4' && x.address != '127.0.0.1')
    [0].address
  );
}

let getRawBody = function(req, res, buf, encoding) {
  // TODO: add unzip logic before this
  req.rawBody = buf.toString(encoding || 'utf8');
}
let basicParseRoute = new Subroute();
// parsing application/x-www-form-urlencoded:
basicParseRoute.use(express.urlencoded({ limit: '50MB', verify: getRawBody, extended: true }));
// parsing application/json
basicParseRoute.use(express.json({ verify: getRawBody }));
basicParseRoute.use(Server.extractContentType);

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    Server,
    Returner,
    Session,
    Peer,
    localIP,
    basicParseRoute,
  }
}
