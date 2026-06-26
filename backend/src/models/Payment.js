const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Payment",
  tableName: "payments",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid" },
    provider: { type: "nvarchar", length: 30 },
    provider_transaction_id: { type: "nvarchar", length: 100, nullable: true, unique: true },
    amount: { type: "decimal", precision: 10, scale: 2 },
    status: { type: "nvarchar", length: 30, default: "pending" },
    idempotency_key: { type: "uuid", unique: true },
    paid_at: { type: "datetime2", nullable: true },
    failed_at: { type: "datetime2", nullable: true },
    refunded_amount: { type: "decimal", precision: 10, scale: 2, default: 0 },
    created_at: { type: "datetime2", createDate: true },
    updated_at: { type: "datetime2", updateDate: true },
  },
  relations: {
    booking: {
      target: "Booking",
      type: "one-to-one",
      joinColumn: { name: "booking_id" },
      nullable: false,
      onDelete: "CASCADE",
    },
  },
});
