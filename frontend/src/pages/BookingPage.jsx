import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  estimateBookingTotal,
  isShowBookable,
  isValidUuid,
  MAX_BOOKING_SEATS,
  validateSeatIds,
} from "../booking/bookingContract";
import { bookingSuccessStore, checkoutSessionStore } from "../booking/bookingSession";
import SeatMap from "../components/booking/SeatMap";
import { formatCountdown } from "../hooks/useAbsoluteCountdown";
import useSeatLock, { SEAT_LOCK_STATUS } from "../hooks/useSeatLock";
import {
  setCheckoutSession,
  setSelectedSeats as setReduxSelectedSeats,
  setShowDetails,
} from "../redux/slices/bookingSlice";
import { normalizeApiError } from "../services/apiError";
import { bookingService } from "../services/bookingService";
import { Calendar, Clock, MapPin, Film, ArrowRight } from "lucide-react";

const BookingPage = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [show, setShow] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatCount, setSeatCount] = useState(null);
  const [seatRefreshKey, setSeatRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const clearSelection = useCallback(() => {
    setSelectedSeats([]);
    dispatch(setReduxSelectedSeats([]));
    checkoutSessionStore.clear();
  }, [dispatch]);

  const handleLockConflict = useCallback(
    (_requestError, conflictingSeatIds) => {
      const conflicting = selectedSeats
        .filter((seat) => conflictingSeatIds.includes(String(seat.id).toLowerCase()))
        .map((seat) => `${seat.row}${seat.number}`);
      clearSelection();
      setSeatRefreshKey((value) => value + 1);
      setError(
        conflicting.length
          ? `Ghế ${conflicting.join(", ")} vừa được người khác giữ hoặc đặt. Vui lòng chọn lại.`
          : "Một hoặc nhiều ghế vừa được người khác giữ hoặc đặt. Vui lòng chọn lại.",
      );
    },
    [clearSelection, selectedSeats],
  );

  const handleLockExpired = useCallback(() => {
    clearSelection();
    setSeatRefreshKey((value) => value + 1);
    setError("Thời gian giữ ghế đã hết. Vui lòng chọn lại.");
  }, [clearSelection]);

  const handleLockError = useCallback((requestError) => {
    const apiError = normalizeApiError(requestError);
    setError(
      apiError.status === null
        ? "Không thể kết nối máy chủ để giữ ghế. Vui lòng thử lại."
        : "Không thể giữ ghế lúc này. Vui lòng thử lại.",
    );
  }, []);

  const seatLock = useSeatLock({
    showId,
    seatIds: selectedSeats.map((seat) => seat.id),
    onConflict: handleLockConflict,
    onExpired: handleLockExpired,
    onError: handleLockError,
  });

  useEffect(() => {
    bookingSuccessStore.clear();
    if (!isValidUuid(showId)) {
      setError("Mã suất chiếu không hợp lệ.");
      setLoading(false);
      return;
    }

    let active = true;
    bookingService
      .getShowById(showId)
      .then((data) => {
        if (!active) return;
        setShow(data);
        dispatch(setShowDetails(data));
        if (!isShowBookable(data)) setError("Suất chiếu này đã bắt đầu và không thể đặt vé.");
      })
      .catch((requestError) => {
        if (!active) return;
        const apiError = normalizeApiError(requestError);
        setError(
          apiError.status === 404
            ? "Không tìm thấy suất chiếu."
            : "Không thể tải thông tin suất chiếu. Vui lòng thử lại.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dispatch, showId]);

  const handleSeatsSelected = useCallback(
    (seats) => {
      setError("");
      setSelectedSeats(seats);
      dispatch(setReduxSelectedSeats(seats));
    },
    [dispatch],
  );

  const handleAvailabilityChange = useCallback((count) => setSeatCount(count), []);

  const handleContinue = async () => {
    if (!show || !isShowBookable(show)) {
      setError("Suất chiếu này đã bắt đầu và không thể tiếp tục.");
      return;
    }
    if (seatCount === 0) {
      setError("Suất chiếu này chưa có ghế khả dụng.");
      return;
    }

    const validation = validateSeatIds(selectedSeats.map((seat) => seat.id));
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    if (!seatLock.selectionIsLocked || !seatLock.lock) {
      setError("Vui lòng chờ hệ thống giữ ghế trước khi tiếp tục.");
      return;
    }

    const session = { ...seatLock.lock, seatIds: validation.seatIds };
    checkoutSessionStore.save(session);
    dispatch(setCheckoutSession(session));
    seatLock.markTransferred();
    navigate("/checkout", { state: { checkoutSession: session } });
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#F5F0EB] flex justify-center pt-24 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E6DFD9] flex flex-col items-center gap-4 mt-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#B8744C] border-t-transparent"></div>
          <p className="text-[#3E3A39] font-medium">Đang tải suất chiếu và ghế...</p>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <main className="min-h-screen w-full bg-[#F5F0EB] flex justify-center px-4 pt-28">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#E6DFD9] text-center max-w-md">
          <p role="alert" className="text-[#DC2626] font-medium">
            {error || "Không thể mở suất chiếu."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/movies")}
            className="mt-5 rounded-xl bg-[#DC2626] px-6 py-2.5 text-white font-bold shadow-md shadow-[#DC2626]/30 hover:bg-[#B91C1C] transition"
          >
            Quay lại danh sách phim
          </button>
        </div>
      </main>
    );
  }

  const showStarted = !isShowBookable(show);
  const estimatedTotal = estimateBookingTotal(show, selectedSeats);

  return (
    <main className="min-h-screen w-full bg-[#F5F0EB] flex justify-center px-4 pb-64 pt-24 sm:pb-40">
      <div className="w-full max-w-6xl">

        {/* Header: Thông tin phim */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#E6DFD9] mb-8">
          <div className="flex items-center gap-3 pb-4 border-b border-[#E6DFD9] mb-4">
            <div className="p-2 bg-[#B8744C]/10 rounded-xl text-[#B8744C]">
              <Film className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#3E3A39]">
              {show.movie?.title || "Suất chiếu"}
            </h1>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-[#6B625A]">
            <div className="flex items-center gap-2 bg-[#F9F7F5] px-3 py-1.5 rounded-full">
              <Calendar className="w-4 h-4 text-[#B8744C]" />
              {new Date(show.start_time).toLocaleString("vi-VN")}
            </div>
            {show.screen?.theater?.name && (
              <div className="flex items-center gap-2 bg-[#F9F7F5] px-3 py-1.5 rounded-full">
                <MapPin className="w-4 h-4 text-[#B8744C]" />
                {show.screen.theater.name}
              </div>
            )}
            {show.screen?.name && (
              <div className="flex items-center gap-2 bg-[#F9F7F5] px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4 text-[#B8744C]" />
                Phòng {show.screen.name}
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" className="mb-6 rounded-2xl bg-white border border-red-200 p-4 text-[#DC2626] shadow-sm">
            {error}
          </div>
        )}

        {/* Sơ đồ ghế */}
        {!showStarted && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#E6DFD9]">
            <SeatMap
              showId={showId}
              selectedSeats={selectedSeats}
              onSeatsSelected={handleSeatsSelected}
              onAvailabilityChange={handleAvailabilityChange}
              refreshKey={seatRefreshKey}
              maxSeats={MAX_BOOKING_SEATS}
            />
          </div>
        )}

        {/* Bottom Bar - Thanh công cụ dưới cùng */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E6DFD9] rounded-t-3xl shadow-2xl p-4 pb-6"
        >
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">

            {/* Cột trái: Ghế đã chọn */}
            <div className="w-full sm:w-auto">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">Ghế đã chọn</p>
              <p className="font-semibold text-[#3E3A39] mt-1 truncate max-w-[250px] sm:max-w-xs">
                {selectedSeats.length
                  ? selectedSeats.map((seat) => `${seat.row}${seat.number}`).join(", ")
                  : <span className="text-[#6B625A] font-normal italic">Chưa chọn ghế</span>}
              </p>
            </div>

            {/* Cột giữa: Giá & Timer */}
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">Tổng tạm tính</p>
                <p className="text-2xl font-bold text-[#B8744C]">
                  {estimatedTotal.toLocaleString("vi-VN")} ₫
                </p>
                <p className="text-[10px] text-[#6B625A]">Giá chính thức do backend xác nhận</p>
              </div>

              {seatLock.status === SEAT_LOCK_STATUS.LOCKED && (
                <div className="bg-[#F9F7F5] px-4 py-2 rounded-full border border-[#E6DFD9] flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#B8744C] rounded-full animate-pulse"></div>
                  <p
                    role="timer"
                    aria-live="polite"
                    aria-atomic="true"
                    className="text-sm font-bold text-[#B8744C]"
                  >
                    {formatCountdown(seatLock.remainingMs)}
                  </p>
                </div>
              )}
            </div>

            {/* Cột phải: Các nút hành động */}
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 mt-2 sm:mt-0">
              {selectedSeats.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={seatLock.status === SEAT_LOCK_STATUS.UNLOCKING}
                  className="w-full sm:w-auto rounded-xl border border-[#E6DFD9] px-5 py-2.5 text-[#6B625A] font-medium hover:bg-[#F9F7F5] transition disabled:opacity-50"
                >
                  {seatLock.status === SEAT_LOCK_STATUS.UNLOCKING
                    ? "Đang nhả ghế..."
                    : "Hủy lựa chọn"}
                </button>
              )}
              <button
                type="button"
                onClick={handleContinue}
                disabled={
                  showStarted ||
                  seatCount === 0 ||
                  selectedSeats.length === 0 ||
                  !seatLock.selectionIsLocked
                }
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-8 py-2.5 font-bold text-white shadow-md shadow-[#DC2626]/30 hover:bg-[#B91C1C] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {seatLock.status === SEAT_LOCK_STATUS.LOCKING
                  ? "Đang giữ ghế..."
                  : seatLock.status === SEAT_LOCK_STATUS.UNLOCKING
                    ? "Đang đổi ghế..."
                    : "Tiếp tục checkout"}
                {(seatLock.status === SEAT_LOCK_STATUS.LOCKED || seatLock.status === SEAT_LOCK_STATUS.IDLE) && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default BookingPage;