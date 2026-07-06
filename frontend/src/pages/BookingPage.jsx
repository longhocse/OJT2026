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
      <div
        className="flex min-h-screen justify-center pt-24"
        role="status"
        aria-label="Đang tải suất chiếu"
      >
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  if (!show) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-4 pt-28 text-center">
        <p role="alert" className="text-error">
          {error || "Không thể mở suất chiếu."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/movies")}
          className="mt-5 rounded-lg bg-primary px-5 py-2 text-white"
        >
          Quay lại danh sách phim
        </button>
      </main>
    );
  }

  const showStarted = !isShowBookable(show);
  const estimatedTotal = estimateBookingTotal(show, selectedSeats);

  return (
    <main className="min-h-screen px-4 pb-64 pt-24 sm:pb-40 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold md:text-3xl">{show.movie?.title || "Suất chiếu"}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-on-surface-variant">
            <span>{new Date(show.start_time).toLocaleString("vi-VN")}</span>
            {show.screen?.theater?.name && <span>• {show.screen.theater.name}</span>}
            {show.screen?.name && <span>• Phòng {show.screen.name}</span>}
          </div>
        </header>

        {error && (
          <p role="alert" className="mb-6 rounded-lg bg-red-500/10 p-4 text-error">
            {error}
          </p>
        )}

        {!showStarted && (
          <div className="mb-8 overflow-x-auto rounded-xl bg-surface-container p-6">
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

        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-surface-container-high p-4"
        >
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-sm text-on-surface-variant">Ghế đã chọn</p>
              <p className="font-semibold">
                {selectedSeats.length
                  ? selectedSeats.map((seat) => `${seat.row}${seat.number}`).join(", ")
                  : "Chưa chọn ghế"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-on-surface-variant">Tổng tạm tính</p>
              <p className="text-2xl font-bold text-primary">
                {estimatedTotal.toLocaleString("vi-VN")} ₫
              </p>
              <p className="text-xs text-on-surface-variant">Giá chính thức do backend xác nhận</p>
              {seatLock.status === SEAT_LOCK_STATUS.LOCKED && (
                <p
                  role="timer"
                  aria-live="polite"
                  aria-atomic="true"
                  className="mt-1 text-sm font-semibold text-amber-400"
                >
                  Giữ ghế còn {formatCountdown(seatLock.remainingMs)}
                </p>
              )}
            </div>
            {selectedSeats.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                disabled={seatLock.status === SEAT_LOCK_STATUS.UNLOCKING}
                className="rounded-lg border border-white/20 px-4 py-3 disabled:opacity-50"
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
              className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {seatLock.status === SEAT_LOCK_STATUS.LOCKING
                ? "Đang giữ ghế..."
                : seatLock.status === SEAT_LOCK_STATUS.UNLOCKING
                  ? "Đang đổi ghế..."
                  : "Tiếp tục checkout"}
            </button>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default BookingPage;
