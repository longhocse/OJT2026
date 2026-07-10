const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Review",
  tableName: "reviews",
  uniques: [
    {
      name: "UQ_reviews_user_movie",
      columns: ["user", "movie"],
    },
  ],
  checks: [
    {
      name: "CK_reviews_rating",
      expression: "rating >= 1 AND rating <= 5",
    },
  ],
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    rating: { type: "float" },
    comment: { type: "nvarchar", length: "MAX", nullable: true },
    created_at: { type: "datetime", createDate: true },
    updated_at: { type: "datetime2", updateDate: true },
  },
  relations: {
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: { name: "user_id" },
      nullable: false,
    },
    movie: {
      target: "Movie",
      type: "many-to-one",
      joinColumn: { name: "movie_id" },
      nullable: false,
    },
  },
});
