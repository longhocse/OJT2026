const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");

const { AppDataSource } = require("../src/config/database");
const adminRoutes = require("../src/routes/adminRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MOVIE_ID = "11111111-1111-4111-8111-111111111111";
const SCREEN_ID = "22222222-2222-4222-8222-222222222222";
const SHOW_ID = "33333333-3333-4333-8333-333333333333";
const THEATER_ID = "44444444-4444-4444-8444-444444444444";

const authToken = (role) =>
  jwt.sign({ id: ADMIN_ID, role }, process.env.JWT_SECRET, { expiresIn: "5m" });

const app = express();
app.use(express.json());
app.use("/api/admin", adminRoutes);
app.use(errorHandler);

const futurePayload = () => {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  start.setUTCSeconds(0, 0);
  const end = new Date(start.getTime() + 120 * 60 * 1000);
  return {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    price: 100000,
    movie: { id: MOVIE_ID },
    screen: { id: SCREEN_ID },
  };
};

test("admin show routes enforce authorization and filter validation", async () => {
  const denied = await request(app)
    .get("/api/admin/shows")
    .set("Authorization", `Bearer ${authToken("customer")}`);
  assert.equal(denied.status, 403);

  const invalid = await request(app)
    .get("/api/admin/shows?status=unknown")
    .set("Authorization", `Bearer ${authToken("admin")}`);
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, "VALIDATION_ERROR");
});

test("admin show list supports pagination and all business filters", async (t) => {
  const originalGetRepository = AppDataSource.getRepository;
  const clauses = [];
  const show = {
    id: SHOW_ID,
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
    end_time: new Date(Date.now() + 26 * 60 * 60 * 1000),
    price: 100000,
    status: "scheduled",
    movie: { id: MOVIE_ID, title: "Movie", duration: 120 },
    screen: { id: SCREEN_ID, name: "Room", theater: { id: "theater" } },
  };
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
      return [[show], 21];
    },
  };
  AppDataSource.getRepository = (name) =>
    name === "Show"
      ? { createQueryBuilder: () => qb }
      : originalGetRepository.call(AppDataSource, name);
  t.after(() => {
    AppDataSource.getRepository = originalGetRepository;
  });

  const response = await request(app)
    .get(
      `/api/admin/shows?page=2&limit=20&movieId=${MOVIE_ID}&theaterId=${THEATER_ID}&screenId=${SCREEN_ID}&date=2026-07-01&status=scheduled`,
    )
    .set("Authorization", `Bearer ${authToken("admin")}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.length, 1);
  assert.deepEqual(response.body.pagination, { page: 2, limit: 20, total: 21, pages: 2 });
  assert.equal(clauses.length, 5);
});

test("show creation validates duration and schedule conflicts transactionally", async (t) => {
  const originalCreateQueryRunner = AppDataSource.createQueryRunner;
  const originalGetRepository = AppDataSource.getRepository;
  const calls = [];
  let conflict = false;
  let storedShow;

  const conflictQuery = {
    innerJoin() {
      return this;
    },
    where() {
      return this;
    },
    andWhere() {
      return this;
    },
    setLock() {
      return this;
    },
    async getOne() {
      return conflict ? { id: "conflict" } : null;
    },
  };
  const repositories = {
    Movie: { findOneBy: async () => ({ id: MOVIE_ID, title: "Movie", duration: 120 }) },
    Screen: {
      findOneBy: async () => ({ id: SCREEN_ID, name: "Room", total_seats: 50 }),
    },
    Show: {
      createQueryBuilder: () => conflictQuery,
      create: (data) => ({ id: SHOW_ID, ...data }),
      findOne: async () => storedShow,
      save: async (show) => {
        storedShow = show;
        calls.push("save");
        return show;
      },
    },
    Booking: { count: async () => 0 },
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
    if (name === "Show") {
      return {
        findOne: async () => ({
          ...storedShow,
          movie: { id: MOVIE_ID, title: "Movie", duration: 120 },
          screen: { id: SCREEN_ID, name: "Room", theater: { id: "theater" } },
        }),
      };
    }
    return originalGetRepository.call(AppDataSource, name);
  };
  t.after(() => {
    AppDataSource.createQueryRunner = originalCreateQueryRunner;
    AppDataSource.getRepository = originalGetRepository;
  });

  const created = await request(app)
    .post("/api/admin/shows")
    .set("Authorization", `Bearer ${authToken("admin")}`)
    .send(futurePayload());
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "scheduled");
  assert.deepEqual(calls, ["connect", "start", "save", "commit", "release"]);

  calls.length = 0;
  const updatePayload = { ...futurePayload(), price: 125000 };
  const updated = await request(app)
    .put(`/api/admin/shows/${SHOW_ID}`)
    .set("Authorization", `Bearer ${authToken("admin")}`)
    .send(updatePayload);
  assert.equal(updated.status, 200);
  assert.equal(updated.body.price, 125000);
  assert.deepEqual(calls, ["connect", "start", "save", "commit", "release"]);

  calls.length = 0;
  conflict = true;
  const rejected = await request(app)
    .post("/api/admin/shows")
    .set("Authorization", `Bearer ${authToken("admin")}`)
    .send(futurePayload());
  assert.equal(rejected.status, 409);
  assert.equal(rejected.body.code, "SHOW_SCHEDULE_CONFLICT");
  assert.deepEqual(calls, ["connect", "start", "rollback", "release"]);

  calls.length = 0;
  conflict = false;
  const badDuration = futurePayload();
  badDuration.end_time = new Date(new Date(badDuration.start_time).getTime() + 60 * 60000);
  const mismatch = await request(app)
    .post("/api/admin/shows")
    .set("Authorization", `Bearer ${authToken("admin")}`)
    .send(badDuration);
  assert.equal(mismatch.status, 400);
  assert.equal(mismatch.body.code, "SHOW_DURATION_MISMATCH");
  assert.deepEqual(calls, ["connect", "start", "rollback", "release"]);

  calls.length = 0;
  const past = futurePayload();
  past.start_time = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  past.end_time = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const pastResponse = await request(app)
    .post("/api/admin/shows")
    .set("Authorization", `Bearer ${authToken("admin")}`)
    .send(past);
  assert.equal(pastResponse.status, 409);
  assert.equal(pastResponse.body.code, "SHOW_IN_PAST");
  assert.deepEqual(calls, ["connect", "start", "rollback", "release"]);
});

test("cancelling a show cancels bookings and releases every seat state atomically", async (t) => {
  const originalCreateQueryRunner = AppDataSource.createQueryRunner;
  const originalGetRepository = AppDataSource.getRepository;
  const calls = [];
  const show = {
    id: SHOW_ID,
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
    end_time: new Date(Date.now() + 26 * 60 * 60 * 1000),
    price: 100000,
    status: "scheduled",
    movie: { id: MOVIE_ID, title: "Movie", duration: 120 },
    screen: { id: SCREEN_ID, name: "Room", theater: { id: "theater" } },
  };
  const bookingSeat = { id: "booking-seat", status: "confirmed" };
  const booking = { id: "booking", status: "confirmed", bookingSeats: [bookingSeat] };
  const state = {
    id: "state",
    status: "booked",
    booking: { id: booking.id },
    lockedByUser: null,
    lock_token: null,
    locked_until: null,
  };
  const repositories = {
    Show: {
      findOne: async () => show,
      save: async () => calls.push("save-show"),
    },
    Booking: {
      find: async () => [booking],
      save: async () => calls.push("save-bookings"),
    },
    BookingSeat: { save: async () => calls.push("save-booking-seats") },
    ShowSeatState: {
      find: async () => [state],
      save: async () => calls.push("save-states"),
    },
    Payment: {
      findOne: async () => ({
        id: "payment-1",
        provider: "mock",
        amount: 0,
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
    if (name === "Show") return { findOne: async () => show };
    return originalGetRepository.call(AppDataSource, name);
  };
  t.after(() => {
    AppDataSource.createQueryRunner = originalCreateQueryRunner;
    AppDataSource.getRepository = originalGetRepository;
  });

  const response = await request(app)
    .post(`/api/admin/shows/${SHOW_ID}/cancel`)
    .set("Authorization", `Bearer ${authToken("admin")}`)
    .send({ reason: "Projector maintenance" });

  assert.equal(response.status, 200);
  assert.equal(show.status, "cancelled");
  assert.equal(show.cancellation_reason, "Projector maintenance");
  assert.equal(booking.status, "cancelled");
  assert.equal(bookingSeat.status, "cancelled");
  assert.equal(state.status, "available");
  assert.equal(state.booking, null);
  assert.deepEqual(calls, [
    "connect",
    "start",
    "save-show",
    "save-payment",
    "save-bookings",
    "save-booking-seats",
    "save-states",
    "commit",
    "release",
  ]);
});

test("a show that has bookings cannot be deleted", async (t) => {
  const originalCreateQueryRunner = AppDataSource.createQueryRunner;
  const calls = [];
  const repositories = {
    Show: { findOne: async () => ({ id: SHOW_ID }), remove: async () => calls.push("remove") },
    Booking: { count: async () => 1 },
  };
  AppDataSource.createQueryRunner = () => ({
    manager: { getRepository: (name) => repositories[name] },
    connect: async () => calls.push("connect"),
    startTransaction: async () => calls.push("start"),
    commitTransaction: async () => calls.push("commit"),
    rollbackTransaction: async () => calls.push("rollback"),
    release: async () => calls.push("release"),
  });
  t.after(() => {
    AppDataSource.createQueryRunner = originalCreateQueryRunner;
  });

  const response = await request(app)
    .delete(`/api/admin/shows/${SHOW_ID}`)
    .set("Authorization", `Bearer ${authToken("admin")}`);
  assert.equal(response.status, 409);
  assert.equal(response.body.code, "SHOW_HAS_BOOKINGS");
  assert.deepEqual(calls, ["connect", "start", "rollback", "release"]);
});
