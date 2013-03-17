module.exports = {
    comment: 'DELETE examples',
    transaction: [
        {
            comment: 'who are we kidding, we cannot handle puff pastry',
            transaction: [
                {
                    comment: 'so we need to remove the recipe...',
                    js: [
                        'sql.delete("recipe").where("id = 2")'
                    ]
                },
                {
                    comment: 'and any association with ingredients',
                    js: [
                        'sql.delete("recipe_ingredient").where("recipe_id = 2")'
                    ]
                },
                {
                    comment: 'and any ingredient that was only there for puff pastry',
                    js: [
                        'var selectRecipeIngredientId = sql.select("ingredient_id").from("recipe_ingredient");',
                        'sql.delete("ingredient")',
                        '   .where(sql.$("id NOT IN (?)", selectRecipeIngredientId))'
                    ]
                }
            ]
        }
    ]
};
