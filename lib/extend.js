
function inherits(sub, sup) {
    function F() {}
    F.prototype = sup.prototype;
    var proto = new F();
    proto.constructor = sub;
    sub.prototype = proto;
    sub.super_ = sup;
}

function merge() {
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

function extend() {
    var proto = {},
        statics = {},
        global = null,
        ctor = null,
        factory = null,
        super_ = null;

    if (arguments.length === 1) {
	    // syntax 1: extend(proto)
        proto = arguments[0];
    } else if (arguments.length === 2) {
	    // syntax 2: extend(statics, proto)
        statics = arguments[0];
        proto = arguments[1];
    }

    // if "this" is the global object, extend was called with no context
    if (this === Function('return this')()) {
    	// so we inherit from object
    	super_ = Object;
    } else {
    	// otherwise we inherit from "this"
    	super_ = this;
    }

    // if the prototype specifies a constructor, use it
    // otherwise, define a default constructor
    ctor = proto.constructor || function () {};

    // we want a constructor that can also serve as a factory:
    // var A = extend();
    // new A() instanceof A; // true
    // A() instanceof A; // true
	factory = function () {
		var that = null;
        if (this instanceof factory) {
        	that = this;
        } else {
        	that = new factory();
        }
        ctor.apply(that, arguments);
        return that;
    };

    // now we will have factory instanceof super_ === true
    inherits(factory, super_);
    // we just need to enrich the factory's prototype
    merge(factory.prototype, proto);
    // ...and static members
    merge(factory, {extend: extend}, statics);
    return factory;
}

var A = extend({
    constructor: function () { console.log('A.constructor', arguments); },
    foo: function () { console.log('A.foo', arguments) }
});

var B = A.extend({
    constructor: function () {
        console.log('B.constructor', arguments);
        B.super_.apply(this, arguments);
    }
});

var C = B.extend({
    NAME: 'C'
}, {
    constructor: function () {
        console.log('C.constructor', arguments);
        C.super_.apply(this, arguments);
    },

    bar: function () {
    	console.log('C.bar', arguments);
    	C.super_.prototype.foo.call(this, 'C.bar', arguments);
    }
});

var c = new C('param1', 'param2');
c.foo('param1', 'param2');
c.bar('param1', 'param2');
console.log('c instanceof A', c instanceof A);
console.log('c instanceof B', c instanceof B);
console.log('c instanceof C', c instanceof C);
console.log('C.super_ === B', C.super_ === B);
console.log('B.super_ === A', B.super_ === A);
console.log('C.NAME', C.NAME);

module.exports = extend;
