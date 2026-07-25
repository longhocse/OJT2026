import QRCode from "qrcode";
import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { bookingKeys, bookingService } from "../services/bookingService";
import { normalizeApiError } from "../services/apiError";
import { paymentService } from "../services/paymentService";
import SafeImage from "../components/common/SafeImage";
import { Calendar, Clock, MapPin, User, X, Download, Eye } from "lucide-react";

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
  return Number.isNaN(date.getTime()) ? "Chưa có thông tin" : format(date, "HH:mm, dd/MM/yyyy");
};

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState(null);
  const [ticketModal, setTicketModal] = useState(null);
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

  const ticketMutation = useMutation({
    mutationFn: paymentService.getTicket,
    onSuccess: (ticket) => {
      setTicketModal(ticket);
      setNotice(null);
    },
    onError: (error) => {
      const apiError = normalizeApiError(error);
      const message =
        apiError.status === 403
          ? "Bạn không có quyền xem vé này."
          : apiError.status === 400
            ? "Vé chỉ hiển thị sau khi booking đã được xác nhận thanh toán."
            : "Không thể tải mã QR vé. Vui lòng thử lại.";
      setNotice({ type: "error", message });
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
          className="rounded-2xl bg-white border border-red-100 p-10 text-center shadow-sm"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4 text-[#DC2626]">
            <X className="w-8 h-8" />
          </div>
          <p className="text-[#2b2d42] font-medium mb-4">{getBookingErrorMessage(bookingsQuery.error, "load")}</p>
          <button
            type="button"
            onClick={() => bookingsQuery.refetch()}
            disabled={bookingsQuery.isFetching}
            className="rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] px-6 py-2.5 font-semibold text-white shadow-md shadow-[#DC2626]/30 transition disabled:opacity-50"
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
          className={`mb-6 rounded-xl border p-4 ${notice.type === "error"
              ? "border-red-500/20 bg-red-50 text-[#DC2626]"
              : "border-green-500/20 bg-green-50 text-[#16A34A]"
            }`}
        >
          {notice.message}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#F3F4F6] rounded-full mb-4 text-gray-400">
            <Calendar className="w-10 h-10" />
          </div>
          <p className="mb-4 text-[#2b2d42] font-medium text-lg">Bạn chưa có booking nào.</p>
          <button
            type="button"
            onClick={() => navigate("/movies")}
            className="rounded-xl bg-[#DC2626] px-6 py-2.5 text-white font-bold hover:bg-[#B91C1C] transition shadow-md shadow-[#DC2626]/30"
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
              onReviewMovie={() => navigate(`/movie/${booking.show?.movie?.id || ""}#reviews`)}
              onViewTicket={() => ticketMutation.mutate(booking.id)}
              ticketLoading={ticketMutation.isPending && ticketMutation.variables === booking.id}
            />
          ))}
        </div>
      )}
      {ticketModal && <TicketModal ticket={ticketModal} onClose={() => setTicketModal(null)} />}
    </PageShell>
  );
};

// --- QUAN TRỌNG: ĐÃ SỬA LẠI PAGESHELL ĐỂ MẤT VIỀN ĐEN ---
const PageShell = ({ title, children }) => (
  // Bỏ 'max-w-6xl' để nền bao trọn màn hình. Dùng flex để căn giữa nội dung.
  <main className="min-h-screen w-full bg-[#FAFAFA] flex justify-center pt-24 pb-16 px-4 md:px-8">
    <div className="w-full max-w-6xl">
      <h1 className="mb-8 text-3xl font-extrabold text-[#2b2d42]">{title}</h1>
      {children}
    </div>
  </main>
);

const BookingListSkeleton = () => (
  <PageShell title="Lịch sử booking">
    <div role="status" aria-label="Đang tải lịch sử booking" className="space-y-5">
      {[1, 2].map((item) => (
        <div key={item} className="h-48 animate-pulse bg-[#F3F4F6] rounded-2xl" />
      ))}
    </div>
  </PageShell>
);

const BookingCard = ({
  booking,
  cancelling,
  cancelDisabled,
  onCancel,
  onBookAgain,
  onReviewMovie,
  onViewTicket,
  ticketLoading,
}) => {
  const canCancel = canCancelBooking(booking);
  const canViewTicket = ["confirmed", "used"].includes(booking.status);
  const canReview = booking.status === "used" && Boolean(booking.show?.movie?.id);
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
    <article className="flex flex-col lg:flex-row gap-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <SafeImage
        src={booking.show?.movie?.poster_url}
        alt={booking.show?.movie?.title || "Poster phim"}
        className="w-full lg:w-32 h-48 rounded-2xl object-cover shadow-sm"
      />
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start gap-2">
            <h2 className="text-xl font-bold text-[#2b2d42]">{booking.show?.movie?.title || "Phim không xác định"}</h2>
            <BookingStatus status={booking.status} />
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="w-4 h-4 text-[#DC2626]" />
              <span className="font-medium text-[#2b2d42]">{formatShowTime(booking.show?.start_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <User className="w-4 h-4 text-[#DC2626]" />
              <span className="font-medium text-[#2b2d42]">Ghế: {seats || "Chưa có thông tin"}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin className="w-4 h-4 text-[#DC2626]" />
              <span className="font-medium text-[#2b2d42]">{booking.payment_method || "Chưa có thông tin"}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">Tổng tiền:</span>
            <span className="font-bold text-[#DC2626] text-lg">{formatMoney(booking.total_price)}</span>
          </div>

          {booking.status === "cancelled" && booking.cancellation_reason && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-[#DC2626] border border-red-100">
              Lý do hủy: {booking.cancellation_reason}
            </p>
          )}
          {isWithinCancellationWindow && (
            <p className="mt-3 text-sm text-amber-500 bg-amber-50 p-2 rounded-lg inline-block">
              ⚠️ Không thể hủy trong vòng 2 giờ trước suất chiếu.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-gray-100">
          {canViewTicket && (
            <button
              type="button"
              onClick={onViewTicket}
              disabled={ticketLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#DC2626] px-5 py-2.5 font-semibold text-white hover:bg-[#B91C1C] shadow-md shadow-[#DC2626]/30 disabled:cursor-not-allowed disabled:opacity-50 transition"
            >
              <Eye className="w-4 h-4" />
              {ticketLoading ? "Đang tải..." : "Xem vé QR"}
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(booking.id)}
              disabled={cancelDisabled}
              className="inline-flex items-center gap-2 rounded-xl border border-[#DC2626] px-5 py-2.5 text-[#DC2626] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
            >
              {cancelling ? "Đang hủy..." : "Hủy booking"}
            </button>
          )}

          {canReview && (
            <button
              type="button"
              onClick={onReviewMovie}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FDE047] text-[#2b2d42] px-5 py-2.5 font-semibold hover:bg-[#FEF08A] shadow-sm transition"
            >
              Đánh giá phim
            </button>
          )}

          {booking.show?.movie?.id && (
            <button
              type="button"
              onClick={onBookAgain}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F3F4F6] text-[#2b2d42] px-5 py-2.5 font-semibold hover:bg-gray-200 transition"
            >
              Xem lại phim
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

const TicketModal = ({ ticket, onClose }) => {
  const [qrUrl, setQrUrl] = useState("");
  const checkedInText = ticket.checkedInAt ? formatShowTime(ticket.checkedInAt) : "Chưa check-in";

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(ticket.qrPayload, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
      width: 260,
    })
      .then((dataUrl) => {
        if (active) setQrUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrUrl("");
      });
    return () => {
      active = false;
    };
  }, [ticket.qrPayload]);

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(ticket.qrPayload);
      window.alert("Đã copy payload QR.");
    } catch (_error) {
      window.alert("Không thể copy tự động, bạn có thể copy thủ công trong ô payload.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vé QR"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-[#2b2d42]">🎫 Vé QR</h2>
            <p className="mt-1 text-sm text-gray-500">
              Đưa mã này cho nhân viên rạp để check-in.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#F3F4F6] p-2 text-gray-500 hover:bg-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center rounded-2xl bg-[#FAFAFA] border border-gray-100 p-6">
          {qrUrl ? (
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <img src={qrUrl} alt={`QR vé ${ticket.ticketCode}`} className="h-56 w-56" />
            </div>
          ) : (
            <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-[#F3F4F6] p-4 text-center text-sm text-gray-500">
              Không thể tạo ảnh QR. Bạn có thể copy payload.
            </div>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-[#F3F4F6] rounded-xl p-3">
            <dt className="text-gray-500 text-xs uppercase tracking-wider font-bold">Mã vé</dt>
            <dd className="font-semibold text-[#2b2d42]">{ticket.ticketCode || "Chưa có"}</dd>
          </div>
          <div className="bg-[#F3F4F6] rounded-xl p-3">
            <dt className="text-gray-500 text-xs uppercase tracking-wider font-bold">Trạng thái</dt>
            <dd className="font-semibold text-[#2b2d42] capitalize">{ticket.status || "Không xác định"}</dd>
          </div>
          <div className="bg-[#F3F4F6] rounded-xl p-3 md:col-span-2">
            <dt className="text-gray-500 text-xs uppercase tracking-wider font-bold">Check-in</dt>
            <dd className="font-semibold text-[#2b2d42]">{checkedInText}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <label className="block text-sm font-bold text-[#2b2d42] mb-1">
            Payload QR
          </label>
          <textarea
            readOnly
            value={ticket.qrPayload}
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
          />
          <button
            type="button"
            onClick={copyPayload}
            className="mt-3 w-full rounded-xl border border-[#DC2626] px-4 py-2.5 font-semibold text-[#DC2626] hover:bg-red-50 transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Copy payload
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingStatus = ({ status }) => {
  const statusStyles = {
    confirmed: "bg-green-100 text-[#16A34A] border border-green-200",
    used: "bg-blue-100 text-[#2563EB] border border-blue-200",
    cancelled: "bg-red-100 text-[#DC2626] border border-red-200",
    expired: "bg-gray-100 text-gray-500 border border-gray-200",
    pending_payment: "bg-yellow-100 text-[#D97706] border border-yellow-200",
    pending: "bg-yellow-100 text-[#D97706] border border-yellow-200",
  };
  const labels = {
    confirmed: "Đã xác nhận",
    cancelled: "Đã hủy",
    pending: "Đang xử lý",
    used: "Đã dùng",
    expired: "Hết hạn",
    pending_payment: "Chờ thanh toán"
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyles[status] || statusStyles.pending}`}
    >
      {labels[status] || status || "Không xác định"}
    </span>
  );
};

export default MyBookingsPage;