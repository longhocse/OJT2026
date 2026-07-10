import { bookingSuccessStore, checkoutSessionStore } from "./bookingSession";

test("checkout and success session stores round-trip and clear data", () => {
  checkoutSessionStore.save({ showId: "show-1" });
  bookingSuccessStore.save({ bookingId: "booking-1" });
  expect(checkoutSessionStore.load()).toEqual({ showId: "show-1" });
  expect(bookingSuccessStore.load()).toEqual({ bookingId: "booking-1" });
  checkoutSessionStore.clear();
  bookingSuccessStore.clear();
  expect(checkoutSessionStore.load()).toBeNull();
  expect(bookingSuccessStore.load()).toBeNull();
});

test("invalid session JSON is removed instead of escaping to the UI", () => {
  sessionStorage.setItem("movietap.checkout", "{");
  expect(checkoutSessionStore.load()).toBeNull();
  expect(sessionStorage.getItem("movietap.checkout")).toBeNull();
});
