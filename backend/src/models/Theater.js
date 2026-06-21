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
    name: { type: "nvarchar", length: 100 },
    address: { type: "nvarchar", length: 255, nullable: true },
    city: { type: "nvarchar", length: 50, nullable: true },
    phone: { type: "nvarchar", length: 20, nullable: true },
  },
  relations: {
    screens: {
      target: "Screen",
      type: "one-to-many",
      inverseSide: "theater",
    },
  },
});
