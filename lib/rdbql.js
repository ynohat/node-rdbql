var util = require('util'),
    _ = require('underscore');

/**
 * Base for inheritance, provides the static @extend@ method.
 *
 * Example:
 *
 * <code>
 *  var A = extend({
 *      foo: 'bar',
 *      constructor: function () {
 *          console.log('A.constructor');
 *      }
 *  });
 *
 *  var B = A.extend({
 *      constructor: function () {
 *          console.log('B.construtor');
 *          B.super_(); // logs 'A.constructor'
 *      }
 *  });
 *
 * var C = B.extends(
 *      {
 *          STATIC_MEMBER: 'hello'
 *      },
 *      {
 *          constructor: function () { C.super_(); }
 *      }
 * );
 * </code>
 */
function extend() {
    var proto = {},
        statics = {};
    if (arguments.length === 1) {
        proto = arguments[0];
    } else if (arguments.length === 2) {
        proto = arguments[1];
        statics = arguments[0];
    }
    var ctor = proto.constructor || function () {};
    // get the global object
    var global = Function('return this')();
    var tmpCtor = function () {};
    var realCtor = function () {
        var that = null;
        if (this instanceof realCtor) {
            that = this;
        } else {
            that = new tmpCtor();
        }
        ctor.apply(that, arguments);
        return that;
    };
    util.inherits(realCtor, this === global ? Object : this);
    util.inherits(tmpCtor, realCtor);
    _.extend(realCtor.prototype, proto);
    _.extend(realCtor, {extend: extend}, statics);
    return realCtor;
};

var dialect = extend({
    constructor: function (name) {
        this.name = name;

        /**
         * expression base class.
         */
        this.expr = extend({
                wrap: function (expr) {
                    return expr instanceof this ? expr : this(expr);
                }
            },{
                dialect: this,

                constructor: function (sql) {
                    this._sql = sql;
                    this._comment = null;
                },

                comment: function () {
                    this._comment = this.dialect.comment.apply(null, arguments);
                    return this;
                },

                toSQL: function () {
                    return this._sql;
                },

                toString: function () {
                    var bits = [];
                    if (this._comment) {
                        bits.push(this._comment.toSQL());
                    }
                    bits.push(
                        this[this.dialect.name]
                        && this[this.dialect.name].toSQL
                        && this[this.dialect.name].toSQL()
                        || this.toSQL()
                    );
                    return bits.join("\n");
                }
        });

        /**
         * Expression list (column list, rvalue for the IN operator, ...)
         */
        this.list = this.expr.extend({
            constructor: function () {
                this._expressions = [];
                this.add.apply(this, arguments);
            },

            add: function () {
                _.each(arguments, function (arg) {
                    if (arg instanceof this.dialect.expr) {
                        this._expressions.push(arg);
                    } else if (_.isArray(arg) || _.isArguments(arg)) {
                        var sublist = new this.dialect.list();
                        sublist.add.apply(sublist, arg);
                        this._expressions.push(sublist);
                    } else {
                        this._expressions.push(new this.dialect.expr(arg));
                    }
                }, this);
            },

            length: function () {
                return this._expressions.length;
            },

            each: function (cb, thisObj) {
                return _.each(this._expressions, cb, thisObj);
            },

            union: function () {
                var u = this.dialect.list();
                _.each(arguments, function (list) {
                    if (list instanceof this.dialect.list) {
                        list = this.dialect.list._expressions;
                    } else if (_.isArray(list) === false) {
                        throw new Error('expecting array or sql list');
                    }
                    u._expressions = _.union(u._expressions, list);
                }, this);
                return u;
            },

            map: function (cb, thisObj) {
                return _.map(this._expressions, cb, thisObj);
            },

            toSQL: function () {
                return this._expressions.join(', ');
            }
        });

        this.null = this.expr.extend({
            toSQL: function () {
                return 'NULL';
            }
        });

        // a bound parameter value
        this.$ = this.expr.extend({
            constructor: function (value) {
                this._value = value;
            },

            toSQL: function () {
                return '?';
            }
        });

        this.comment = this.expr.extend({
            constructor: function () {
                this._lines = _.flatten(arguments);
            },

            toSQL: function () {
                return "/**\n" + this._lines.join("\n").replace(/^/, ' * ') + "\n */";
            }
        });

        /**
         * alias (name columns or tables)
         */
        this.alias = this.expr.extend({
            constructor: function (expr, alias) {
                this._expr = expr;
                this._alias = this.dialect.expr.wrap(alias);
            },

            toSQL: function () {
                var exprSQL = (this._expr instanceof this.dialect.expr) ?
                    '('+this._expr+')' :
                    this._expr;
                return exprSQL+' AS '+this._alias;  
            }
        });

        /**
         * condition (chainable "a and (b or c)" expressions)
         */
        this.condition = this.expr.extend({
            constructor: function () {
                this._expressions = [];
                this._isOr = false;
                this.add.apply(this, arguments);
            },

            add: function () {
                _.each(arguments, function (arg) {
                    this._expressions.push(this.dialect.expr.wrap(arg));
                }, this);
            },

            and: function () {
                if (this._isOr) {
                    var left = this.copy();
                    var right = this.dialect.condition.apply(null, arguments);
                    this._expressions = [left, right];
                    this._isOr = false;
                } else {
                    this.add.apply(this, arguments);
                }
                return this;
            },

            or: function () {
                if (this._isOr === false) {
                    var left = this.copy();
                    var right = this.dialect.condition.apply(null, arguments);
                    this._expressions = [left, right];
                    this._isOr = true;
                } else {
                    this.add.apply(this, arguments);
                }
                return this;
            },

            copy: function () {
                var b = this.dialect.condition();
                b._operator = this._operator;
                b._expressions = this._expressions;
                return b;
            },

            toSQL: function () {
                var op = this._isOr ? ' OR ' : ' AND ';
                return '(' + this._expressions.join(op) + ')';
            }
        });

        /**
         * Column definition (for create table statements)
         */
        this.coldef = this.expr.extend({
            constructor: function (def) {
                this._def = this.dialect.expr.wrap(def);
            },

            toSQL: function () {
                return this._def;
            }
        });

        /**
         * From clause, for select and delete statements
         */
        this.from = this.expr.extend({
            constructor: function () {
                this._tables = this.dialect.list();
                this.add.apply(this, arguments);
            },

            add: function () {
                _.each(_.flatten(arguments), function (arg) {
                    var table = null;
                    if (_.isObject(arg) && arg instanceof this.dialect.expr === false) {
                        _.each(_.keys(arg), function (key) {
                            this._tables.add(this.dialect.alias(arg[key], key));
                        }, this);
                    } else {
                        this._tables.add(arg);
                    }
                }, this)
                return this;
            },

            toSQL: function () {
                return 'FROM '+this._tables.toSQL();
            }
        });

        /**
         * Join statement chain.
         */
        this.join = this.expr.extend({
            NATURAL: 'NATURAL',
            CROSS: 'CROSS',
            LEFT: 'LEFT',
            /*RIGHT, 'RIGHT', // unsupported in Sqlite, and rarely used */
            INNER: 'INNER'
        }, {
            constructor: function () {
                this._chain = [];
            },

            left: function (table, condition) {
                this._chain.push({
                    type: this.dialect.join.LEFT,
                    table: table,
                    condition: condition        
                });
                return this;
            },

            inner: function (table, condition) {
                this._chain.push({
                    type: this.dialect.join.INNER,
                    table: table,
                    condition: condition        
                });
                return this;
            },

            cross: function (table) {
                this._chain.push({
                    type: this.dialect.join.CROSS,
                    table: table
                });
                return this;
            },

            natural: function (table) {
                this._chain.push({
                    type: this.dialect.join.NATURAL,
                    table: table
                });
                return this;
            },

            toSQL: function () {
                return _.map(this._chain, function (join) {
                    if (
                        join.type === this.dialect.join.NATURAL
                        || join.type === this.dialect.join.CROSS
                    ) {
                        return join.type + ' JOIN ' + join.table;
                    } else {
                        return join.type + ' JOIN ' + join.table + ' ON ' + join.condition;
                    }
                }, this).join(' ');
            }
        });

        /**
         * WHERE clause
         */
        this.where = this.expr.extend({
            constructor: function () {
                this._condition = this.dialect.condition();
            },

            and: function () {
                this._condition.and.apply(this._condition, arguments);
                return this;
            },

            or: function () {
                this._condition.or.apply(this._condition, arguments);
                return this;
            },

            toSQL: function () {
                return 'WHERE '+this._condition;
            }
        });

        /**
         * limit clause for select statements
         */
        this.limit = this.expr.extend({
            constructor: function (count, offset) {
                this._offset = offset;
                this._count = count;
            },

            toSQL: function () {
                if (this._offset !== undefined) {
                    return 'LIMIT '+this._offset+' '+this._count;
                } else {
                    return 'LIMIT '+this._count;
                }
            }
        });

        /**
         * ORDER clause for select statements
         */
        this.order = this.expr.extend({
            constructor: function () {
                this._spec = new this.dialect.list();
            },

            add: function () {
                this._spec.add.apply(this._spec, arguments);
                return this;
            },

            toSQL: function () {
                return 'ORDER BY '+this._spec.toSQL();
            }
        });

        this.statement = this.expr.extend({
        });

        /**
         * Create table statement
         */
        this.createTable = this.statement.extend({
            constructor: function (name) {
                this._name = name;
                this._ifNotExists = false;
                this._columns = this.dialect.list();
            },

            ifNotExists: function (val) {
                this._ifNotExists = val === undefined || val === true;
                return this;
            },

            columns: function () {
                _.each(arguments, function (arg) {
                    this._columns.add(this.dialect.expr.wrap(arg));
                }, this);
                return this;
            },

            toSQL: function () {
                var bits = [];
                bits.push('CREATE TABLE');
                if (this._ifNotExists) {
                    bits.push('IF NOT EXISTS');
                }
                bits.push(this._name);
                bits.push('(');
                bits.push(this._columns);
                bits.push(')');
                return bits.join(' ');
            }
        });

        /**
         * INSERT statement
         */
        this.insert = this.statement.extend({
            constructor: function (table) {
                this._table = table;
                // columns specified via this.columns()
                this._explicitColumns = null;
                // columns deduced from object values
                this._implicitColumns = null;
                this._values = [];
            },

            columns: function () {
                this._explicitColumns = _.flatten(arguments);
                return this;
            },

            values: function () {
                _.each(arguments, function (arg) {
                    if (_.isArray(arg)) {
                        if (this._implicitColumns && this._explicitColumns === false) {
                            throw new Error('cannot mix object and array args without explicitly specifying columns');
                        }
                    } else if (_.isObject(arg)) {
                        if (this._explicitColumns === null) {
                            this._implicitColumns = _.union(this._implicitColumns || [], _.keys(arg));
                        }
                    } else {
                        throw new Error('expecting array or object');
                    }
                    this._values.push(arg);
                }, this);
                return this;
            },

            toSQL: function () {
                var bits = [];
                bits.push('INSERT INTO '+this._table);
                var columns = this._explicitColumns || this._implicitColumns;
                if (columns) {
                    bits.push('('+columns.join(', ')+')');
                }
                bits.push('VALUES ('+
                    _.map(this._values, function (values) {
                        if (_.isArray(values)) {
                            return values.join(', ');
                        } else if (_.isObject(values)) {
                            return _.map(columns, function (column) {
                                return values[column] || this.dialect.expr('NULL');
                            }, this).join(', ');
                        }
                    }, this).join('),(')+
                ')');
                return bits.join(' ');
            }
        });

        /**
         * SELECT statement
         */
        this.select = this.expr.extend({
            constructor: function () {
                this._columns = null;
                this._from = this.dialect.from();
                if (arguments.length) {
                    this.columns.apply(this, arguments);
                }
                this._join = this.dialect.join();
                this._where = null;
                this._limit = null;
                this._order = null;
            },

            columns: function () {
                if (arguments.length > 0) {
                    if (this._columns instanceof this.dialect.list === false) {
                        this._columns = this.dialect.list();
                    }
                    _.each(_.flatten(arguments), function (arg) {
                        if (_.isObject(arg) && arg instanceof this.dialect.expr === false) {
                            _.each(_.keys(arg), function (key) {
                                this._columns.add(this.dialect.alias(arg[key], key));
                            }, this);
                        } else {
                            this._columns.add(arg);
                        }
                    }, this);
                }
                return this;
            },

            from: function () {
                if (arguments.length > 0) {
                    this._from.add.apply(this._from, arguments);
                }
                return this;
            },

            join: function (table, condition) {
                return this.joinInner(table, condition);
            },

            joinInner: function (table, condition) {
                this._join.inner(table, condition);
                return this;
            },

            joinLeft: function (table, condition) {
                this._join.left(table, condition);
                return this;
            },

            joinCross: function (table) {
                this._join.cross(table);
                return this;
            },

            joinNatural: function (table) {
                this._join.natural(table);
                return this;
            },

            where: function () {
                if (arguments.length > 0) {
                    if (this._where instanceof this.dialect.where === false) {
                        this._where = this.dialect.where.apply(null, arguments);
                    }
                }
                return this;
            },

            orWhere: function () {
                this._where.or.apply(this._where, arguments);
                return this;
            },

            limit: function (count, offset) {
                this._limit = this.dialect.limit(count, offset);
                return this;
            },

            order: function () {
                if (arguments.length > 0) {
                    if (this._order instanceof list === false) {
                        this._order = this.dialect.list();
                    }
                    this._order.add.apply(this._order, arguments);
                }
                return this;
            },

            toSQL: function () {
                var bits = [];
                bits.push(this._columns || this.dialect.expr('*'));
                bits.push(this._from);
                bits.push(this._join);
                if (this._where instanceof this.dialect.where) {
                    bits.push(this._where);
                }
                if (this._limit instanceof this.dialect.limit) {
                    bits.push(this._limit);
                }
                var q = 'SELECT '+_.invoke(bits, 'toSQL').join(' ');
                return q;
            }
        });

        this.update = this.statement.extend({
                constructor: function (table) {
                this._table = this.dialect.expr.wrap(table);
                this._values = {},
                this._where = null;
            },

            set: function (values) {
                _.extend(this._values, values);
                return this;
            },

            where: function () {
                if (arguments.length > 0) {
                    if (this._where instanceof this.where === false) {
                        this._where = this.dialect.where();
                        this._where.and.apply(this._where, arguments);
                    }
                }
                return this;
            },

            orWhere: function () {
                this._where.or.apply(this._where, arguments);
                return this;
            },

            toSQL: function () {
                var values = this.dialect.list();
                _.each(_.keys(this._values), function (key) {
                    values.add(this.dialect.expr(key + ' = ' + this._values[key]));
                }, this);
                var q = 'UPDATE '+this._table;
                q += ' SET '+values;
                if (this._where instanceof this.dialect.where) {
                    q += ' '+this._where;
                }
                return q;
            }
        });
    }
});



module.exports = {
    dialect: _.memoize(dialect)
};
