const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { AppDataSource } = require("../src/config/database");

const expectedEntities = [
  "User",
  "Movie",
  "Genre",
  "Theater",
  "Screen",
  "Show",
  "Seat",
  "Booking",
  "BookingSeat",
  "Review",
  "ShowSeatState",
  "Payment",
  "RefreshToken",
  "PasswordResetToken",
  "EmailVerificationToken",
  "AuditLog",
];

test("all EntitySchemas and important SQL Server queries build", async (t) => {
  await AppDataSource.buildMetadatas();

  await t.test("synchronize remains disabled and every repository builds SQL", () => {
    assert.equal(AppDataSource.options.synchronize, false);
    assert.deepEqual(
      AppDataSource.entityMetadatas
        .filter((metadata) => metadata.name !== "movie_genres")
        .map((metadata) => metadata.name)
        .sort(),
      [...expectedEntities].sort(),
    );

    for (const entity of expectedEntities) {
      const sql = AppDataSource.getRepository(entity)
        .createQueryBuilder(entity.toLowerCase())
        .select(`${entity.toLowerCase()}.id`)
        .getSql();
      assert.match(sql, /^SELECT /);
    }
  });

  await t.test("Seat properties target the SQL column names", () => {
    const metadata = AppDataSource.getMetadata("Seat");
    assert.equal(metadata.findColumnWithPropertyName("row").databaseName, "seat_row");
    assert.equal(metadata.findColumnWithPropertyName("number").databaseName, "seat_number");
  });

  await t.test("Review enforces one rating per user and movie", () => {
    const metadata = AppDataSource.getMetadata("Review");
    const unique = metadata.uniques.find((item) => item.givenName === "UQ_reviews_user_movie");
    assert.deepEqual(
      unique.columns.map((column) => column.databaseName),
      ["user_id", "movie_id"],
    );
    assert.ok(metadata.checks.some((check) => check.name === "CK_reviews_rating"));
    assert.equal(metadata.findRelationWithPropertyPath("user").isNullable, false);
    assert.equal(metadata.findRelationWithPropertyPath("movie").isNullable, false);
  });

  await t.test("Payment exposes the required lifecycle columns and one booking relation", () => {
    const metadata = AppDataSource.getMetadata("Payment");
    const columns = metadata.columns.map((column) => column.databaseName);
    for (const column of [
      "id",
      "booking_id",
      "provider",
      "provider_transaction_id",
      "amount",
      "status",
      "idempotency_key",
      "paid_at",
      "failed_at",
      "refunded_amount",
      "created_at",
      "updated_at",
    ]) {
      assert.ok(columns.includes(column), `missing payments.${column}`);
    }
    assert.equal(metadata.findRelationWithPropertyPath("booking").isOneToOne, true);
  });

  await t.test("AuditLog captures admin operations without sensitive payload columns", () => {
    const metadata = AppDataSource.getMetadata("AuditLog");
    const columns = metadata.columns.map((column) => column.databaseName);
    for (const column of [
      "id",
      "actor_user_id",
      "action",
      "resource_type",
      "resource_id",
      "metadata_json",
      "created_at",
    ]) {
      assert.ok(columns.includes(column), `missing audit_logs.${column}`);
    }
    assert.equal(metadata.findRelationWithPropertyPath("actor").isNullable, true);
    assert.ok(!columns.includes("password_hash"));
  });

  await t.test("relation-based filters generate SQL without virtual relation-id columns", () => {
    const recommendationSql = AppDataSource.getRepository("Booking")
      .createQueryBuilder("booking")
      .innerJoin("booking.user", "user")
      .innerJoin("booking.show", "show")
      .innerJoin("show.movie", "movie")
      .where("user.id = :userId", { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" })
      .getSql();
    assert.match(recommendationSql, /JOIN/);
    assert.doesNotMatch(recommendationSql, /userId/);

    const reviewSql = AppDataSource.getRepository("Review")
      .createQueryBuilder("review")
      .innerJoin("review.movie", "reviewedMovie")
      .select("AVG(review.rating)", "avg")
      .where("reviewedMovie.id = :movieId", { movieId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" })
      .getSql();
    assert.match(reviewSql, /movie_id/);
    assert.doesNotMatch(reviewSql, /movieId/);

    const roomSql = AppDataSource.getRepository("Screen")
      .createQueryBuilder("screen")
      .leftJoin("screen.theater", "theater")
      .where("theater.id = :theaterId", { theaterId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" })
      .getSql();
    assert.match(roomSql, /theater_id/);
    assert.doesNotMatch(roomSql, /screen\.theater_id/);

    const trendingSql = AppDataSource.getRepository("Booking")
      .createQueryBuilder("booking")
      .innerJoin("booking.show", "show")
      .innerJoin("show.movie", "movie")
      .select("movie.id", "movieId")
      .addSelect("COUNT(booking.id)", "bookingCount")
      .groupBy("movie.id")
      .orderBy("COUNT(booking.id)", "DESC")
      .limit(4)
      .getSql();
    assert.match(trendingSql, /GROUP BY/);
    assert.doesNotMatch(trendingSql, /description/);
  });

  await t.test("controllers contain no unsafe raw relation-id references", () => {
    const controllersDir = path.join(__dirname, "..", "src", "controllers");
    const source = fs
      .readdirSync(controllersDir)
      .filter((file) => file.endsWith(".js"))
      .map((file) => fs.readFileSync(path.join(controllersDir, file), "utf8"))
      .join("\n");

    assert.doesNotMatch(
      source,
      /(?:booking\.userId|review\.movieId|b\.showId|bs\.seatId|screen\.theater_id)/,
    );
  });
});
