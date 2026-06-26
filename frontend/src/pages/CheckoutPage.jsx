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
      <div role="status" className="flex min-h-screen items-center justify-center pt-20">
        Đang kiểm tra lại suất chiếu và ghế...
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
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-24 md:px-8">
      <h1 className="mb-8 text-3xl font-bold">Xác nhận booking</h1>

      {(dataError || submitError) && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-error"
        >
          <p>{submitError || dataError}</p>
          {(dataError || fatalConflict) && (
            <button
              type="button"
              onClick={() => navigate(`/booking/${validSession.showId}`, { replace: true })}
              className="mt-4 rounded-lg bg-primary px-5 py-2 text-white"
            >
              Chọn lại ghế
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="order-2 lg:order-1">
          <div className="sticky top-24 rounded-xl bg-surface-container p-6">
            <h2 className="mb-4 text-xl font-bold">Thông tin tạm tính</h2>
            <div className="flex gap-4">
              <SafeImage
                src={show?.movie?.poster_url}
                alt={show?.movie?.title || "Poster phim"}
                className="h-24 w-16 rounded object-cover"
              />
              <div>
                <h3 className="font-semibold">{show?.movie?.title || "Phim không xác định"}</h3>
                <p className="text-sm text-on-surface-variant">
                  {show?.start_time ? new Date(show.start_time).toLocaleString("vi-VN") : "—"}
                </p>
                {show?.screen?.theater?.name && (
                  <p className="text-sm">{show.screen.theater.name}</p>
                )}
              </div>
            </div>
            <dl className="mt-5 space-y-3 border-t border-white/10 pt-4">
              <div className="flex justify-between gap-4">
                <dt>Ghế</dt>
                <dd>
                  {selectedSeats.map((seat) => `${seat.row}${seat.number}`).join(", ") || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-lg font-bold">
                <dt>Tổng tạm tính</dt>
                <dd className="text-primary">{estimatedTotal.toLocaleString("vi-VN")} ₫</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-on-surface-variant">
              Đây chỉ là giá ước tính. Tổng tiền chính thức được backend trả về sau khi booking
              thành công.
            </p>
            <p
              role="timer"
              aria-live="polite"
              aria-atomic="true"
              className="mt-3 text-sm font-semibold text-amber-400"
            >
              Giữ ghế còn {formatCountdown(remainingLockMs)}
            </p>
          </div>
        </section>

        <section className="order-1 lg:order-2 lg:col-span-2">
          <div className="rounded-xl bg-surface-container p-6">
            <h2 className="mb-6 text-xl font-bold">Phương thức thanh toán</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${paymentMethod === method ? "border-primary bg-primary/10" : "border-white/10"}`}
                >
                  <input
                    type="radio"
                    value={method}
                    {...register("paymentMethod")}
                    disabled={!checkoutReady || submitting || isSubmitting}
                  />
                  <span>{PAYMENT_LABELS[method]}</span>
                </label>
              ))}
            </div>
            {errors.paymentMethod && (
              <p role="alert" className="mt-2 text-sm text-error">
                {errors.paymentMethod.message}
              </p>
            )}

            <motion.button
              whileHover={
                checkoutReady && !submitting && !isSubmitting ? { scale: 1.01 } : undefined
              }
              whileTap={checkoutReady && !submitting && !isSubmitting ? { scale: 0.99 } : undefined}
              type="button"
              onClick={handleFormSubmit(submitBooking)}
              disabled={!checkoutReady || submitting || isSubmitting}
              className="mt-8 w-full rounded-lg bg-primary py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Đang tạo booking..." : "Xác nhận booking"}
            </motion.button>
            <button
              type="button"
              onClick={handleCancelCheckout}
              disabled={submitting || isSubmitting}
              className="mt-3 w-full rounded-lg border border-white/20 py-3 font-semibold disabled:opacity-50"
            >
              Hủy checkout và chọn lại
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default CheckoutPage;
