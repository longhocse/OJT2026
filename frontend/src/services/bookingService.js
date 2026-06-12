import api from "./api";

export const bookingService = {
  getShows: async (params = {}) => {
    const response = await api.get("/shows", { params });
    return response.data;
  },
  getShowById: async (id) => {
    const response = await api.get(`/shows/${id}`);
    return response.data;
  },
  getSeatsByShow: async (showId) => {
    const response = await api.get(`/shows/${showId}/seats`);
    return response.data;
  },
  lockSeats: async (data) => {
    const response = await api.post("/bookings/seats/lock", data);
    return response.data;
  },
  unlockSeats: async (data) => {
    const response = await api.post("/bookings/seats/unlock", data);
    return response.data;
  },
  createBooking: async (data) => {
    const response = await api.post("/bookings", data);
    return response.data;
  },
  getUserBookings: async (userId) => {
    const response = await api.get(`/bookings/user/${userId}`);
    return response.data;
  },
  cancelBooking: async (id) => {
    const response = await api.put(`/bookings/${id}/cancel`);
    return response.data;
  },
};