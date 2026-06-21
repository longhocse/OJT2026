const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

const routes = require("../src/routes");
const validation = require("../src/middleware/apiValidation");
const { errorHandler } = require("../src/middleware/errorHandler");
const { AppError } = require("../src/utils/AppError");
const { createSupertestFetch } = require("../test-support/supertestFetch");

const JWT_SECRET = "validation-test-secret";

const startTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.post("/validation/movie", validation.movieCreate, (req, res) => {
    res.json({ body: req.body });
  });
  app.post("/validation/register", validation.authRegister, (req, res) => {
    res.json({ body: req.body });
  });
  app.post("/validation/review/:movieId", validation.reviewCreate, (req, res) => {
    res.json({ body: req.body });
  });
  app.get("/validation/error", () => {
    throw new AppError(409, "TEST_CONFLICT", "Test conflict", [
      { field: "test", message: "conflict" },
    ]);
  });
  app.use("/api", routes);
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

test("API validation returns one consistent error contract", { concurrency: false }, async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = JWT_SECRET;
  const server = await startTestServer();
  t.after(async () => {
    await server.close();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const adminToken = jwt.sign(
    { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "admin" },
    JWT_SECRET,
    { expiresIn: "5m" },
  );
  const cases = [
    fetch(`${server.baseUrl}/api/movies/not-a-uuid`),
    fetch(`${server.baseUrl}/api/movies?limit=101`),
    fetch(`${server.baseUrl}/api/shows?movieId=invalid`),
    fetch(`${server.baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bad", password: "short", name: "" }),
    }),
    fetch(`${server.baseUrl}/api/movies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ title: "", duration: 0 }),
    }),
  ];

  for (const responsePromise of cases) {
    const response = await responsePromise;
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.code, "VALIDATION_ERROR");
    assert.equal(body.message, "Validation failed");
    assert.ok(Array.isArray(body.errors));
    assert.ok(body.errors.length > 0);
  }

  const validResponse = await fetch(`${server.baseUrl}/validation/movie`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Valid movie",
      duration: 120,
      rating: 5,
      status: "now_showing",
      unexpectedAdminField: true,
    }),
  });
  const validBody = await validResponse.json();
  assert.equal(validResponse.status, 200);
  assert.equal(validBody.body.title, "Valid movie");
  assert.equal(validBody.body.rating, 5);
  assert.equal("unexpectedAdminField" in validBody.body, false);

  const validRegister = await fetch(`${server.baseUrl}/validation/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "USER@EXAMPLE.COM",
      password: "StrongPass123",
      name: "Valid User",
      role: "admin",
    }),
  });
  const registerBody = await validRegister.json();
  assert.equal(validRegister.status, 200);
  assert.equal(registerBody.body.email, "user@example.com");
  assert.equal("role" in registerBody.body, false);

  const invalidRating = await fetch(
    `${server.baseUrl}/validation/review/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 6 }),
    },
  );
  assert.equal(invalidRating.status, 400);

  const errorResponse = await fetch(`${server.baseUrl}/validation/error`);
  const errorBody = await errorResponse.json();
  assert.equal(errorResponse.status, 409);
  assert.deepEqual(errorBody, {
    code: "TEST_CONFLICT",
    message: "Test conflict",
    errors: [{ field: "test", message: "conflict" }],
  });
});
