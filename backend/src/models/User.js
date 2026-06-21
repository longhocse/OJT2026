const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    email: {
      type: "nvarchar",
      length: 255,
      unique: true,
    },
    password_hash: {
      type: "nvarchar",
      length: 255,
    },
    name: {
      type: "nvarchar",
      length: 100,
    },
    phone: {
      type: "nvarchar",
      length: 20,
      nullable: true,
    },
    role: {
      type: "nvarchar",
      length: 20,
      default: "customer",
    },
    created_at: {
      type: "datetime",
      createDate: true,
    },
  },
  relations: {
    bookings: {
      target: "Booking",
      type: "one-to-many",
      inverseSide: "user",
    },
    reviews: {
      target: "Review",
      type: "one-to-many",
      inverseSide: "user",
    },
  },
});
