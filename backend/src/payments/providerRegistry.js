const { randomUUID } = require("node:crypto");

class PaymentProvider {
  async createIntent() {
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

const providers = { mock: new MockPaymentProvider(), cash: new CashPaymentProvider() };
const getProviderForMethod = (method) => (method === "cash" ? providers.cash : providers.mock);
const getProvider = (name) => providers[name] || null;

module.exports = { PaymentProvider, MockPaymentProvider, getProvider, getProviderForMethod };
