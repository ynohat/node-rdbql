var extend = require('./extend.js'),
    _ = require('underscore');

var dialect = extend({
    constructor: function (name) {
        this.name = name || 'std';

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
                },

                toSQL: function (params) {
                    return this._sql;
                },

                params: function () {
                    return this._params;
                },

                toString: function () {
                    this._params = [];
                    // if a specific method exists for this dialect, call it
                    return this[this.dialect.name]
                        && this[this.dialect.name].toSQL
                        && this[this.dialect.name].toSQL.call(this, this._params)
                        // otherwise use the default method
                        || this.toSQL(this._params)
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
                    if (_.isArray(arg) || _.isArguments(arg)) {
                        var sublist = new this.dialect.list();
                        sublist.add.apply(sublist, arg);
                        this._expressions.push(sublist);
                    } else {
                        this._expressions.push(this.dialect.expr.wrap(arg));
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

            toSQL: function (params) {
                return _.map(this._expressions, function (expr) {
                    return expr.toSQL(params);
                }).join(', ');
            }
        });

        this.null = this.expr.extend({
            toSQL: function (params) {
                return 'NULL';
            }
        });

        this.$ = this.expr.extend({
            constructor: function () {
                this._value = arguments[0];
                this._parameters = [];
                for (var i = 1; i < arguments.length; i++) {
                    this._parameters.push(arguments[i]);
                }
            },

            toSQL: function (params) {
                var sql = '';
                if (this._parameters.length) {
                    var bits = this._value.toString().split('?');
                    if (bits.length !== this._parameters.length + 1) {
                        throw new Error('insufficient positional parameters');
                    }
                    while (this._parameters.length) {
                        sql += bits.shift();
                        var param = this.dialect.$(this._parameters.shift());
                        sql += param.toSQL(params);
                    }
                    sql += bits.shift();
                } else {
                    if (_.isArray(this._value)) {
                        var list = this.dialect.list();
                        for (var i = 0; i < this._value.length; i++) {
                            list.add(this.dialect.$(this._value[i]));
                        }
                        sql = list.toSQL(params);
                    } else {
                        if (this._value instanceof this.dialect.expr) {
                            sql = this._value.toSQL(params);
                        } else {
                            sql = '? /*'+this._value.toString().replace(/\*\//g, '')+'*/';
                            params.push(this._value);
                        }
                    }
                }
                return sql;
            }
        });

        /**
         * alias (name columns or tables)
         */
        this.alias = this.expr.extend({
            constructor: function (alias, expr) {
                this._alias = this.dialect.expr.wrap(alias);
                this._expr = this.dialect.expr.wrap(expr);
            },

            toSQL: function (params) {
                return this._expr.toSQL(params)+' AS '+this._alias.toSQL(params);  
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
                return this;
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

            toSQL: function (params) {
                var op = this._isOr ? ' OR ' : ' AND ';
                return '(' + _.map(this._expressions, function (expr) {
                    return expr.toSQL(params);
                }).join(op) + ')';
            }
        });

        /**
         * Column definition (for create table statements)
         */
        this.coldef = this.expr.extend({
            constructor: function (def) {
                this._def = this.dialect.expr.wrap(def);
            },

            toSQL: function (params) {
                return this._def.toSQL(params);
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
                            this._tables.add(this.dialect.alias(key, arg[key]));
                        }, this);
                    } else {
                        this._tables.add(this.dialect.expr.wrap(arg));
                    }
                }, this)
                return this;
            },

            toSQL: function (params) {
                return 'FROM '+this._tables.toSQL(params);
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
                    table: this._wrapTable(table),
                    condition: this.dialect.expr.wrap(condition)        
                });
                return this;
            },

            inner: function (table, condition) {
                this._chain.push({
                    type: this.dialect.join.INNER,
                    table: this._wrapTable(table),
                    condition: this.dialect.expr.wrap(condition)        
                });
                return this;
            },

            cross: function (table) {
                this._chain.push({
                    type: this.dialect.join.CROSS,
                    table: this._wrapTable(table)
                });
                return this;
            },

            natural: function (table) {
                this._chain.push({
                    type: this.dialect.join.NATURAL,
                    table: this._wrapTable(table)
                });
                return this;
            },

            // table can be an object with one key/val pair (alias), or a string, or an expr
            _wrapTable: function (table) {
                if (_.isObject(table) && table instanceof this.dialect.expr === false) {
                    return this.dialect.alias.apply(null, _.first(_.pairs(table)));
                }
                return this.dialect.expr.wrap(table);
            },

            toSQL: function (params) {
                return _.map(this._chain, function (join) {
                    if (
                        join.type === this.dialect.join.NATURAL
                        || join.type === this.dialect.join.CROSS
                    ) {
                        return join.type + ' JOIN ' + join.table.toSQL(params);
                    } else {
                        return join.type + ' JOIN ' + join.table.toSQL(params) + ' ON ' + join.condition.toSQL(params);
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
                this._condition.and.apply(this._condition, arguments);
            },

            and: function () {
                this._condition.and.apply(this._condition, arguments);
                return this;
            },

            or: function () {
                this._condition.or.apply(this._condition, arguments);
                return this;
            },

            toSQL: function (params) {
                return 'WHERE '+this._condition.toSQL(params);
            }
        });

        /**
         * limit clause for select statements
         */
        this.limit = this.expr.extend({
            constructor: function (count, offset) {
                if (offset !== undefined) {
                    this._offset = this.dialect.expr.wrap(offset);
                }
                this._count = this.dialect.expr.wrap(count);
            },

            toSQL: function (params) {
                if (this._offset !== undefined) {
                    return 'LIMIT '+this._offset.toSQL(params)+' '+this._count.toSQL(params);
                } else {
                    return 'LIMIT '+this._count.toSQL(params);
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

            toSQL: function (params) {
                return 'ORDER BY '+this._spec.toSQL(params);
            }
        });

        this.statement = this.expr.extend({
            constructor: function () {
                this.dialect.statement.super_.apply(this, arguments);
            }
        });

        /**
         * Create table statement
         */
        this.createTable = this.statement.extend({
            constructor: function (name) {
                this._name = this.dialect.expr.wrap(name);
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

            toSQL: function (params) {
                var bits = [];
                bits.push('CREATE TABLE');
                if (this._ifNotExists) {
                    bits.push('IF NOT EXISTS');
                }
                bits.push(this._name.toSQL(params));
                bits.push('(');
                bits.push("\t"+this._columns.toSQL(params));
                bits.push(')');
                return bits.join("\n");
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

            sqlite3: {
                toSQL: function (params) {
                    var columns = this._explicitColumns || this._implicitColumns;
                    var aliases = columns;
                    var union = this.dialect.union().all();
                    for (var i = 0; i < this._values.length; i++) {
                        var values = this._values[i];
                        var select = union.select();
                        if (_.isArray(values)) {
                            for (var j = 0; j < values.length; j++) {
                                if (aliases) {
                                    select.columns(this.dialect.alias(aliases[j], values[j]));
                                } else {
                                    select.columns(values[j]);
                                }
                            }
                        } else if (_.isObject(values)) {
                            for (var j = 0; j < columns.length; j++) {
                                if (aliases) {
                                    select.columns(this.dialect.alias(aliases[j], values[columns[j]]));
                                } else {
                                    select.columns(values[columns[j]]);
                                }
                            }
                        }
                        aliases = null;
                    }
                    return 'INSERT INTO '+this._table+"\n"+union.toSQL(params);
                }
            },

            toSQL: function (params) {
                var bits = [];
                bits.push('INSERT INTO '+this._table);
                var columns = this._explicitColumns || this._implicitColumns;
                if (columns) {
                    bits.push('('+columns.join(', ')+')');
                }
                bits.push("VALUES\n\t("+
                    _.map(this._values, function (values) {
                        if (_.isArray(values)) {
                            return _.map(values, function (value) {
                                value.toSQL(params);
                            }).join(', ');
                        } else if (_.isObject(values)) {
                            return _.map(columns, function (column) {
                                if (values.hasOwnProperty(column)) {
                                    return this.dialect.expr.wrap(values[column]).toSQL(params);
                                } else {
                                    return this.dialect.null().toSQL(params);
                                }
                            }, this).join(', ');
                        }
                    }, this).join("),\n\t(")+
                ')');
                return bits.join("\n");
            } 
        });

        /**
         * SELECT statement
         */
        this.select = this.statement.extend({
            constructor: function () {
                this._columns = null;
                if (arguments.length) {
                    this.columns.apply(this, arguments);
                }
                this._distinct = false;
                this._from = null;
                this._join = this.dialect.join();
                this._where = null;
                this._limit = null;
                this._order = null;
            },

            distinct: function (distinct) {
                this._distinct = distinct || distinct === undefined;
                return this;
            },

            columns: function () {
                if (arguments.length > 0) {
                    if (this._columns instanceof this.dialect.list === false) {
                        this._columns = this.dialect.list();
                    }
                    _.each(_.flatten(arguments), function (arg) {
                        if (_.isObject(arg) && arg instanceof this.dialect.expr === false) {
                            _.each(_.keys(arg), function (key) {
                                this._columns.add(this.dialect.alias(key, arg[key]));
                            }, this);
                        } else {
                            this._columns.add(this.dialect.expr.wrap(arg));
                        }
                    }, this);
                }
                return this;
            },

            from: function () {
                if (arguments.length > 0) {
                    if (this._from === null) {
                        this._from = this.dialect.from.apply(null, arguments);
                    } else {
                        this._from.add.apply(this._from, arguments);
                    }
                }
                return this;
            },

            join: function (table, condition) {
                return this.joinInner(table, condition);
            },

            joinInner: function (table, condition) {
                this._join = this._join || this.dialect.join();
                this._join.inner(table, condition);
                return this;
            },

            joinLeft: function (table, condition) {
                this._join = this._join || this.dialect.join();
                this._join.left(table, condition);
                return this;
            },

            joinCross: function (table) {
                this._join = this._join || this.dialect.join();
                this._join.cross(table);
                return this;
            },

            joinNatural: function (table) {
                this._join = this._join || this.dialect.join();
                this._join.natural(table);
                return this;
            },

            where: function () {
                if (arguments.length > 0) {
                    if (this._where instanceof this.dialect.where === false) {
                        this._where = this.dialect.where();
                    }
                    this._where.and.apply(this._where, arguments);
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
                    if (this._order instanceof this.dialect.list === false) {
                        this._order = this.dialect.list();
                    }
                    this._order.add.apply(this._order, arguments);
                }
                return this;
            },

            toSQL: function (params) {
                var bits = [];
                if (this._distinct === true) {
                    bits.push(this.dialect.expr("DISTINCT"));
                }
                bits.push(this._columns || this.dialect.expr('*'));
                if (this._from instanceof this.dialect.from) {
                    bits.push(this._from);
                    if (this._join instanceof this.dialect.join) {
                        bits.push(this._join);
                    }
                    if (this._where instanceof this.dialect.where) {
                        bits.push(this._where);
                    }
                    if (this._limit instanceof this.dialect.limit) {
                        bits.push(this._limit);
                    }
                }
                var q = 'SELECT '+_.invoke(bits, 'toSQL', params).join(" ");
                return q;
            }
        });

        this.union = this.statement.extend({
            constructor: function () {
                this.dialect.union.super_.apply(this, arguments);
                this._type = ' UNION ';
                this._selects = [];
            },

            all: function (all) {
                if (all === true || all === undefined) {
                    this._type = "UNION ALL";
                } else {
                    this._type = "UNION";
                }
                return this;
            },

            select: function () {
                var select = this.dialect.select.apply(null, arguments);
                this._selects.push(select);
                return select;
            },

            toSQL: function (params) {
                return _.map(this._selects, function (select) {
                    return "\t"+select.toSQL(params).replace("\n", "\n\t");
                }).join("\n"+this._type+"\n");
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
                    if (this._where instanceof this.dialect.where === false) {
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

            toSQL: function (params) {
                var values = this.dialect.list();
                _.each(_.keys(this._values), function (key) {
                    values.add(this.dialect.expr(key + ' = ' + this._values[key]));
                }, this);
                var q = 'UPDATE ' + this._table.toSQL(params);
                q += ' SET ' + values.toSQL(params);
                if (this._where instanceof this.dialect.where) {
                    q += ' ' + this._where.toSQL(params);
                }
                return q;
            }
        });

        this.delete = this.statement.extend({
            constructor: function (table) {
                this._table = this.dialect.expr.wrap(table);
                this._where = null;
            },

            where: function () {
                if (arguments.length > 0) {
                    if (this._where instanceof this.dialect.where === false) {
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

            toSQL: function (params) {
                var q = 'DELETE FROM ' + this._table.toSQL(params)
                if (this._where instanceof this.dialect.where) {
                    q += ' ' + this._where.toSQL(params);
                }
                return q;
            }
        });
    }
});



module.exports = {
    dialect: _.memoize(dialect)
};
