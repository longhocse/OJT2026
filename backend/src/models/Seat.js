const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Seat",
  tableName: "seats",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    row: { type: "char", length: 2 },
    number: { type: "int" },
    type: { type: "varchar", default: "standard" },
    status: { type: "varchar", default: "available" },
    locked_until: { type: "datetime", nullable: true },
  },
  relations: {
    screen: {
      target: "Screen",
      type: "many-to-one",
      joinColumn: { name: "screen_id" },
    },
    bookingSeats: {
      target: "BookingSeat",
      type: "one-to-many",
      inverseSide: "seat",
    },
  },
});