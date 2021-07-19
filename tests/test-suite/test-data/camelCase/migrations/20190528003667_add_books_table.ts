
exports.up = async (knex) => {
  await knex.schema.createTable("books", table => {
    table.string("id").primary();
    table.string("title");
    table.dateTime("datePublished");
    table.integer("isbn");
    table
      .integer("author")
      .notNullable()
      .references("id")
      .inTable("users");
  });
}

exports.down = async (knex) => {
  await knex.schema.dropTable("books");
}
