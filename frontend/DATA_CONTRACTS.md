# Frontend data contracts

## Phase 4 payment and ticket contract

This section supersedes older notes below that say admin booking/stat endpoints are
unavailable.

- Booking status: `pending_payment`, `confirmed`, `cancelled`, `expired`, `used`.
- Payment status: `pending`, `paid`, `failed`, `cancelled`, `partially_refunded`,
  `refunded`.
- Booking responses can include `expires_at`, `ticket_code`, `checked_in_at`, and a
  payment summary. A booking is not confirmed while its payment is pending.
- `GET /payments/:id` and `POST /payments/:id/mock-complete` support the local payment
  flow. `GET /bookings/:id/ticket` returns the signed ticket payload to its owner.
- Admin uses `GET /admin/payments`, cash confirmation/refund actions, and
  `POST /admin/tickets/check-in`. Payment and booking responses never expose
  `password_hash`.

## Phase 5-7 authentication, catalog and data-safety contract

- Auth supports profile update, password change, forgot/reset password, refresh-token rotation, and logout revocation. Refresh tokens are HttpOnly cookies; frontend sends `withCredentials` and retries once after a successful `/auth/refresh`.
- Users include `is_active`; locked accounts cannot login or refresh. Admin can change role/lock state through `/users/:id/access`, but the backend rejects removing the final active admin.
- Movies now use `genres[]` via Movie–Genre many-to-many. `genre` remains a frontend display fallback only; create/update sends `genreIds[]`. Aggregate `rating` is computed from reviews and is not an admin input.
- Movie detail can include `director`, `cast`, `language`, `country`, `age_rating`, `genres[]`, and `reviews[]`.
- Review writes require a confirmed/used booking whose show has ended. Users can update or delete their own review; admin moderation uses the explicit moderation endpoint.
- Referenced movies/cinemas/rooms are deactivated instead of hard-deleted. Public lists hide inactive resources.
- Admin audit logs are available at `GET /admin/audit-logs` and shown in `/admin/audit-logs`.

Nguồn sự thật là `backend/src/models`, controller, route và `apiValidation.js`. Frontend giữ nguyên tên field API, sau đó normalizer chuyển các trường `decimal` có thể về dạng chuỗi thành `number`.

| Resource         | Response frontend sử dụng                                                   | Field/quan hệ chính                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| User             | Auth trả `{ token, user }`; admin list trả `{ success, data, pagination }`  | `id`, `email`, `name`, `phone`, `role`, `created_at`; luôn loại `password_hash`                                                                 |
| Movie            | List trả `{ data, pagination }`; detail trả object có `genres` và `reviews` | `title`, `description`, `genres[]`, `rating`, `duration`, metadata phim, `poster_url`, `trailer_url`, `release_date`, `status`, `created_at`    |
| Show             | Public list trả mảng; admin list trả `{ data, pagination }`                 | `start_time`, `end_time`, `price`, `status`, `cancellation_reason`, `movie`, `screen`; trạng thái gồm scheduled/in_progress/completed/cancelled |
| Theater / Cinema | List/detail trả object hoặc mảng                                            | `name`, `address`, `city`, `phone`, `screens[]`                                                                                                 |
| Screen / Room    | List có `theater`; detail có `theater` và `seats`                           | Write gửi `name`, `theater`, `seats[]`; backend tự tính `total_seats`, sinh `layout_json` và lưu transaction                                    |
| Seat             | `GET /shows/:showId/seats` trả mảng                                         | `row`, `number`, `type`; trạng thái gồm `available/locked/occupied/disabled`; ghế `disabled` không được giữ hoặc đặt                            |
| Booking          | User list trả mảng; admin list trả `{ data, pagination }`                   | Có `payment_status`, `refunded_amount`, `cancellation_reason`, `cancelled_at`; admin detail không chứa `password_hash`                          |
| Review           | List trả mảng; create/update/delete theo quyền                              | `rating` 1–5, `comment`, `created_at`, `updated_at`, `user` khi endpoint có load relation                                                       |
| AuditLog         | Admin list trả `{ data, pagination }`                                       | `action`, `resource_type`, `resource_id`, `metadata_json`, `actor`, `created_at`; không chứa `password_hash`                                    |
| Pagination       | Dùng cho movie/user list                                                    | `{ page, limit, total, pages }`; movie/user records nằm trong `data`                                                                            |

## Endpoint audit

Các lời gọi HTTP runtime hiện được tập trung trong `authService`, `movieService`, `bookingService` và `catalogService`; tất cả đều có route tương ứng ở backend.

- Auth: `/auth/login`, `/auth/register`, `/auth/me`.
- Catalog: `/movies`, `/shows`, `/cinemas`, `/rooms`, `/users` và review routes.
- Booking: `/bookings`, `/bookings/me`, `/bookings/:id`, cancel và seat lock/unlock.
- Recommendation: `/recommendations`, `/recommendations/trending`.
- Room layout: admin dùng `POST /rooms` hoặc `PUT /rooms/:id` với toàn bộ `seats[]`; không gửi `total_seats` hoặc JSON thô.
- Show admin: `/admin/shows` hỗ trợ CRUD có kiểm soát, lọc/phân trang và hủy kèm lý do.
- Booking admin: `/admin/bookings` hỗ trợ search/filter/detail/hủy; `/admin/dashboard/stats` trả doanh thu, refund, occupancy và chuỗi theo ngày.
- Audit admin: `/admin/audit-logs` hỗ trợ lọc theo action/resource/actor và phân trang.
- User admin: `/users` hỗ trợ list/search; `/users/:id/access` hỗ trợ đổi role và khóa/mở tài khoản.

Các file quản trị trùng `MovieManagement.jsx` và `CinemaManagement.jsx` đã được loại bỏ; route chỉ dùng `AdminMovies` và `AdminCinemas`.
