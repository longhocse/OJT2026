const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Show",
  tableName: "shows",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    start_time: { type: "datetime" },
    end_time: { type: "datetime" },
    price: { type: "decimal", precision: 10, scale: 2 },
  },
  relations: {
    screen: {
      target: "Screen",
      type: "many-to-one",
      joinColumn: { name: "screen_id" },
    },
    movie: {
      target: "Movie",
      type: "many-to-one",
      joinColumn: { name: "movie_id" },
    },
    bookings: {
      target: "Booking",
      type: "one-to-many",
      inverseSide: "show",
    },
  },
});