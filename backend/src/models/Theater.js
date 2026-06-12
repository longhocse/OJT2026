const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Theater",
  tableName: "theaters",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    name: { type: "varchar" },
    address: { type: "varchar" },
    city: { type: "varchar" },
    phone: { type: "varchar", nullable: true },
  },
  relations: {
    screens: {
      target: "Screen",
      type: "one-to-many",
      inverseSide: "theater",
    },
  },
});