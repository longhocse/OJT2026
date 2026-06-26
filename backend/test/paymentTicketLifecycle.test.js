const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");

const { AppDataSource } = require("../src/config/database");
const paymentRoutes = require("../src/routes/paymentRoutes");
const adminRoutes = require("../src/routes/adminRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");
const { signWebhook } = require("../src/payments/paymentSecurity");
const { createTicketPayload } = require("../src/tickets/ticketSecurity");
const { expireBooking } = require("../src/services/paymentLifecycleService");

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ADMIN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const BOOKING_ID = "11111111-1111-4111-8111-111111111111";
const PAYMENT_ID = "22222222-2222-4222-8222-222222222222";
const SHOW_ID = "33333333-3333-4333-8333-333333333333";

const token = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "5m" });

const app = express();
app.use(express.json());
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use(errorHandler);

const queryRunner = (repositories) => ({
  manager: { getRepository: (name) => repositories[name] },
  connect: async () => {},
  startTransaction: async () => {},
  commitTransaction: async () => {},
  rollbackTransaction: async () => {},
  release: async () => {},
});

test("payment webhook verifies its signature, ignores client amount and is idempotent", async (t) => {
  const original = AppDataSource.createQueryRunner;
  const booking = {
    id: BOOKING_ID,
    status: "pending_payment",
    payment_status: "pending",
    total_price: 125000,
    expires_at: new Date(Date.now() + 60000),
    show: { id: SHOW_ID },
    bookingSeats: [],
  };
  const payment = {
    id: PAYMENT_ID,
    provider: "mock",
    provider_transaction_id: "mock-provider-transaction",
    amount: 125000,
    status: "pending",
    refunded_amount: 0,
    booking,
  };
  const saved = [];
  const repositories = {
    Payment: { findOne: async () => payment, save: async (value) => saved.push(value) },
    Booking: { save: async (value) => saved.push(value) },
  };
  AppDataSource.createQueryRunner = () => queryRunner(repositories);
  t.after(() => {
    AppDataSource.createQueryRunner = original;
  });

  const body = {
    paymentId: PAYMENT_ID,
    providerTransactionId: "mock-provider-transaction",
    status: "paid",
    amount: 1,
  };
  const invalid = await request(app)
    .post("/api/payments/webhooks/mock")
    .set("x-payment-timestamp", String(Date.now()))
    .set("x-payment-signature", "0".repeat(64))
    .send(body);
  assert.equal(invalid.status, 401);
  assert.deepEqual(Object.keys(invalid.body).sort(), ["code", "errors", "message"]);

  const timestamp = String(Date.now());
  const signature = signWebhook(timestamp, body);
  const paid = await request(app)
    .post("/api/payments/webhooks/mock")
    .set("x-payment-timestamp", timestamp)
    .set("x-payment-signature", signature)
    .send(body);
  assert.equal(paid.status, 200);
  assert.equal(paid.body.idempotent, false);
  assert.equal(payment.amount, 125000);
  assert.equal(payment.status, "paid");
  assert.equal(booking.status, "confirmed");
  assert.equal(booking.payment_status, "paid");
  assert.equal(saved.length, 2);

  const replay = await request(app)
    .post("/api/payments/webhooks/mock")
    .set("x-payment-timestamp", timestamp)
    .set("x-payment-signature", signature)
    .send(body);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotent, true);
  assert.equal(saved.length, 2);
});

test("payment detail never exposes password_hash", async (t) => {
  const original = AppDataSource.getRepository;
  const payment = {
    id: PAYMENT_ID,
    provider: "mock",
    amount: 125000,
    status: "paid",
    refunded_amount: 0,
    booking: {
      id: BOOKING_ID,
      user: { id: USER_ID, email: "user@example.com", password_hash: "never-return" },
    },
  };
  AppDataSource.getRepository = (name) =>
    name === "Payment" ? { findOne: async () => payment } : original.call(AppDataSource, name);
  t.after(() => {
    AppDataSource.getRepository = original;
  });

  const response = await request(app)
    .get(`/api/payments/${PAYMENT_ID}`)
    .set("Authorization", `Bearer ${token(USER_ID, "customer")}`);
  assert.equal(response.status, 200);
  assert.equal("password_hash" in response.body.booking.user, false);
});

test("cash confirmation is an explicit admin-only idempotent workflow", async (t) => {
  const original = AppDataSource.createQueryRunner;
  const booking = {
    id: BOOKING_ID,
    status: "pending_payment",
    payment_status: "pending",
    expires_at: new Date(Date.now() + 60000),
    show: { id: SHOW_ID },
    bookingSeats: [],
  };
  const payment = {
    id: PAYMENT_ID,
    provider: "cash",
    amount: 125000,
    status: "pending",
    refunded_amount: 0,
    booking,
  };
  const repositories = {
    Payment: { findOne: async () => payment, save: async () => payment },
    Booking: { save: async () => booking },
  };
  AppDataSource.createQueryRunner = () => queryRunner(repositories);
  t.after(() => {
    AppDataSource.createQueryRunner = original;
  });

  const denied = await request(app)
    .post(`/api/admin/payments/${PAYMENT_ID}/confirm-cash`)
    .set("Authorization", `Bearer ${token(USER_ID, "customer")}`);
  assert.equal(denied.status, 403);

  const first = await request(app)
    .post(`/api/admin/payments/${PAYMENT_ID}/confirm-cash`)
    .set("Authorization", `Bearer ${token(ADMIN_ID, "admin")}`);
  assert.equal(first.status, 200);
  assert.equal(first.body.idempotent, false);
  assert.equal(payment.status, "paid");
  assert.equal(booking.status, "confirmed");

  const second = await request(app)
    .post(`/api/admin/payments/${PAYMENT_ID}/confirm-cash`)
    .set("Authorization", `Bearer ${token(ADMIN_ID, "admin")}`);
  assert.equal(second.status, 200);
  assert.equal(second.body.idempotent, true);
});

test("signed ticket check-in is tamper-proof and idempotent", async (t) => {
  const original = AppDataSource.createQueryRunner;
  const booking = {
    id: BOOKING_ID,
    ticket_code: "MT-TEST-TICKET",
    status: "confirmed",
    checked_in_at: null,
    show: { id: SHOW_ID },
  };
  const repositories = {
    Booking: {
      findOne: async () => booking,
      save: async () => booking,
    },
  };
  AppDataSource.createQueryRunner = () => queryRunner(repositories);
  t.after(() => {
    AppDataSource.createQueryRunner = original;
  });

  const qrPayload = createTicketPayload(booking);
  const first = await request(app)
    .post("/api/admin/tickets/check-in")
    .set("Authorization", `Bearer ${token(ADMIN_ID, "admin")}`)
    .send({ qrPayload });
  assert.equal(first.status, 200);
  assert.equal(first.body.status, "used");
  assert.equal(first.body.alreadyCheckedIn, false);

  const second = await request(app)
    .post("/api/admin/tickets/check-in")
    .set("Authorization", `Bearer ${token(ADMIN_ID, "admin")}`)
    .send({ qrPayload });
  assert.equal(second.status, 200);
  assert.equal(second.body.alreadyCheckedIn, true);

  const tampered = JSON.stringify({ ...JSON.parse(qrPayload), ticketCode: "MT-TAMPERED" });
  const rejected = await request(app)
    .post("/api/admin/tickets/check-in")
    .set("Authorization", `Bearer ${token(ADMIN_ID, "admin")}`)
    .send({ qrPayload: tampered });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.code, "TICKET_SIGNATURE_INVALID");
});

test("expired pending bookings release seats and cancel pending payment atomically", async (t) => {
  const original = AppDataSource.createQueryRunner;
  const seat = { id: "seat-1" };
  const bookingSeat = { id: "booking-seat-1", seat, status: "confirmed" };
  const booking = {
    id: BOOKING_ID,
    status: "pending_payment",
    payment_status: "pending",
    expires_at: new Date(Date.now() - 1000),
    show: { id: SHOW_ID },
    bookingSeats: [bookingSeat],
  };
  const payment = { id: PAYMENT_ID, status: "pending", booking };
  const state = { status: "booked", booking: { id: BOOKING_ID }, seat };
  const repositories = {
    Booking: { findOne: async () => booking, save: async () => booking },
    Payment: { findOne: async () => payment, save: async () => payment },
    ShowSeatState: { findOne: async () => state, save: async () => state },
    BookingSeat: { save: async () => [bookingSeat] },
  };
  AppDataSource.createQueryRunner = () => queryRunner(repositories);
  t.after(() => {
    AppDataSource.createQueryRunner = original;
  });

  assert.equal(await expireBooking(BOOKING_ID), true);
  assert.equal(booking.status, "expired");
  assert.equal(booking.payment_status, "cancelled");
  assert.equal(payment.status, "cancelled");
  assert.equal(state.status, "available");
  assert.equal(state.booking, null);
  assert.equal(bookingSeat.status, "cancelled");
});
