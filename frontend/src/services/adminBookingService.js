import {
  normalizeAuditLogPage,
  normalizeBooking,
  normalizeBookingPage,
  normalizeDashboardStats,
} from "../contracts/normalizers";
import api from "./api";

export const adminBookingService = {
  async getBookings(params = {}) {
    const response = await api.get("/admin/bookings", { params });
    return normalizeBookingPage(response.data);
  },

  async getBookingById(id) {
    const response = await api.get(`/admin/bookings/${id}`);
    return normalizeBooking(response.data);
  },

  async cancelBooking(id, reason) {
    const response = await api.post(`/admin/bookings/${id}/cancel`, { reason });
    return {
      message: response.data.message,
      refundAmount: Number(response.data.refundAmount) || 0,
      refundRate: Number(response.data.refundRate) || 0,
      booking: normalizeBooking(response.data.booking),
    };
  },

  async getDashboardStats(params = {}) {
    const response = await api.get("/admin/dashboard/stats", { params });
    return normalizeDashboardStats(response.data);
  },

  async getAuditLogs(params = {}) {
    const response = await api.get("/admin/audit-logs", { params });
    return normalizeAuditLogPage(response.data);
  },
};
