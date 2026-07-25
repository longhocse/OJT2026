const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const { AppDataSource } = require("../src/config/database");

const shouldRun = process.env.RUN_SQLSERVER_INTEGRATION === "1";

const ensureInitialized = async () => {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
};

test(
  "SQL Server integration: phase migrations expose required tables and columns",
  { skip: !shouldRun },
  async () => {
    await ensureInitialized();
    const rows = await AppDataSource.query(`
      SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME IN ('payments', 'refresh_tokens', 'password_reset_tokens', 'movie_genres', 'audit_logs', 'movies', 'theaters', 'screens')
    `);
    const columns = new Set(rows.map((row) => `${row.tableName}.${row.columnName}`));
    for (const column of [
      "payments.idempotency_key",
      "payments.refunded_amount",
      "refresh_tokens.token_hash",
      "password_reset_tokens.expires_at",
      "movie_genres.movie_id",
      "audit_logs.action",
      "movies.is_active",
      "theaters.is_active",
      "screens.is_active",
    ]) {
      assert.ok(columns.has(column), `missing ${column}; run migrations before integration tests`);
    }
  },
);

test(
  "SQL Server integration: duplicate seats are rejected by the database constraint",
  { skip: !shouldRun },
  async () => {
    await ensureInitialized();
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const theaterId = randomUUID();
      const screenId = randomUUID();
      await runner.query("INSERT INTO dbo.theaters (id, name, is_active) VALUES (@0, @1, 1)", [
        theaterId,
        `Integration Cinema ${theaterId}`,
      ]);
      await runner.query(
        "INSERT INTO dbo.screens (id, theater_id, name, total_seats, is_active) VALUES (@0, @1, @2, 2, 1)",
        [screenId, theaterId, "Integration Room"],
      );
      await runner.query(
        "INSERT INTO dbo.seats (id, screen_id, seat_row, seat_number, type, status) VALUES (@0, @1, 'A', 1, 'standard', 'available')",
        [randomUUID(), screenId],
      );
      await assert.rejects(
        () =>
          runner.query(
            "INSERT INTO dbo.seats (id, screen_id, seat_row, seat_number, type, status) VALUES (@0, @1, 'A', 1, 'standard', 'available')",
            [randomUUID(), screenId],
          ),
        /duplicate|unique|constraint/i,
      );
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  },
);

test(
  "SQL Server integration: show overlap query detects room conflicts",
  { skip: !shouldRun },
  async () => {
    await ensureInitialized();
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const theaterId = randomUUID();
      const screenId = randomUUID();
      const movieId = randomUUID();
      const showId = randomUUID();
      const start = new Date("2030-01-01T10:00:00.000Z");
      const end = new Date("2030-01-01T12:00:00.000Z");
      await runner.query("INSERT INTO dbo.theaters (id, name, is_active) VALUES (@0, @1, 1)", [
        theaterId,
        `Integration Cinema ${theaterId}`,
      ]);
      await runner.query(
        "INSERT INTO dbo.screens (id, theater_id, name, total_seats, is_active) VALUES (@0, @1, @2, 10, 1)",
        [screenId, theaterId, "Integration Room"],
      );
      await runner.query(
        "INSERT INTO dbo.movies (id, title, duration, status, is_active) VALUES (@0, @1, 120, 'now_showing', 1)",
        [movieId, "Integration Movie"],
      );
      await runner.query(
        "INSERT INTO dbo.shows (id, screen_id, movie_id, start_time, end_time, price, status) VALUES (@0, @1, @2, @3, @4, 100000, 'scheduled')",
        [showId, screenId, movieId, start, end],
      );
      const conflicts = await runner.query(
        `
        SELECT id
        FROM dbo.shows
        WHERE screen_id = @0
          AND status = 'scheduled'
          AND start_time < @1
          AND end_time > @2
        `,
        [screenId, new Date("2030-01-01T12:15:00.000Z"), new Date("2030-01-01T10:15:00.000Z")],
      );
      assert.equal(conflicts.length, 1);
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  },
);
