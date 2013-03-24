var assert = require('assert'),
    extend = require('../lib/extend.js');

var aConstructed = false;

console.log('defining base class A');
var A = extend({
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
        this.a = a || 'noargs';
        aConstructed = true;
    },
    foo: function () {
        this.afooed = true;
    },
    bar: function () {
        this.abared = true;
    }
});

console.log('assert statics are assigned correctly');
assert(A.FOO === 'BAR');
console.log('assert constructor was not called during definition');
assert(aConstructed === false);

console.log('defining subclass B of A');
var B = A.extend({
    b: null,
    bfooed: false,
    constructor: function (a, b) {
        B.uber.call(this, a);
        this.b = b;
    }
});

console.log('assert statics are not inherited');
assert(B.FOO === undefined);
console.log('assert A\'s constructor was not called during definition of B');
assert(aConstructed === false);

console.log('defining subclass C of B');
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

console.log('defining sublass D of C, with mixins');
var D = C.extend({
    d: null,
    mixins: [
        { foobar: function () { this.d = 'd'; } }
    ]
});

console.log('assert A\'s constructor was not called during definition of B, C and D');
assert(aConstructed === false);

console.log('creating an instance c of C');
var c = new C('a', 'b', 'c');
console.log('assert c instanceof A');
assert(c instanceof A);
console.log('assert c instanceof B');
assert(c instanceof B);
console.log('assert c instanceof C');
assert(c instanceof C);
console.log('assert constructor chain works');
assert(c.a === 'a');
assert(c.b === 'b');
assert(c.c === 'c');
console.log('assert statics are not inherited');
assert(c.FOO === undefined);
assert(C.FOO === undefined);

console.log('assert changing c.obj (inherited from A) does not affect A.prototype.obj');
c.obj.goodbye = "and good luck";
assert(A.prototype.obj.goodbye === undefined);

console.log('assert prototype chain works via uber');
c.foo();
assert(c.cfooed);
assert(c.bfooed === false);
assert(c.afooed);
c.bar();
assert(c.abared);
assert(C.uber.bar === A.prototype.bar);

console.log('creating an instance of C using the constructor as a factory');
var c2 = C('a', 'b', 'c');
console.log('asserting c2 is an instance of C');
assert(c2 instanceof C);

var d = new D();
console.log('asserting d is an instance of C');
assert(d instanceof C);
console.log('asserting A.constructor was not called');
assert(d.a === null);
d.foobar();
console.log('asserting the foobar mixin had the intended effect');
assert(d.d === 'd');