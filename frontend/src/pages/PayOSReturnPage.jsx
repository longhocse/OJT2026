import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { bookingSuccessStore } from "../booking/bookingSession";
import { bookingService } from "../services/bookingService";
import { paymentService } from "../services/paymentService";
import { queryKeys } from "../services/queryKeys";

export default function PayOSReturnPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = bookingSuccessStore.load();
  const isCancel = location.pathname.includes("/cancel");
  const params = new URLSearchParams(location.search);
  const orderCode = params.get("orderCode") || booking?.payment?.provider_transaction_id || "";

  const reconcileQuery = useQuery({
    queryKey: ["payos-reconcile", orderCode],
    queryFn: () => paymentService.reconcilePayOS(orderCode),
    enabled: Boolean(orderCode) && !isCancel,
    retry: 2,
    refetchInterval: (query) => (query.state.data?.paid ? false : 3000),
  });

  const bookingQuery = useQuery({
    queryKey: booking?.bookingId
      ? queryKeys.bookings.detail(booking.bookingId)
      : ["payos-return", "missing-booking"],
    queryFn: () => bookingService.getBookingById(booking.bookingId),
    enabled: Boolean(booking?.bookingId) && !isCancel,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "confirmed" || status === "cancelled") return false;
      if (status === "expired" && reconcileQuery.data?.paid !== true) return false;
      return 3000;
    },
  });

  const status = bookingQuery.data?.status || booking?.status || "pending_payment";
  const paymentStatus = bookingQuery.data?.payment_status || booking?.payment?.status || "pending";
  const confirmed = status === "confirmed" || paymentStatus === "paid";

  const leave = (path) => {
    if (confirmed || isCancel) bookingSuccessStore.clear();
    navigate(path);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pb-16 pt-24">
      <section className="w-full max-w-2xl rounded-2xl bg-surface-container p-8 text-center">
        <div
          className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${
            isCancel ? "bg-red-500/20" : confirmed ? "bg-green-500/20" : "bg-amber-500/20"
          }`}
        >
          <span
            className={`material-symbols-outlined text-4xl ${
              isCancel ? "text-red-400" : confirmed ? "text-green-400" : "text-amber-400"
            }`}
          >
            {isCancel ? "cancel" : confirmed ? "check_circle" : "hourglass_top"}
          </span>
        </div>
        <h1 className="text-3xl font-bold">
          {isCancel
            ? "Bạn đã hủy thanh toán"
            : confirmed
              ? "Thanh toán thành công"
              : "Đang xác nhận thanh toán"}
        </h1>
        <p className="mt-4 text-on-surface-variant">
          {isCancel
            ? "Booking vẫn có thể đang giữ trong thời gian ngắn. Bạn có thể đặt lại hoặc xem lịch sử booking."
            : confirmed
              ? "MovieTap đã xác nhận vé. Vé điện tử/QR sẽ hiển thị trong lịch sử booking và được gửi qua email nếu hệ thống mail đang bật."
              : "PayOS đã chuyển bạn về MovieTap. Hệ thống sẽ xác nhận bằng webhook PayOS, có thể mất vài giây."}
        </p>

        <dl className="mx-auto mt-6 max-w-md space-y-2 rounded-lg border border-white/10 p-4 text-left text-sm">
          <div>
            <dt className="text-on-surface-variant">Booking</dt>
            <dd className="break-all font-mono">{booking?.bookingId || "Không tìm thấy trong phiên này"}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Order code PayOS</dt>
            <dd>{orderCode || "—"}</dd>
          </div>
          {reconcileQuery.data?.payosStatus && (
            <div>
              <dt className="text-on-surface-variant">PayOS</dt>
              <dd>{reconcileQuery.data.payosStatus}</dd>
            </div>
          )}
          <div>
            <dt className="text-on-surface-variant">Trạng thái</dt>
            <dd>
              {bookingQuery.isFetching && !confirmed ? "Đang kiểm tra..." : `${status} / ${paymentStatus}`}
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => leave("/my-bookings")}
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-white"
          >
            Xem lịch sử booking
          </button>
          <button
            type="button"
            onClick={() => leave("/movies")}
            className="rounded-lg border border-white/20 px-6 py-3 font-semibold"
          >
            Tiếp tục xem phim
          </button>
        </div>
      </section>
    </main>
  );
}
