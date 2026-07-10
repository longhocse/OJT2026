import { act, renderHook } from "@testing-library/react";
import { bookingService } from "../services/bookingService";
import useSeatLock, { LOCK_REPLACE_DEBOUNCE_MS, SEAT_LOCK_STATUS } from "./useSeatLock";

jest.mock("../services/bookingService", () => ({
  bookingService: {
    lockSeats: jest.fn(),
    unlockSeats: jest.fn(),
  },
}));

const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SEAT_A = "22222222-2222-4222-8222-222222222222";
const SEAT_B = "44444444-4444-4444-8444-444444444444";
const TOKEN_A = "33333333-3333-4333-8333-333333333333";
const TOKEN_B = "55555555-5555-4555-8555-555555555555";

const lockResponse = (token, durationMs = 10000) => ({
  lockToken: token,
  lockedUntil: new Date(Date.now() + durationMs).toISOString(),
  expiresIn: Math.ceil(durationMs / 1000),
});

const flushTimers = async (milliseconds = 0) => {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const renderSeatLock = (seatIds, callbacks = {}) =>
  renderHook(
    ({ selected }) =>
      useSeatLock({
        showId: SHOW_ID,
        seatIds: selected,
        ...callbacks,
      }),
    { initialProps: { selected: seatIds } },
  );

describe("useSeatLock state machine", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-22T00:00:00.000Z"));
    jest.clearAllMocks();
    bookingService.unlockSeats.mockResolvedValue({ message: "Seats unlocked" });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test("counts down from lockedUntil and expires using absolute time", async () => {
    const onExpired = jest.fn();
    bookingService.lockSeats.mockImplementation(() => Promise.resolve(lockResponse(TOKEN_A, 3000)));
    const { result } = renderSeatLock([SEAT_A], { onExpired });

    await flushTimers(LOCK_REPLACE_DEBOUNCE_MS);
    expect(result.current.status).toBe(SEAT_LOCK_STATUS.LOCKED);
    expect(result.current.remainingMs).toBe(3000);

    jest.setSystemTime(new Date("2026-06-22T00:00:04.000Z"));
    await flushTimers(1000);

    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe(SEAT_LOCK_STATUS.EXPIRED);
    expect(result.current.lock).toBeNull();
  });

  test("unlocks the old set before locking a changed selection", async () => {
    bookingService.lockSeats
      .mockResolvedValueOnce(lockResponse(TOKEN_A))
      .mockResolvedValueOnce(lockResponse(TOKEN_B));
    const { result, rerender } = renderSeatLock([SEAT_A]);

    await flushTimers(LOCK_REPLACE_DEBOUNCE_MS);
    rerender({ selected: [SEAT_B] });
    await flushTimers(LOCK_REPLACE_DEBOUNCE_MS);

    expect(bookingService.unlockSeats).toHaveBeenCalledWith({
      showId: SHOW_ID,
      seatIds: [SEAT_A],
      lockToken: TOKEN_A,
    });
    expect(bookingService.lockSeats).toHaveBeenLastCalledWith({
      showId: SHOW_ID,
      seatIds: [SEAT_B],
      duration: 600,
    });
    expect(result.current.lock.lockToken).toBe(TOKEN_B);
  });

  test("unlocks successfully when the user clears the selection", async () => {
    bookingService.lockSeats.mockResolvedValue(lockResponse(TOKEN_A));
    const { result, rerender } = renderSeatLock([SEAT_A]);

    await flushTimers(LOCK_REPLACE_DEBOUNCE_MS);
    rerender({ selected: [] });
    await flushTimers();

    expect(bookingService.unlockSeats).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe(SEAT_LOCK_STATUS.IDLE);
    expect(result.current.lock).toBeNull();
  });

  test("releases an owned lock when leaving the page", async () => {
    bookingService.lockSeats.mockResolvedValue(lockResponse(TOKEN_A));
    const { unmount } = renderSeatLock([SEAT_A]);

    await flushTimers(LOCK_REPLACE_DEBOUNCE_MS);
    unmount();
    await flushTimers();

    expect(bookingService.unlockSeats).toHaveBeenCalledWith({
      showId: SHOW_ID,
      seatIds: [SEAT_A],
      lockToken: TOKEN_A,
    });
  });

  test("does not release a lock that was transferred to checkout", async () => {
    bookingService.lockSeats.mockResolvedValue(lockResponse(TOKEN_A));
    const { result, unmount } = renderSeatLock([SEAT_A]);

    await flushTimers(LOCK_REPLACE_DEBOUNCE_MS);
    act(() => result.current.markTransferred());
    unmount();
    await flushTimers();

    expect(bookingService.unlockSeats).not.toHaveBeenCalled();
  });

  test("reports a 409 conflict and never enters the locked state", async () => {
    const conflict = { response: { status: 409 } };
    const onConflict = jest.fn();
    bookingService.lockSeats.mockRejectedValue(conflict);
    const { result } = renderSeatLock([SEAT_A], { onConflict });

    await flushTimers(LOCK_REPLACE_DEBOUNCE_MS);

    expect(onConflict).toHaveBeenCalledWith(conflict, [SEAT_A]);
    expect(result.current.status).toBe(SEAT_LOCK_STATUS.IDLE);
    expect(result.current.selectionIsLocked).toBe(false);
  });
});
