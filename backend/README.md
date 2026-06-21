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

For a new empty database, use `docker/sqlserver/bootstrap.sql`. Optional non-user sample data is in `docker/sqlserver/seed.sql`:

```powershell
sqlcmd -S localhost -U sa -d MovieTapDB -C -b -i docker/sqlserver/seed.sql
```

`new.sql` is a legacy destructive development script and must not be run against shared or production data.

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

## API overview

- `GET /health` — process liveness; does not depend on SQL Server
- `GET /ready` — readiness; returns `503` unless a database query succeeds
- `/api/auth` — register, login, current profile
- `/api/users` — admin-only paginated user list
- `/api/movies`, `/api/genres`, `/api/cinemas`, `/api/rooms`, `/api/shows` — catalog and admin CRUD
- `/api/bookings` — authenticated booking, ownership checks, seat lock/unlock; `/me` returns the current user's bookings
- `/api/recommendations` — authenticated personal recommendations; `/trending` is public
- `/api/movies/:movieId/reviews` — review list and authenticated create/update

Authenticated calls use `Authorization: Bearer <token>`. Errors use `{ code, message, errors }`; responses carry `X-Request-Id` for log correlation.

## Production operation

The server handles `SIGTERM`/`SIGINT`: it stops accepting HTTP traffic, drains connections with a timeout, and then closes the TypeORM pool. Route load balancers to `/health` for liveness and `/ready` for readiness. See `docs/production-readiness.md` before launch.
