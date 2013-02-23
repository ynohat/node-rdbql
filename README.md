node-rdbql
============

(yet another) SQL syntax helper for node.js

## Why?

Applications using a RDBMS of some kind quickly get messy when building SQL "from scratch".

<pre>
function filter(params) {
  var select = "SELECT * FROM t",
      where = [],
      bindings = {},
      binding;
  for (var key in params) {
    binding = "$" + key;
    where.push(key + " = " + binding);
    bindings[binding] = params[key];
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
var sql = require("rdbql");

function filter(params) {
  var select = sql.select().from("t");
  for (var key in params) {
    select.where(sql.equals(key, params[key]));
  }
  return {"q": select.toString(), "params": select.params};
}
</pre>

