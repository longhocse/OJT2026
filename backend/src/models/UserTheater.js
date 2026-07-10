const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "UserTheater",
  tableName: "user_theaters",
  uniques: [
    {
      name: "UQ_user_theaters_user_theater",
      columns: ["user", "theater"],
    },
  ],
  checks: [
    {
      name: "CK_user_theaters_role",
      expression: "role_at_theater IN ('manager', 'cashier', 'ticket_checker')",
    },
  ],
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    role_at_theater: {
      type: "nvarchar",
      length: 30,
    },
    is_active: {
      type: "bit",
      default: true,
    },
    created_at: {
      type: "datetime2",
      createDate: true,
    },
  },
  relations: {
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: { name: "user_id" },
      nullable: false,
      onDelete: "CASCADE",
    },
    theater: {
      target: "Theater",
      type: "many-to-one",
      joinColumn: { name: "theater_id" },
      nullable: false,
      onDelete: "CASCADE",
    },
  },
});
