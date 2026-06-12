const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Review",
  tableName: "reviews",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    rating: { type: "float" },
    comment: { type: "text" },
    created_at: { type: "datetime", createDate: true },
  },
  relations: {
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: { name: "user_id" },
    },
    movie: {
      target: "Movie",
      type: "many-to-one",
      joinColumn: { name: "movie_id" },
    },
  },
});