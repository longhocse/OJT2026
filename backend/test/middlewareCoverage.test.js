const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const { authMiddleware, adminMiddleware } = require("../src/middleware/authMiddleware");
const { errorHandler, notFoundHandler } = require("../src/middleware/errorHandler");

const responseRecorder = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("error middleware normalizes duplicate, internal and not-found responses", () => {
  const req = { id: "request-1", method: "POST", path: "/resource" };

  const duplicate = responseRecorder();
  errorHandler({ number: 2627 }, req, duplicate, () => {});
  assert.equal(duplicate.statusCode, 409);
  assert.deepEqual(duplicate.body, {
    code: "RESOURCE_CONFLICT",
    message: "Resource already exists",
    errors: [],
  });

  const internal = responseRecorder();
  errorHandler(new Error("database details must stay private"), req, internal, () => {});
  assert.equal(internal.statusCode, 500);
  assert.equal(internal.body.code, "INTERNAL_ERROR");
  assert.equal(internal.body.message, "Internal server error");

  const missing = responseRecorder();
  notFoundHandler({}, missing);
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.body.code, "ROUTE_NOT_FOUND");
});

test("auth and admin middleware cover missing, invalid and accepted credentials", () => {
  let error;
  authMiddleware({ headers: {} }, {}, (value) => {
    error = value;
  });
  assert.equal(error.status, 401);
  assert.equal(error.code, "AUTH_REQUIRED");

  error = null;
  authMiddleware({ headers: { authorization: "Bearer invalid" } }, {}, (value) => {
    error = value;
  });
  assert.equal(error.code, "INVALID_TOKEN");

  const token = jwt.sign({ id: "user-1", role: "admin" }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  let accepted = false;
  authMiddleware(req, {}, () => {
    accepted = true;
  });
  assert.equal(accepted, true);
  assert.equal(req.user.role, "admin");

  adminMiddleware(req, {}, () => {
    accepted = "admin";
  });
  assert.equal(accepted, "admin");

  error = null;
  adminMiddleware({ user: { role: "customer" } }, {}, (value) => {
    error = value;
  });
  assert.equal(error.code, "ADMIN_REQUIRED");
});
