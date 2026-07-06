const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

const { AppDataSource } = require("../src/config/database");
const bookingRoutes = require("../src/routes/bookingRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");
const { createSupertestFetch } = require("../test-support/supertestFetch");

const JWT_SECRET = "create-booking-test-secret";
const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SCREEN_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_SCREEN_ID = "33333333-3333-4333-8333-333333333333";
const SEAT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SEAT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MISSING_SEAT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const LOCK_TOKEN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const futureShow = () => ({
  id: SHOW_ID,
  start_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
  price: "100000",
  screen: { id: SCREEN_ID },
  movie: { id: "movie-1" },
});

const seat = (id, screenId = SCREEN_ID, type = "standard") => ({
  id,
  row: "A",
  number: id === SEAT_A ? 1 : 2,
  type,
  status: "available",
  locked_until: null,
  screen: { id: screenId },
});

const startTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/bookings", bookingRoutes);
  app.use(errorHandler);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createSupertestFetch(app);
  return {
    baseUrl: "http://test.local",
    close: async () => {
      globalThis.fetch = originalFetch;
    },
  };
};

const createQueryBuilder = () => {
  const builder = {
    innerJoin: () => builder,
    where: () => builder,
    andWhere: () => builder,
    getOne: async () => null,
  };
  return builder;
};

const queryRunnerFor = (scenario, states) => {
  const state = { committed: false, rolledBack: false, released: false, saved: [] };
  states.push(state);

  const repositories = {
    Show: { findOne: async () => scenario.show ?? futureShow() },
    Seat: { find: async () => scenario.seats ?? [] },
    Booking: {
      create: (data) => ({ id: "booking-created", ...data }),
    },
    BookingSeat: {
      create: (data) => data,
      createQueryBuilder,
    },
    ShowSeatState: {
      findOne: async ({ where }) => ({
        id: `state-${where.seat.id}`,
        status: "locked",
        show: { id: SHOW_ID },
        seat: { id: where.seat.id },
        lockedByUser: { id: "user-1" },
        lock_token: LOCK_TOKEN,
        locked_until: new Date(Date.now() + 10 * 60 * 1000),
        booking: null,
      }),
    },
    Payment: {
      create: (data) => ({ id: "payment-created", ...data }),
      save: async (entity) => entity,
    },
  };

  return {
    connect: async () => {},
    startTransaction: async () => {},
    commitTransaction: async () => {
      state.committed = true;
    },
    rollbackTransaction: async () => {
      state.rolledBack = true;
    },
    release: async () => {
      state.released = true;
    },
    manager: {
      getRepository: (name) => repositories[name],
      save: async (entity) => {
        state.saved.push(entity);
        return entity;
      },
    },
  };
};

const postBooking = (baseUrl, body) =>
  fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt.sign({ id: "user-1", role: "customer" }, JWT_SECRET, {
        expiresIn: "5m",
      })}`,
    },
    body: JSON.stringify(body),
  });

test("createBooking validation and transaction behavior", { concurrency: false }, async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  const originalCreateQueryRunner = AppDataSource.createQueryRunner;
  process.env.JWT_SECRET = JWT_SECRET;

  let scenario = {};
  let createRunnerCalls = 0;
  const states = [];
  AppDataSource.createQueryRunner = () => {
    createRunnerCalls += 1;
    return queryRunnerFor(scenario, states);
  };

  const server = await startTestServer();
  t.after(async () => {
    await server.close();
    AppDataSource.createQueryRunner = originalCreateQueryRunner;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  await t.test("rejects an empty seat list before opening a transaction", async () => {
    const response = await postBooking(server.baseUrl, {
      showId: SHOW_ID,
      seatIds: [],
      paymentMethod: "credit_card",
    });

    assert.equal(response.status, 400);
    assert.equal(createRunnerCalls, 0);
  });

  await t.test("returns 404 and rolls back when a seat does not exist", async () => {
    scenario = { seats: [seat(SEAT_A)] };
    const response = await postBooking(server.baseUrl, {
      showId: SHOW_ID,
      seatIds: [SEAT_A, MISSING_SEAT],
      paymentMethod: "vnpay",
      lockToken: LOCK_TOKEN,
    });

    assert.equal(response.status, 404);
    assert.equal(states.at(-1).rolledBack, true);
    assert.equal(states.at(-1).released, true);
  });

  await t.test("returns 400 and rolls back for a seat from another screen", async () => {
    scenario = { seats: [seat(SEAT_A, OTHER_SCREEN_ID)] };
    const response = await postBooking(server.baseUrl, {
      showId: SHOW_ID,
      seatIds: [SEAT_A],
      paymentMethod: "momo",
      lockToken: LOCK_TOKEN,
    });

    assert.equal(response.status, 400);
    assert.equal(states.at(-1).rolledBack, true);
    assert.equal(states.at(-1).released, true);
  });

  await t.test("creates a valid booking using server-calculated prices", async () => {
    scenario = { seats: [seat(SEAT_A), seat(SEAT_B, SCREEN_ID, "vip")] };
    const response = await postBooking(server.baseUrl, {
      showId: SHOW_ID,
      seatIds: [SEAT_A, SEAT_B],
      paymentMethod: "cash",
      lockToken: LOCK_TOKEN,
      totalPrice: 1,
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.totalPrice, 250000);
    assert.equal(states.at(-1).committed, true);
    assert.equal(states.at(-1).rolledBack, false);
    assert.equal(states.at(-1).released, true);
  });
});
