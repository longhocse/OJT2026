const test = require("node:test");
const assert = require("node:assert/strict");

const { AppDataSource } = require("../src/config/database");
const {
  applyTheaterScope,
  assertBookingAccess,
  assertShowAccess,
  assertTheaterAccess,
  attachAccessScope,
} = require("../src/services/accessControlService");

const THEATER_A = "11111111-1111-4111-8111-111111111111";
const THEATER_B = "22222222-2222-4222-8222-222222222222";

const attach = (req) =>
  new Promise((resolve, reject) =>
    attachAccessScope(req, {}, (error) => (error ? reject(error) : resolve())),
  );

test("manager, cashier and checker cannot cross their assigned theater", async (t) => {
  const originalGetRepository = AppDataSource.manager.getRepository;
  const assignmentQueries = [];
  AppDataSource.manager.getRepository = (name) => {
    if (name !== "UserTheater") return originalGetRepository.call(AppDataSource.manager, name);
    return {
      find: async ({ where }) => {
        assignmentQueries.push(where);
        return [
          {
            is_active: true,
            role_at_theater: where.role_at_theater,
            theater: { id: THEATER_A },
          },
        ];
      },
    };
  };
  t.after(() => {
    AppDataSource.manager.getRepository = originalGetRepository;
  });

  for (const role of ["manager", "cashier", "ticket_checker"]) {
    const req = { user: { id: `${role}-user`, role } };
    await attach(req);
    assert.deepEqual(req.accessScope.theaterIds, [THEATER_A]);
    assert.doesNotThrow(() => assertTheaterAccess(req, THEATER_A));
    assert.throws(
      () => assertTheaterAccess(req, THEATER_B),
      (error) => error.status === 403 && error.code === "THEATER_SCOPE_FORBIDDEN",
    );
  }

  assert.deepEqual(
    assignmentQueries.map((where) => where.role_at_theater),
    ["manager", "cashier", "ticket_checker"],
  );
});

test("show, booking and list access all enforce the same theater scope", async () => {
  const req = { user: { id: "staff-1", role: "manager" }, accessScope: { theaterIds: [THEATER_A] } };
  const manager = {
    getRepository(name) {
      if (name === "Show") {
        return {
          findOne: async ({ where }) => ({
            id: where.id,
            screen: { theater: { id: where.id === "show-a" ? THEATER_A : THEATER_B } },
          }),
        };
      }
      if (name === "Booking") {
        return {
          findOne: async ({ where }) => ({
            id: where.id,
            show: { screen: { theater: { id: where.id === "booking-a" ? THEATER_A : THEATER_B } } },
          }),
        };
      }
      throw new Error(`Unexpected repository ${name}`);
    },
  };

  await assertShowAccess(manager, req, "show-a");
  await assert.rejects(() => assertShowAccess(manager, req, "show-b"), {
    status: 403,
    code: "THEATER_SCOPE_FORBIDDEN",
  });
  await assertBookingAccess(manager, req, "booking-a");
  await assert.rejects(() => assertBookingAccess(manager, req, "booking-b"), {
    status: 403,
    code: "THEATER_SCOPE_FORBIDDEN",
  });

  const calls = [];
  const qb = {
    andWhere(sql, params) {
      calls.push({ sql, params });
      return this;
    },
  };
  applyTheaterScope(qb, req, "theater");
  assert.deepEqual(calls, [
    {
      sql: "theater.id IN (:...scopeTheaterIds)",
      params: { scopeTheaterIds: [THEATER_A] },
    },
  ]);
});

test("admin remains global and staff without a matching assignment gets no rows", () => {
  assert.doesNotThrow(() =>
    assertTheaterAccess({ user: { role: "admin" }, accessScope: { theaterIds: null } }, THEATER_B),
  );

  const calls = [];
  const qb = {
    andWhere(sql) {
      calls.push(sql);
      return this;
    },
  };
  applyTheaterScope(
    qb,
    { user: { role: "cashier" }, accessScope: { theaterIds: [] } },
    "theater",
  );
  assert.deepEqual(calls, ["1 = 0"]);
});
