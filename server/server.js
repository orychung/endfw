
const fs = require('fs');
const path = require('path');

const {g, now, pass} = require('../../js/quick_tool');

class server {
    constructor(project, domain, port) {
        this.project = project;
        this.domain = domain;
        this.port = port;
        
        this.log = pass;
        this.peerDisposal = pass;
        
        this.initApp();
    }
    initApp() {
        var express = require('express');
        var cookieParser = require('cookie-parser');
        var contentSecurityPolicy = require('helmet-csp');
        this.app = express();
        this.app.use(express.json()); // for parsing application/json
        this.app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
        this.app.use(cookieParser('<abc>this is the secret</abc>'));
        this.app.use(contentSecurityPolicy({
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com/", "https://code.jquery.com/"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:"],
                frameSrc: ["'self'", "https://www.bridgebase.com/"]
            },
            loose: false
        }));
    }
    startHTTPS() {
        const options = {
            key: fs.readFileSync('../ssl/key.pem'),
            cert: fs.readFileSync('../ssl/cert.pem'),
            passphrase: 'changeit'
        };
        var https = require('https');
        this.httpsServer = https.createServer(options, this.app);
        this.httpsServer.listen(this.port, this.domain, () => this.log('Server running at '+this.url));
    }
    initWS() {
        var WebSocketServer = require('websocket').server;
        this.ws = new WebSocketServer({
            httpServer: this.httpsServer,
            autoAcceptConnections: false
        });
    }
    disposePeer(peer) {this.peerDisposal(peer);}
    checkResource(filePath, callback=pass) {
        return [
            './proj/'+this.project+filePath,
            '.'+filePath
        ].reduce((p, x) => (p || (fs.existsSync(x)?x:null)), null) || callback();
    }
    get url() {return 'https://'+this.domain+':'+this.port;}
}

const cbNotFound = function(ret, filePath) {
    return function() {
        ret.server.log("not found: "+filePath);
        ret.error(404);
        return null;
    }
};
class returner {
    constructor(res, server) {
        this.res = res;
        this.server = server;
    }
    static messages = {
        paramNotEnough : {code: 400, msg: 'insufficient parameters'},
        noLogin        : {code: 401, msg: 'not logged in'},
        methodNotFound : {code: 404, msg: 'method not found'},
        dataNotReady   : {code: 500, msg: 'fail to get data'}
    }
    download(filePath) {
        // this.server.log('[200] return download: '+filePath);
        var resourcePath = this.server.checkResource(filePath, cbNotFound(this, filePath));
        if (resourcePath) {
            this.res.writeHead(200, {
                "Content-Type": "application/octet-stream",
                "Content-Disposition" : "attachment; filename=" + path.basename(resourcePath)
            });
            fs.createReadStream(resourcePath).pipe(this.res);
        }
    }
    file(filePath, mimeType='text/html', standalone=false) {
        // this.server.log('[200] return file: '+filePath);
        var resourcePath = this.server.checkResource(filePath, cbNotFound(this, filePath));
        if (resourcePath) {
            if (mimeType == 'image/png') {
                this.res.writeHead(200, {'Content-Type': mimeType});
                fs.createReadStream(resourcePath).pipe(this.res);
                return;
            }
            try {
                var html = fs.readFileSync(resourcePath).toString();
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
            this.res.writeHead(200, {'Content-Type': mimeType});
            this.res.end(html);
        }
    }
    html(data='') {
        this.res.writeHead(200, {'Content-Type': 'text/html'});
        this.res.end(data);
    }
    error(code=400, message, data=null, mimeType='text/html') {
        this.server.log('['+code+'] '+message);
        this.res.writeHead(code, {'Content-Type': 'text/html'});
        this.res.end(data);
    }
    get jsonMsg() {
        return new Proxy(this, {get: function(x, name) {
            return () => x.jsonError(
                returner.messages[name].code,
                returner.messages[name].msg
            );
        }});
    }
    jsonError(code, message, data=Object(), mimeType='application/json') {
        data.errorMessage = message;
        this.error(code, message, JSON.stringify(data), mimeType);
    }
    json(data=Object(), code=200, mimeType='application/json') {
        this.res.writeHead(code, {'Content-Type': mimeType});
        this.res.end(JSON.stringify(data));
    }
}

class session {
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

class peer {
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

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        server: server,
        returner: returner,
        session: session,
        peer: peer
    }
}
