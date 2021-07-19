
exports.up = async (knex) => {
  await knex.schema.createTable("links", table => {
    table.increments("id").primary();
    table.string("url");
  });
}

exports.down = async (knex) => {
  await knex.schema.dropTable("links");
}
