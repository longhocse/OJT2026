const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

const { AppDataSource } = require("../src/config/database");
const bookingRoutes = require("../src/routes/bookingRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");
const { createSupertestFetch } = require("../test-support/supertestFetch");

const JWT_SECRET = "booking-authorization-test-secret";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ADMIN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const BOOKING_A = "11111111-1111-4111-8111-111111111111";
const BOOKING_B = "22222222-2222-4222-8222-222222222222";
const MISSING_BOOKING = "33333333-3333-4333-8333-333333333333";
const futureShow = (bookingId) => ({
  id: `${bookingId}-show`,
  start_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
  movie: { id: "movie-1", title: "Test Movie" },
  screen: { id: "screen-1", theater: { id: "theater-1" } },
});

const createBooking = (id, userId) => ({
  id,
  status: "confirmed",
  user: {
    id: userId,
    name: userId,
    email: `${userId}@example.com`,
    password_hash: "must-never-be-returned",
  },
  show: futureShow(id),
  bookingSeats: [
    {
      id: `${id}-seat`,
      seat: { id: `${id}-physical-seat` },
    },
  ],
  created_at: new Date(),
});

const tokenFor = (id, role = "customer") =>
  jwt.sign({ id, email: `${id}@example.com`, role }, JWT_SECRET, { expiresIn: "5m" });

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

const authHeaders = (id, role) => ({
  Authorization: `Bearer ${tokenFor(id, role)}`,
});

test("booking authorization prevents IDOR", { concurrency: false }, async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  const originalGetRepository = AppDataSource.getRepository;
  const originalCreateQueryRunner = AppDataSource.createQueryRunner;
  process.env.JWT_SECRET = JWT_SECRET;

  const bookings = new Map([
    [BOOKING_A, createBooking(BOOKING_A, USER_A)],
    [BOOKING_B, createBooking(BOOKING_B, USER_B)],
  ]);
  const transactions = [];

  AppDataSource.getRepository = (name) => {
    assert.equal(name, "Booking");
    return {
      findOne: async ({ where }) => bookings.get(where.id) ?? null,
      find: async ({ where }) =>
        [...bookings.values()].filter((booking) => booking.user.id === where.user.id),
    };
  };

  AppDataSource.createQueryRunner = () => {
    const transaction = { committed: false, rolledBack: false, released: false };
    transactions.push(transaction);

    return {
      connect: async () => {},
      startTransaction: async () => {},
      commitTransaction: async () => {
        transaction.committed = true;
      },
      rollbackTransaction: async () => {
        transaction.rolledBack = true;
      },
      release: async () => {
        transaction.released = true;
      },
      manager: {
        getRepository: (name) => {
          if (name === "Booking") {
            return {
              findOne: async ({ where }) => bookings.get(where.id) ?? null,
            };
          }
          if (name === "ShowSeatState") {
            return {
              findOne: async ({ where }) => {
                const booking = [...bookings.values()].find(
                  (candidate) =>
                    candidate.show.id === where.show.id &&
                    candidate.bookingSeats[0].seat.id === where.seat.id,
                );
                return booking
                  ? {
                      status: "booked",
                      show: booking.show,
                      seat: booking.bookingSeats[0].seat,
                      booking: { id: booking.id },
                    }
                  : null;
              },
            };
          }
          throw new Error(`Unexpected repository: ${name}`);
        },
        save: async (entity) => entity,
      },
    };
  };

  const server = await startTestServer();
  t.after(async () => {
    await server.close();
    AppDataSource.getRepository = originalGetRepository;
    AppDataSource.createQueryRunner = originalCreateQueryRunner;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  await t.test("customer sees only their own list through /me", async () => {
    const response = await fetch(`${server.baseUrl}/api/bookings/me`, {
      headers: authHeaders(USER_A, "customer"),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(
      body.map((booking) => booking.id),
      [BOOKING_A],
    );
    assert.equal("password_hash" in body[0].user, false);
  });

  await t.test("legacy user endpoint rejects a different customer id", async () => {
    const response = await fetch(`${server.baseUrl}/api/bookings/user/${USER_B}`, {
      headers: authHeaders(USER_A, "customer"),
    });
    assert.equal(response.status, 403);
  });

  await t.test("customer cannot view another customer's booking", async () => {
    const response = await fetch(`${server.baseUrl}/api/bookings/${BOOKING_B}`, {
      headers: authHeaders(USER_A, "customer"),
    });
    assert.equal(response.status, 403);
  });

  await t.test("owner can view their booking without password_hash", async () => {
    const response = await fetch(`${server.baseUrl}/api/bookings/${BOOKING_B}`, {
      headers: authHeaders(USER_B, "customer"),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.id, BOOKING_B);
    assert.equal("password_hash" in body.user, false);
  });

  await t.test("customer cannot cancel another customer's booking", async () => {
    const response = await fetch(`${server.baseUrl}/api/bookings/${BOOKING_B}/cancel`, {
      method: "PUT",
      headers: authHeaders(USER_A, "customer"),
    });

    assert.equal(response.status, 403);
    assert.equal(bookings.get(BOOKING_B).status, "confirmed");
    assert.equal(transactions.at(-1).rolledBack, true);
    assert.equal(transactions.at(-1).released, true);
  });

  await t.test("owner can cancel their own booking", async () => {
    const response = await fetch(`${server.baseUrl}/api/bookings/${BOOKING_A}/cancel`, {
      method: "PUT",
      headers: authHeaders(USER_A, "customer"),
    });

    assert.equal(response.status, 200);
    assert.equal(bookings.get(BOOKING_A).status, "cancelled");
    assert.equal(transactions.at(-1).committed, true);
  });

  await t.test("admin can view and cancel any booking", async () => {
    const listResponse = await fetch(`${server.baseUrl}/api/bookings/user/${USER_B}`, {
      headers: authHeaders(ADMIN, "admin"),
    });
    const listBody = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.deepEqual(
      listBody.map((booking) => booking.id),
      [BOOKING_B],
    );
    assert.equal("password_hash" in listBody[0].user, false);

    const viewResponse = await fetch(`${server.baseUrl}/api/bookings/${BOOKING_B}`, {
      headers: authHeaders(ADMIN, "admin"),
    });
    const viewBody = await viewResponse.json();
    assert.equal(viewResponse.status, 200);
    assert.equal("password_hash" in viewBody.user, false);

    const cancelResponse = await fetch(`${server.baseUrl}/api/bookings/${BOOKING_B}/cancel`, {
      method: "PUT",
      headers: authHeaders(ADMIN, "admin"),
    });
    assert.equal(cancelResponse.status, 200);
    assert.equal(bookings.get(BOOKING_B).status, "cancelled");
  });

  await t.test("missing booking returns 404", async () => {
    const response = await fetch(`${server.baseUrl}/api/bookings/${MISSING_BOOKING}`, {
      headers: authHeaders(ADMIN, "admin"),
    });
    assert.equal(response.status, 404);
  });
});
