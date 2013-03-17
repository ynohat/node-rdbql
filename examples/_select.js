module.exports = {
    comment: 'SELECT examples',
    transaction: [
        {
            comment: 'select * from recipe',
            js: [
                'sql.select().from("recipe")'
            ]
        },

        {
            comment: 'select distinct id from recipe',
            js: [
                'sql.select("id").distinct().from("recipe")'
            ]
        },

        {
            comment: 'select even ids',
            js: [
                'sql.select("id").distinct().from("recipe").where("id % 2 = 0")'
            ]
        },

        {
            comment: 'select ids over some user value (2 in this example)',
            js: [
                'sql.select("id").from("recipe").where(sql.$("id > ?", 2))'
            ]
        },

        {
            comment: 'select ids from a set of values',
            js: [
                'sql.select("id").from("recipe").where(sql.$("id IN (?)", [1, 2, 3, 4]))'
            ]
        },

        {
            comment: 'select * from recipe join recipe_ingredient join ingredient',
            js: [
                'sql.select().from("recipe")',
                '   .joinLeft("recipe_ingredient", "recipe.id = recipe_ingredient.recipe_id")',
                '   .joinLeft("ingredient", "recipe_ingredient.ingredient_id = ingredient.id")'
            ]
        },

        {
            comment: 'select * from recipe join recipe_ingredient join ingredient, using aliased table names',
            js: [
                'sql.select().from({"r": "recipe"})',
                '   .joinLeft({"ri": "recipe_ingredient"}, "r.id = ri.recipe_id")',
                '   .joinLeft({"i": "ingredient"}, "ri.ingredient_id = i.id")'
            ]
        },

        {
            comment: 'the same, using aliased columns',
            js: [
                'sql.select({',
                '   "recipe_id": "r.id",',
                '   "recipe_name": "r.name",',
                '   "ingredient_id": "i.id",',
                '   "ingredient_name": "i.name"',
                '}).from({"r": "recipe"})',
                '.joinLeft({"ri": "recipe_ingredient"}, "r.id = ri.recipe_id")',
                '.joinLeft({"i": "ingredient"}, "ri.ingredient_id = i.id")'
            ]
        }
    ]
};
