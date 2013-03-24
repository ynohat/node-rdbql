var assert = require('assert'),
    clone = require('../lib/clone.js');

assert(clone(null) === null);
assert(clone(undefined) === undefined);
assert(clone("a") === "a");

var a = { b: { c: {} } };
var a2 = clone(a);
assert(a !== a2);
assert(a.b !== a2.b);
assert(a.b.c !== a2.b.c);

var d = new Date();
var d2 = clone(d);
assert(d !== d2);
d2.setFullYear(d2.getFullYear() + 1);
assert(d.getYear() === d2.getYear() - 1);

function F() {
    this.a = {
        b: {
            c: 1
        }
    }
};
F.prototype.foo = function () {};
var f = new F();
var f2 = clone(f);
assert(f2 instanceof F);
assert(f !== f2);
assert(f.a !== f2);
assert(f.a.b !== f2.a.b);
assert(f.a.b.c === f2.a.b.c);

function F2() {};
F2.prototype = new F();
var f3 = new F2();
assert(f3.foo === f.foo);
assert(f3.foo === f2.foo);

var c = {};
c.cycle = c;
assert(c === c.cycle);
var c1 = clone(c);
assert(c1 !== c);
assert(c1.cycle === c1);