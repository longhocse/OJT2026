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
    status: { type: "nvarchar", length: 20, default: "confirmed" },
    price: { type: "decimal", precision: 10, scale: 2 },
  },
  relations: {
    booking: {
      target: "Booking",
      type: "many-to-one",
      joinColumn: { name: "booking_id" },
      nullable: true,
      onDelete: "CASCADE",
    },
    seat: {
      target: "Seat",
      type: "many-to-one",
      joinColumn: { name: "seat_id" },
      nullable: true,
    },
  },
});
