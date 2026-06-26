# Bộ prompt hoàn thiện frontend MovieTap

Chạy lần lượt các prompt dưới đây. Mỗi prompt tập trung vào một phạm vi để dễ review, hạn chế sửa lan man và bám đúng API thực tế trong `D:\OJT2026\backend`.

Quy ước chung cho tất cả prompt:

- Chỉ sửa trong `D:\OJT2026\frontend`; backend chỉ được đọc để đối chiếu, tuyệt đối không sửa file backend.
- Trước khi sửa, đọc route, validation, controller và tài liệu liên quan trong backend để xác nhận endpoint, request và response hiện tại; không tự đoán API.
- Giữ lại các thay đổi chưa commit không liên quan và không ghi đè công việc của người khác.
- Dự án hiện dùng React 19, Create React App (`react-scripts`), React Router, Redux Toolkit/Redux Persist, TanStack Query, Axios, React Hook Form và Zod.
- Không thêm thư viện mới nếu thư viện hiện có đã giải quyết được yêu cầu.
- Giữ phong cách giao diện hiện có, responsive trên mobile/desktop, có loading, empty và error state phù hợp.
- Sau mỗi prompt, chạy kiểm tra phù hợp và báo cáo file đã sửa, test/build đã chạy, vấn đề còn lại nếu có.

## Prompt 1 — Chuẩn hóa API client và xác thực

Hãy audit và sửa nền tảng gọi API cùng luồng authentication của frontend tại `D:\OJT2026\frontend`.

Yêu cầu:

- Chỉ sửa frontend; không sửa backend.
- Đối chiếu `backend/src/routes/authRoutes.js`, `authController.js`, `errorHandler.js` và cấu hình CORS trước khi triển khai.
- Sửa cấu hình base URL đúng với Create React App: dùng biến môi trường tương thích CRA thay vì `import.meta.env`; tạo `.env.example` an toàn nếu cần.
- Tập trung mọi lời gọi HTTP qua một Axios client; loại bỏ lời gọi trùng lặp giữa `authService`, `useAuth` và component.
- Gắn `Authorization: Bearer <token>` cho request cần đăng nhập nhưng tuyệt đối không log token, password, request headers hoặc response nhạy cảm.
- Chuẩn hóa cách đọc lỗi backend theo `{ code, message, errors }`; tạo helper để lấy lỗi chung và lỗi theo field.
- Xử lý 401 nhất quán: xóa phiên đăng nhập và điều hướng về `/login`, nhưng tránh redirect loop và tránh dùng `window.location.href` nếu router có thể xử lý.
- Không tự logout đối với 403; hiển thị thông báo không đủ quyền phù hợp.
- Sau khi khôi phục Redux Persist, gọi `GET /api/auth/me` để xác minh phiên và cập nhật user; không chỉ tin dữ liệu user cũ trong local storage.
- Chỉ có một nguồn lưu trạng thái auth; loại bỏ việc vừa tự ghi `localStorage` trong reducer vừa để Redux Persist ghi trùng.
- `ProtectedRoute` phải giữ lại đường dẫn đích để quay lại sau đăng nhập. `AdminRoute` phải chặn customer và xử lý trạng thái đang xác minh phiên để không nháy trang.
- Sửa hoặc loại bỏ `updateUser` vì backend hiện không có `PUT /api/auth/me`; không gọi endpoint không tồn tại.
- Viết test cho: login thành công, login sai, khôi phục phiên hợp lệ, token hết hạn/401, customer vào admin route và admin vào admin route.
- Chạy test và production build.

## Prompt 2 — Đồng bộ lịch sử booking và phân quyền giao diện

Hãy sửa luồng xem và hủy booking để frontend tuân thủ authorization của backend.

Yêu cầu:

- Đối chiếu `backend/src/routes/bookingRoutes.js` và các hàm `getMyBookings`, `getBookingById`, `cancelBooking` trong controller.
- Customer phải lấy lịch sử bằng `GET /api/bookings/me`; không gửi `userId` lấy từ Redux hoặc URL để truy vấn booking của chính mình.
- Xóa hoặc thay thế `bookingService.getUserBookings(userId)` bằng API không nhận userId cho customer.
- Trang `MyBookingsPage` phải có loading, empty, error, retry và trạng thái hủy rõ ràng.
- Chỉ hiển thị nút hủy khi booking chưa bị hủy và còn đủ ít nhất 2 giờ trước suất chiếu, nhưng vẫn coi backend là nguồn quyết định cuối cùng.
- Khi hủy bằng `PUT /api/bookings/:id/cancel`, yêu cầu xác nhận, khóa nút trong lúc gửi, chống gửi lặp và cập nhật/invalidate cache đúng cách.
- Hiển thị thông báo dễ hiểu cho 400, 403, 404 và lỗi mạng; không làm lộ chi tiết kỹ thuật.
- Không hiển thị hoặc lưu bất kỳ `password_hash` nào nếu dữ liệu bất thường từ server lọt về.
- Không tạo nút admin giả cho endpoint chưa tồn tại. Nếu màn `AdminBookings` đang gọi API không có trong backend, chuyển sang trạng thái “chưa được backend hỗ trợ” rõ ràng hoặc ẩn route/chức năng đó; không mock số liệu như dữ liệu thật.
- Viết test cho danh sách booking của user hiện tại, empty state, hủy thành công, hủy sát giờ bị từ chối và 403.
- Chạy test và production build.

## Prompt 3 — Làm chắc luồng chọn ghế và checkout

Hãy sửa luồng từ chọn suất chiếu, chọn ghế đến tạo booking theo contract backend hiện tại.

Yêu cầu:

- Đối chiếu validation booking trong `backend/src/middleware/apiValidation.js`, `showController.js` và `bookingController.js`.
- `showId` phải lấy từ route hợp lệ; `seatIds` là mảng UUID không rỗng, không trùng; `paymentMethod` chỉ thuộc `credit_card`, `vnpay`, `momo`, `cash`.
- Không tin hoặc gửi tổng tiền do frontend tính như nguồn dữ liệu nghiệp vụ. Frontend chỉ hiển thị giá ước tính; giá trong booking response từ backend là kết quả chính thức.
- Không dùng dữ liệu đạo diễn, diễn viên, ngôn ngữ hoặc giá giả/hard-code nếu backend không cung cấp; ẩn hoặc ghi nhãn rõ phần chưa có dữ liệu.
- Không cho tiếp tục nếu suất chiếu đã bắt đầu, không có ghế, hoặc dữ liệu show không tải được.
- Giới hạn tối đa 20 ghế theo backend; nếu UX muốn giới hạn thấp hơn thì khai báo một hằng số rõ ràng và kiểm thử.
- Dữ liệu cần thiết cho checkout phải sống qua refresh có kiểm soát hoặc khi thiếu phải điều hướng an toàn về trang chọn ghế; không tạo booking từ state cũ/mất đồng bộ.
- Chống double-submit ở nút thanh toán, hiển thị tiến trình và xử lý 400/404/409 theo lỗi backend.
- Sau booking thành công, xóa toàn bộ state chọn ghế/lock cũ và hiển thị dữ liệu booking thật từ response; refresh trang success không được dựng thông tin giả.
- Viết integration test cho danh sách ghế rỗng, ghế trùng, show đã bắt đầu, payment method sai, submit lặp và booking hợp lệ.
- Chạy test và production build.

## Prompt 4 — Hoàn thiện seat lock và chống xung đột trên UI

Hãy triển khai đúng vòng đời khóa ghế trên frontend theo cơ chế show-scoped seat locking của backend.

Yêu cầu:

- Đọc kỹ `backend/docs/seat-locking.md`, route seat lock/unlock và response của `getSeatsByShow` trước khi sửa.
- Khi chọn ghế, gọi `POST /api/bookings/seats/lock` và lưu cả `lockToken`, `lockedUntil`, `expiresIn` trả về; không tự tạo token và không chỉ đặt timer cố định 10 phút.
- Khi tạo booking, bắt buộc gửi đúng `lockToken` cùng `showId`, `seatIds`, `paymentMethod`.
- Khi user đổi tập ghế, điều hướng khỏi trang, hủy thao tác hoặc bấm bỏ chọn, unlock tập ghế đang giữ bằng `POST /api/bookings/seats/unlock` với đúng token khi còn có thể.
- Không gửi unlock thiếu token. Dọn timer/subscription trong cleanup và tránh request từ component đã unmount.
- Hiển thị countdown dựa trên `lockedUntil`; xử lý tab ngủ/clock drift bằng thời gian tuyệt đối thay vì chỉ giảm biến đếm.
- Khi lock hết hạn, xóa selection/token, tải lại sơ đồ ghế và buộc user chọn lại.
- Khi backend trả 409 vì ghế vừa bị người khác giữ/đặt, hiển thị ghế xung đột, refresh sơ đồ và không chuyển sang checkout.
- Việc poll danh sách ghế không được làm mất các ghế chính user đang giữ; trạng thái selected của client và trạng thái locked từ server phải được phân biệt rõ.
- Tránh gọi lock lại toàn bộ danh sách sau mỗi click theo cách làm rò lock cũ. Thiết kế một state machine nhỏ hoặc luồng tuần tự rõ ràng cho `idle → locking → locked → booking/unlocking/expired`.
- Viết test với fake timers cho countdown/expiry, đổi selection, rời trang, unlock thành công, lock 409 và hoàn tất booking bằng đúng token.
- Chạy test và production build.

## Prompt 5 — Chuẩn hóa model và contract dữ liệu frontend

Hãy audit toàn bộ dữ liệu frontend sử dụng so với EntitySchema, controller response và validation thật của backend.

Yêu cầu:

- Chỉ đọc `backend/src/models`, controller, route và validation; không sửa backend.
- Lập bảng ngắn các contract đang dùng cho User, Movie, Show, Theater/Cinema, Screen/Room, Seat, Booking, Review và pagination.
- Tìm và sửa mọi chỗ dùng sai tên field, sai kiểu, sai response envelope hoặc quan hệ lồng nhau.
- Đặc biệt kiểm tra: `seat.row`, `seat.number`, `poster_url`, `release_date`, `start_time`, `total_price`, `created_at`, `screen.theater`, `bookingSeats[].seat`, và response `{ data, pagination }` của movies/users.
- Tạo các service/adapter nhỏ nếu cần để component không tự đoán nhiều hình dạng response khác nhau; không che giấu lỗi contract bằng optional chaining ở mọi nơi.
- Chuẩn hóa query key TanStack Query theo resource và params; invalidate đúng prefix với API v5.
- Loại bỏ component/page quản trị trùng chức năng như các cặp màn quản lý movie/cinema nếu chúng thực sự trùng; giữ một implementation được route sử dụng.
- Rà tất cả lời gọi API và lập danh sách endpoint frontend đang gọi nhưng backend không cung cấp. Không tiếp tục gọi các endpoint như `/bookings/admin/stats` hoặc `/admin/users/stats` nếu backend không có.
- Các tính năng chưa có backend phải được ẩn, disable có giải thích, hoặc đánh dấu rõ là chưa hỗ trợ; không fallback thành số 0 khiến người dùng tưởng là dữ liệu thật.
- Viết unit test cho adapter/normalizer và test component với response thật đại diện từ backend.
- Chạy test và production build.

## Prompt 6 — Validation form và xử lý lỗi nhất quán

Hãy bổ sung validation phía client khớp backend cho toàn bộ form người dùng và admin.

Yêu cầu:

- Tái sử dụng React Hook Form, Zod và `@hookform/resolvers` đã có; không thêm validation library mới.
- Đối chiếu trực tiếp schema trong `backend/src/middleware/apiValidation.js`.
- Validate login/register, movie, show, cinema, room, genre, review và checkout ở client, nhưng backend vẫn là nguồn xác thực cuối cùng.
- Registration: email hợp lệ; password 8–128 ký tự, có chữ thường, chữ hoa và số; name bắt buộc; phone đúng contract backend.
- Review rating chỉ từ 1 đến 5, không dùng thang 10. Chỉ gửi `rating` và `comment`.
- Movie filter `minRating` chỉ từ 1 đến 5; `sortBy` chỉ là `release_date` hoặc `popular`, không gửi `newest` vì backend không chấp nhận.
- Form admin chỉ gửi field backend whitelist; dữ liệu quan hệ show/room phải có dạng `{ id: uuid }`; ngày giờ show phải có `end_time > start_time`.
- Map `errors[].field` từ backend về đúng input; đồng thời có lỗi form-level cho conflict, unauthorized, forbidden và network error.
- Submit phải được disable trong lúc pending, chống nhấn lặp và focus vào field lỗi đầu tiên.
- Không dùng `alert()` cho validation/transaction quan trọng; dùng component thông báo truy cập được bằng bàn phím và screen reader.
- Viết test cho input sai và hợp lệ của từng nhóm form quan trọng, gồm cả lỗi field trả từ backend.
- Chạy test và production build.

## Prompt 7 — Dọn bảo mật và cấu hình frontend

Hãy harden cấu hình, lưu trữ và logging của frontend mà không thay đổi nghiệp vụ backend.

Yêu cầu:

- Không log password, token, Authorization header, object Axios đầy đủ hoặc dữ liệu cá nhân. Xóa debug log trong `api.js`, `authService`, auth slice và các page.
- Không đưa secret vào frontend. Tài liệu hóa rằng biến `REACT_APP_*` được đóng vào bundle và chỉ được dùng cho cấu hình công khai như API base URL.
- Kiểm tra `.gitignore` và tạo `.env.example` an toàn; không tự xóa file local hoặc thay đổi Git index.
- Với cơ chế JWT hiện tại của backend, giữ access token theo cách tương thích nhưng giảm dữ liệu persist xuống mức tối thiểu, xác minh bằng `/auth/me` và xóa sạch khi logout/401. Ghi chú rủi ro XSS còn lại thay vì tuyên bố local storage là an toàn tuyệt đối.
- Không render HTML từ API bằng `dangerouslySetInnerHTML`; URL poster/trailer phải có fallback và thuộc protocol an toàn.
- External link mở tab mới phải có `rel="noopener noreferrer"`.
- Thêm error boundary cấp ứng dụng để lỗi render không làm màn hình trắng; không hiển thị stack trace cho user.
- Đảm bảo route admin chỉ render sau khi kiểm tra auth/role, nhưng không coi client-side guard là authorization thật.
- Audit dependency và xử lý cảnh báo có thể sửa an toàn, không chạy auto-fix major phá vỡ dự án.
- Viết test cho redaction/no sensitive logging, logout cleanup, URL không an toàn và error boundary.
- Chạy test, build và `npm audit`; báo cáo cảnh báo còn lại cùng mức độ ảnh hưởng.

## Prompt 8 — Recommendation và review theo API thật

Hãy hoàn thiện recommendation và review trên frontend theo rule backend hiện tại.

Yêu cầu:

- Đối chiếu `backend/docs/recommendation-review.md`, `recommendationRoutes.js` và phần review trong `movieController.js`.
- Recommendation cá nhân gọi `GET /api/recommendations` qua Axios client có JWT; tuyệt đối không truyền `userId` query và không dùng `fetch` riêng bỏ qua interceptor.
- Khi chưa đăng nhập, dùng `GET /api/recommendations/trending` hoặc hiển thị CTA đăng nhập; không gọi endpoint cá nhân rồi nuốt 401.
- Query recommendation phải `enabled` theo trạng thái auth và có query key/cache phù hợp.
- Review chỉ cho rating 1–5. UI phải nói rõ user cần booking confirmed cho phim đó, và xử lý `REVIEW_NOT_ALLOWED`/403 dễ hiểu.
- Một lần submit sau có thể là update review cũ; UI và cache phải xử lý cả response 201 lẫn 200.
- Sau tạo/cập nhật review, invalidate danh sách review, movie detail/rating và recommendation liên quan.
- Không cho double-submit; có loading, empty, login-required, not-eligible, conflict và network state.
- Không hiển thị dữ liệu user nhạy cảm trong review; chỉ dùng field công khai cần thiết.
- Viết test cho guest trending, user recommendation có Bearer token, không gửi userId, review không đủ điều kiện, tạo mới và cập nhật review.
- Chạy test và production build.

## Prompt 9 — Thiết lập test và developer tooling cho frontend

Hãy hoàn thiện nền tảng kiểm thử và tooling cho frontend hiện tại.

Yêu cầu:

- Giữ stack tương thích Create React App/Jest và React Testing Library; không migrate build tool trong prompt này.
- Xóa test mẫu `renders learn react link` và thay bằng test ứng dụng có ý nghĩa.
- Tạo test utilities để render với Router, Redux store, PersistGate và QueryClient biệt lập; không dùng store/cache production chung giữa các test.
- Mock HTTP ở ranh giới service một cách nhất quán; không phụ thuộc backend thật hoặc internet khi chạy test.
- Bổ sung scripts rõ ràng cho test CI, coverage, lint và format check nếu thiếu; không làm mất các script hiện có.
- Viết test tối thiểu cho auth/route guards, movie list/filter/pagination, movie detail/review, booking/seat-lock/checkout, my bookings và admin users pagination.
- Coverage mục tiêu tối thiểu 80% cho services, auth, route guards và logic booking quan trọng; không chạy theo coverage bằng test vô nghĩa.
- Bắt lỗi React act warning, unhandled promise rejection, timer không cleanup và query retry làm test chậm.
- Thêm ESLint/format config nhất quán với codebase; sửa warning ảnh hưởng correctness như dependency array, import thừa, biến thừa và component trùng.
- `npm test -- --watchAll=false` và `npm run build` phải chạy thành công trong môi trường sạch sau `npm ci`.
- Báo cáo coverage theo khu vực và các khoảng trống chưa test.

## Prompt 10 — Hoàn thiện frontend để demo/deploy

Hãy chuẩn bị frontend MovieTap cho production deployment mà không sửa backend.

Yêu cầu:

- Cấu hình API base URL theo môi trường build CRA và tài liệu hóa cách kết nối backend/CORS; không hard-code origin production.
- Thêm route 404, error boundary và trang lỗi API thân thiện.
- Lazy-load các page/route lớn, đặc biệt admin; có Suspense fallback và tránh bundle import trùng.
- Tối ưu ảnh poster với lazy loading, kích thước ổn định và fallback để giảm layout shift.
- Kiểm tra responsive ở mobile/tablet/desktop cho navbar, movie grid, seat map, checkout, booking history và admin table.
- Audit accessibility: semantic heading, label/input, focus visible, keyboard navigation, dialog focus trap, contrast, alt text, `aria-live` cho lỗi/countdown và reduced motion.
- Không dùng dữ liệu mock/hard-code như dữ liệu production. Mọi tính năng backend chưa hỗ trợ phải được ghi rõ hoặc ẩn.
- Thêm README frontend gồm setup, environment, scripts, kiến trúc state/data fetching, auth flow, booking lock flow, test và build/deploy.
- Nếu triển khai static hosting, cấu hình SPA fallback trong tài liệu hoặc file deploy phù hợp; không thêm cấu hình cho một nhà cung cấp cụ thể khi chưa cần.
- Chạy `npm ci`, test CI, coverage, lint, build và audit; kiểm tra bundle không chứa token/secret hoặc URL môi trường local ngoài fallback development có chủ đích.
- Lập checklist production readiness và ghi rõ blocker nào thực sự cần backend bổ sung, đặc biệt thống kê/admin booking nếu endpoint chưa có.

## Prompt tổng kiểm tra cuối

Hãy review toàn bộ frontend tại `D:\OJT2026\frontend` sau các thay đổi như một senior frontend/security engineer.

Không sửa code ngay. Backend tại `D:\OJT2026\backend` chỉ được đọc để đối chiếu contract, tuyệt đối không chỉnh sửa.

Hãy:

- Kiểm tra Git diff/status trước tiên để phân biệt thay đổi hiện có và không quy nhầm công việc của người khác.
- Chạy install sạch theo lockfile nếu môi trường cho phép, test CI, coverage, lint, production build và `npm audit`.
- Rà toàn bộ endpoint frontend gọi so với route backend; kiểm tra method, path, auth, params, body và response shape.
- Kiểm tra authentication, route guards, 401/403, persistence và đảm bảo không log/lộ token hoặc password.
- Kiểm tra trọn luồng booking: tải show, tải ghế, lock, countdown, đổi ghế, unlock, checkout với lockToken, xử lý 409, success cleanup và cancel booking.
- Kiểm tra movie filters dùng đúng enum/range backend, review rating 1–5 và recommendation cá nhân không nhận userId từ client.
- Kiểm tra loading, empty, error, retry và disabled state ở các màn chính.
- Kiểm tra responsive, accessibility cơ bản, cleanup effect/timer/request, duplicate submit và stale cache.
- Kiểm tra không còn `import.meta.env` trong dự án CRA, endpoint giả, dữ liệu mock trình bày như thật, test mặc định CRA hoặc debug log nhạy cảm.
- Liệt kê phát hiện theo P0, P1, P2, kèm file và dòng, tác động, cách tái hiện và hướng sửa ngắn gọn.
- Tách rõ lỗi frontend, mismatch contract và blocker cần backend; không đề xuất sửa backend cho vấn đề có thể giải quyết hoàn toàn ở client.
- Nếu không có lỗi nghiêm trọng, đưa checklist xác nhận dự án sẵn sàng demo/deploy và nêu các rủi ro còn chấp nhận được.
