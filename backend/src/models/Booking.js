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
    status: { type: "nvarchar", length: 20, default: "pending_payment" },
    payment_method: { type: "nvarchar", length: 50, nullable: true },
    payment_status: { type: "nvarchar", length: 30, default: "pending" },
    refunded_amount: { type: "decimal", precision: 10, scale: 2, default: 0 },
    cancellation_reason: { type: "nvarchar", length: 500, nullable: true },
    cancelled_at: { type: "datetime2", nullable: true },
    expires_at: { type: "datetime2", nullable: true },
    ticket_code: { type: "nvarchar", length: 40, nullable: true, unique: true },
    checked_in_at: { type: "datetime2", nullable: true },
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
    payment: {
      target: "Payment",
      type: "one-to-one",
      inverseSide: "booking",
    },
  },
});
