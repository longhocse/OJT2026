const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const bcrypt = require("bcryptjs");

const { AppDataSource } = require("../src/config/database");
const { createApp } = require("../src/app");
const { envSchema } = require("../src/config/env");
const { createGracefulShutdown } = require("../src/server");
const authRoutes = require("../src/routes/authRoutes");
const movieRoutes = require("../src/routes/movieRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MOVIE_ID = "11111111-1111-4111-8111-111111111111";

const routeApp = (path, router) => {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  app.use(errorHandler);
  return app;
};

test("app can be tested without starting the HTTP or database server", async () => {
  const app = createApp({ enableRequestLogging: false });
  const response = await request(app).get("/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(AppDataSource.options.database, "MovieTapTestDB");
  assert.equal(AppDataSource.isInitialized, false);
});

test("health, readiness and CORS expose production-safe behavior", async () => {
  const readyDataSource = { isInitialized: true, query: async () => [{ ready: 1 }] };
  const app = createApp({ enableRequestLogging: false, dataSource: readyDataSource });

  const ready = await request(app)
    .get("/ready")
    .set("Origin", process.env.CORS_ORIGIN || "http://localhost:3000");
  assert.equal(ready.status, 200);
  assert.equal(ready.body.status, "ready");

  const denied = await request(app).get("/health").set("Origin", "https://untrusted.example");
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, "CORS_ORIGIN_DENIED");

  const unavailable = createApp({
    enableRequestLogging: false,
    dataSource: { isInitialized: false },
  });
  assert.equal((await request(unavailable).get("/ready")).status, 503);

  const broken = createApp({
    enableRequestLogging: false,
    dataSource: {
      isInitialized: true,
      query: async () => Promise.reject(new Error("db unavailable")),
    },
  });
  assert.equal((await request(broken).get("/ready")).status, 503);
});

test("production environment rejects wildcard CORS", () => {
  const result = envSchema.safeParse({
    NODE_ENV: "production",
    DB_HOST: "sqlserver",
    DB_USERNAME: "sa",
    DB_PASSWORD: "database-password-strong",
    DB_DATABASE: "MovieTapDB",
    JWT_SECRET: "a-production-jwt-secret-with-32-chars",
    CORS_ORIGINS: "*",
  });
  assert.equal(result.success, false);
});

test("graceful shutdown closes HTTP once and then database", async () => {
  const calls = [];
  const server = {
    close(callback) {
      calls.push("http");
      callback();
    },
    closeIdleConnections() {
      calls.push("idle");
    },
  };
  const dataSource = {
    isInitialized: true,
    async destroy() {
      calls.push("database");
    },
  };
  const shutdown = createGracefulShutdown({ server, dataSource, timeoutMs: 100 });
  const first = shutdown("SIGTERM");
  const second = shutdown("SIGINT");
  assert.equal(first, second);
  await first;
  assert.deepEqual(calls, ["http", "idle", "database"]);
});

test("auth register, login and profile flow", { concurrency: false }, async (t) => {
  const originalGetRepository = AppDataSource.getRepository;
  const originalCreateQueryRunner = AppDataSource.createQueryRunner;
  const repository = AppDataSource.getRepository("User");
  const originals = {
    findOne: repository.findOne,
    create: repository.create,
    save: repository.save,
  };
  let storedUser = null;
  const refreshTokens = [];
  const verificationTokens = [];
  const refreshRepository = {
    create: (data) => ({ id: `refresh-${refreshTokens.length + 1}`, ...data }),
    save: async (token) => {
      refreshTokens.push(token);
      return token;
    },
  };
  const verificationRepository = {
    create: (data) => ({ id: `verification-${verificationTokens.length + 1}`, ...data }),
    save: async (token) => {
      verificationTokens.push(token);
      return token;
    },
  };
  AppDataSource.getRepository = (name) => {
    if (name === "User") return repository;
    if (name === "RefreshToken") return refreshRepository;
    if (name === "EmailVerificationToken") return verificationRepository;
    return originalGetRepository.call(AppDataSource, name);
  };
  AppDataSource.createQueryRunner = () => ({
    manager: {
      getRepository: (name) => {
        if (name === "User") return repository;
        if (name === "EmailVerificationToken") return verificationRepository;
        return AppDataSource.getRepository(name);
      },
    },
    connect: async () => {},
    startTransaction: async () => {},
    commitTransaction: async () => {},
    rollbackTransaction: async () => {},
    release: async () => {},
    isTransactionActive: true,
  });
  repository.findOne = async ({ where }) => {
    if (where.email) return storedUser?.email === where.email ? storedUser : null;
    if (where.id) return storedUser?.id === where.id ? storedUser : null;
    return null;
  };
  repository.create = (data) => ({ id: USER_ID, created_at: new Date(), ...data });
  repository.save = async (user) => {
    storedUser = user;
    return user;
  };
  t.after(() => {
    Object.assign(repository, originals);
    AppDataSource.getRepository = originalGetRepository;
    AppDataSource.createQueryRunner = originalCreateQueryRunner;
  });

  const app = routeApp("/api/auth", authRoutes);
  const register = await request(app).post("/api/auth/register").send({
    email: "NEW@EXAMPLE.COM",
    password: "StrongPass123",
    name: "New User",
    role: "admin",
  });
  assert.equal(register.status, 201);
  assert.equal(register.body.email, "new@example.com");
  assert.equal(register.body.emailSent, false);
  assert.ok(register.body.verificationToken);
  assert.equal(await bcrypt.compare("StrongPass123", storedUser.password_hash), true);
  assert.equal(storedUser.email_verified_at, null);

  const invalidLogin = await request(app).post("/api/auth/login").send({
    email: "new@example.com",
    password: "wrong",
  });
  assert.equal(invalidLogin.status, 401);
  assert.equal(invalidLogin.body.code, "INVALID_CREDENTIALS");

  const unverifiedLogin = await request(app).post("/api/auth/login").send({
    email: "new@example.com",
    password: "StrongPass123",
  });
  assert.equal(unverifiedLogin.status, 403);
  assert.equal(unverifiedLogin.body.code, "EMAIL_NOT_VERIFIED");

  storedUser.email_verified_at = new Date();

  const login = await request(app).post("/api/auth/login").send({
    email: "new@example.com",
    password: "StrongPass123",
  });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  assert.match(login.headers["set-cookie"][0], /^movietap_refresh=/);

  const profile = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${login.body.token}`);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.id, USER_ID);
  assert.equal("password_hash" in profile.body, false);
});

test("admin can create, update and delete movies", { concurrency: false }, async (t) => {
  const originalGetRepository = AppDataSource.getRepository;
  let movie = null;
  const repository = {
    create: (data) => ({ id: MOVIE_ID, rating: 0, ...data }),
    save: async (entity) => {
      movie = entity;
      return entity;
    },
    findOneBy: async ({ id }) => (id === MOVIE_ID ? movie : null),
    findOne: async ({ where }) => (where.id === MOVIE_ID ? movie : null),
    merge: (entity, data) => Object.assign(entity, data),
    delete: async (id) => ({ affected: id === MOVIE_ID ? 1 : 0 }),
  };
  AppDataSource.getRepository = (name) => {
    if (name === "Movie") return repository;
    return originalGetRepository.call(AppDataSource, name);
  };
  t.after(() => {
    AppDataSource.getRepository = originalGetRepository;
  });

  const app = routeApp("/api/movies", movieRoutes);
  const adminToken = require("jsonwebtoken").sign(
    { id: USER_ID, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" },
  );
  const customerToken = require("jsonwebtoken").sign(
    { id: USER_ID, role: "customer" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" },
  );
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const denied = await request(app)
    .post("/api/movies")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ title: "Movie", duration: 120 });
  assert.equal(denied.status, 403);

  const created = await request(app)
    .post("/api/movies")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      title: "Movie",
      duration: 120,
      description: "",
      poster_url: "",
      release_date: "",
      unexpected: "stripped",
    });
  assert.equal(created.status, 201);
  assert.equal("unexpected" in created.body, false);
  assert.equal(created.body.description, null);
  assert.equal(created.body.poster_url, null);
  assert.equal(created.body.release_date, null);

  globalThis.fetch = async () => ({
    headers: { get: () => "text/html; charset=utf-8" },
    text: async () =>
      '<html><head><meta property="og:image" content="/images/poster.webp"></head></html>',
  });
  const createdFromPagePoster = await request(app)
    .post("/api/movies")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      title: "Movie With Page Poster",
      duration: 120,
      poster_url: "https://example.com/movie-page",
      trailer_url: "https://www.youtube.com/watch?v=0wTIniZRYXU",
    });
  assert.equal(createdFromPagePoster.status, 201);
  assert.equal(createdFromPagePoster.body.poster_url, "https://example.com/images/poster.webp");
  assert.equal(createdFromPagePoster.body.trailer_url, "https://www.youtube.com/embed/0wTIniZRYXU");

  const updated = await request(app)
    .put(`/api/movies/${MOVIE_ID}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ title: "Updated Movie", rating: 5 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.title, "Updated Movie");

  const deleted = await request(app)
    .delete(`/api/movies/${MOVIE_ID}`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(deleted.status, 200);
});
