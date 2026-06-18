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
      type: "varchar",
      unique: true,
    },
    password_hash: {
      type: "varchar",
    },
    name: {
      type: "varchar",
    },
    phone: {
      type: "varchar",
      nullable: true,
    },
    role: {
  type: "varchar",
  default: "customer"

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