# MovieTap Backend

Express 5 + TypeORM API for a SQL Server movie-ticket booking system. The application is separated from the HTTP listener, validates configuration at startup, emits structured JSON logs, and keeps TypeORM schema synchronization disabled.

## Requirements

- Node.js 24 or newer
- npm (lockfile is committed)
- SQL Server 2022, or Docker Desktop with Compose

## Local setup

```powershell
npm ci
Copy-Item .env.example .env
npm run start
```

Fill `.env` before starting. The process exits with the names of invalid or missing variables; it never prints their values. For live reload use `npm run dev`.

## Environment

| Variable                                    | Purpose                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `NODE_ENV`                                  | `development`, `test`, or `production`                                     |
| `PORT`                                      | HTTP port, default `5000`                                                  |
| `DB_HOST`, `DB_PORT`                        | SQL Server address                                                         |
| `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | SQL Server credentials/database                                            |
| `DB_INSTANCE`                               | Optional named SQL Server instance                                         |
| `DB_ENCRYPT`                                | Enable transport encryption; use `true` in production                      |
| `DB_TRUST_SERVER_CERTIFICATE`               | Development convenience; use `false` with a trusted production certificate |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`          | Independent random secrets, at least 32 characters                         |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`  | Token lifetime values                                                      |
| `PASSWORD_RESET_TTL_MINUTES`                | Password reset token lifetime, default `30` minutes                        |
| `SHOW_CLEANING_BUFFER_MINUTES`              | Minimum room cleaning gap, default `15` minutes                            |
| `PAYMENT_PROVIDER_MODE`                     | Local provider mode; currently `mock`                                      |
| `PAYMENT_WEBHOOK_SECRET`                    | HMAC secret used to verify payment callbacks                               |
| `TICKET_QR_SECRET`                          | Independent HMAC secret used to sign ticket QR payloads                    |
| `PAYMENT_PENDING_TTL_MINUTES`               | Online payment reservation lifetime                                        |
| `CASH_PAYMENT_TTL_MINUTES`                  | Cash confirmation reservation lifetime                                     |
| `BOOKING_EXPIRY_INTERVAL_MS`                | Pending-booking expiry worker interval                                     |
| `CORS_ORIGINS`                              | Comma-separated exact browser origins; `*` is rejected in production       |

Never commit `.env`. Inject production secrets through the deployment platform's secret manager and rotate any secret that has appeared in Git history.

## Docker development

Set secrets in the current shell, then start the API and SQL Server:

```powershell
$env:MSSQL_SA_PASSWORD = '<a-strong-local-password>'
$env:JWT_SECRET = '<at-least-32-random-characters>'
$env:JWT_REFRESH_SECRET = '<a-different-32-character-secret>'
docker compose up --build
```

The database volume is persistent and `docker/sqlserver/bootstrap.sql` is idempotent. Stop with `docker compose down`; add `-v` only when you intentionally want to delete local database data.

## Database migrations and seed

For an existing database, back up first and execute each `*.up.sql` in `migrations/` in filename order. Roll back by executing matching `*.down.sql` files in reverse order. Example:

```powershell
sqlcmd -S localhost -U sa -d MovieTapDB -C -b -i migrations/20260621_align_entity_schema.up.sql
```

For the local SQL Server database used by this repository, execute
`MovieTapDB_FULL_RESET_CURRENT.sql` once to recreate the current schema and demo
data:

```powershell
sqlcmd -S localhost -U sa -C -b -i MovieTapDB_FULL_RESET_CURRENT.sql
```

For Docker-only bootstrap flows, `docker/sqlserver/bootstrap.sql` remains
idempotent. Optional non-user sample data is in `docker/sqlserver/seed.sql`:

```powershell
sqlcmd -S localhost -U sa -d MovieTapDB -C -b -i docker/sqlserver/seed.sql
```

Do not enable TypeORM `synchronize`; all incremental database changes should go
through the migration files in this folder.

## Tests and quality checks

```powershell
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run security:check
npm audit --audit-level=high
```

Tests use `MovieTapTestDB` configuration and do not listen on a real port. Important controller/middleware coverage is gated at 80% lines and functions.

SQL Server integration tests are opt-in so they cannot accidentally mutate a developer database. Apply migrations to a disposable/staging database, set the normal DB environment variables to that database, then run:

```powershell
$env:RUN_SQLSERVER_INTEGRATION = '1'
npm test
```

Those tests verify migrated tables/columns, the duplicate-seat constraint and the room-overlap query against real SQL Server.

## API overview

- `GET /health` — process liveness; does not depend on SQL Server
- `GET /ready` — readiness; returns `503` unless a database query succeeds
- `/api/auth` — register, login, refresh rotation, logout revoke, profile, change/forgot/reset password
- `/api/users` — admin-only paginated user list and role/lock management
- `/api/movies`, `/api/genres`, `/api/cinemas`, `/api/rooms`, `/api/shows` — catalog and admin CRUD
- Admin delete of referenced movies/cinemas/rooms deactivates the resource (`is_active = 0`) instead of hard-deleting historical data.
- `POST/PUT /api/rooms` — admin-only transactional room and seat-layout writes; totals are derived server-side
- `/api/admin/shows` — paginated show scheduling, conflict checks, cancellation and safe deletion
- `/api/admin/bookings`, `/api/admin/dashboard/stats` — booking operations, refunds and dashboard metrics
- `/api/admin/audit-logs` — paginated audit trail for important admin actions
- `/api/bookings` — authenticated booking, ownership checks, seat lock/unlock; `/me` returns the current user's bookings
- `/api/recommendations` — authenticated personal recommendations; `/trending` is public
- `/api/movies/:movieId/reviews` — review list, authenticated create/update/delete, and admin moderation

Authenticated calls use `Authorization: Bearer <token>`. Errors use `{ code, message, errors }`; responses carry `X-Request-Id` for log correlation.

## Payment and ticket endpoints

- `POST /api/payments/webhooks/mock` verifies a signed provider callback.
- `GET /api/payments/:id` and `POST /api/payments/:id/mock-complete` support the local flow.
- `/api/admin/payments` supports search, cash confirmation, and refunds.
- `GET /api/bookings/:id/ticket` returns an owner-authorized signed ticket payload.
- `POST /api/admin/tickets/check-in` performs idempotent admin check-in.

See `docs/payment-ticket-lifecycle.md` for state transitions and operational rules.

## Production operation

The server handles `SIGTERM`/`SIGINT`: it stops accepting HTTP traffic, drains connections with a timeout, and then closes the TypeORM pool. Route load balancers to `/health` for liveness and `/ready` for readiness. See `docs/production-readiness.md` before launch.
