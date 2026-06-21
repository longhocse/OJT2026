# Testing and developer tooling

## Commands

- `npm start` starts the production-style server bootstrap.
- `npm run dev` starts the server with Nodemon.
- `npm test` runs the CommonJS test suite once.
- `npm run test:watch` reruns tests while files change.
- `npm run test:coverage` enforces at least 80% line and function coverage for
  critical auth, booking, and request middleware modules.
- `npm run lint` runs ESLint.
- `npm run format` formats the repository with Prettier.
- `npm run format:check` verifies formatting without changing files.

## Architecture

`src/app.js` constructs and returns the Express application. It does not open
a port or initialize TypeORM. `src/server.js` is the only runtime bootstrap
that connects to SQL Server and calls `listen`.

Tests use Supertest against the in-memory Express application. No test file
opens a network port. Database repositories and query runners are mocked for
unit/integration tests.

## Test database isolation

`test.setup.js` sets `NODE_ENV=test` and forces `DB_DATABASE=MovieTapTestDB`
before application modules load. Tests must never reuse the development
database name. If real database integration tests are added, create and migrate
this dedicated test database independently and clean it between test runs.

## Clean setup

```powershell
npm ci
npm run lint
npm test
npm run test:coverage
```
