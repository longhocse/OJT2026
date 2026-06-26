const { createHmac, timingSafeEqual } = require("node:crypto");
const { env } = require("../config/env");

const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};
const signWebhook = (timestamp, body) =>
  createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET)
    .update(`${timestamp}.${canonicalJson(body)}`)
    .digest("hex");
const verifyWebhook = ({ timestamp, signature, body, now = Date.now() }) => {
  if (!/^\d+$/.test(String(timestamp)) || !/^[a-f0-9]{64}$/i.test(String(signature))) return false;
  if (Math.abs(now - Number(timestamp)) > 300000) return false;
  const expected = Buffer.from(signWebhook(timestamp, body), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
module.exports = { canonicalJson, signWebhook, verifyWebhook };
