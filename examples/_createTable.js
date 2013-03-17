module.exports = {
    comment: 'create the database schema',
    transaction: [
        {
            comment: 'create the ingredient table',
            js: [
                'sql.createTable("ingredient").columns(',
                '   "id INT",',
                '   "name TEXT"',
                ')'
            ]
        },

        {
            comment: 'create the recipe table',
            js: [
                'sql.createTable("recipe").columns(',
                '   "id INT",',
                '   "feeds INT", /* how many people the recipe will feed :) */',
                '   "name TEXT"',
                ')'
            ]
        },

        {
            comment: 'create the recipe_ingredient table',
            js: [
                'sql.createTable("recipe_ingredient").columns(',
                '   "recipe_id INT",',
                '   "ingredient_id INT",',
                '   "quantity NUMERIC",',
                '   "unit TEXT"',
                ')'
            ]
        }
    ]
};
