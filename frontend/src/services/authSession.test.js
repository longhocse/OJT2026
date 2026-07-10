jest.mock("../redux/store", () => ({
  store: { dispatch: jest.fn() },
  persistor: { purge: jest.fn(() => Promise.resolve()) },
}));
jest.mock("../booking/bookingSession", () => ({
  checkoutSessionStore: { clear: jest.fn() },
  bookingSuccessStore: { clear: jest.fn() },
}));

import { bookingSuccessStore, checkoutSessionStore } from "../booking/bookingSession";
import { persistor, store } from "../redux/store";
import { clearClientSession } from "./authSession";

test("logout removes Redux auth, persisted auth and temporary booking data", async () => {
  await clearClientSession();
  expect(store.dispatch).toHaveBeenCalledWith({ type: "auth/logout" });
  expect(persistor.purge).toHaveBeenCalledTimes(1);
  expect(checkoutSessionStore.clear).toHaveBeenCalledTimes(1);
  expect(bookingSuccessStore.clear).toHaveBeenCalledTimes(1);
});
