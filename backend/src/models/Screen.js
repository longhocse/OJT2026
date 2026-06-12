const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Screen",
  tableName: "screens",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    name: { type: "varchar" },
    total_seats: { type: "int" },
    layout_json: { type: "nvarchar", nullable: true },
  },
  relations: {
    theater: {
      target: "Theater",
      type: "many-to-one",
      joinColumn: { name: "theater_id" },
    },
    shows: {
      target: "Show",
      type: "one-to-many",
      inverseSide: "screen",
    },
    seats: {
      target: "Seat",
      type: "one-to-many",
      inverseSide: "screen",
    },
  },
});