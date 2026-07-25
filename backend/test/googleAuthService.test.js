const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const {
  findOrCreateGoogleUser,
  verifyGoogleIdToken,
} = require("../src/services/googleAuthService");

test("Google ID token verification requires a verified email and normalizes the profile", async () => {
  const client = {
    verifyIdToken: async ({ idToken, audience }) => {
      assert.equal(idToken, "credential");
      assert.equal(audience, "client-id.apps.googleusercontent.com");
      return {
        getPayload: () => ({
          sub: "google-subject",
          email: "USER@EXAMPLE.COM",
          email_verified: true,
          name: "Google User",
        }),
      };
    },
  };

  const profile = await verifyGoogleIdToken("credential", {
    clientId: "client-id.apps.googleusercontent.com",
    client,
  });
  assert.deepEqual(profile, {
    subject: "google-subject",
    email: "user@example.com",
    name: "Google User",
  });
});

test("Google login merges by verified email without replacing the existing password", async () => {
  const passwordHash = await bcrypt.hash("ExistingPass123", 4);
  const existing = {
    id: "user-1",
    email: "user@example.com",
    password_hash: passwordHash,
    is_active: true,
    email_verified_at: new Date(),
  };
  let saveCalls = 0;
  const repository = {
    findOne: async () => existing,
    save: async () => {
      saveCalls += 1;
    },
  };

  const user = await findOrCreateGoogleUser(
    { email: "user@example.com", name: "Google User" },
    repository,
  );
  assert.equal(user, existing);
  assert.equal(user.password_hash, passwordHash);
  assert.equal(saveCalls, 0);
});

test("a new Google user gets an unknown random password and verified email without a DB change", async () => {
  let saved;
  const repository = {
    findOne: async () => null,
    create: (value) => ({ id: "user-2", ...value }),
    save: async (value) => {
      saved = value;
      return value;
    },
  };

  const user = await findOrCreateGoogleUser(
    { email: "new@example.com", name: "New Google User" },
    repository,
  );
  assert.equal(user, saved);
  assert.equal(user.role, "customer");
  assert.ok(user.email_verified_at instanceof Date);
  assert.equal(await bcrypt.compare("DemoPass123!", user.password_hash), false);
});
