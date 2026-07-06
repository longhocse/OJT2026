import { bookingSuccessStore, checkoutSessionStore } from "../booking/bookingSession";
import { logout } from "../redux/slices/authSlice";
import { persistor, store } from "../redux/store";

export const clearClientSession = () => {
  store.dispatch(logout());
  checkoutSessionStore.clear();
  bookingSuccessStore.clear();
  return persistor.purge();
};
