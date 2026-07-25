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
    status: { type: "nvarchar", length: 20, default: "scheduled" },
    cancellation_reason: { type: "nvarchar", length: 500, nullable: true },
    cancelled_at: { type: "datetime2", nullable: true },
  },
  relations: {
    screen: {
      target: "Screen",
      type: "many-to-one",
      joinColumn: { name: "screen_id" },
      nullable: true,
    },
    movie: {
      target: "Movie",
      type: "many-to-one",
      joinColumn: { name: "movie_id" },
      nullable: true,
    },
    bookings: {
      target: "Booking",
      type: "one-to-many",
      inverseSide: "show",
    },
  },
});
