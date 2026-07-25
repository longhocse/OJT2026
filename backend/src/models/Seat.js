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
    row: { name: "seat_row", type: "char", length: 2 },
    number: { name: "seat_number", type: "int" },
    type: { type: "nvarchar", length: 20, default: "standard" },
    status: { type: "nvarchar", length: 20, default: "available" },
    locked_until: { type: "datetime", nullable: true },
  },
  relations: {
    screen: {
      target: "Screen",
      type: "many-to-one",
      joinColumn: { name: "screen_id" },
      nullable: true,
    },
    bookingSeats: {
      target: "BookingSeat",
      type: "one-to-many",
      inverseSide: "seat",
    },
  },
});
