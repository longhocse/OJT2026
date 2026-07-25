const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

const TOKEN_OPTIONS = { audience: "payos-return", issuer: "movietap" };

const signPayOSReturnSession = ({ orderCode, userId }) => {
  if (!orderCode || !userId) {
    throw new AppError(500, "PAYOS_RETURN_SESSION_DATA_MISSING", "Payment return session data missing");
  }
  return jwt.sign({ orderCode: String(orderCode), userId: String(userId) }, env.JWT_SECRET, {
    ...TOKEN_OPTIONS,
    expiresIn: "30m",
  });
};

const verifyPayOSReturnSession = (token, { orderCode, userId }) => {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, TOKEN_OPTIONS);
  } catch (_error) {
    throw new AppError(401, "PAYOS_RETURN_SESSION_INVALID", "Payment return session is invalid");
  }
  if (String(payload.orderCode) !== String(orderCode) || String(payload.userId) !== String(userId)) {
    throw new AppError(401, "PAYOS_RETURN_SESSION_MISMATCH", "Payment return session mismatch");
  }
  return payload;
};

module.exports = { signPayOSReturnSession, verifyPayOSReturnSession };
