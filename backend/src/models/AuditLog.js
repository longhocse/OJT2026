const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "AuditLog",
  tableName: "audit_logs",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    actor_user_id: { type: "uuid", nullable: true },
    action: { type: "nvarchar", length: 100 },
    resource_type: { type: "nvarchar", length: 100 },
    resource_id: { type: "uuid", nullable: true },
    metadata_json: { type: "nvarchar", length: "MAX", nullable: true },
    created_at: { type: "datetime2", createDate: true },
  },
  relations: {
    actor: {
      target: "User",
      type: "many-to-one",
      joinColumn: { name: "actor_user_id" },
      nullable: true,
      onDelete: "SET NULL",
    },
  },
});
