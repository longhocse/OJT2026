export const MAX_BOOKING_SEATS = 20;
export const PAYMENT_METHODS = ["credit_card", "vnpay", "momo", "cash"];

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidUuid = (value) => typeof value === "string" && UUID_PATTERN.test(value);

export const validateSeatIds = (seatIds) => {
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return { valid: false, message: "Vui lòng chọn ít nhất một ghế." };
  }
  if (seatIds.length > MAX_BOOKING_SEATS) {
    return { valid: false, message: `Chỉ được chọn tối đa ${MAX_BOOKING_SEATS} ghế.` };
  }
  if (seatIds.some((seatId) => !isValidUuid(seatId))) {
    return { valid: false, message: "Danh sách ghế không hợp lệ." };
  }
  const normalizedIds = seatIds.map((seatId) => seatId.toLowerCase());
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    return { valid: false, message: "Danh sách ghế không được trùng lặp." };
  }
  return { valid: true, seatIds: normalizedIds };
};

export const validateCheckoutSession = (session, now = Date.now()) => {
  if (!session || !isValidUuid(session.showId) || !isValidUuid(session.lockToken)) {
    return { valid: false, message: "Phiên checkout không hợp lệ." };
  }

  const seatValidation = validateSeatIds(session.seatIds);
  if (!seatValidation.valid) return seatValidation;

  const lockedUntil = new Date(session.lockedUntil).getTime();
  if (!Number.isFinite(lockedUntil) || lockedUntil <= now) {
    return { valid: false, message: "Thời gian giữ ghế đã hết. Vui lòng chọn lại." };
  }

  return {
    valid: true,
    session: { ...session, seatIds: seatValidation.seatIds },
  };
};

export const buildBookingPayload = (session, paymentMethod) => {
  const validation = validateCheckoutSession(session);
  if (!validation.valid) throw new Error(validation.message);
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new Error("Phương thức thanh toán không hợp lệ.");
  }

  return {
    showId: validation.session.showId,
    seatIds: validation.session.seatIds,
    paymentMethod,
    lockToken: validation.session.lockToken,
  };
};

export const isShowBookable = (show, now = Date.now()) => {
  const startTime = new Date(show?.start_time).getTime();
  return Number.isFinite(startTime) && startTime > now;
};

export const estimateBookingTotal = (show, seats) => {
  const basePrice = Number(show?.price);
  if (!Number.isFinite(basePrice) || basePrice <= 0 || !Array.isArray(seats)) return 0;

  return seats.reduce((total, seat) => {
    const multiplier = seat.type === "vip" ? 1.5 : seat.type === "couple" ? 1.8 : 1;
    return total + basePrice * multiplier;
  }, 0);
};
