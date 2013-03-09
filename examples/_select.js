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
        }
    ]
};
