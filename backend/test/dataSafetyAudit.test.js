const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const { AppDataSource } = require("../src/config/database");
const movieRoutes = require("../src/routes/movieRoutes");
const adminRoutes = require("../src/routes/adminRoutes");
const { errorHandler } = require("../src/middleware/errorHandler");

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MOVIE_ID = "11111111-1111-4111-8111-111111111111";
const AUDIT_ID = "22222222-2222-4222-8222-222222222222";

const routeApp = (path, router) => {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  app.use(errorHandler);
  return app;
};

const adminToken = () =>
  jwt.sign({ id: USER_ID, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "5m" });

test(
  "referenced movie delete deactivates and writes an audit log",
  { concurrency: false },
  async (t) => {
    const originalGetRepository = AppDataSource.getRepository;
    const originalHasMetadata = AppDataSource.hasMetadata;
    const movie = {
      id: MOVIE_ID,
      title: "Referenced Movie",
      status: "now_showing",
      is_active: true,
    };
    let savedMovie = null;
    let auditLog = null;

    AppDataSource.hasMetadata = (name) => name === "AuditLog";
    AppDataSource.getRepository = (name) => {
      if (name === "Movie") {
        return {
          findOneBy: async ({ id }) => (id === MOVIE_ID ? movie : null),
          save: async (entity) => {
            savedMovie = entity;
            return entity;
          },
        };
      }
      if (name === "Show") return { count: async () => 1 };
      if (name === "Review") return { count: async () => 0 };
      if (name === "AuditLog") {
        return {
          save: async (entry) => {
            auditLog = { id: AUDIT_ID, ...entry };
            return auditLog;
          },
        };
      }
      return originalGetRepository.call(AppDataSource, name);
    };
    t.after(() => {
      AppDataSource.getRepository = originalGetRepository;
      AppDataSource.hasMetadata = originalHasMetadata;
    });

    const response = await request(routeApp("/api/movies", movieRoutes))
      .delete(`/api/movies/${MOVIE_ID}`)
      .set("Authorization", `Bearer ${adminToken()}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.code, "MOVIE_IN_USE_DEACTIVATED");
    assert.equal(savedMovie.is_active, false);
    assert.equal(savedMovie.status, "ended");
    assert.equal(auditLog.action, "movie.deactivate");
    assert.equal(auditLog.resource_id, MOVIE_ID);
    assert.match(auditLog.metadata_json, /referenced_resource/);
  },
);

test(
  "admin audit log endpoint paginates and omits password_hash",
  { concurrency: false },
  async (t) => {
    const originalGetRepository = AppDataSource.getRepository;
    const auditItem = {
      id: AUDIT_ID,
      action: "movie.deactivate",
      resource_type: "Movie",
      resource_id: MOVIE_ID,
      metadata_json: '{"reason":"referenced_resource"}',
      created_at: new Date("2026-06-25T00:00:00.000Z"),
      actor: {
        id: USER_ID,
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        password_hash: "must-not-leak",
      },
    };
    const qb = {
      leftJoinAndSelect: () => qb,
      andWhere: () => qb,
      orderBy: () => qb,
      skip: () => qb,
      take: () => qb,
      getManyAndCount: async () => [[auditItem], 1],
    };

    AppDataSource.getRepository = (name) => {
      if (name === "AuditLog") return { createQueryBuilder: () => qb };
      return originalGetRepository.call(AppDataSource, name);
    };
    t.after(() => {
      AppDataSource.getRepository = originalGetRepository;
    });

    const response = await request(routeApp("/api/admin", adminRoutes))
      .get("/api/admin/audit-logs?action=movie.deactivate")
      .set("Authorization", `Bearer ${adminToken()}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data[0].action, "movie.deactivate");
    assert.equal(response.body.data[0].actor.email, "admin@example.com");
    assert.equal("password_hash" in response.body.data[0].actor, false);
    assert.deepEqual(response.body.pagination, { page: 1, limit: 20, total: 1, pages: 1 });
  },
);
