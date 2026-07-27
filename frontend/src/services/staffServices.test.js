import api from "./api";
import { cashierService } from "./cashierService";
import { chatService } from "./chatService";
import { checkerService } from "./checkerService";

jest.mock("./api", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

test("cashier service maps shows, bookings and ticket operations", async () => {
  api.get
    .mockResolvedValueOnce({
      data: { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } },
    })
    .mockResolvedValueOnce({
      data: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          total_price: 100000,
          status: "confirmed",
          bookingSeats: [],
        },
      ],
    })
    .mockResolvedValueOnce({ data: { ticketCode: "MT-1" } });
  api.post
    .mockResolvedValueOnce({
      data: {
        bookingId: "11111111-1111-4111-8111-111111111111",
        totalPrice: 100000,
        seats: ["A1"],
        status: "pending_payment",
        payment: {
          id: "22222222-2222-4222-8222-222222222222",
          provider: "cash",
          status: "pending",
          checkoutUrl: null,
        },
      },
    })
    .mockResolvedValueOnce({ data: { status: "paid" } });

  expect(await cashierService.getShows({ page: 1 })).toMatchObject({ data: [] });
  expect(await cashierService.createBooking({ showId: "show-1" })).toMatchObject({
    bookingId: "11111111-1111-4111-8111-111111111111",
  });
  expect(await cashierService.confirmCash("payment-1")).toEqual({ status: "paid" });
  expect(await cashierService.getMyBookings()).toHaveLength(1);
  expect(await cashierService.getTicket("booking-1")).toEqual({ ticketCode: "MT-1" });
});

test("cashier handles a non-array booking response", async () => {
  api.get.mockResolvedValue({ data: null });
  await expect(cashierService.getMyBookings()).resolves.toEqual([]);
});

test("checker and chat services forward their contracts", async () => {
  api.post
    .mockResolvedValueOnce({ data: { checkedIn: true } })
    .mockResolvedValueOnce({ data: { reply: "hello" } });
  api.get.mockResolvedValueOnce({ data: { data: [] } });

  await expect(checkerService.checkIn("qr-payload")).resolves.toEqual({ checkedIn: true });
  await expect(checkerService.getMyHistory({ page: 2 })).resolves.toEqual({ data: [] });
  await expect(chatService.sendMessage("hi")).resolves.toEqual({ reply: "hello" });
});
