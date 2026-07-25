const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getRefundRate = (showTime, now = new Date()) => {
  const hoursUntilShow = (new Date(showTime).getTime() - now.getTime()) / (60 * 60 * 1000);
  if (hoursUntilShow >= 24) return 1;
  if (hoursUntilShow >= 2) return 0.5;
  return 0;
};

const calculateRefund = (totalPrice, showTime, now = new Date()) =>
  roundMoney(Math.max(0, Number(totalPrice) || 0) * getRefundRate(showTime, now));

const applyRefundSummary = (booking, refundAmount) => {
  const total = roundMoney(Math.max(0, Number(booking.total_price) || 0));
  const requestedRefund = Math.max(0, Number(refundAmount) || 0);
  const existingRefund = Math.max(0, Number(booking.refunded_amount) || 0);
  const refund = roundMoney(Math.min(total, Math.max(existingRefund, requestedRefund)));
  booking.refunded_amount = refund;

  if (booking.payment_status === "pending") booking.payment_status = "cancelled";
  else if (refund >= total && total > 0) booking.payment_status = "refunded";
  else if (refund > 0) booking.payment_status = "partially_refunded";
  else if (!booking.payment_status) booking.payment_status = "paid";
  return refund;
};

module.exports = { applyRefundSummary, calculateRefund, getRefundRate };
