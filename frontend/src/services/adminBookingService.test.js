jest.mock("./api", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

import api from "./api";
import { adminBookingService } from "./adminBookingService";

const booking = {
  id: "booking-1",
  total_price: "100000",
  status: "confirmed",
  payment_method: "credit_card",
  payment_status: "paid",
  refunded_amount: "0",
  bookingSeats: [],
};

test("admin booking service covers list, detail, cancellation and dashboard stats", async () => {
  api.get
    .mockResolvedValueOnce({
      data: {
        data: [booking],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      },
    })
    .mockResolvedValueOnce({ data: booking })
    .mockResolvedValueOnce({
      data: {
        totalBookings: "1",
        confirmedBookings: "1",
        cancelledBookings: "0",
        revenue: "100000",
        refund: "0",
        occupancy: "25",
        bookedSeats: "1",
        capacity: "4",
        series: [{ date: "2026-06-23", totalBookings: "1", revenue: "100000", refund: "0" }],
      },
    });
  api.post.mockResolvedValue({
    data: {
      message: "Booking cancelled",
      refundAmount: "50000",
      refundRate: 0.5,
      booking: {
        ...booking,
        status: "cancelled",
        payment_status: "partially_refunded",
        refunded_amount: "50000",
      },
    },
  });

  await expect(adminBookingService.getBookings({ page: 1 })).resolves.toMatchObject({
    data: [{ id: "booking-1", payment_status: "paid" }],
    pagination: { total: 1 },
  });
  await expect(adminBookingService.getBookingById("booking-1")).resolves.toMatchObject({
    id: "booking-1",
  });
  await expect(
    adminBookingService.cancelBooking("booking-1", "Approved reason"),
  ).resolves.toMatchObject({
    refundAmount: 50000,
    refundRate: 0.5,
    booking: { status: "cancelled" },
  });
  await expect(
    adminBookingService.getDashboardStats({ dateFrom: "2026-06-01" }),
  ).resolves.toMatchObject({
    totalBookings: 1,
    revenue: 100000,
    occupancy: 25,
    series: [{ totalBookings: 1 }],
  });

  expect(api.post).toHaveBeenCalledWith("/admin/bookings/booking-1/cancel", {
    reason: "Approved reason",
  });
  expect(api.get).toHaveBeenLastCalledWith("/admin/dashboard/stats", {
    params: { dateFrom: "2026-06-01" },
  });
});
