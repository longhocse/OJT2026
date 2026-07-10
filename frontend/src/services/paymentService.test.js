jest.mock("./api", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

import api from "./api";
import { paymentService } from "./paymentService";

const payment = {
  id: "payment-1",
  provider: "mock",
  provider_transaction_id: "provider-1",
  amount: "125000",
  status: "paid",
  refunded_amount: "0",
};

test("payment service normalizes payment, refund, cash, ticket and check-in responses", async () => {
  api.get
    .mockResolvedValueOnce({ data: payment })
    .mockResolvedValueOnce({ data: { ticketCode: "MT-1", qrPayload: "signed-payload" } })
    .mockResolvedValueOnce({
      data: {
        data: [payment],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      },
    });
  api.post
    .mockResolvedValueOnce({ data: { payment, bookingStatus: "confirmed" } })
    .mockResolvedValueOnce({
      data: { payment: { ...payment, provider: "cash" }, idempotent: false },
    })
    .mockResolvedValueOnce({
      data: { payment: { ...payment, status: "refunded", refunded_amount: "125000" } },
    })
    .mockResolvedValueOnce({ data: { status: "used", alreadyCheckedIn: false } });

  await expect(paymentService.getPayment("payment-1")).resolves.toMatchObject({
    amount: 125000,
    status: "paid",
  });
  await expect(paymentService.getTicket("booking-1")).resolves.toEqual({
    ticketCode: "MT-1",
    qrPayload: "signed-payload",
  });
  await expect(paymentService.getAdminPayments({ page: 1 })).resolves.toMatchObject({
    data: [{ id: "payment-1", amount: 125000 }],
    pagination: { total: 1 },
  });
  await expect(paymentService.completeMock("payment-1")).resolves.toMatchObject({
    bookingStatus: "confirmed",
  });
  await expect(paymentService.confirmCash("payment-1")).resolves.toMatchObject({
    payment: { provider: "cash" },
    idempotent: false,
  });
  await expect(paymentService.refund("payment-1", 125000)).resolves.toMatchObject({
    status: "refunded",
    refunded_amount: 125000,
  });
  await expect(paymentService.checkIn("signed-payload")).resolves.toEqual({
    status: "used",
    alreadyCheckedIn: false,
  });

  expect(api.post).toHaveBeenCalledWith("/admin/payments/payment-1/refund", {
    amount: 125000,
  });
  expect(api.post).toHaveBeenCalledWith("/admin/tickets/check-in", {
    qrPayload: "signed-payload",
  });
});
