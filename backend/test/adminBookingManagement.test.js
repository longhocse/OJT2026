const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");

const { AppDataSource } = require("../src/config/database");
const adminRoutes = require("../src/routes/adminRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOOKING_ID = "11111111-1111-4111-8111-111111111111";
const MOVIE_ID = "22222222-2222-4222-8222-222222222222";
const CINEMA_ID = "33333333-3333-4333-8333-333333333333";

const token = (role) =>
  jwt.sign({ id: ADMIN_ID, role }, process.env.JWT_SECRET, { expiresIn: "5m" });

const app = express();
app.use(express.json());
app.use("/api/admin", adminRoutes);
app.use(errorHandler);

const bookingFixture = (hoursUntilShow = 10) => ({
  id: BOOKING_ID,
  total_price: 100000,
  refunded_amount: 0,
  status: "confirmed",
  payment_method: "credit_card",
  payment_status: "paid",
  created_at: new Date("2026-06-20T10:00:00.000Z"),
  user: {
    id: "user-1",
    name: "Customer",
    email: "customer@example.com",
    password_hash: "never-return-this",
  },
  show: {
    id: "show-1",
    start_time: new Date(Date.now() + hoursUntilShow * 60 * 60 * 1000),
    movie: { id: MOVIE_ID, title: "Movie" },
    screen: { id: "screen-1", name: "Room", theater: { id: CINEMA_ID, name: "Cinema" } },
  },
  bookingSeats: [
    {
      id: "booking-seat-1",
      status: "confirmed",
      seat: { id: "seat-1", row: "A", number: 1 },
    },
  ],
});

test("admin booking routes enforce authorization and date validation", async () => {
  const denied = await request(app)
    .get("/api/admin/bookings")
    .set("Authorization", `Bearer ${token("customer")}`);
  assert.equal(denied.status, 403);

  const invalid = await request(app)
    .get("/api/admin/bookings?dateFrom=2026-07-02&dateTo=2026-07-01")
    .set("Authorization", `Bearer ${token("admin")}`);
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, "VALIDATION_ERROR");
});

test("admin booking list supports filters and recursively removes password hashes", async (t) => {
  const originalGetRepository = AppDataSource.getRepository;
  const clauses = [];
  const qb = {
    leftJoinAndSelect() {
      return this;
    },
    andWhere(clause) {
      clauses.push(clause);
      return this;
    },
    orderBy() {
      return this;
    },
    skip(value) {
      assert.equal(value, 20);
      return this;
    },
    take(value) {
      assert.equal(value, 20);
      return this;
    },
    async getManyAndCount() {
      return [[bookingFixture()], 21];
    },
  };
  AppDataSource.getRepository = (name) =>
    name === "Booking"
      ? { createQueryBuilder: () => qb }
      : originalGetRepository.call(AppDataSource, name);
  t.after(() => {
    AppDataSource.getRepository = originalGetRepository;
  });

  const response = await request(app)
    .get(
      `/api/admin/bookings?page=2&limit=20&search=customer&status=confirmed&paymentStatus=paid&movieId=${MOVIE_ID}&cinemaId=${CINEMA_ID}&dateFrom=2026-06-01&dateTo=2026-06-30`,
    )
    .set("Authorization", `Bearer ${token("admin")}`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.pagination, { page: 2, limit: 20, total: 21, pages: 2 });
  assert.equal(response.body.data[0].created_at, "2026-06-20T10:00:00.000Z");
  assert.equal("password_hash" in response.body.data[0].user, false);
  assert.equal(clauses.length, 7);
});

test("admin booking detail never returns password_hash", async (t) => {
  const originalGetRepository = AppDataSource.getRepository;
  AppDataSource.getRepository = (name) => {
    if (name === "Booking") return { findOne: async () => bookingFixture() };
    return originalGetRepository.call(AppDataSource, name);
  };
  t.after(() => {
    AppDataSource.getRepository = originalGetRepository;
  });

  const response = await request(app)
    .get(`/api/admin/bookings/${BOOKING_ID}`)
    .set("Authorization", `Bearer ${token("admin")}`);
  assert.equal(response.status, 200);
  assert.equal("password_hash" in response.body.user, false);
});

test("admin cancellation records reason, applies 50 percent refund and releases seats", async (t) => {
  const originalCreateQueryRunner = AppDataSource.createQueryRunner;
  const originalGetRepository = AppDataSource.getRepository;
  const booking = bookingFixture(10);
  const state = { status: "booked", booking: { id: BOOKING_ID } };
  const calls = [];
  const repositories = {
    Booking: {
      findOne: async () => booking,
      save: async () => calls.push("save-booking"),
    },
    BookingSeat: { save: async () => calls.push("save-seats") },
    ShowSeatState: {
      findOne: async () => state,
      save: async () => calls.push("save-state"),
    },
    Payment: {
      findOne: async () => ({
        id: "payment-1",
        provider: "mock",
        amount: 100000,
        status: "paid",
        refunded_amount: 0,
      }),
      save: async () => calls.push("save-payment"),
    },
  };
  AppDataSource.createQueryRunner = () => ({
    manager: { getRepository: (name) => repositories[name] },
    connect: async () => calls.push("connect"),
    startTransaction: async () => calls.push("start"),
    commitTransaction: async () => calls.push("commit"),
    rollbackTransaction: async () => calls.push("rollback"),
    release: async () => calls.push("release"),
  });
  AppDataSource.getRepository = (name) => {
    if (name === "Booking") return { findOne: async () => booking };
    return originalGetRepository.call(AppDataSource, name);
  };
  t.after(() => {
    AppDataSource.createQueryRunner = originalCreateQueryRunner;
    AppDataSource.getRepository = originalGetRepository;
  });

  const response = await request(app)
    .post(`/api/admin/bookings/${BOOKING_ID}/cancel`)
    .set("Authorization", `Bearer ${token("admin")}`)
    .send({ reason: "Customer support approved cancellation" });
  assert.equal(response.status, 200);
  assert.equal(response.body.refundAmount, 50000);
  assert.equal(response.body.refundRate, 0.5);
  assert.equal(booking.status, "cancelled");
  assert.equal(booking.payment_status, "partially_refunded");
  assert.equal(booking.cancellation_reason, "Customer support approved cancellation");
  assert.equal(state.status, "available");
  assert.equal(state.booking, null);
  assert.deepEqual(calls, [
    "connect",
    "start",
    "save-payment",
    "save-booking",
    "save-state",
    "save-seats",
    "commit",
    "release",
  ]);
});

const rawQuery = ({ one, many } = {}) => ({
  select() {
    return this;
  },
  addSelect() {
    return this;
  },
  innerJoin() {
    return this;
  },
  where() {
    return this;
  },
  andWhere() {
    return this;
  },
  groupBy() {
    return this;
  },
  orderBy() {
    return this;
  },
  async getRawOne() {
    return one;
  },
  async getRawMany() {
    return many;
  },
});

test("dashboard stats return revenue, refunds, occupancy and time series", async (t) => {
  const originalGetRepository = AppDataSource.getRepository;
  let bookingQueryCount = 0;
  AppDataSource.getRepository = (name) => {
    if (name === "Booking") {
      return {
        createQueryBuilder: () => {
          bookingQueryCount += 1;
          return bookingQueryCount === 1
            ? rawQuery({
                one: {
                  totalBookings: "10",
                  confirmedBookings: "7",
                  cancelledBookings: "3",
                  revenue: "700000",
                  refund: "150000",
                },
              })
            : rawQuery({
                many: [
                  {
                    date: "2026-06-20",
                    totalBookings: "4",
                    revenue: "300000",
                    refund: "50000",
                  },
                ],
              });
        },
      };
    }
    if (name === "BookingSeat") {
      return { createQueryBuilder: () => rawQuery({ one: { bookedSeats: "40" } }) };
    }
    if (name === "Show") {
      return { createQueryBuilder: () => rawQuery({ one: { capacity: "100" } }) };
    }
    return originalGetRepository.call(AppDataSource, name);
  };
  t.after(() => {
    AppDataSource.getRepository = originalGetRepository;
  });

  const response = await request(app)
    .get("/api/admin/dashboard/stats?dateFrom=2026-06-01&dateTo=2026-06-30")
    .set("Authorization", `Bearer ${token("admin")}`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    totalBookings: 10,
    confirmedBookings: 7,
    cancelledBookings: 3,
    revenue: 700000,
    refund: 150000,
    occupancy: 40,
    bookedSeats: 40,
    capacity: 100,
    series: [{ date: "2026-06-20", totalBookings: 4, revenue: 300000, refund: 50000 }],
  });
});
