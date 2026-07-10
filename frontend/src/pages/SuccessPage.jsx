import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { bookingSuccessStore } from "../booking/bookingSession";
import { paymentService } from "../services/paymentService";
import { CheckCircle2, Ticket, Home } from "lucide-react";

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
    <main className="min-h-screen w-full bg-[#F5F0EB] flex justify-center items-center px-4 py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className="w-full max-w-2xl bg-white rounded-3xl p-8 md:p-10 shadow-2xl border border-[#E6DFD9] text-center relative overflow-hidden"
      >
        {/* Background trang trí mờ nhẹ */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#B8744C]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[#DC2626]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          {/* Icon thành công */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#B8744C]/10 border-4 border-[#B8744C]/20">
            <CheckCircle2 className="w-12 h-12 text-[#B8744C]" />
          </div>

          <h1 className="mb-2 text-3xl md:text-4xl font-extrabold text-[#3E3A39]">
            Booking đã được tạo!
          </h1>
          <p className="mb-8 text-[#6B625A] text-base max-w-md mx-auto">
            Vé chỉ được xác nhận chính thức sau khi thanh toán thành công.
          </p>

          {/* Thông tin chi tiết */}
          <section className="mb-8 border-t border-[#E6DFD9] pt-6 text-left">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E6DFD9] mb-4">
              <div className="p-2 bg-[#B8744C]/10 rounded-xl text-[#B8744C]">
                <Ticket className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-[#3E3A39]">Thông tin xác nhận từ backend</h2>
            </div>

            <dl className="space-y-4 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 bg-[#F9F7F5] p-3 rounded-xl">
                <dt className="text-[#6B625A] font-medium">Booking ID</dt>
                <dd className="break-all font-mono font-semibold text-[#3E3A39]">{booking.bookingId}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 bg-[#F9F7F5] p-3 rounded-xl">
                <dt className="text-[#6B625A] font-medium">Ghế đã chọn</dt>
                <dd className="font-semibold text-[#3E3A39]">{booking.seats.join(", ") || "—"}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 bg-[#F9F7F5] p-3 rounded-xl border-l-4 border-[#B8744C]">
                <dt className="text-[#6B625A] font-medium">Tổng tiền chính thức</dt>
                <dd className="text-xl font-bold text-[#B8744C]">
                  {Number(booking.totalPrice).toLocaleString("vi-VN")} ₫
                </dd>
              </div>
            </dl>

            {/* Trạng thái thanh toán */}
            <div className="mt-6 bg-[#F9F7F5] rounded-xl p-4 border border-[#E6DFD9]">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="text-[#6B625A] text-sm">Trạng thái thanh toán:</span>
                <span className={`font-bold px-4 py-1.5 rounded-full text-sm ${paymentStatus === "confirmed" || paymentStatus === "completed"
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                  }`}>
                  {paymentStatus === "confirmed" || paymentStatus === "completed" ? "Đã thanh toán" : "Chờ thanh toán"}
                </span>
              </div>

              {/* Nút thanh toán thử nghiệm (Mock) */}
              {booking.payment?.provider === "mock" && paymentStatus === "pending" && (
                <button
                  type="button"
                  disabled={processing}
                  onClick={completeMock}
                  className="mt-4 w-full rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] px-5 py-3 font-bold text-white shadow-md shadow-[#DC2626]/30 transition disabled:opacity-50"
                >
                  {processing ? "Đang xử lý..." : "Thanh toán thử nghiệm"}
                </button>
              )}

              {/* Thông báo thanh toán tiền mặt */}
              {booking.payment?.provider === "cash" && paymentStatus === "pending" && (
                <div className="mt-4 bg-[#FDE047]/10 border border-[#FDE047]/30 rounded-xl p-3 text-center text-[#B45309] font-medium text-sm">
                  💰 Đang chờ nhân viên rạp xác nhận thanh toán tiền mặt.
                </div>
              )}

              {actionError && (
                <p role="alert" className="mt-3 text-[#DC2626] font-medium text-center bg-red-50 p-2 rounded-lg text-sm">
                  {actionError}
                </p>
              )}

              {/* QR Ticket (nếu có) */}
              {ticket && (
                <div className="mt-5 rounded-xl bg-white border border-[#E6DFD9] p-4">
                  <p className="text-sm font-bold text-[#3E3A39] mb-2">
                    Mã vé: <span className="text-[#B8744C]">{ticket.ticketCode}</span>
                  </p>
                  <textarea
                    readOnly
                    aria-label="QR vé"
                    value={ticket.qrPayload}
                    rows="4"
                    className="w-full bg-[#F9F7F5] rounded-xl border border-[#E6DFD9] p-3 font-mono text-xs resize-none text-[#3E3A39]"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Buttons Hành động */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-2">
            <button
              type="button"
              onClick={() => leaveSuccessPage("/my-bookings")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] px-6 py-3.5 font-bold text-white shadow-md shadow-[#DC2626]/30 transition"
            >
              <Ticket className="w-4 h-4" /> Xem lịch sử booking
            </button>
            <button
              type="button"
              onClick={() => leaveSuccessPage("/")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#E6DFD9] bg-white hover:bg-[#F9F7F5] px-6 py-3.5 font-semibold text-[#3E3A39] transition"
            >
              <Home className="w-4 h-4" /> Về trang chủ
            </button>
          </div>
        </div>
      </motion.div>
    </main>
  );
};

export default SuccessPage;