const { createHmac, randomUUID } = require("node:crypto");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

class PaymentProvider {
  async createIntent() {
    throw new Error("Not implemented");
  }
  async getPaymentRequest() {
    throw new Error("Not implemented");
  }
  async refund() {
    throw new Error("Not implemented");
  }
}

class MockPaymentProvider extends PaymentProvider {
  async createIntent({ paymentId }) {
    return {
      provider: "mock",
      transactionId: `mock_${randomUUID()}`,
      checkoutUrl: `/mock-payment/${paymentId}`,
    };
  }
  async refund({ amount }) {
    return { accepted: true, refundedAmount: Number(amount) };
  }
}

class CashPaymentProvider extends PaymentProvider {
  async createIntent() {
    return { provider: "cash", transactionId: null, checkoutUrl: null };
  }
  async refund({ amount }) {
    return { accepted: true, refundedAmount: Number(amount) };
  }
}

const stringifyPayOSValue = (value) => {
  if ([null, undefined, "undefined", "null"].includes(value)) return "";
  if (Array.isArray(value)) {
    return JSON.stringify(
      value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? Object.keys(item)
              .sort()
              .reduce((result, key) => ({ ...result, [key]: item[key] }), {})
          : item,
      ),
    );
  }
  return String(value);
};

const buildPayOSSignaturePayload = (data) =>
  Object.keys(data)
    .filter((key) => data[key] !== undefined)
    .sort()
    .map((key) => `${key}=${stringifyPayOSValue(data[key])}`)
    .join("&");

const signPayOSData = (data) =>
  createHmac("sha256", env.PAYOS_CHECKSUM_KEY || "")
    .update(buildPayOSSignaturePayload(data))
    .digest("hex");

const signPayOSPaymentRequest = ({ amount, cancelUrl, description, orderCode, returnUrl }) =>
  signPayOSData({ amount, cancelUrl, description, orderCode, returnUrl });

const verifyPayOSData = (data, signature) => {
  if (!signature || typeof signature !== "string") return false;
  return signPayOSData(data) === signature;
};

const absoluteUrl = (value, fallbackPath) => {
  if (value) return value;
  const baseUrl = env.FRONTEND_URL;
  return new URL(fallbackPath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
};

const createOrderCode = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

class PayOSPaymentProvider extends PaymentProvider {
  async createIntent({ paymentId, amount, booking }) {
    if (!env.PAYOS_CLIENT_ID || !env.PAYOS_API_KEY || !env.PAYOS_CHECKSUM_KEY) {
      throw new AppError(500, "PAYOS_NOT_CONFIGURED", "PayOS is not configured");
    }

    const orderCode = createOrderCode();
    const integerAmount = Math.round(Number(amount));
    if (!Number.isInteger(integerAmount) || integerAmount <= 0) {
      throw new AppError(400, "PAYOS_AMOUNT_INVALID", "PayOS amount must be a positive integer");
    }

    const description = `MT ${String(booking?.ticket_code || paymentId).replace(/[^A-Za-z0-9]/g, "").slice(-20)}`;
    const body = {
      orderCode,
      amount: integerAmount,
      description: description.slice(0, 25),
      items: [
        {
          name: `Ve phim MovieTap`,
          quantity: 1,
          price: integerAmount,
        },
      ],
      cancelUrl: absoluteUrl(env.PAYOS_CANCEL_URL, "/payment/payos/cancel"),
      returnUrl: absoluteUrl(env.PAYOS_RETURN_URL, "/payment/payos/return"),
      expiredAt: booking?.expires_at
        ? Math.floor(new Date(booking.expires_at).getTime() / 1000)
        : undefined,
    };
    body.signature = signPayOSPaymentRequest(body);

    const response = await fetch(`${env.PAYOS_API_BASE_URL}/v2/payment-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": env.PAYOS_CLIENT_ID,
        "x-api-key": env.PAYOS_API_KEY,
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.code !== "00" || !payload.data?.checkoutUrl) {
      throw new AppError(
        502,
        "PAYOS_CREATE_LINK_FAILED",
        payload.desc || "Could not create PayOS payment link",
      );
    }

    return {
      provider: "payos",
      transactionId: String(payload.data.orderCode || orderCode),
      checkoutUrl: payload.data.checkoutUrl,
      qrCode: payload.data.qrCode,
      paymentLinkId: payload.data.paymentLinkId,
    };
  }

  async refund() {
    return { accepted: false, refundedAmount: 0 };
  }

  async getPaymentRequest({ orderCode }) {
    if (!env.PAYOS_CLIENT_ID || !env.PAYOS_API_KEY || !env.PAYOS_CHECKSUM_KEY) {
      throw new AppError(500, "PAYOS_NOT_CONFIGURED", "PayOS is not configured");
    }
    if (!orderCode) throw new AppError(400, "PAYOS_ORDER_CODE_REQUIRED", "Missing orderCode");

    const response = await fetch(`${env.PAYOS_API_BASE_URL}/v2/payment-requests/${orderCode}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": env.PAYOS_CLIENT_ID,
        "x-api-key": env.PAYOS_API_KEY,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.code !== "00" || !payload.data) {
      throw new AppError(
        502,
        "PAYOS_LOOKUP_FAILED",
        payload.desc || "Could not lookup PayOS payment request",
      );
    }
    return payload.data;
  }
}

const providers = {
  mock: new MockPaymentProvider(),
  cash: new CashPaymentProvider(),
  payos: new PayOSPaymentProvider(),
};
const getProviderForMethod = (method) => {
  if (method === "cash") return providers.cash;
  if (method === "payos" || env.PAYMENT_PROVIDER_MODE === "payos") return providers.payos;
  return providers.mock;
};
const getProvider = (name) => providers[name] || null;

module.exports = {
  PaymentProvider,
  MockPaymentProvider,
  PayOSPaymentProvider,
  getProvider,
  getProviderForMethod,
  signPayOSData,
  verifyPayOSData,
};
