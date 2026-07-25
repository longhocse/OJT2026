const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "RefreshToken",
  tableName: "refresh_tokens",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid" },
    token_hash: { type: "char", length: 64, unique: true },
    family_id: { type: "uuid" },
    expires_at: { type: "datetime2" },
    revoked_at: { type: "datetime2", nullable: true },
    replaced_by_hash: { type: "char", length: 64, nullable: true },
    created_at: { type: "datetime2", createDate: true },
  },
  relations: {
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: { name: "user_id" },
      nullable: false,
      onDelete: "CASCADE",
    },
  },
});
