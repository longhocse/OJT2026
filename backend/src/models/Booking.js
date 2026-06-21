const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Booking",
  tableName: "bookings",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    total_price: { type: "decimal", precision: 10, scale: 2 },
    status: { type: "nvarchar", length: 20, default: "pending" },
    payment_method: { type: "nvarchar", length: 50, nullable: true },
    created_at: { type: "datetime", createDate: true },
  },
  relations: {
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: { name: "user_id" },
      nullable: true,
    },
    show: {
      target: "Show",
      type: "many-to-one",
      joinColumn: { name: "show_id" },
      nullable: true,
    },
    bookingSeats: {
      target: "BookingSeat",
      type: "one-to-many",
      inverseSide: "booking",
    },
  },
});
