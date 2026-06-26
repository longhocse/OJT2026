import { normalizePayment } from "../contracts/normalizers";
import api from "./api";

const normalizePage = (raw) => ({
  data: Array.isArray(raw.data) ? raw.data.map(normalizePayment) : [],
  pagination: raw.pagination,
});

export const paymentService = {
  async getPayment(id) {
    const response = await api.get(`/payments/${id}`);
    return normalizePayment(response.data);
  },
  async completeMock(id) {
    const response = await api.post(`/payments/${id}/mock-complete`);
    return {
      payment: normalizePayment(response.data.payment),
      bookingStatus: response.data.bookingStatus,
    };
  },
  async getTicket(bookingId) {
    const response = await api.get(`/bookings/${bookingId}/ticket`);
    return response.data;
  },
  async getAdminPayments(params = {}) {
    const response = await api.get("/admin/payments", { params });
    return normalizePage(response.data);
  },
  async confirmCash(id) {
    const response = await api.post(`/admin/payments/${id}/confirm-cash`);
    return {
      payment: normalizePayment(response.data.payment),
      idempotent: response.data.idempotent,
    };
  },
  async refund(id, amount) {
    const response = await api.post(`/admin/payments/${id}/refund`, amount ? { amount } : {});
    return normalizePayment(response.data.payment);
  },
  async checkIn(qrPayload) {
    const response = await api.post("/admin/tickets/check-in", { qrPayload });
    return response.data;
  },
};
