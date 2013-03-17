# Intro

## Install

<pre>npm install [-g] rdbql</pre>

## require() it

<pre>var sql = require('rdbql').dialect('sqlite3');</pre>

or

<pre>var sql = require('rdbql').dialect('mysql');</pre>

(I'll be working on support for other engines)

## Expressions

The library deals in SQL expressions, so there is a simple method for defining one:

<pre>
var simpleExpression = sql.expr("SELECT a, b, c FROM t");
simpleExpression.toString(); // SELECT a, b, c, FROM t
simpleExpression instanceof sql.expr; // true
</pre>

Every expression in the library inherits from expr. Most of the time, you won't need to use expr() directly, you'll be using _statements_.

## Statements

"Public" expressions your code will be calling usually inherit extend _sql.statement_. There's nothing particular about statements, except that they can be executed using your favourite adapter.

Detailed documentation for specific statements is available at the following locations:

* [CREATE TABLE](schemadef.md)
* [INSERT](insert.md)
* [UPDATE](update.md)
* [SELECT](select.md)
* [DELETE](delete.md)

## Parameters

You're bound to use parameters in your SQL. The library makes it easy to do so, using the _$_ method. When your query is rendered, each bound parameter is substituted with a "?", and added to the positional parameter list.

which supports two distinct syntaxes:

### Single literal

<pre>
var foo = sql.$('foo');
foo instanceof sql.expr; // true
foo.toString(); // ?
foo.params(); // ['foo']
</pre>

The parameter can now be used in a query, for example:

<pre>
var selectFoo = sql.select({bar: foo});
selectFoo.toString(); // SELECT ? AS bar
selectFoo.params(); // ['foo']
</pre>

### Multiple literals

This syntax is typically useful when performing comparisons, or when the parameter should be bound as part of another expression.

<pre>
var cmp = sql.$('a = ? OR b = ?', 1, 2);
cmp.toString(); // 'a = ? OR b = ?'
cmp.params(); // [1, 2]
</pre>

This comparison can be used as part of a where clause:

<pre>
var selectWhereCmp = sql.select().from('t').where(cmp);
selectWhereCmp.toString(); // SELECT * FROM t WHERE (a = ? OR b = ?)
selectWhereCmp.params(); // [1, 2]
</pre>

### Binding arrays

Both syntaxes accept arrays as parameters:

<pre>
var boundArray = sql.$([1, 2, 3]);
boundArray.toString(); // ?, ?, ?
boundArray.params(); // [1, 2, 3]
</pre>

<pre>
var whereInCmp = sql.$("a IN (?)", [1, 2, 3]);
whereInCmp.toString(); // a IN (?, ?, ?)
whereInCmp.params(); // [1, 2, 3]
</pre>

### Binding expressions

When an expression is provided, _$_ does not substitute it with the "?" character. Instead, it inserts the expression in place, which is very useful for building subqueries:

<pre>
var subSelect = sql.select().from('t').where('a = b');
var select = sql.select().from('t').where(sql.$('a IN (?)', subselect));
select.toString(); // SELECT * FROM t WHERE a IN (SELECT a FROM t WHERE a = b)
select.params(); // []
</pre>
