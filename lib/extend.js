var clone = require('./clone.js'),
    unique = {};

// shallow copies all properties from arguments 2+ into argument1,
// returning argument 1
function update() {
    var target = arguments[0],
        source = null;
    if (arguments.length > 0) {
        for (var i = 1; i < arguments.length; i++) {
            source = arguments[i] || {};
            for (var k in source) {
                if (source.hasOwnProperty(k)) {
                    target[k] = source[k];
                }
            }
        }
    }
    return target;
}

// creates a convenient uber property for subclasses to access their
// superclass prototype
function mkuber(proto) {
    // uber is a simple proxy to the prototype's constructor
    var uber = function () {
        proto.constructor.apply(this, arguments);
    };
    // and we copy over all methods on the super prototype to uber, so
    // A.uber.foo.call(this, ...)
    // We MUST NOT check that sup.prototype.hasOwnProperty(k), otherwise
    // if var B = A.extend(), C = B.extend(), then C.uber will not carry
    // methods from A's prototype.
    for (var k in proto) {
        if (proto[k] instanceof Function
            && k !== "constructor") {
            uber[k] = proto[k];
        }
    }
}

// makes sub a subclass of sup without calling sup's constructor
// adds the convenient uber object
function inherit(sub, sup) {
    function F() {}
    // Calling clone on the prototype guarantees that changing properties
    // of instances will not change those properties on the prototype.
    // Clone *will* call the parent constructor, which is undesirable since
    // we don't any initializing logic to take place, we're just interested
    // in having the right prototype class and properties on our subclass.
    // So we hack a bit and set noinit on the constructor, which is tested
    // in the surrogate constructor as defined in Class.extend.
    sup.prototype.constructor.__inherit_noinit = true;
    F.prototype = clone(sup.prototype);
    delete sup.prototype.constructor.__inherit_noinit;

    var proto = new F();
    proto.constructor = sub;
    sub.prototype = proto;

    // we want to be able to call the constructor via uber, so we create
    // a proxy function
    // So if var B = A.extend(), then A.uber.call(this) calls the constructor.
    sub.uber = function () {
        sup.apply(this, arguments);
    };
    // and we copy over all methods on the super prototype to uber, so
    // A.uber.foo.call(this, ...)
    // We MUST NOT check that sup.prototype.hasOwnProperty(k), otherwise
    // if var B = A.extend(), C = B.extend(), then C.uber will not carry
    // methods from A's prototype.
    for (var k in sup.prototype) {
        if (sup.prototype[k] instanceof Function
            && k !== "constructor") {
            sub.uber[k] = sup.prototype[k];
        }
    }
}

// the base class from which extend will create subclasses
// if called without a "this"
function Class() {}

Class.mixin = function () {
    var idx;
    for (idx = 0; idx < arguments.length; idx++) {
        update(this.prototype, arguments[idx]);
    }
};

// the actual extend method
Class.extend = function (options) {
    var statics = null,
        mixins = null,
        surrogate = null,
        constructor = null,
        proto = null;

    options = options || {};
    statics = options.statics || {};
    delete options.statics;
    mixins = options.mixins || [];
    delete options.mixins;
    if (options.constructor instanceof Function
        && options.constructor !== Object) {
        constructor = options.constructor;
    } else {
        constructor = function () {};
    }
    delete options.constructor;

    surrogate = function () {
        // In some contexts, we want the surrogate to simply act as a constructor,
        // not as an initializer (see the inherit method). In those cases, we test
        // the value of the static "noinit".
        if (!surrogate.__inherit_noinit) {
            if (this instanceof surrogate) {
                if (arguments.length === 2 && arguments[0] === unique) {
                    constructor.apply(this, arguments[1]);
                } else {
                    constructor.apply(this, arguments);
                }
            } else {
                return new surrogate(unique, arguments);
            }
        }
    };

    inherit(surrogate, this);
    update(surrogate.prototype, options);
    update(surrogate, statics, {
        extend: Class.extend,
        mixin: Class.mixin
    });
    surrogate.mixin.apply(surrogate, mixins);

    return surrogate;
};

module.exports = function (options) {
    return Class.extend(options);
};
