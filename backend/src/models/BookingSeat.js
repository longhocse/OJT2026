const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "BookingSeat",
  tableName: "booking_seats",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    status: { type: "varchar", default: "confirmed" },
    price: { type: "decimal", precision: 10, scale: 2 },
  },
  relations: {
    booking: {
      target: "Booking",
      type: "many-to-one",
      joinColumn: { name: "booking_id" },
    },
    seat: {
      target: "Seat",
      type: "many-to-one",
      joinColumn: { name: "seat_id" },
    },
  },
});