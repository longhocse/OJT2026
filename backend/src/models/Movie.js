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
    title: { type: "nvarchar", length: 200 },
    description: { type: "text", nullable: true },
    genre: { type: "nvarchar", length: 100, nullable: true },
    rating: { type: "float", default: 0 },
    duration: { type: "int" },
    poster_url: { type: "nvarchar", length: 500, nullable: true },
    trailer_url: { type: "nvarchar", length: 500, nullable: true },
    release_date: { type: "date", nullable: true },
    status: { type: "nvarchar", length: 20, default: "coming_soon" },
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
