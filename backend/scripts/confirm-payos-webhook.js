require("dotenv").config({ quiet: true });

const required = ["PAYOS_CLIENT_ID", "PAYOS_API_KEY", "PAYOS_WEBHOOK_URL"];
const missing = required.filter((field) => !process.env[field]);

if (missing.length) {
  console.error(`Missing required env: ${missing.join(", ")}`);
  process.exit(1);
}

const apiBaseUrl = process.env.PAYOS_API_BASE_URL || "https://api-merchant.payos.vn";

(async () => {
  const response = await fetch(`${apiBaseUrl}/confirm-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": process.env.PAYOS_CLIENT_ID,
      "x-api-key": process.env.PAYOS_API_KEY,
    },
    body: JSON.stringify({ webhookUrl: process.env.PAYOS_WEBHOOK_URL }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code !== "00") {
    console.error("Could not confirm PayOS webhook");
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }
  console.log(`PayOS webhook confirmed: ${payload.data?.webhookUrl || process.env.PAYOS_WEBHOOK_URL}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
