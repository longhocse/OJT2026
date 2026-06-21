const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const logger = require("../src/utils/logger");
const { envSchema } = require("../src/config/env");

test("security configuration and logging redact sensitive data", async (t) => {
  await t.test("structured logger recursively redacts sensitive keys", () => {
    const redacted = logger.redact({
      authorization: "Bearer value",
      nested: {
        password_hash: "hash",
        refreshToken: "token",
        safe: "visible",
      },
    });
    assert.equal(redacted.authorization, "[REDACTED]");
    assert.equal(redacted.nested.password_hash, "[REDACTED]");
    assert.equal(redacted.nested.refreshToken, "[REDACTED]");
    assert.equal(redacted.nested.safe, "visible");
  });

  await t.test("environment schema rejects missing secrets and DB configuration", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "production",
      PORT: "5000",
      CORS_ORIGIN: "https://example.com",
    });
    assert.equal(result.success, false);
    const fields = result.error.issues.map((issue) => issue.path.join("."));
    assert.ok(fields.includes("JWT_SECRET"));
    assert.ok(fields.includes("DB_HOST"));
    assert.ok(fields.includes("DB_PASSWORD"));
    assert.ok(fields.includes("DB_DATABASE"));
  });

  await t.test("source does not log request headers or password hashes", () => {
    const serverSource = fs.readFileSync(path.join(__dirname, "..", "src", "server.js"), "utf8");
    const authSource = fs.readFileSync(
      path.join(__dirname, "..", "src", "controllers", "authController.js"),
      "utf8",
    );
    assert.doesNotMatch(serverSource, /console\.log\([^\n]*(headers|authorization)/i);
    assert.doesNotMatch(authSource, /console\.log/);
  });
});
