module.exports = {
    comment: 'select examples',
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
        }
    ]
};
