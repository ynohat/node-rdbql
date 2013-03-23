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

// makes sub a subclass of sup without calling sup's constructor
function inherit(sub, sup) {
    function F() {}
    F.prototype = clone(sup.prototype);
    var proto = new F();
    proto.constructor = sub;
    sub.prototype = proto;
    sub.uber = function () {
        sup.apply(this, arguments);
    };
    for (var k in sup.prototype) {
        if (sup.prototype[k] instanceof Function
            && k !== "constructor") {
            sub.uber[k] = sup.prototype[k];
        }
    }
}

function Class() {}

Class.extend = function (options) {
    var statics = null,
        mixins = null,
        mixinIdx = null,
        surrogate = null,
        constructor = null,
        proto = null,
        uber = null;

    options = clone(options);
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
        if (this instanceof surrogate) {
            if (arguments.length === 2 && arguments[0] === unique) {
                this.__ctorArgs__ = arguments;
                constructor.apply(this, arguments[1]);
            } else {
                constructor.apply(this, arguments);
            }
        } else {
            return new surrogate(unique, arguments);
        }
    };

    inherit(surrogate, this);
    update(surrogate.prototype, options);
    for (mixinIdx = 0; mixinIdx < mixins.length; mixins++) {
        update(surrogate.prototype, mixins[mixinIdx]);
    }
    update(surrogate, statics, {
        extend: Class.extend
    });

    return surrogate;
};

module.exports = function (options) {
    return Class.extend(options);
};

var assert = require('assert');

var A = Class.extend({
    statics: {
        FOO: 'BAR'
    },
    a: null,
    afooed: false,
    abared: false,
    obj: {
        hello: 'world'
    },
    constructor: function (a) {
        this.a = a;
    },
    foo: function () {
        this.afooed = true;
    },
    bar: function () {
        this.abared = true;
    }
});

assert(A.FOO === 'BAR');

var B = A.extend({
    b: null,
    bfooed: false,
    constructor: function (a, b) {
        B.uber.call(this, a);
        this.b = b;
    }
});

assert(B.FOO === undefined);

var C = B.extend({
    c: null,
    cfooed: false,
    constructor: function (a, b, c) {
        C.uber.call(this, a, b);
        this.c = c;
    },

    foo: function () {
        this.cfooed = true;
    	C.uber.foo.call(this);
    }
});

var c = new C('a', 'b', 'c');
assert(c instanceof Class);
assert(c instanceof A);
assert(c instanceof B);
assert(c instanceof C);
assert(c.a === 'a');
assert(c.b === 'b');
assert(c.c === 'c');
assert(c.FOO === undefined);
assert(C.FOO === undefined);

c.obj.goodbye = "and good luck";
assert(A.prototype.obj.goodbye === undefined);

c.foo();
assert(c.cfooed);
assert(c.bfooed === false);
assert(c.afooed);
c.bar();
assert(c.abared);
