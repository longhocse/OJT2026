// backend/src/models/Genre.js
const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Genre",
  tableName: "genres",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    name: {
      type: "varchar",
      unique: true,
    },
    description: {
      type: "varchar",
      nullable: true,
    },
    created_at: {
      type: "datetime",
      createDate: true,
    },
  },
});