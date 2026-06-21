const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

const { AppDataSource } = require("../src/config/database");
const bookingRoutes = require("../src/routes/bookingRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");
const { createSupertestFetch } = require("../test-support/supertestFetch");

const JWT_SECRET = "seat-lock-concurrency-test-secret";
const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SCREEN_ID = "22222222-2222-4222-8222-222222222222";
const SEAT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const show = {
  id: SHOW_ID,
  start_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
  price: "100000",
  screen: { id: SCREEN_ID },
};
const seat = {
  id: SEAT_ID,
  row: "A",
  number: 1,
  type: "standard",
  screen: { id: SCREEN_ID },
};

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

const tokenFor = (userId) =>
  jwt.sign({ id: userId, role: "customer" }, JWT_SECRET, { expiresIn: "5m" });

const post = (baseUrl, path, userId, body) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenFor(userId)}`,
    },
    body: JSON.stringify(body),
  });

test("two users cannot lock or book the same show seat", { concurrency: false }, async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  const originalCreateQueryRunner = AppDataSource.createQueryRunner;
  process.env.JWT_SECRET = JWT_SECRET;

  let sharedState = null;
  let transactionTail = Promise.resolve();
  const queryRunners = [];

  AppDataSource.createQueryRunner = () => {
    const runnerState = {
      isolation: null,
      committed: false,
      rolledBack: false,
      released: false,
      unlockTransaction: null,
    };
    queryRunners.push(runnerState);

    const finishTransaction = () => {
      if (runnerState.unlockTransaction) {
        runnerState.unlockTransaction();
        runnerState.unlockTransaction = null;
      }
    };

    const stateRepository = {
      findOne: async () => sharedState,
      create: (data) => ({ id: "state-1", status: "available", ...data }),
    };

    return {
      connect: async () => {},
      startTransaction: async (isolation) => {
        runnerState.isolation = isolation;
        const previous = transactionTail;
        transactionTail = new Promise((resolve) => {
          runnerState.unlockTransaction = resolve;
        });
        await previous;
      },
      commitTransaction: async () => {
        runnerState.committed = true;
        finishTransaction();
      },
      rollbackTransaction: async () => {
        runnerState.rolledBack = true;
        finishTransaction();
      },
      release: async () => {
        runnerState.released = true;
        finishTransaction();
      },
      manager: {
        getRepository: (name) => {
          if (name === "Show") return { findOne: async () => show };
          if (name === "Seat") return { find: async () => [seat] };
          if (name === "ShowSeatState") return stateRepository;
          if (name === "Booking") {
            return { create: (data) => ({ id: "booking-1", ...data }) };
          }
          if (name === "BookingSeat") return { create: (data) => data };
          throw new Error(`Unexpected repository: ${name}`);
        },
        save: async (entity) => {
          if (entity.show && entity.seat && Object.hasOwn(entity, "lock_token")) {
            sharedState = entity;
          }
          return entity;
        },
      },
    };
  };

  const server = await startTestServer();
  t.after(async () => {
    await server.close();
    AppDataSource.createQueryRunner = originalCreateQueryRunner;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const lockBody = { showId: SHOW_ID, seatIds: [SEAT_ID], duration: 600 };
  const attempts = await Promise.all([
    post(server.baseUrl, "/api/bookings/seats/lock", "user-a", lockBody).then(async (response) => ({
      userId: "user-a",
      response,
      body: await response.json(),
    })),
    post(server.baseUrl, "/api/bookings/seats/lock", "user-b", lockBody).then(async (response) => ({
      userId: "user-b",
      response,
      body: await response.json(),
    })),
  ]);

  const winner = attempts.find((attempt) => attempt.response.status === 200);
  const loser = attempts.find((attempt) => attempt.response.status === 409);
  assert.ok(winner, "exactly one user should acquire the lock");
  assert.ok(loser, "the competing user should receive HTTP 409");
  assert.notEqual(winner.userId, loser.userId);
  assert.equal(sharedState.lockedByUser.id, winner.userId);
  assert.equal(sharedState.lock_token, winner.body.lockToken);

  const unauthorizedUnlock = await post(
    server.baseUrl,
    "/api/bookings/seats/unlock",
    loser.userId,
    { ...lockBody, lockToken: winner.body.lockToken },
  );
  assert.equal(unauthorizedUnlock.status, 403);

  const unauthorizedBooking = await post(server.baseUrl, "/api/bookings", loser.userId, {
    showId: SHOW_ID,
    seatIds: [SEAT_ID],
    paymentMethod: "cash",
    lockToken: winner.body.lockToken,
  });
  assert.equal(unauthorizedBooking.status, 403);

  const successfulBooking = await post(server.baseUrl, "/api/bookings", winner.userId, {
    showId: SHOW_ID,
    seatIds: [SEAT_ID],
    paymentMethod: "cash",
    lockToken: winner.body.lockToken,
  });
  assert.equal(successfulBooking.status, 201);
  assert.equal(sharedState.status, "booked");
  assert.equal(sharedState.booking.id, "booking-1");

  assert.ok(queryRunners.every((runner) => runner.isolation === "SERIALIZABLE"));
  assert.ok(queryRunners.every((runner) => runner.released));
});
