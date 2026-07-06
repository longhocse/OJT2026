import { buildBookingPayload, validateSeatIds } from "./bookingContract";

const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SEAT_ID = "22222222-2222-4222-8222-222222222222";
const LOCK_TOKEN = "33333333-3333-4333-8333-333333333333";

const validSession = () => ({
  showId: SHOW_ID,
  seatIds: [SEAT_ID],
  lockToken: LOCK_TOKEN,
  lockedUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
});

describe("booking contract", () => {
  test("rejects more than the backend maximum of 20 seats", () => {
    const seatIds = Array.from(
      { length: 21 },
      (_, index) => `22222222-2222-4222-8222-${String(index).padStart(12, "0")}`,
    );

    expect(validateSeatIds(seatIds)).toMatchObject({ valid: false });
  });

  test("rejects duplicate seat IDs case-insensitively", () => {
    const result = validateSeatIds([SEAT_ID, SEAT_ID.toUpperCase()]);

    expect(result).toMatchObject({
      valid: false,
      message: "Danh sách ghế không được trùng lặp.",
    });
  });

  test("rejects payment methods outside the backend enum", () => {
    expect(() => buildBookingPayload(validSession(), "paypal")).toThrow(
      "Phương thức thanh toán không hợp lệ.",
    );
  });

  test("builds only the four fields accepted by the backend", () => {
    expect(buildBookingPayload(validSession(), "cash")).toEqual({
      showId: SHOW_ID,
      seatIds: [SEAT_ID],
      paymentMethod: "cash",
      lockToken: LOCK_TOKEN,
    });
  });
});
