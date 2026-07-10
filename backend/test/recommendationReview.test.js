const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

const { AppDataSource } = require("../src/config/database");
const recommendationRoutes = require("../src/routes/recommendationRoutes");
const movieRoutes = require("../src/routes/movieRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");
const { createSupertestFetch } = require("../test-support/supertestFetch");

const JWT_SECRET = "recommendation-review-test-secret";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MOVIE_ID = "11111111-1111-4111-8111-111111111111";

const tokenFor = (userId) =>
  jwt.sign({ id: userId, role: "customer" }, JWT_SECRET, { expiresIn: "5m" });

const chain = (terminalName, terminalValue, capture = {}) => {
  const builder = {};
  for (const method of [
    "innerJoin",
    "leftJoinAndSelect",
    "where",
    "andWhere",
    "select",
    "addSelect",
    "groupBy",
    "addGroupBy",
    "orderBy",
    "limit",
  ]) {
    builder[method] = (...args) => {
      if (method === "where" || method === "andWhere")
        capture.conditions = [...(capture.conditions ?? []), args];
      return builder;
    };
  }
  builder[terminalName] = async () => terminalValue;
  return builder;
};

const startServer = async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/recommendations", recommendationRoutes);
  app.use("/api/movies", movieRoutes);
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

test("personal recommendations use the authenticated user", { concurrency: false }, async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  const originalGetRepository = AppDataSource.getRepository;
  process.env.JWT_SECRET = JWT_SECRET;
  const capture = {};

  AppDataSource.getRepository = (name) => {
    if (name === "Booking") {
      return {
        createQueryBuilder: () =>
          chain("getRawMany", [{ genreId: "genre-1", genreName: "Drama" }], capture),
      };
    }
    if (name === "Movie") {
      return {
        createQueryBuilder: () => chain("getMany", [{ id: MOVIE_ID, genres: [] }]),
      };
    }
    throw new Error(`Unexpected repository: ${name}`);
  };

  const server = await startServer();
  t.after(async () => {
    await server.close();
    AppDataSource.getRepository = originalGetRepository;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const unauthenticated = await fetch(`${server.baseUrl}/api/recommendations`);
  assert.equal(unauthenticated.status, 401);

  const response = await fetch(`${server.baseUrl}/api/recommendations?userId=${OTHER_USER_ID}`, {
    headers: { Authorization: `Bearer ${tokenFor(USER_ID)}` },
  });
  assert.equal(response.status, 200);
  const userCondition = capture.conditions.find(([sql]) => sql === "user.id = :userId");
  assert.equal(userCondition[1].userId, USER_ID);
  const statusCondition = capture.conditions.find(([sql]) => sql.includes("booking.status IN"));
  assert.deepEqual(statusCondition[1].bookingStatuses, ["confirmed", "used"]);
});

test("reviews require a used ticket and upsert safely", { concurrency: false }, async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  const originalCreateQueryRunner = AppDataSource.createQueryRunner;
  process.env.JWT_SECRET = JWT_SECRET;

  let eligible = false;
  let existingReview = null;
  const bookingCapture = {};
  const transactions = [];
  AppDataSource.createQueryRunner = () => {
    const state = { committed: false, rolledBack: false, released: false, active: false };
    transactions.push(state);
    const movie = { id: MOVIE_ID, title: "Movie", rating: 0 };
    return {
      connect: async () => {},
      startTransaction: async (isolation) => {
        state.isolation = isolation;
        state.active = true;
      },
      commitTransaction: async () => {
        state.committed = true;
        state.active = false;
      },
      rollbackTransaction: async () => {
        state.rolledBack = true;
        state.active = false;
      },
      release: async () => {
        state.released = true;
      },
      manager: {
        getRepository: (name) => {
          if (name === "Movie") return { findOne: async () => movie, save: async () => movie };
          if (name === "Booking") {
            return {
              createQueryBuilder: () =>
                chain("getOne", eligible ? { id: "booking" } : null, bookingCapture),
            };
          }
          if (name === "Review") {
            return {
              findOne: async () => existingReview,
              create: (data) => ({ id: "44444444-4444-4444-8444-444444444444", ...data }),
              save: async (entity) => {
                existingReview = entity;
                return entity;
              },
              createQueryBuilder: () => chain("getRawOne", { avg: "5" }),
            };
          }
          throw new Error(`Unexpected repository: ${name}`);
        },
        save: async (entity) => {
          if (Object.hasOwn(entity, "comment")) existingReview = entity;
          return entity;
        },
      },
      get isTransactionActive() {
        return state.active;
      },
    };
  };

  const server = await startServer();
  t.after(async () => {
    await server.close();
    AppDataSource.createQueryRunner = originalCreateQueryRunner;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const requestReview = (rating, comment) =>
    fetch(`${server.baseUrl}/api/movies/${MOVIE_ID}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenFor(USER_ID)}`,
      },
      body: JSON.stringify({ rating, comment }),
    });

  const forbidden = await requestReview(5, "Great");
  assert.equal(forbidden.status, 403);
  assert.equal(transactions.at(-1).rolledBack, true);
  assert.equal(transactions.at(-1).released, true);
  const usedCondition = bookingCapture.conditions.find(
    ([sql]) => sql === "booking.status = :status",
  );
  assert.equal(usedCondition[1].status, "used");
  assert.ok(!bookingCapture.conditions.some(([sql]) => sql === "show.end_time <= :now"));

  const runnerCountBeforeInvalidRating = transactions.length;
  const invalidRating = await requestReview(6, "Invalid");
  assert.equal(invalidRating.status, 400);
  assert.equal(transactions.length, runnerCountBeforeInvalidRating);

  eligible = true;
  const created = await requestReview(5, "Great");
  assert.equal(created.status, 201);
  assert.equal(transactions.at(-1).committed, true);
  assert.equal(transactions.at(-1).isolation, "SERIALIZABLE");

  const duplicate = await requestReview(4, "Updated");
  assert.equal(duplicate.status, 409);

  const updated = await fetch(
    `${server.baseUrl}/api/movies/${MOVIE_ID}/reviews/44444444-4444-4444-8444-444444444444`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenFor(USER_ID)}`,
      },
      body: JSON.stringify({ rating: 4, comment: "Updated" }),
    },
  );
  assert.equal(updated.status, 200);
  const updatedBody = await updated.json();
  assert.equal(updatedBody.rating, 4);
  assert.equal(updatedBody.comment, "Updated");
});
