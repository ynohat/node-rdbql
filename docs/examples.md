
# CREATE TABLE examples


## create the ingredient table


_Javascript:_

<pre>
sql.createTable("ingredient").columns(
   "id INT",
   "name TEXT"
)
</pre>


_SQL:_

<pre>
CREATE TABLE
ingredient
(
	id INT, name TEXT
)
</pre>

_Result:_

<pre>
last insert id = 0, changes = 0
</pre>


## create the recipe table


_Javascript:_

<pre>
sql.createTable("recipe").columns(
   "id INT",
   "feeds INT", /* how many people the recipe will feed :) */
   "name TEXT"
)
</pre>


_SQL:_

<pre>
CREATE TABLE
recipe
(
	id INT, feeds INT, name TEXT
)
</pre>

_Result:_

<pre>
last insert id = 0, changes = 0
</pre>


## create the recipe_ingredient table


_Javascript:_

<pre>
sql.createTable("recipe_ingredient").columns(
   "recipe_id INT",
   "ingredient_id INT",
   "quantity NUMERIC",
   "unit TEXT"
)
</pre>


_SQL:_

<pre>
CREATE TABLE
recipe_ingredient
(
	recipe_id INT, ingredient_id INT, quantity NUMERIC, unit TEXT
)
</pre>

_Result:_

<pre>
last insert id = 0, changes = 0
</pre>


# INSERT statement examples


## add a few ingredients, using the object syntax


_Javascript:_

<pre>
sql.insert("ingredient").values(
   {id: 1, name: sql.$("egg")},
   {id: 2, name: sql.$("flour")}
)
</pre>


_SQL:_

<pre>
INSERT INTO ingredient
	SELECT 1 AS id, ? /*egg*/ AS name
UNION ALL
	SELECT 2, ? /*flour*/
</pre>

_Result:_

<pre>
last insert id = 2, changes = 2
</pre>


## add a few recipes, using the array syntax


_Javascript:_

<pre>
sql.insert("recipe")
   .columns("id", "feeds", "name") /* this call is optional */
   .values(
      [1, 2, sql.$("omelet")],
      [2, 4, sql.$("puff pastry")],
      [3, 4, sql.$("shortbread cookies")]
   )
</pre>


_SQL:_

<pre>
INSERT INTO recipe
	SELECT 1 AS id, 2 AS feeds, ? /*omelet*/ AS name
UNION ALL
	SELECT 2, 4, ? /*puff pastry*/
UNION ALL
	SELECT 3, 4, ? /*shortbread cookies*/
</pre>

_Result:_

<pre>
last insert id = 3, changes = 3
</pre>


## associate ingredients and recipes, using the mixed object/array syntax


_Javascript:_

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


_SQL:_

<pre>
INSERT INTO recipe_ingredient
	SELECT 1 AS recipe_id, 1 AS ingredient_id, 6 AS quantity, NULL AS unit
UNION ALL
	SELECT 1, 3, 1, ? /*oz*/
</pre>

_Result:_

<pre>
last insert id = 2, changes = 2
</pre>


# SELECT examples


## select * from recipe


_Javascript:_

<pre>
sql.select().from("recipe")
</pre>


_SQL:_

<pre>
SELECT * FROM recipe 
</pre>

_Result:_

<pre>
[ { id: 1, feeds: 2, name: 'omelet' },
  { id: 2, feeds: 4, name: 'puff pastry' },
  { id: 3, feeds: 4, name: 'shortbread cookies' } ]
</pre>


## select distinct id from recipe


_Javascript:_

<pre>
sql.select("id").distinct().from("recipe")
</pre>


_SQL:_

<pre>
SELECT DISTINCT id FROM recipe 
</pre>

_Result:_

<pre>
[ { id: 1 }, { id: 2 }, { id: 3 } ]
</pre>


## select even ids


_Javascript:_

<pre>
sql.select("id").distinct().from("recipe").where("id % 2 = 0")
</pre>


_SQL:_

<pre>
SELECT DISTINCT id FROM recipe  WHERE (id % 2 = 0)
</pre>

_Result:_

<pre>
[ { id: 2 } ]
</pre>


## select ids over some user value (2 in this example)


_Javascript:_

<pre>
sql.select("id").from("recipe").where(sql.$("id > ?", 2))
</pre>


_SQL:_

<pre>
SELECT id FROM recipe  WHERE (id > ? /*2*/)
</pre>

_Result:_

<pre>
[ { id: 3 } ]
</pre>


## select ids from a set of values


_Javascript:_

<pre>
sql.select("id").from("recipe").where(sql.$("id IN (?)", [1, 2, 3, 4]))
</pre>


_SQL:_

<pre>
SELECT id FROM recipe  WHERE (id IN (? /*1*/, ? /*2*/, ? /*3*/, ? /*4*/))
</pre>

_Result:_

<pre>
[ { id: 1 }, { id: 2 }, { id: 3 } ]
</pre>


## select * from recipe join recipe_ingredient join ingredient


_Javascript:_

<pre>
sql.select().from("recipe")
   .joinLeft("recipe_ingredient", "recipe.id = recipe_ingredient.recipe_id")
   .joinLeft("ingredient", "recipe_ingredient.ingredient_id = ingredient.id")
</pre>


_SQL:_

<pre>
SELECT * FROM recipe LEFT JOIN recipe_ingredient ON recipe.id = recipe_ingredient.recipe_id LEFT JOIN ingredient ON recipe_ingredient.ingredient_id = ingredient.id
</pre>

_Result:_

<pre>
[ { id: 1,
    feeds: 2,
    name: 'egg',
    recipe_id: 1,
    ingredient_id: 1,
    quantity: 6,
    unit: null },
  { id: null,
    feeds: 2,
    name: null,
    recipe_id: 1,
    ingredient_id: 3,
    quantity: 1,
    unit: 'oz' },
  { id: null,
    feeds: 4,
    name: null,
    recipe_id: null,
    ingredient_id: null,
    quantity: null,
    unit: null },
  { id: null,
    feeds: 4,
    name: null,
    recipe_id: null,
    ingredient_id: null,
    quantity: null,
    unit: null } ]
</pre>


## select * from recipe join recipe_ingredient join ingredient, using aliased table names


_Javascript:_

<pre>
sql.select().from({"r": "recipe"})
   .joinLeft({"ri": "recipe_ingredient"}, "r.id = ri.recipe_id")
   .joinLeft({"i": "ingredient"}, "ri.ingredient_id = i.id")
</pre>


_SQL:_

<pre>
SELECT * FROM recipe AS r LEFT JOIN recipe_ingredient AS ri ON r.id = ri.recipe_id LEFT JOIN ingredient AS i ON ri.ingredient_id = i.id
</pre>

_Result:_

<pre>
[ { id: 1,
    feeds: 2,
    name: 'egg',
    recipe_id: 1,
    ingredient_id: 1,
    quantity: 6,
    unit: null },
  { id: null,
    feeds: 2,
    name: null,
    recipe_id: 1,
    ingredient_id: 3,
    quantity: 1,
    unit: 'oz' },
  { id: null,
    feeds: 4,
    name: null,
    recipe_id: null,
    ingredient_id: null,
    quantity: null,
    unit: null },
  { id: null,
    feeds: 4,
    name: null,
    recipe_id: null,
    ingredient_id: null,
    quantity: null,
    unit: null } ]
</pre>


## the same, using aliased columns


_Javascript:_

<pre>
sql.select({
   "recipe_id": "r.id",
   "recipe_name": "r.name",
   "ingredient_id": "i.id",
   "ingredient_name": "i.name"
}).from({"r": "recipe"})
.joinLeft({"ri": "recipe_ingredient"}, "r.id = ri.recipe_id")
.joinLeft({"i": "ingredient"}, "ri.ingredient_id = i.id")
</pre>


_SQL:_

<pre>
SELECT r.id AS recipe_id, r.name AS recipe_name, i.id AS ingredient_id, i.name AS ingredient_name FROM recipe AS r LEFT JOIN recipe_ingredient AS ri ON r.id = ri.recipe_id LEFT JOIN ingredient AS i ON ri.ingredient_id = i.id
</pre>

_Result:_

<pre>
[ { recipe_id: 1,
    recipe_name: 'omelet',
    ingredient_id: 1,
    ingredient_name: 'egg' },
  { recipe_id: 1,
    recipe_name: 'omelet',
    ingredient_id: null,
    ingredient_name: null },
  { recipe_id: 2,
    recipe_name: 'puff pastry',
    ingredient_id: null,
    ingredient_name: null },
  { recipe_id: 3,
    recipe_name: 'shortbread cookies',
    ingredient_id: null,
    ingredient_name: null } ]
</pre>


# UPDATE examples


## make the "omelet" recipe (id = 1) feed 4, not 2 people


### update ingredient quantities...


_Javascript:_

<pre>
sql.update("recipe_ingredient")
   .set({"quantity": "quantity * 2"})
   .where("recipe_id = 1")
</pre>


_SQL:_

<pre>
UPDATE recipe_ingredient SET quantity = quantity * 2 WHERE (recipe_id = 1)
</pre>

_Result:_

<pre>
last insert id = 2, changes = 2
</pre>


### update recipe "feeds" field to match


_Javascript:_

<pre>
sql.update("recipe")
   .set({"feeds": "feeds * 2"})
   .where("id = 1")
</pre>


_SQL:_

<pre>
UPDATE recipe SET feeds = feeds * 2 WHERE (id = 1)
</pre>

_Result:_

<pre>
last insert id = 2, changes = 1
</pre>


### check our results


_Javascript:_

<pre>
sql.select({
   "recipe": "r.name",
   "feeds": "r.feeds",
   "ingredient": "i.name",
   "quantity": "ri.quantity"
}).from({"r": "recipe"})
.join({"ri": "recipe_ingredient"}, "r.id = ri.recipe_id")
.join({"i": "ingredient"}, "ri.ingredient_id = i.id")
.where("r.id = 1")
</pre>


_SQL:_

<pre>
SELECT r.name AS recipe, r.feeds AS feeds, i.name AS ingredient, ri.quantity AS quantity FROM recipe AS r INNER JOIN recipe_ingredient AS ri ON r.id = ri.recipe_id INNER JOIN ingredient AS i ON ri.ingredient_id = i.id WHERE (r.id = 1)
</pre>

_Result:_

<pre>
[ { recipe: 'omelet', feeds: 4, ingredient: 'egg', quantity: 12 } ]
</pre>


# DELETE examples


## who are we kidding, we cannot handle puff pastry


### so we need to remove the recipe...


_Javascript:_

<pre>
sql.delete("recipe").where("id = 2")
</pre>


_SQL:_

<pre>
DELETE FROM recipe WHERE (id = 2)
</pre>

_Result:_

<pre>
last insert id = 2, changes = 1
</pre>


### and any association with ingredients


_Javascript:_

<pre>
sql.delete("recipe_ingredient").where("recipe_id = 2")
</pre>


_SQL:_

<pre>
DELETE FROM recipe_ingredient WHERE (recipe_id = 2)
</pre>

_Result:_

<pre>
last insert id = 2, changes = 0
</pre>


### and any ingredient that was only there for puff pastry


_Javascript:_

<pre>
var selectRecipeIngredientId = sql.select("ingredient_id").from("recipe_ingredient");
sql.delete("ingredient")
   .where(sql.$("id NOT IN (?)", selectRecipeIngredientId))
</pre>


_SQL:_

<pre>
DELETE FROM ingredient WHERE (id NOT IN (SELECT ingredient_id FROM recipe_ingredient ))
</pre>

_Result:_

<pre>
last insert id = 2, changes = 1
</pre>

that's it!
