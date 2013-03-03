var _ = require('underscore'),
    async = require('async'),
    sqlite3 = require('sqlite3'),
    sql = require('../lib/rdbql.js').dialect('sqlite3');

function repeat(pattern, count) {
    if (count < 1) return '';
    var result = '';
    while (count > 0) {
        if (count & 1) result += pattern;
        count >>= 1, pattern += pattern;
    }
    return result;
}

function Runner(adapter, level, step) {
    this.adapter = adapter;
    this.level = level || 1;
    this.step = step;
};

Runner.prototype.run = function (next) {
    var series = [];
    if (_.isArray(this.step)) {
        _.each(this.step, function (step) {
            var runner = this.createRunner(step);
            series.push(_.bind(runner.run, runner));
        }, this);
    } else if (this.step instanceof sql.statement) {
        var q = this.step.toString();
        var p = this.step.params();
        if (this.step instanceof sql.select) {
            series.push(_.bind(function (next) {
                this.adapter.all(q, p, function (err, rows) {
                    console.log(); console.log();
                    console.log("_SQL:_");
                    console.log(); console.log();
                    console.log("<pre>", q, "</pre>");
                    console.log(); console.log();
                    console.log("_Result:_");
                    console.log(); console.log();
                    console.log("<pre>", err || rows, "</pre>");
                    console.log(); console.log();
                    next(err, rows);
                });
            }, this));
        } else {
            series.push(_.bind(function (next) {
                this.adapter.run(q, p, function (err) {
                    console.log(); console.log();
                    console.log("_SQL:_");
                    console.log(); console.log();
                    console.log("<pre>", q, "</pre>");
                    console.log(); console.log();
                    console.log("_Result:_");
                    console.log(); console.log();
                    console.log("<pre>", err || ("last insert id = "+this.lastID+", changes = "+this.changes), "</pre>");
                    console.log(); console.log();
                    next(err);
                });
            }, this));            
        }
    } else if (_.isObject(this.step)) {
        if (this.step.comment) {
            series.push(_.bind(function (next) {
                console.log(); console.log();
                console.log(( this.level && repeat('#', this.level)+" " || "") + this.step.comment);
                console.log(); console.log();
                next();
            }, this));
        }
        if (this.step.js) {
            series.push(_.bind(function (next) {
                var js = _.isArray(this.step.js) ? this.step.js.join("\n") : this.step.js;
                console.log(); console.log();
                console.log("_Javascript:_");
                console.log(); console.log();
                console.log("<pre>", js, "</pre>");
                console.log(); console.log();
                var runner = this.createRunner(eval(js));
                runner.run(next);
            }, this));
        }
        if (this.step.transaction) {
            var runner = this.createRunner(this.step.transaction);
            runner.level += 1;
            series.push(_.bind(runner.run, runner));
        }
    }
    async.series(series, function (err, result) {
        if (next) {
            next(err, result);
        }
    });
};

Runner.prototype.createRunner = function (step) {
    return new Runner(this.adapter, this.level, step);
};

var transaction = [
    require('./_initSchema.js'),
    require('./_insertRows.js'),
    require('./_select.js'),
];

var runner = new Runner(new sqlite3.Database(':memory:'), 0, transaction);

module.exports = runner;

runner.run(function () {
    console.log("that's it!");    
});