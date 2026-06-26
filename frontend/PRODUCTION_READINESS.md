# MovieTap production readiness

## Ready in the frontend

- [x] CRA environment-based API URL with no hard-coded production origin
- [x] Central Axios client, JWT injection, `/auth/me` session verification, and `401` cleanup
- [x] Protected and admin route verification; backend remains authorization authority
- [x] Lazy route bundles, Suspense fallback, application error boundary, API error state, and 404 route
- [x] Safe poster URLs, intrinsic image dimensions, lazy decoding/loading, and fallback image
- [x] Responsive user flows and horizontally scrollable admin/seat tables
- [x] Keyboard focus styles, mobile filter focus trap, semantic alerts/status, countdown announcements, and reduced-motion support
- [x] No production mock statistics or unsupported endpoint calls
- [x] Profile/password reset pages, refresh retry flow, admin user access controls, payments, audit logs, and real dashboard stats
- [x] CI tests, critical-area coverage threshold, ESLint, Prettier, and production build
- [x] Static-host SPA fallback and cache requirements documented

## Deployment checks

- [ ] Build with the final public `REACT_APP_API_URL`, or configure a same-origin `/api` reverse proxy
- [ ] Add the exact frontend origin to backend `CORS_ORIGINS`
- [ ] Verify TLS, CSP/security headers, compression, and SPA rewrites on the selected host
- [ ] Run `npm ci`, `npm run test:ci`, `npm run test:coverage`, `npm run lint`, `npm run format:check`, `npm run build`, and `npm audit`
- [ ] Smoke-test admin tạo rạp → phòng → ghế → phim → suất; user đăng ký → giữ ghế → thanh toán → nhận vé; admin check-in; user/admin hủy và hoàn tiền
- [ ] Verify forgot/reset password, refresh-token rotation, logout revoke, locked account behavior, and admin audit log visibility

## Remaining deployment-owner checks

1. **Secret material:** provide production-grade `PAYMENT_WEBHOOK_SECRET`, `TICKET_QR_SECRET`, JWT secrets and SQL credentials through the deployment secret manager.
2. **Operational E2E:** run the full smoke paths above against staging after migrations are applied.
3. **Cookie policy:** confirm HTTPS, SameSite and domain behavior for the HttpOnly refresh cookie behind the final reverse proxy.
