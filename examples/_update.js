module.exports = {
    comment: 'UPDATE examples',
    transaction: [
        {
            comment: 'make the "omelet" recipe (id = 1) feed 4, not 2 people',
            transaction: [
                {
                    comment: 'update ingredient quantities...',
                    js: [
                        'sql.update("recipe_ingredient")',
                        '   .set({"quantity": "quantity * 2"})',
                        '   .where("recipe_id = 1")'
                    ]
                },

                {
                    comment: 'update recipe "feeds" field to match',
                    js: [
                        'sql.update("recipe")',
                        '   .set({"feeds": "feeds * 2"})',
                        '   .where("id = 1")'
                    ]
                },

                {
                    comment: 'check our results',
                    js: [
                        'sql.select({',
                        '   "recipe": "r.name",',
                        '   "feeds": "r.feeds",',
                        '   "ingredient": "i.name",',
                        '   "quantity": "ri.quantity"',
                        '}).from({"r": "recipe"})',
                        '.join({"ri": "recipe_ingredient"}, "r.id = ri.recipe_id")',
                        '.join({"i": "ingredient"}, "ri.ingredient_id = i.id")',
                        '.where("r.id = 1")'
                    ]
                }
            ]
        }
    ]
};
