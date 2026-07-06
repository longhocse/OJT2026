const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "PasswordResetToken",
  tableName: "password_reset_tokens",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid" },
    token_hash: { type: "char", length: 64, unique: true },
    expires_at: { type: "datetime2" },
    used_at: { type: "datetime2", nullable: true },
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
