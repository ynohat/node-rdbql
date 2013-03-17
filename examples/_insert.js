module.exports = {
    comment: 'add some recipes',
    transaction: [
        {
            comment: 'add a few ingredients, using the object syntax',
            js: [
                'sql.insert("ingredient").values(',
                '   {id: 1, name: sql.$("egg")},',
                '   {id: 2, name: sql.$("flour")}',
                ')'
            ]
        },

        {
            comment: 'add a few recipes, using the array syntax',
            js: [
                'sql.insert("recipe")',
                '   .columns("id", "feeds", "name") /* this call is optional */',
                '   .values(',
                '      [1, 2, sql.$("omelet")],',
                '      [2, 4, sql.$("puff pastry")],',
                '      [3, 4, sql.$("shortbread cookies")]',
                '   )'
            ]
        },

        {
            comment: 'associate ingredients and recipes, using the mixed object/array syntax',
            js: [
                'sql.insert("recipe_ingredient")',
                '   .columns( /* this call is compulsory when mixing arrays and objects */',
                '       "recipe_id",',
                '       "ingredient_id",',
                '       "quantity",',
                '       "unit"',
                '   ).values(',
                '      [1 /* omelet */, 1 /* egg */, 6 /* 3 eggs per person... */, sql.null()],',
                '      {',
                '           recipe_id: 1 /* omelet */,',
                '           ingredient_id: 3 /* butter for the pan */,',
                '           quantity: 1,',
                '           unit: sql.$("oz") /* ounces... */',
                '      }',
                '   )'
            ]
        }
    ]
};
