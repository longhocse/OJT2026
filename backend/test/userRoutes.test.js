const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

const { AppDataSource } = require("../src/config/database");
const userRoutes = require("../src/routes/userRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");
const { createSupertestFetch } = require("../test-support/supertestFetch");

const JWT_SECRET = "user-route-test-secret";

const startTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/users", userRoutes);
  app.use(errorHandler);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createSupertestFetch(app);

  return {
    baseUrl: "http://test.local",
    close: async () => {
      globalThis.fetch = originalFetch;
    },
  };
};

const tokenFor = (role) =>
  jwt.sign({ id: `${role}-id`, email: `${role}@example.com`, role }, JWT_SECRET, {
    expiresIn: "5m",
  });

test("GET /api/users authorization", { concurrency: false }, async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  const originalGetRepository = AppDataSource.getRepository;
  process.env.JWT_SECRET = JWT_SECRET;

  AppDataSource.getRepository = () => ({
    findAndCount: async (options) => {
      assert.equal(options.skip, 20);
      assert.equal(options.take, 20);
      assert.equal(options.where.length, 2);

      return [
        [
          {
            id: "admin-id",
            name: "Admin User",
            email: "admin@example.com",
            phone: "0900000000",
            role: "admin",
            created_at: new Date("2026-01-01T00:00:00Z"),
            password_hash: "must-never-be-returned",
          },
        ],
        21,
      ];
    },
  });

  const server = await startTestServer();
  t.after(async () => {
    await server.close();
    AppDataSource.getRepository = originalGetRepository;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  await t.test("rejects an unauthenticated request", async () => {
    const response = await fetch(`${server.baseUrl}/api/users`);
    assert.equal(response.status, 401);
  });

  await t.test("rejects a customer", async () => {
    const response = await fetch(`${server.baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${tokenFor("customer")}` },
    });
    assert.equal(response.status, 403);
  });

  await t.test("rejects invalid pagination", async () => {
    const headers = { Authorization: `Bearer ${tokenFor("admin")}` };
    const invalidPage = await fetch(`${server.baseUrl}/api/users?page=0&limit=20`, { headers });
    const excessiveLimit = await fetch(`${server.baseUrl}/api/users?page=1&limit=101`, { headers });

    assert.equal(invalidPage.status, 400);
    assert.equal(excessiveLimit.status, 400);
  });

  await t.test("allows an admin and omits password_hash", async () => {
    const response = await fetch(`${server.baseUrl}/api/users?page=2&limit=20&search=admin`, {
      headers: { Authorization: `Bearer ${tokenFor("admin")}` },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
    assert.equal("password_hash" in body.data[0], false);
    assert.deepEqual(body.pagination, {
      page: 2,
      limit: 20,
      total: 21,
      pages: 2,
    });
  });
});
