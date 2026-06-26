const CHECKOUT_KEY = "movietap.checkout";
const SUCCESS_KEY = "movietap.bookingSuccess";

const readJson = (key) => {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
};

export const checkoutSessionStore = {
  load: () => readJson(CHECKOUT_KEY),
  save: (value) => sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(value)),
  clear: () => sessionStorage.removeItem(CHECKOUT_KEY),
};

export const bookingSuccessStore = {
  load: () => readJson(SUCCESS_KEY),
  save: (value) => sessionStorage.setItem(SUCCESS_KEY, JSON.stringify(value)),
  clear: () => sessionStorage.removeItem(SUCCESS_KEY),
};
