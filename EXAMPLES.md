
# create the database schema


## create the ingredient table

<pre>
sql.createTable("ingredient").columns(
   "id INT",
   "name TEXT"
)
</pre>
<pre>
CREATE TABLE ingredient ( id INT, name TEXT )
params: []
last insert id = 0, changes = 0
</pre>

## create the recipe table

<pre>
sql.createTable("recipe").columns(
   "id INT",
   "feeds INT", /* how many people the recipe will feed :) */
   "name TEXT"
)
</pre>
<pre>
CREATE TABLE recipe ( id INT, feeds INT, name TEXT )
params: []
last insert id = 0, changes = 0
</pre>

## create the recipe_ingredient table

<pre>
sql.createTable("recipe_ingredient").columns(
   "recipe_id INT",
   "ingredient_id INT",
   "quantity NUMERIC",
   "unit TEXT"
)
</pre>
<pre>
CREATE TABLE recipe_ingredient ( recipe_id INT, ingredient_id INT, quantity NUMERIC, unit TEXT )
params: []
last insert id = 0, changes = 0
</pre>

# add some recipes


## add a few ingredients, using the object syntax

<pre>
sql.insert("ingredient").values(
   {id: 1, name: sql.$("egg")},
   {id: 2, name: sql.$("flour")}
)
</pre>
<pre>
INSERT INTO ingredient SELECT (1) AS id, (?) AS name UNION ALL SELECT (2) AS id, (?) AS name
params: [ 'egg', 'flour' ]
last insert id = 2, changes = 2
</pre>

## add a few recipes, using the array syntax

<pre>
sql.insert("recipe")
   .columns("id", "feeds", "name") /* this call is optional */
   .values(
      [1, 2, sql.$("omelet")],
      [2, 4, sql.$("puff pastry")],
      [3, 4, sql.$("shortbread cookies")]
   )
</pre>
<pre>
INSERT INTO recipe SELECT (1) AS id, (2) AS feeds, (?) AS name UNION ALL SELECT (2) AS id, (4) AS feeds, (?) AS name UNION ALL SELECT (3) AS id, (4) AS feeds, (?) AS name
params: [ 'omelet', 'puff pastry', 'shortbread cookies' ]
last insert id = 3, changes = 3
</pre>

## associate ingredients and recipes, using the mixed object/array syntax

<pre>
sql.insert("recipe_ingredient")
   .columns( /* this call is compulsory when mixing arrays and objects */
       "recipe_id",
       "ingredient_id",
       "quantity",
       "unit"
   ).values(
      [1 /* omelet */, 1 /* egg */, 6 /* 3 eggs per person... */, sql.null()],
      {
           recipe_id: 1 /* omelet */,
           ingredient_id: 3 /* butter for the pan */,
           quantity: 1,
           unit: sql.$("oz") /* ounces... */
      }
   )
</pre>
<pre>
INSERT INTO recipe_ingredient SELECT (1) AS recipe_id, (1) AS ingredient_id, (6) AS quantity, (NULL) AS unit UNION ALL SELECT (1) AS recipe_id, (3) AS ingredient_id, (1) AS quantity, (?) AS unit
params: [ 'oz' ]
last insert id = 2, changes = 2
</pre>

# select examples


## select * from recipe

<pre>
sql.select().from("recipe")
</pre>
<pre>
SELECT * FROM recipe 
params: []
[ { id: 1, feeds: 2, name: 'omelet' },
  { id: 2, feeds: 4, name: 'puff pastry' },
  { id: 3, feeds: 4, name: 'shortbread cookies' } ]
</pre>

## select distinct id from recipe

<pre>
sql.select("id").distinct().from("recipe")
</pre>
<pre>
SELECT DISTINCT id FROM recipe 
params: []
[ { id: 1 }, { id: 2 }, { id: 3 } ]
</pre>
that's it!
