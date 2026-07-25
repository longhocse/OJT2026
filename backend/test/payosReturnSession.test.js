const test = require("node:test");
const assert = require("node:assert/strict");
const {
  signPayOSReturnSession,
  verifyPayOSReturnSession,
} = require("../src/payments/payosReturnSession");

test("PayOS return sessions are signed and bound to both order and user", () => {
  const token = signPayOSReturnSession({ orderCode: "123456", userId: "user-1" });
  const payload = verifyPayOSReturnSession(token, {
    orderCode: "123456",
    userId: "user-1",
  });
  assert.equal(payload.orderCode, "123456");
  assert.equal(payload.userId, "user-1");
  assert.throws(
    () => verifyPayOSReturnSession(token, { orderCode: "654321", userId: "user-1" }),
    /mismatch/i,
  );
});
