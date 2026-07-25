const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");

const { AppDataSource } = require("../src/config/database");
const roomRoutes = require("../src/routes/roomRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const THEATER_ID = "11111111-1111-4111-8111-111111111111";
const ROOM_ID = "22222222-2222-4222-8222-222222222222";

const token = (role) =>
  jwt.sign({ id: ADMIN_ID, role }, process.env.JWT_SECRET, { expiresIn: "5m" });

const app = express();
app.use(express.json());
app.use("/api/rooms", roomRoutes);
app.use(errorHandler);

const roomPayload = (seats) => ({
  name: "Room 1",
  theater: { id: THEATER_ID },
  seats,
});

test("room seat management requires admin and rejects duplicate positions", async () => {
  const seats = [
    { row: "A", number: 1, type: "standard", status: "available" },
    { row: "a", number: 1, type: "vip", status: "available" },
  ];

  const denied = await request(app)
    .post("/api/rooms")
    .set("Authorization", `Bearer ${token("customer")}`)
    .send(roomPayload(seats));
  assert.equal(denied.status, 403);

  const duplicate = await request(app)
    .post("/api/rooms")
    .set("Authorization", `Bearer ${token("admin")}`)
    .send(roomPayload(seats));
  assert.equal(duplicate.status, 400);
  assert.equal(duplicate.body.code, "VALIDATION_ERROR");
  assert.match(duplicate.body.errors[0].message, /Duplicate seat position/i);
});

test("creating a room and its seats commits one transaction and derives totals", async (t) => {
  const originalCreateQueryRunner = AppDataSource.createQueryRunner;
  const originalGetRepository = AppDataSource.getRepository;
  const calls = [];
  let storedRoom;
  let storedSeats = [];

  const repositories = {
    Theater: { findOneBy: async () => ({ id: THEATER_ID, name: "Cinema" }) },
    Screen: {
      create: () => ({ id: ROOM_ID }),
      save: async (room) => {
        calls.push("save-room");
        storedRoom = room;
        return room;
      },
    },
    Seat: {
      create: (data) => ({ id: `seat-${data.row}-${data.number}`, ...data }),
      save: async (seats) => {
        calls.push("save-seats");
        storedSeats = seats;
        return seats;
      },
      remove: async () => {},
    },
    Show: { count: async () => 0 },
    BookingSeat: { count: async () => 0 },
  };
  const queryRunner = {
    manager: { getRepository: (name) => repositories[name] },
    connect: async () => calls.push("connect"),
    startTransaction: async () => calls.push("start"),
    commitTransaction: async () => calls.push("commit"),
    rollbackTransaction: async () => calls.push("rollback"),
    release: async () => calls.push("release"),
  };
  AppDataSource.createQueryRunner = () => queryRunner;
  AppDataSource.getRepository = (name) => {
    if (name === "Screen") {
      return {
        findOne: async () => ({ ...storedRoom, seats: storedSeats }),
      };
    }
    return originalGetRepository.call(AppDataSource, name);
  };
  t.after(() => {
    AppDataSource.createQueryRunner = originalCreateQueryRunner;
    AppDataSource.getRepository = originalGetRepository;
  });

  const response = await request(app)
    .post("/api/rooms")
    .set("Authorization", `Bearer ${token("admin")}`)
    .send(
      roomPayload([
        { row: "a", number: 1, type: "standard", status: "available" },
        { row: "A", number: 2, type: "vip", status: "disabled" },
      ]),
    );

  assert.equal(response.status, 201);
  assert.equal(response.body.total_seats, 2);
  assert.deepEqual(calls, ["connect", "start", "save-room", "save-seats", "commit", "release"]);
  assert.equal(storedRoom.total_seats, 2);
  assert.equal(storedSeats[0].row, "A");
  assert.equal(JSON.parse(storedRoom.layout_json).seats.length, 2);
});

test("updating a layout with future shows rolls the transaction back", async (t) => {
  const originalCreateQueryRunner = AppDataSource.createQueryRunner;
  const originalGetRepository = AppDataSource.getRepository;
  const calls = [];
  const existingSeat = {
    id: "33333333-3333-4333-8333-333333333333",
    row: "A",
    number: 1,
    type: "standard",
    status: "available",
  };
  const repositories = {
    Theater: { findOneBy: async () => ({ id: THEATER_ID }) },
    Screen: {
      findOne: async () => ({
        id: ROOM_ID,
        name: "Room 1",
        theater: { id: THEATER_ID },
        seats: [existingSeat],
      }),
    },
    Seat: {},
    Show: { count: async () => 1 },
    BookingSeat: { count: async () => 0 },
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
    AppDataSource.getRepository = originalGetRepository;
  });

  const response = await request(app)
    .put(`/api/rooms/${ROOM_ID}`)
    .set("Authorization", `Bearer ${token("admin")}`)
    .send(roomPayload([{ ...existingSeat, type: "vip" }]));

  assert.equal(response.status, 409);
  assert.equal(response.body.code, "ROOM_LAYOUT_HAS_FUTURE_SHOWS");
  assert.deepEqual(calls, ["connect", "start", "rollback", "release"]);
});
