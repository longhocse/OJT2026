import { normalizeBooking, normalizeBookingResult, normalizeShowPage } from "../contracts/normalizers";
import api from "./api";

export const cashierService = {
  async getShows(params = {}) {
    const response = await api.get("/cashier/shows", { params });
    return normalizeShowPage(response.data);
  },
  async createBooking(data) {
    const response = await api.post("/cashier/bookings", data);
    return normalizeBookingResult(response.data);
  },
  async confirmCash(paymentId) {
    const response = await api.post(`/cashier/payments/${paymentId}/confirm-cash`);
    return response.data;
  },
  async getMyBookings() {
    const response = await api.get("/cashier/bookings/me");
    return Array.isArray(response.data) ? response.data.map(normalizeBooking) : [];
  },
  async getTicket(bookingId) {
    const response = await api.get(`/cashier/bookings/${bookingId}/ticket`);
    return response.data;
  },
};
