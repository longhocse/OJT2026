import {
  normalizeBooking,
  normalizeBookingResult,
  normalizeSeat,
  normalizeShow,
} from "../contracts/normalizers";
import api from "./api";
import { queryKeys } from "./queryKeys";

export const bookingKeys = queryKeys.bookings;

export const removeSensitiveFields = (value) => {
  if (Array.isArray(value)) return value.map(removeSensitiveFields);
  if (!value || typeof value !== "object") return value;
  return Object.entries(value).reduce((safeValue, [key, nestedValue]) => {
    if (key !== "password_hash") safeValue[key] = removeSensitiveFields(nestedValue);
    return safeValue;
  }, {});
};

export const bookingService = {
  async getShows(params = {}) {
    const response = await api.get("/shows", { params });
    return Array.isArray(response.data) ? response.data.map(normalizeShow) : [];
  },

  async getShowById(id) {
    const response = await api.get(`/shows/${id}`);
    return normalizeShow(response.data);
  },

  async getSeatsByShow(showId) {
    const response = await api.get(`/shows/${showId}/seats`);
    return Array.isArray(response.data) ? response.data.map(normalizeSeat) : [];
  },

  async lockSeats(data) {
    const response = await api.post("/bookings/seats/lock", data);
    return response.data;
  },

  async unlockSeats(data) {
    const response = await api.post("/bookings/seats/unlock", data);
    return response.data;
  },

  async createBooking(data) {
    const response = await api.post("/bookings", data);
    return normalizeBookingResult(response.data);
  },

  async getMyBookings() {
    const response = await api.get("/bookings/me");
    return Array.isArray(response.data) ? response.data.map(normalizeBooking) : [];
  },

  async getBookingById(id) {
    const response = await api.get(`/bookings/${id}`);
    return normalizeBooking(response.data);
  },

  async cancelBooking(id) {
    const response = await api.put(`/bookings/${id}/cancel`);
    return response.data;
  },
};
