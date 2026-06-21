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
      type: "nvarchar",
      length: 100,
      unique: true,
    },
    description: {
      type: "nvarchar",
      length: 500,
      nullable: true,
    },
    created_at: {
      type: "datetime",
      createDate: true,
    },
  },
});
