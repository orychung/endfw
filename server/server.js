
const os = require('os');
const fs = require('fs');
const path = require('path');
const WebSocketServer = require('websocket').server;
const {g, pass, sequenceGenerator} = require('../common/global');

class Server {
    constructor(project, domain, port, options = {}) {
        this.project = project;
        this.domain = domain;
        this.port = port;
        
        this.log = options.log || pass;
        this.peerDisposal = options.peerDisposal || pass;
        this.cookieSecret = options.cookieSecret || '<abc>this is the secret</abc>';
		this.cspDirectives = options.cspDirectives || JSON.parse(JSON.stringify(Server.defaultCspDirectives));
        
        this.initApp();
    }
    initApp() {
        var express = require('express');
        var cookieParser = require('cookie-parser');
        var contentSecurityPolicy = require('helmet-csp');
        this.app = express();
        var getRawBody = function(req, res, buf, encoding) {
            // TODO: add unzip logic before this
            req.rawBody = buf.toString(encoding || 'utf8');
        }
        this.app.use(express.json({ verify: getRawBody })); // for parsing application/json
        this.app.use(express.urlencoded({ limit: '50MB', verify: getRawBody, extended: true })); // for parsing application/x-www-form-urlencoded
        this.app.use(cookieParser(this.cookieSecret));
        this.app.use(contentSecurityPolicy({directives: this.cspDirectives}));
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
	resourceList(filePath) {
		return [
            './proj/'+this.project+filePath,
            '.'+filePath
        ];
	}
    checkResource(filePath, callback=pass) {
        return this.resourceList(filePath).reduce((p, x) => (p || (fs.existsSync(x)?x:null)), null) || callback();
    }
    get url() {return 'https://'+this.domain+':'+this.port;}
    get httpUrl() {return 'http://'+this.domain+':'+this.port;}
}
Server.defaultCspDirectives = {
	defaultSrc: ["'self'"],
	scriptSrc: ["'self'", "'unsafe-inline'"],
	styleSrc: ["'self'", "'unsafe-inline'"],
	imgSrc: ["'self'", "data:"],
	frameSrc: ["'self'"]
};

const cbNotFound = function(ret, filePath) {
    return function() {
        ret.server.log("not found: "+filePath);
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
        noLogin        : {code: 401, msg: 'not logged in'},
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
			return;
		}
		Object.assign(this.addHeader, extraHeader);
		this.res.writeHead(httpCode, this.addHeader);
		this.headClosed = true;
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
    download(filePath) {
        // this.server.log('[200] return download: '+filePath);
        var resourcePath = this.server.checkResource(filePath, cbNotFound(this, filePath));
        if (resourcePath) {
            this.closeHead(200, {
                "Content-Type": "application/octet-stream",
                "Content-Disposition" : "attachment; filename=" + path.basename(resourcePath)
            });
            fs.createReadStream(resourcePath).pipe(this.res);
        }
    }
    file(filePath, mimeType='auto', standalone=false) {
        // this.server.log('[200] return file: '+filePath);
		if (mimeType == 'auto') {
			var ext = filePath.split('.').slice(-1)[0].toLowerCase();
			mimeType = {
				'js': 'text/javascript',
				'html': 'text/html',
				'xml': 'text/xml',
				'yaml': 'text/x-yaml',
				'css': 'text/css',
				'png': 'image/png',
                'svg': 'image/svg+xml',
				'json': 'application/json',
			}[ext] || 'text/plain';
		}
        var resourcePath = this.server.checkResource(filePath, cbNotFound(this, filePath));
        if (resourcePath) {
            if (!mimeType.startsWith('text/')) {
                this.closeHead(200, {'Content-Type': mimeType});
                fs.createReadStream(resourcePath).pipe(this.res);
                return;
            }
            try {
                var html = fs.readFileSync(resourcePath).toString();
                for (var key in this.variableAssignment) {
                    html = html.split(this.variablePlaceholder(key)).join(this.variableAssignment[key]);
                }
                if (standalone) {
                // perform content substitution to make the page standalone
                    var re = new RegExp('  <link rel="stylesheet" type="text/css" href="[.][.]([^"]+)" />', 'g');
                    var matches = html.match(re);
                    matches.forEach(x=>{
                        var name = x.replace(re, '$1');
                        if (name.startsWith('/css/')) name = '/../js'+name;
                        var cssPath = this.server.checkResource(name, cbNotFound(this, name));
                        if (!cssPath) return;
                        var cssContent = fs.readFileSync(cssPath).toString();
                        html = html.split(x).join('  <style type="text/css">'+cssContent+'</style>');
                    });
                    
                    var re = new RegExp('  <script type="text/javascript" src="[.][.]([^"]+)"></script>', 'g');
                    var matches = html.match(re);
                    matches.forEach(x=>{
                        var name = x.replace(re, '$1');
                        if (name.startsWith('/js/')) name = '/..'+name;
                        var jsPath = this.server.checkResource(name, cbNotFound(this, name));
                        if (!jsPath) return;
                        var jsContent = fs.readFileSync(jsPath).toString();
                        html = html.split(x).join('  <script type="text/javascript">'+jsContent+'</script>');
                    });
                }
            } catch (err) {
                this.server.log("error loading file: "+resourcePath);
                this.server.log(err);
                return this.error(500);
            }
            this.closeHead(200, {'Content-Type': mimeType});
            this.res.end(html);
        }
    }
    error(code=400, message, data=null, mimeType='text/html') {
        this.server.log('['+code+'] '+message);
        this.closeHead(code, {'Content-Type': 'text/html'});
        this.res.end(data);
    }
	xmlError(code, message, data) {this.error(code, message, data, 'text/xml;charset=UTF-8');}
	success(data='', code=200, mimeType='text/html') {
        this.closeHead(code, {'Content-Type': mimeType});
		this.res.end(data);
	}
    html(data='', code=200) {this.success(data, code, 'text/html');}
	xml(data='', code=200) {this.success(data, code, 'text/xml;charset=UTF-8');}
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
/* naive local IP lookup to handle the simplest case that
 * only one interface is using the 255.255.255.0 mask */
    var ifaces = os.networkInterfaces();
    var result
    Object.keys(ifaces).forEach(function (key) {
        ifaces[key].forEach(function (ip) {
            if (ip.netmask == '255.255.255.0') result=ip.address;
        });
    });
    return result;
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        Server: Server,
        Returner: Returner,
        Session: Session,
        Peer: Peer,
        localIP: localIP
    }
}
