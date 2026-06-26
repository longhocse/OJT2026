import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { bookingSuccessStore } from "../booking/bookingSession";
import { paymentService } from "../services/paymentService";

const isValidBookingResult = (booking) =>
  Boolean(
    booking &&
      typeof booking.bookingId === "string" &&
      Array.isArray(booking.seats) &&
      Number.isFinite(Number(booking.totalPrice)),
  );

const SuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [booking] = useState(() => location.state?.booking || bookingSuccessStore.load());
  const [paymentStatus, setPaymentStatus] = useState(booking?.payment?.status || "pending");
  const [ticket, setTicket] = useState(null);
  const [actionError, setActionError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isValidBookingResult(booking)) navigate("/my-bookings", { replace: true });
  }, [booking, navigate]);

  if (!isValidBookingResult(booking)) return null;

  const leaveSuccessPage = (destination) => {
    bookingSuccessStore.clear();
    navigate(destination);
  };
  const completeMock = async () => {
    setProcessing(true);
    setActionError("");
    try {
      const result = await paymentService.completeMock(booking.payment.id);
      setPaymentStatus(result.payment.status);
      if (result.bookingStatus === "confirmed") {
        setTicket(await paymentService.getTicket(booking.bookingId));
      }
    } catch (error) {
      setActionError(error.response?.data?.message || "Không thể hoàn tất thanh toán.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pb-16 pt-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-2xl bg-surface-container p-8 text-center"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/20">
          <span className="material-symbols-outlined text-5xl text-secondary">check_circle</span>
        </div>
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">Booking đã được tạo</h1>
        <p className="mb-8 text-on-surface-variant">
          Vé chỉ được xác nhận sau khi thanh toán thành công.
        </p>

        <section className="mb-8 border-t border-white/10 pt-6 text-left">
          <h2 className="mb-4 font-semibold">Thông tin xác nhận từ backend</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-on-surface-variant">Booking ID</dt>
              <dd className="break-all font-mono">{booking.bookingId}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Ghế</dt>
              <dd>{booking.seats.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Tổng tiền chính thức</dt>
              <dd className="text-xl font-bold text-primary">
                {Number(booking.totalPrice).toLocaleString("vi-VN")} ₫
              </dd>
            </div>
          </dl>
          <p className="mt-4">
            Trạng thái thanh toán: <strong>{paymentStatus}</strong>
          </p>
          {booking.payment?.provider === "mock" && paymentStatus === "pending" && (
            <button
              type="button"
              disabled={processing}
              onClick={completeMock}
              className="mt-4 rounded-lg bg-green-600 px-5 py-2 text-white disabled:opacity-50"
            >
              {processing ? "Đang xử lý..." : "Thanh toán thử nghiệm"}
            </button>
          )}
          {booking.payment?.provider === "cash" && paymentStatus === "pending" && (
            <p className="mt-3 text-amber-400">Đang chờ nhân viên xác nhận thanh toán tiền mặt.</p>
          )}
          {actionError && (
            <p role="alert" className="mt-3 text-red-400">
              {actionError}
            </p>
          )}
          {ticket && (
            <div className="mt-5 rounded border p-3">
              <p>
                Mã vé: <strong>{ticket.ticketCode}</strong>
              </p>
              <textarea
                readOnly
                aria-label="QR vé"
                value={ticket.qrPayload}
                rows="4"
                className="mt-2 w-full bg-transparent font-mono text-xs"
              />
            </div>
          )}
        </section>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => leaveSuccessPage("/my-bookings")}
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-primary/90"
          >
            Xem lịch sử booking
          </button>
          <button
            type="button"
            onClick={() => leaveSuccessPage("/")}
            className="rounded-lg border border-white/20 px-6 py-3 font-semibold hover:bg-white/5"
          >
            Về trang chủ
          </button>
        </div>
      </motion.div>
    </main>
  );
};

export default SuccessPage;
