import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { bookingKeys, bookingService } from "../services/bookingService";
import { normalizeApiError } from "../services/apiError";
import SafeImage from "../components/common/SafeImage";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export const canCancelBooking = (booking, now = Date.now()) => {
  if (!["pending_payment", "confirmed"].includes(booking?.status)) return false;
  const showTime = new Date(booking?.show?.start_time).getTime();
  return Number.isFinite(showTime) && showTime - now >= TWO_HOURS_MS;
};

const getBookingErrorMessage = (error, action) => {
  const apiError = normalizeApiError(error);

  if (apiError.status === null) {
    return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.";
  }
  if (apiError.status === 400 && action === "cancel") {
    return "Không thể hủy vé trong vòng 2 giờ trước suất chiếu.";
  }
  if (apiError.status === 403) {
    return "Bạn không có quyền xem hoặc hủy booking này.";
  }
  if (apiError.status === 404) {
    return action === "cancel"
      ? "Booking không còn tồn tại. Danh sách sẽ được tải lại."
      : "Không tìm thấy dữ liệu booking.";
  }
  return action === "cancel"
    ? "Không thể hủy booking lúc này. Vui lòng thử lại."
    : "Không thể tải lịch sử booking. Vui lòng thử lại.";
};

const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);

const formatShowTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa có thông tin" : format(date, "PPP p");
};

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState(null);
  const cancellationInFlight = useRef(false);

  const bookingsQuery = useQuery({
    queryKey: bookingKeys.mine,
    queryFn: bookingService.getMyBookings,
    retry: (failureCount, error) => !error?.response && failureCount < 2,
  });

  const cancelMutation = useMutation({
    mutationFn: bookingService.cancelBooking,
    onSuccess: async () => {
      setNotice({ type: "success", message: "Booking đã được hủy thành công." });
      await queryClient.invalidateQueries({ queryKey: bookingKeys.mine });
    },
    onError: async (error) => {
      setNotice({ type: "error", message: getBookingErrorMessage(error, "cancel") });
      if (error?.response?.status === 404) {
        await queryClient.invalidateQueries({ queryKey: bookingKeys.mine });
      }
    },
    onSettled: () => {
      cancellationInFlight.current = false;
    },
  });

  const handleCancel = (bookingId) => {
    if (cancellationInFlight.current || cancelMutation.isPending) return;
    const confirmed = window.confirm("Bạn có chắc muốn hủy booking này không?");
    if (!confirmed) return;

    cancellationInFlight.current = true;
    setNotice(null);
    cancelMutation.mutate(bookingId);
  };

  if (bookingsQuery.isPending) return <BookingListSkeleton />;

  if (bookingsQuery.isError) {
    return (
      <PageShell title="Lịch sử booking">
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center"
        >
          <p className="text-red-400">{getBookingErrorMessage(bookingsQuery.error, "load")}</p>
          <button
            type="button"
            onClick={() => bookingsQuery.refetch()}
            disabled={bookingsQuery.isFetching}
            className="mt-5 rounded-lg bg-primary px-5 py-2 font-semibold text-white disabled:opacity-50"
          >
            {bookingsQuery.isFetching ? "Đang tải lại..." : "Thử lại"}
          </button>
        </div>
      </PageShell>
    );
  }

  const bookings = Array.isArray(bookingsQuery.data) ? bookingsQuery.data : [];

  return (
    <PageShell title="Lịch sử booking">
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`mb-6 rounded-lg border p-4 ${
            notice.type === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-400"
              : "border-green-500/30 bg-green-500/10 text-green-400"
          }`}
        >
          {notice.message}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="py-12 text-center">
          <p className="mb-4 text-on-surface-variant">Bạn chưa có booking nào.</p>
          <button
            type="button"
            onClick={() => navigate("/movies")}
            className="rounded-lg bg-primary px-6 py-2 text-white"
          >
            Xem phim đang chiếu
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              cancelling={cancelMutation.isPending && cancelMutation.variables === booking.id}
              cancelDisabled={cancelMutation.isPending}
              onCancel={handleCancel}
              onBookAgain={() => navigate(`/movie/${booking.show?.movie?.id || ""}`)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
};

const PageShell = ({ title, children }) => (
  <main className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-24 md:px-8">
    <h1 className="mb-8 text-3xl font-bold">{title}</h1>
    {children}
  </main>
);

const BookingListSkeleton = () => (
  <PageShell title="Lịch sử booking">
    <div role="status" aria-label="Đang tải lịch sử booking" className="space-y-5">
      {[1, 2].map((item) => (
        <div key={item} className="h-56 animate-pulse rounded-xl bg-surface-container" />
      ))}
    </div>
  </PageShell>
);

const BookingCard = ({ booking, cancelling, cancelDisabled, onCancel, onBookAgain }) => {
  const canCancel = canCancelBooking(booking);
  const showTime = new Date(booking.show?.start_time).getTime();
  const isWithinCancellationWindow =
    booking.status === "confirmed" &&
    Number.isFinite(showTime) &&
    showTime > Date.now() &&
    !canCancel;
  const seats = (booking.bookingSeats || [])
    .map(({ seat }) => (seat ? `${seat.row}${seat.number}` : null))
    .filter(Boolean)
    .join(", ");

  return (
    <article className="flex flex-col gap-6 rounded-xl bg-surface-container p-6 md:flex-row">
      <SafeImage
        src={booking.show?.movie?.poster_url}
        alt={booking.show?.movie?.title || "Poster phim"}
        className="h-40 w-32 rounded-lg object-cover"
      />
      <div className="flex-1">
        <h2 className="text-xl font-bold">{booking.show?.movie?.title || "Phim không xác định"}</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <BookingDetail label="Ngày và giờ" value={formatShowTime(booking.show?.start_time)} />
          <BookingDetail label="Ghế" value={seats || "Chưa có thông tin"} />
          <BookingDetail label="Tổng tiền" value={formatMoney(booking.total_price)} />
          <BookingDetail
            label="Phương thức"
            value={booking.payment_method || "Chưa có thông tin"}
          />
        </dl>
        <div className="mt-4">
          <span className="text-sm text-on-surface-variant">Trạng thái: </span>
          <BookingStatus status={booking.status} />
        </div>
        {booking.status === "cancelled" && booking.cancellation_reason && (
          <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
            Lý do hủy: {booking.cancellation_reason}
          </p>
        )}
        {isWithinCancellationWindow && (
          <p className="mt-3 text-sm text-amber-400">
            Không thể hủy trong vòng 2 giờ trước suất chiếu.
          </p>
        )}
      </div>
      <div className="flex flex-col justify-center gap-2">
        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel(booking.id)}
            disabled={cancelDisabled}
            className="rounded-lg border border-error px-4 py-2 text-error hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelling ? "Đang hủy..." : "Hủy booking"}
          </button>
        )}
        {booking.show?.movie?.id && (
          <button
            type="button"
            onClick={onBookAgain}
            className="rounded-lg bg-primary/20 px-4 py-2 text-primary hover:bg-primary/30"
          >
            Xem lại phim
          </button>
        )}
      </div>
    </article>
  );
};

const BookingDetail = ({ label, value }) => (
  <div>
    <dt className="text-on-surface-variant">{label}</dt>
    <dd>{value}</dd>
  </div>
);

const BookingStatus = ({ status }) => {
  const statusStyles = {
    confirmed: "bg-green-500/20 text-green-400",
    used: "bg-blue-500/20 text-blue-400",
    cancelled: "bg-red-500/20 text-red-400",
    expired: "bg-gray-500/20 text-gray-300",
    pending_payment: "bg-yellow-500/20 text-yellow-400",
    pending: "bg-yellow-500/20 text-yellow-400",
  };
  const labels = { confirmed: "Đã xác nhận", cancelled: "Đã hủy", pending: "Đang xử lý" };

  return (
    <span
      className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[status] || statusStyles.pending}`}
    >
      {labels[status] || status || "Không xác định"}
    </span>
  );
};

export default MyBookingsPage;
