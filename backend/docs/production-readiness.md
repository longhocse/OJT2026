# Production readiness checklist

Audit date: 2026-06-22

## Implemented and verified in the repository

- [x] Startup validation for database, JWT, port, TLS and CORS configuration
- [x] Exact CORS origin allowlist; wildcard rejected when `NODE_ENV=production`
- [x] Request IDs, JSON structured logging and sensitive-field redaction
- [x] `100kb` JSON/form body limit, Helmet and stricter authentication rate limits
- [x] Separate liveness (`/health`) and SQL-backed readiness (`/ready`) probes
- [x] Idempotent graceful shutdown for HTTP connections and TypeORM
- [x] Application/server split for tests without a listening port
- [x] Docker multi-stage build, production-only dependencies and non-root runtime
- [x] `.dockerignore` prevents local secrets, tests and development artifacts entering the image
- [x] Compose development environment with persistent SQL Server and idempotent bootstrap
- [x] SQL migrations retain `synchronize: false` and include rollback scripts
- [x] CI clean install, format check, lint, tests, coverage, secret scan and dependency audit
- [x] Authorization, booking ownership, validation, review constraints and seat concurrency tests
- [x] Payment lifecycle, signed ticket check-in, refresh-token rotation, password reset expiry and audit-log tests
- [x] Referenced movies/cinemas/rooms deactivate instead of hard-deleting historical booking/show data
- [x] Movie–Genre many-to-many migration with legacy genre migration and review-derived movie ratings

## Deployment-owner actions before go-live

- [ ] Rotate JWT and database credentials that existed before hardening; purge exposed Git history only with team coordination
- [ ] Store secrets in the target platform secret manager; never in image layers or Compose files
- [ ] Set `DB_ENCRYPT=true`, `DB_TRUST_SERVER_CERTIFICATE=false`, trusted SQL certificates and exact HTTPS CORS origins
- [ ] Run migrations and rollback rehearsal against a production-like backup in staging
- [ ] Verify `20260624_*` and `20260625_*` migrations on SQL Server with realistic existing movie genre/review/booking data
- [ ] Run opt-in SQL Server integration tests with `RUN_SQLSERVER_INTEGRATION=1` against a disposable/staging database
- [ ] Configure TLS termination, reverse-proxy timeouts, request limits and trusted proxy settings
- [ ] Configure SQL Server backups, restore drills, retention, least-privilege application login and HA requirements
- [ ] Connect structured logs, `/ready` failures, latency, error-rate and resource metrics to monitoring/alerts
- [ ] Load-test booking concurrency, shutdown draining and expected peak traffic
- [ ] Define deployment rollback, incident response and on-call ownership
- [ ] Run final authenticated smoke tests: admin create cinema → room → seats → movie → show; user register → lock seats → pay → ticket; admin check-in; user/admin cancellation and refund; audit log review
