const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Movie",
  tableName: "movies",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    title: { type: "varchar" },
    description: { type: "text" },
    genre: { type: "nvarchar" },
    rating: { type: "float", default: 0 },
    duration: { type: "int" },
    poster_url: { type: "varchar", nullable: true },
    trailer_url: { type: "varchar", nullable: true },
    release_date: { type: "date" },
    status: { type: "varchar", default: "coming_soon" },
    created_at: { type: "datetime", createDate: true },
  },
  relations: {
    shows: {
      target: "Show",
      type: "one-to-many",
      inverseSide: "movie",
    },
    reviews: {
      target: "Review",
      type: "one-to-many",
      inverseSide: "movie",
    },
  },
});