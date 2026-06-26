const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const request = require("supertest");

const { AppDataSource } = require("../src/config/database");
const authRoutes = require("../src/routes/authRoutes");
const userRoutes = require("../src/routes/userRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");
const { hashToken } = require("../src/services/authTokenService");

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ADMIN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const FAMILY_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use(errorHandler);

const token = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "5m" });

const createRunner = (repositories) => {
  let active = false;
  return {
    manager: { getRepository: (name) => repositories[name] },
    connect: async () => {},
    startTransaction: async () => {
      active = true;
    },
    commitTransaction: async () => {
      active = false;
    },
    rollbackTransaction: async () => {
      active = false;
    },
    release: async () => {},
    get isTransactionActive() {
      return active;
    },
  };
};

test("locked accounts cannot log in", async (t) => {
  const original = AppDataSource.getRepository;
  const user = {
    id: USER_ID,
    email: "locked@example.com",
    password_hash: await bcrypt.hash("StrongPass123", 4),
    role: "customer",
    is_active: false,
  };
  AppDataSource.getRepository = (name) =>
    name === "User" ? { findOne: async () => user } : original.call(AppDataSource, name);
  t.after(() => {
    AppDataSource.getRepository = original;
  });

  const response = await request(app).post("/api/auth/login").send({
    email: user.email,
    password: "StrongPass123",
  });
  assert.equal(response.status, 403);
  assert.equal(response.body.code, "ACCOUNT_LOCKED");
});

test("refresh token rotation detects reuse and revokes the token family", async (t) => {
  const original = AppDataSource.createQueryRunner;
  const rawToken = "original-refresh-token-value-for-reuse-test";
  const records = [];
  const current = {
    id: "refresh-1",
    token_hash: hashToken(rawToken),
    family_id: FAMILY_ID,
    expires_at: new Date(Date.now() + 60000),
    revoked_at: null,
    replaced_by_hash: null,
    user: {
      id: USER_ID,
      email: "user@example.com",
      name: "User",
      role: "customer",
      is_active: true,
    },
  };
  records.push(current);
  let familyRevoked = false;
  const repository = {
    findOne: async ({ where }) => records.find((item) => item.token_hash === where.token_hash),
    create: (data) => ({ id: `refresh-${records.length + 1}`, ...data }),
    save: async (value) => {
      if (!records.includes(value)) records.push(value);
      return value;
    },
    createQueryBuilder: () => ({
      update() {
        return this;
      },
      set() {
        return this;
      },
      where() {
        return this;
      },
      async execute() {
        familyRevoked = true;
        for (const record of records) record.revoked_at ||= new Date();
      },
    }),
  };
  AppDataSource.createQueryRunner = () => createRunner({ RefreshToken: repository });
  t.after(() => {
    AppDataSource.createQueryRunner = original;
  });

  const first = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", `movietap_refresh=${rawToken}`);
  assert.equal(first.status, 200);
  assert.ok(first.body.token);
  assert.match(first.headers["set-cookie"][0], /^movietap_refresh=/);
  assert.ok(current.revoked_at);
  assert.ok(current.replaced_by_hash);

  const reused = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", `movietap_refresh=${rawToken}`);
  assert.equal(reused.status, 401);
  assert.equal(reused.body.code, "REFRESH_TOKEN_REUSED");
  assert.equal(familyRevoked, true);
});

test("locked accounts cannot refresh", async (t) => {
  const original = AppDataSource.createQueryRunner;
  const rawToken = "locked-account-refresh-token-value-for-test";
  const current = {
    token_hash: hashToken(rawToken),
    family_id: FAMILY_ID,
    expires_at: new Date(Date.now() + 60000),
    revoked_at: null,
    user: { id: USER_ID, role: "customer", is_active: false },
  };
  const repository = {
    findOne: async () => current,
    save: async (value) => value,
  };
  AppDataSource.createQueryRunner = () => createRunner({ RefreshToken: repository });
  t.after(() => {
    AppDataSource.createQueryRunner = original;
  });

  const response = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", `movietap_refresh=${rawToken}`);
  assert.equal(response.status, 403);
  assert.equal(response.body.code, "ACCOUNT_LOCKED");
  assert.ok(current.revoked_at);
});

test("expired password reset tokens are rejected", async (t) => {
  const original = AppDataSource.createQueryRunner;
  const rawToken = "expired-password-reset-token-value-123456789";
  const reset = {
    token_hash: hashToken(rawToken),
    expires_at: new Date(Date.now() - 1000),
    used_at: null,
    user: { id: USER_ID, is_active: true },
  };
  const repository = { findOne: async () => reset };
  AppDataSource.createQueryRunner = () =>
    createRunner({ PasswordResetToken: repository, User: { save: async () => {} } });
  t.after(() => {
    AppDataSource.createQueryRunner = original;
  });

  const response = await request(app).post("/api/auth/reset-password").send({
    token: rawToken,
    newPassword: "AnotherStrong123",
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.code, "RESET_TOKEN_EXPIRED");
});

test("profile owner can update safe fields", async (t) => {
  const original = AppDataSource.getRepository;
  const user = {
    id: USER_ID,
    email: "user@example.com",
    name: "Old Name",
    phone: null,
    role: "customer",
    is_active: true,
    password_hash: "never-return",
  };
  AppDataSource.getRepository = (name) =>
    name === "User"
      ? { findOne: async () => user, save: async (value) => value }
      : original.call(AppDataSource, name);
  t.after(() => {
    AppDataSource.getRepository = original;
  });

  const response = await request(app)
    .put("/api/auth/profile")
    .set("Authorization", `Bearer ${token(USER_ID, "customer")}`)
    .send({ name: "New Name", phone: "0900000000" });
  assert.equal(response.status, 200);
  assert.equal(response.body.name, "New Name");
  assert.equal("password_hash" in response.body, false);
});

test("user access management is admin-only and protects the final active admin", async (t) => {
  const original = AppDataSource.createQueryRunner;
  const target = { id: ADMIN_ID, role: "admin", is_active: true };
  const repository = {
    findOne: async () => target,
    count: async () => 1,
    save: async (value) => value,
  };
  AppDataSource.createQueryRunner = () => createRunner({ User: repository, RefreshToken: {} });
  t.after(() => {
    AppDataSource.createQueryRunner = original;
  });

  const denied = await request(app)
    .patch(`/api/users/${ADMIN_ID}`)
    .set("Authorization", `Bearer ${token(USER_ID, "customer")}`)
    .send({ role: "customer" });
  assert.equal(denied.status, 403);

  const protectedAdmin = await request(app)
    .patch(`/api/users/${ADMIN_ID}`)
    .set("Authorization", `Bearer ${token(ADMIN_ID, "admin")}`)
    .send({ role: "customer" });
  assert.equal(protectedAdmin.status, 409);
  assert.equal(protectedAdmin.body.code, "LAST_ADMIN_REQUIRED");
});
