const CHECKOUT_KEY = "movietap.checkout";
const SUCCESS_KEY = "movietap.bookingSuccess";

const readJson = (storage, key) => {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    storage.removeItem(key);
    return null;
  }
};

export const checkoutSessionStore = {
  load: () => readJson(sessionStorage, CHECKOUT_KEY),
  save: (value) => sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(value)),
  clear: () => sessionStorage.removeItem(CHECKOUT_KEY),
};

export const bookingSuccessStore = {
  // PayOS may return in a new browsing context, where sessionStorage is empty.
  // localStorage keeps this non-secret booking handoff available across the redirect.
  load: () => readJson(localStorage, SUCCESS_KEY),
  save: (value) => localStorage.setItem(SUCCESS_KEY, JSON.stringify(value)),
  clear: () => localStorage.removeItem(SUCCESS_KEY),
};
