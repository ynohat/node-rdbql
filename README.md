node-rdbql
============

(yet another) SQL syntax helper for node.js

*This package isn't available via npm, the basics arent't all there yet. The idea is to get sqlite3 and mysql up and running for the following statements: create table, select, insert, update, delete.*

*sqlite3 works for all except delete; MySQL support has not been tested yet.*

## Why?

Applications using a RDBMS of some kind quickly get messy when building SQL "from scratch".

<pre>
function filter(params) {
  var select = "SELECT * FROM t",
      where = [],
      bindings = [];
  for (var key in params) {
    where.push(key + " = ?");
    bindings.push(params[key]);
  }
  if (where.length > 0) {
    select += " WHERE " + where.join(" AND ");
  }
  return {"q": select, "params": bindings};
}
</pre>

That's a fairly complicated piece of code, to do very little: no validation, supports AND-only filtering, parameter binding syntax is hardwired... Maintaining a DAL this way is not nice at all.

With node-rdbql, the previous example might be written like this:

<pre>
var sql = require("rdbql").dialect('sqlite3');

function filter(params) {
  var select = sql.select().from("t");
  for (var key in params) {
    select.where($(key + ' = ?', params[key]));
  }
  return {"q": select.toString(), "params": select.params()};
}
</pre>

## More examples of what can be done

[... can be found here](docs/examples.md)

## Formal documentation

[Introduction](docs/intro.md)
[Schema definition](docs/schemadef.md)
[Insert statements](docs/insert.md)
[Select statements](docs/select.md)
[Update statements](docs/update.md)
[delete statements](docs/delete.md)
