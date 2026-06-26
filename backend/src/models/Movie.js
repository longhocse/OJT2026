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
    rating: { type: "float", default: 0 },
    duration: { type: "int" },
    director: { type: "nvarchar", length: 200, nullable: true },
    cast: { name: "cast_members", type: "nvarchar", length: 2000, nullable: true },
    language: { type: "nvarchar", length: 100, nullable: true },
    country: { type: "nvarchar", length: 100, nullable: true },
    age_rating: { type: "nvarchar", length: 20, nullable: true },
    poster_url: { type: "nvarchar", length: 500, nullable: true },
    trailer_url: { type: "nvarchar", length: 500, nullable: true },
    release_date: { type: "date", nullable: true },
    status: { type: "nvarchar", length: 20, default: "coming_soon" },
    is_active: { type: "bit", default: true },
    created_at: { type: "datetime", createDate: true },
  },
  relations: {
    genres: {
      target: "Genre",
      type: "many-to-many",
      joinTable: {
        name: "movie_genres",
        joinColumn: { name: "movie_id", referencedColumnName: "id" },
        inverseJoinColumn: { name: "genre_id", referencedColumnName: "id" },
      },
    },
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
