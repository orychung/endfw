
const UrlPattern = require('url-pattern');
const triggerFactory = require('../common/promise').triggerFactory;

class Subroute {
    // TODO: support trace logging when starting any child middleware
    constructor(name) {
        this.name = name;
        this.middlewares = [];      // element =  {mw, name, url, method}
        this.middlewareLookup = {}; // name -> [#, mw]
        this.errorHandlers = [];    // element = mw
    }
    register(mw, name, url, method) {
        if (mw instanceof Function && mw.length > 3) {
            this.errorHandlers.push(mw);
        } else {
            if (name) this.middlewareLookup[name] = [this.middlewares.length, mw];
            this.middlewares.push({
                mw: mw,
                name: name,
                url: url,
                method: method
            });
        }
        return this;
    }
    use(mw, name)           {this.register(mw, name, null, null)}
    all(url, mw, name)      {this.register(mw, name, url, null)}
    get(url, mw, name)      {this.register(mw, name, url, 'GET')}
    post(url, mw, name)     {this.register(mw, name, url, 'POST')}
    put(url, mw, name)      {this.register(mw, name, url, 'PUT')}
    delete(url, mw, name)   {this.register(mw, name, url, 'DELETE')}
    async jumpTo(nameArray) {
        // TODO_DESIGN: jump to a particular middleware path
    }
    async beginRoute(req, res, next) {
        try {
            var mwIndex = 0;
            while (mwIndex < this.middlewares.length) {
                var mwDef = this.middlewares[mwIndex];
                var skip = false;
                if (mwDef.method && (mwDef.method != req.method)) skip = true;
                if (mwDef.url) {
                    var pattern = new UrlPattern(mwDef.url);
                    var params = pattern.match(req.url);
                    if (params == null) {
                        skip = true;
                    } else {
                        if (!req.params) {
                            req.params = params;
                        } else {
                            Object.assign(req.params, params);
                        }
                    }
                }
                if (!skip) {
                    var nextCalled = triggerFactory();
                    var localNext = function next(err) {
                        if (err) nextCalled.cancel(err);
                        else nextCalled.fire();
                    }
                    nextCalled.promise.then(
                        () => {},
                        (err) => this.beginErrorRoute(err, req, res, next)
                    );
                    if (mwDef.mw instanceof Subroute) {
                        mwDef.mw.beginRoute(req, res, localNext);
                    } else {
                        mwDef.mw(req, res, localNext);
                    };
                    await nextCalled.promise;
                    if (!nextCalled.fired) return;
                }
                mwIndex = mwIndex + 1;
            }
            next();
        } catch (err) {next(err);}
    }
    async beginErrorRoute(err, req, res, next) {
        var ehIndex = 0;
        try {
            // local error handler then next(err)
            while (ehIndex < this.errorHandlers.length) {
                var nextCalled = triggerFactory();
                var localNext = function next(e) {
                    err = e;
                    nextCalled.cancel(e);
                }
                var mv = this.middlewares[mwIndex].mw;
                ((mv instanceof Subroute)?mv.handler:mv)(err, req, res, localNext);
                await nextCalled.promise;
                mwIndex = mwIndex + 1;
            }
            next(err);
        } catch (err) {next(err);}
    }
    get handler() {
        return (...params) => {return this.beginRoute(...params);}
    }
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = Subroute
}
