import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  buildBookingPayload,
  estimateBookingTotal,
  isShowBookable,
  PAYMENT_METHODS,
  validateCheckoutSession,
} from "../booking/bookingContract";
import { bookingSuccessStore, checkoutSessionStore } from "../booking/bookingSession";
import { clearBooking } from "../redux/slices/bookingSlice";
import useAbsoluteCountdown, { formatCountdown } from "../hooks/useAbsoluteCountdown";
import { normalizeApiError } from "../services/apiError";
import { bookingKeys, bookingService } from "../services/bookingService";
import { queryKeys } from "../services/queryKeys";
import { checkoutSchema } from "../validation/schemas";
import { applyBackendErrors } from "../validation/formErrors";
import SafeImage from "../components/common/SafeImage";
import { CreditCard, Calendar, Clock, MapPin, User, ArrowRight } from "lucide-react";

const PAYMENT_LABELS = {
  credit_card: "Thẻ tín dụng",
  vnpay: "VNPay",
  momo: "MoMo",
  cash: "Thanh toán tại rạp",
};

const getCreateBookingError = (error) => {
  if (!error?.response && !error?.request)
    return error?.message || "Dữ liệu checkout không hợp lệ.";
  const apiError = normalizeApiError(error);
  if (apiError.status === null)
    return "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
  if (apiError.status === 400) return "Thông tin booking không hợp lệ. Vui lòng kiểm tra lại.";
  if (apiError.status === 404) return "Suất chiếu hoặc ghế không còn tồn tại.";
  if (apiError.status === 409)
    return "Ghế giữ chỗ đã hết hạn hoặc không còn khả dụng. Vui lòng chọn lại.";
  return "Không thể hoàn tất booking lúc này. Vui lòng thử lại.";
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const submittingRef = useRef(false);
  const bookingCompletedRef = useRef(false);
  const releasedRef = useRef(false);
  const cleanupTimerRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fatalConflict, setFatalConflict] = useState(false);
  const [checkoutSession] = useState(
    () => location.state?.checkoutSession || checkoutSessionStore.load(),
  );
  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { paymentMethod: "credit_card" },
    shouldFocusError: true,
  });
  const paymentMethod = watch("paymentMethod");

  const sessionValidation = useMemo(
    () => validateCheckoutSession(checkoutSession),
    [checkoutSession],
  );
  const validSession = sessionValidation.valid ? sessionValidation.session : null;

  const releaseCheckoutLock = useCallback(async () => {
    if (!validSession || releasedRef.current || bookingCompletedRef.current) return;
    releasedRef.current = true;
    try {
      await bookingService.unlockSeats({
        showId: validSession.showId,
        seatIds: validSession.seatIds,
        lockToken: validSession.lockToken,
      });
    } catch {
      // Best effort: the lock may have expired or already been consumed.
    }
  }, [validSession]);

  const handleLockExpired = useCallback(() => {
    releasedRef.current = true;
    checkoutSessionStore.clear();
    dispatch(clearBooking());
    setFatalConflict(true);
    setSubmitError("Thời gian giữ ghế đã hết. Vui lòng chọn lại.");
  }, [dispatch]);

  const remainingLockMs = useAbsoluteCountdown(validSession?.lockedUntil, handleLockExpired);

  useEffect(() => {
    clearTimeout(cleanupTimerRef.current);
    return () => {
      cleanupTimerRef.current = setTimeout(() => {
        if (!bookingCompletedRef.current) releaseCheckoutLock();
      }, 0);
    };
  }, [releaseCheckoutLock]);

  useEffect(() => {
    if (sessionValidation.valid) return;
    checkoutSessionStore.clear();
    const destination = checkoutSession?.showId ? `/booking/${checkoutSession.showId}` : "/movies";
    navigate(destination, {
      replace: true,
      state: { checkoutError: sessionValidation.message },
    });
  }, [checkoutSession, navigate, sessionValidation]);

  const showQuery = useQuery({
    queryKey: [...queryKeys.shows.detail(validSession?.showId), "checkout"],
    queryFn: () => bookingService.getShowById(validSession.showId),
    enabled: Boolean(validSession),
    retry: false,
  });

  const seatsQuery = useQuery({
    queryKey: [...queryKeys.shows.seats(validSession?.showId), "checkout"],
    queryFn: () => bookingService.getSeatsByShow(validSession.showId),
    enabled: Boolean(validSession),
    retry: false,
  });

  const selectedSeats = useMemo(() => {
    if (!validSession || !Array.isArray(seatsQuery.data)) return [];
    const selectedIds = new Set(validSession.seatIds);
    return seatsQuery.data.filter((seat) => selectedIds.has(String(seat.id).toLowerCase()));
  }, [seatsQuery.data, validSession]);

  if (!sessionValidation.valid) return null;

  const loading = showQuery.isPending || seatsQuery.isPending;
  const show = showQuery.data;
  const selectedSeatsAreValid =
    selectedSeats.length === validSession.seatIds.length &&
    selectedSeats.every((seat) => seat.status !== "occupied" && seat.status !== "disabled");
  const showIsBookable = isShowBookable(show);
  const checkoutReady =
    !loading &&
    !showQuery.isError &&
    !seatsQuery.isError &&
    showIsBookable &&
    selectedSeatsAreValid &&
    !fatalConflict;
  const estimatedTotal = estimateBookingTotal(show, selectedSeats);

  const submitBooking = async ({ paymentMethod: selectedPaymentMethod }) => {
    if (submittingRef.current || submitting || !checkoutReady) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = buildBookingPayload(validSession, selectedPaymentMethod);
      const booking = await bookingService.createBooking(payload);
      if (!booking?.bookingId || !Array.isArray(booking?.seats)) {
        throw new Error("Phản hồi booking từ máy chủ không hợp lệ.");
      }

      bookingSuccessStore.save(booking);
      checkoutSessionStore.clear();
      dispatch(clearBooking());
      bookingCompletedRef.current = true;
      await queryClient.invalidateQueries({ queryKey: bookingKeys.mine });
      navigate("/success", { replace: true, state: { booking } });
    } catch (error) {
      const formError = applyBackendErrors(error, {
        setError,
        setFocus,
        allowedFields: ["paymentMethod"],
      });
      setSubmitError(formError || getCreateBookingError(error));
      if ([404, 409].includes(error?.response?.status)) {
        setFatalConflict(true);
        checkoutSessionStore.clear();
        await releaseCheckoutLock();
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div role="status" className="flex min-h-screen w-full bg-[#F5F0EB] items-center justify-center pt-20">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E6DFD9] flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#B8744C] border-t-transparent"></div>
          <p className="text-[#3E3A39] font-medium">Đang kiểm tra lại suất chiếu và ghế...</p>
        </div>
      </div>
    );
  }

  const dataError =
    showQuery.isError || seatsQuery.isError
      ? "Không thể xác minh dữ liệu checkout với backend."
      : !showIsBookable
        ? "Suất chiếu đã bắt đầu. Bạn không thể tiếp tục booking."
        : !selectedSeatsAreValid
          ? "Danh sách ghế không còn hợp lệ hoặc không còn tồn tại."
          : "";

  const handleCancelCheckout = async () => {
    if (submittingRef.current) return;
    setSubmitting(true);
    await releaseCheckoutLock();
    checkoutSessionStore.clear();
    dispatch(clearBooking());
    navigate(`/booking/${validSession.showId}`, { replace: true });
  };

  return (
    <main className="min-h-screen w-full bg-[#F5F0EB] flex justify-center px-4 py-12 md:py-24">
      <div className="w-full max-w-6xl">
        <h1 className="mb-8 text-3xl md:text-4xl font-extrabold text-[#3E3A39]">Xác nhận booking</h1>

        {(dataError || submitError) && (
          <div
            role="alert"
            className="mb-6 rounded-2xl bg-white border border-red-200 p-6 text-[#DC2626] shadow-sm"
          >
            <p className="font-medium">{submitError || dataError}</p>
            {(dataError || fatalConflict) && (
              <button
                type="button"
                onClick={() => navigate(`/booking/${validSession.showId}`, { replace: true })}
                className="mt-4 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] px-5 py-2.5 text-white font-semibold shadow-md shadow-[#DC2626]/30 transition"
              >
                Chọn lại ghế
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Cột Trái: Tạm tính (Sticky Sidebar) */}
          <section className="order-2 lg:order-1 lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#E6DFD9]">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E6DFD9]">
                <div className="p-2 bg-[#B8744C]/10 rounded-xl text-[#B8744C]">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-[#3E3A39]">Thông tin tạm tính</h2>
              </div>

              {/* Poster + Tên phim */}
              <div className="flex gap-4 mt-5">
                <SafeImage
                  src={show?.movie?.poster_url}
                  alt={show?.movie?.title || "Poster phim"}
                  className="h-24 w-16 rounded-2xl object-cover shadow-sm border border-[#E6DFD9]"
                />
                <div className="flex flex-col justify-center">
                  <h3 className="font-bold text-[#3E3A39]">{show?.movie?.title || "Phim không xác định"}</h3>
                  <div className="mt-1 space-y-1 text-sm text-[#6B625A]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#B8744C]" />
                      {show?.start_time ? new Date(show.start_time).toLocaleString("vi-VN") : "—"}
                    </div>
                    {show?.screen?.theater?.name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#B8744C]" />
                        {show.screen.theater.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chi tiết Ghế - Giá */}
              <dl className="mt-5 space-y-4 border-t border-[#E6DFD9] pt-5">
                <div className="flex justify-between items-center gap-4 text-sm text-[#3E3A39]">
                  <dt className="flex items-center gap-2 text-[#6B625A]">
                    <User className="w-4 h-4 text-[#B8744C]" /> Ghế đã chọn
                  </dt>
                  <dd className="font-semibold bg-[#F9F7F5] px-3 py-1 rounded-full">
                    {selectedSeats.map((seat) => `${seat.row}${seat.number}`).join(", ") || "—"}
                  </dd>
                </div>
                <div className="flex justify-between items-center gap-4 text-lg font-bold border-t border-[#E6DFD9] pt-4 mt-2">
                  <dt className="text-[#3E3A39]">Tổng tạm tính</dt>
                  <dd className="text-[#B8744C]">{estimatedTotal.toLocaleString("vi-VN")} ₫</dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-[#6B625A] leading-relaxed">
                Đây chỉ là giá ước tính. Tổng tiền chính thức được backend trả về sau khi booking thành công.
              </p>

              {/* Timer giữ ghế */}
              <div className="mt-4 bg-[#F9F7F5] rounded-xl p-3 border border-[#E6DFD9] flex items-center justify-between">
                <span className="text-sm font-medium text-[#6B625A]">Thời gian giữ ghế</span>
                <span
                  role="timer"
                  aria-live="polite"
                  aria-atomic="true"
                  className="font-bold text-[#B8744C]"
                >
                  {formatCountdown(remainingLockMs)}
                </span>
              </div>
            </div>
          </section>

          {/* Cột Phải: Phương thức thanh toán */}
          <section className="order-1 lg:order-2 lg:col-span-2">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#E6DFD9]">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E6DFD9]">
                <div className="p-2 bg-[#B8744C]/10 rounded-xl text-[#B8744C]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-[#3E3A39]">Phương thức thanh toán</h2>
              </div>

              {/* Radio Options */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-5">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${paymentMethod === method
                        ? "border-[#B8744C] bg-[#B8744C]/5 shadow-sm"
                        : "border-[#E6DFD9] bg-white hover:bg-[#F9F7F5]"
                      }`}
                  >
                    <input
                      type="radio"
                      value={method}
                      {...register("paymentMethod")}
                      disabled={!checkoutReady || submitting || isSubmitting}
                      className="w-4 h-4 accent-[#B8744C]"
                    />
                    <span className="text-[#3E3A39] font-medium">{PAYMENT_LABELS[method]}</span>
                  </label>
                ))}
              </div>
              {errors.paymentMethod && (
                <p role="alert" className="mt-3 text-sm text-[#DC2626] font-medium">
                  {errors.paymentMethod.message}
                </p>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-5 border-t border-[#E6DFD9]">
                <motion.button
                  whileHover={
                    checkoutReady && !submitting && !isSubmitting ? { scale: 1.01 } : undefined
                  }
                  whileTap={
                    checkoutReady && !submitting && !isSubmitting ? { scale: 0.99 } : undefined
                  }
                  type="button"
                  onClick={handleFormSubmit(submitBooking)}
                  disabled={!checkoutReady || submitting || isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] py-3.5 font-bold text-white shadow-md shadow-[#DC2626]/30 disabled:cursor-not-allowed disabled:opacity-50 transition"
                >
                  {submitting ? "Đang tạo booking..." : "Xác nhận booking"} <ArrowRight className="w-4 h-4" />
                </motion.button>

                <button
                  type="button"
                  onClick={handleCancelCheckout}
                  disabled={submitting || isSubmitting}
                  className="flex-1 rounded-2xl border border-[#E6DFD9] py-3.5 font-semibold text-[#6B625A] hover:bg-[#F9F7F5] transition disabled:opacity-50"
                >
                  Hủy checkout và chọn lại
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default CheckoutPage;