
const triggerFactory = require('../common/promise').triggerFactory;
class subroute {
    // TODO: support trace logging when starting any child middleware
    constructor(name) {
        this.name = name;
        this.middlewares = [];
        this.middlewareLookup = {}; // name > [#, mw]
        this.errorHandlers = [];
    }
    use(mw, name) {
        if (mw instanceof Function && mw.length > 3) {
            this.errorHandlers.push(mw);
        } else {
            if (name) this.middlewareLookup[name] = [this.middlewares.length, mw];
            this.middlewares.push(mw);
        }
        return this;
    }
    async jumpTo(nameArray) {
        // TODO_DESIGN: jump to a particular middleware path
    }
    async beginRoute(req, res, next) {
        var mwIndex = 0;
        try {
            while (mwIndex < this.middlewares.length) {
                var nextCalled = triggerFactory();
                var localNext = function next(err) {
                    if (err) nextCalled.cancel(err);
                    else nextCalled.fire();
                }
                nextCalled.promise.then(
                    () => {},
                    (err) => this.beginErrorRoute(err, req, res, next)
                );
                var mw = this.middlewares[mwIndex];
                if (mw instanceof subroute) {
                    mw.beginRoute(req, res, localNext);
                } else {
                    mw(req, res, localNext);
                };
                await nextCalled.promise;
                if (!nextCalled.fired) return;
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
                var mv = this.middlewares[mwIndex];
                ((mv instanceof subroute)?mv.handler:mv)(err, req, res, localNext);
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
    module.exports = {
        subroute: subroute
    }
}
