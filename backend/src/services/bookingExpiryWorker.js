const { env } = require("../config/env");
const logger = require("../utils/logger");
const { expirePendingBookings } = require("./paymentLifecycleService");
const startBookingExpiryWorker = () => {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const count = await expirePendingBookings();
      if (count) logger.info("pending_bookings_expired", { count });
    } catch (error) {
      logger.error("booking_expiry_worker_failed", { error });
    } finally {
      running = false;
    }
  };
  const timer = globalThis.setInterval(run, env.BOOKING_EXPIRY_INTERVAL_MS);
  timer.unref?.();
  void run();
  return () => globalThis.clearInterval(timer);
};
module.exports = { startBookingExpiryWorker };
