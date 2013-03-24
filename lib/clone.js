
var clone = module.exports = (function () {

    // store a reference to the global object (node or window), that
    // should never be cloned
    var global = Function("return this;")(),
        cache = {};

    function Cloner() {
        this.uid = 0;
    };

    Cloner.handlers = [];

    Cloner.prototype.hasCached = function (o) {
        return cache[o.__clone_uid] !== undefined;
    };

    Cloner.prototype.getCached = function (o) {
        return cache[o.__clone_uid][1];
    };

    Cloner.prototype.setCached = function (o, clone) {
        o.__clone_uid = String(++this.uid);
        cache[o.__clone_uid] = [o, clone];
    };

    Cloner.prototype.destroy = function () {
        var uid;
        for (uid in cache) {
            if (cache.hasOwnProperty(uid)) {
                delete cache[uid][0].__clone_uid;
                delete cache[uid][1].__clone_uid;
                delete cache[uid];
            }
        }
    };

    Cloner.prototype.cloneObject = function (o) {
        var copy, k;
        if (this.hasCached(o)) {
            copy = this.getCached(o);
        } else {
            if (o.clone instanceof Function
                && o.clone.length === 0) {
                return o.clone();
            } else {
                if (o.constructor instanceof Function
                    && o.constructor.length === 0) {
                    copy = new o.constructor();
                } else {
                    copy = {};
                }
                this.setCached(o, copy);
                for (k in o) {
                    if (this.hasOwnProperty.call(o, k)) {
                        copy[k] = this.clone(o[k]);
                    }
                }
            }
        }
        return copy;
    };

    Cloner.prototype.clone = function (o) {
        var i, handler, copy;
        if (o === undefined
            || o === null
            || o === false
            || o === true
            || Number(o) === o
            || String(o) === o
            || o instanceof Function
            || o === global) {
            copy = o;
        } else if (o instanceof Date) {
            copy = new Date(o.getTime());
        } else if (o instanceof RegExp) {
            copy = eval(o.toString());
        } else if (o instanceof Object) {
            // check if a handler was provided
            for (i = 0; i < Cloner.handlers.length; i++) {
                handler = Cloner.handlers[i];
                if (o instanceof handler[0]) {
                    copy = handler[1](o);
                }
            }
            // if no handlers were defined and it is an object
            if (o instanceof Object) {
                // try to clone it generically
                copy = this.cloneObject(o);
            } else {
                // if all else fails, just return it
                copy = o;
            }
        }
        return copy;
    };

    function clone(o) {
        var cloner, clone;
        cloner = new Cloner();
        clone = cloner.clone(o);
        cloner.destroy();
        return clone;
    }

    clone.registerHandler = function (type, handler) {
        Cloner.handlers.unshift([type, handler]);
    };

    return clone;
})();
