const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    email: {
      type: "nvarchar",
      length: 255,
      unique: true,
    },
    password_hash: {
      type: "nvarchar",
      length: 255,
    },
    name: {
      type: "nvarchar",
      length: 100,
    },
    phone: {
      type: "nvarchar",
      length: 20,
      nullable: true,
    },
    role: {
      type: "nvarchar",
      length: 20,
      default: "customer",
    },
    theater_id: {
      type: "uuid",
      nullable: true,
    },
    is_active: {
      type: "bit",
      default: true,
    },
    email_verified_at: {
      type: "datetime2",
      nullable: true,
    },
    created_at: {
      type: "datetime",
      createDate: true,
    },
  },
  relations: {
    theater: {
      target: "Theater",
      type: "many-to-one",
      joinColumn: {
        name: "theater_id",
      },
    },
    bookings: {
      target: "Booking",
      type: "one-to-many",
      inverseSide: "user",
    },
    reviews: {
      target: "Review",
      type: "one-to-many",
      inverseSide: "user",
    },
    refreshTokens: {
      target: "RefreshToken",
      type: "one-to-many",
      inverseSide: "user",
    },
    passwordResetTokens: {
      target: "PasswordResetToken",
      type: "one-to-many",
      inverseSide: "user",
    },
    emailVerificationTokens: {
      target: "EmailVerificationToken",
      type: "one-to-many",
      inverseSide: "user",
    },
  },
});
