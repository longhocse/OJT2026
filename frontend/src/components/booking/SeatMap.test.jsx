import { fireEvent, render, screen } from "@testing-library/react";
import { bookingService } from "../../services/bookingService";
import SeatMap from "./SeatMap";

jest.mock("../../services/bookingService", () => ({
  bookingService: { getSeatsByShow: jest.fn() },
}));

const seats = [
  { id: "seat-1", row: "A", number: 1, type: "standard", status: "available" },
  { id: "seat-2", row: "A", number: 2, type: "standard", status: "occupied" },
  { id: "seat-3", row: "A", number: 3, type: "standard", status: "disabled" },
];

test("seat map loads, selects available seats and cleans its polling timer", async () => {
  jest.useFakeTimers();
  bookingService.getSeatsByShow.mockResolvedValue(seats);
  const onSeatsSelected = jest.fn();
  const { unmount } = render(
    <SeatMap showId="show-1" onSeatsSelected={onSeatsSelected} onAvailabilityChange={jest.fn()} />,
  );
  expect(await screen.findByRole("button", { name: /A1/ })).toBeEnabled();
  expect(screen.getByRole("button", { name: /A2/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: /A3/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /A1/ }));
  expect(onSeatsSelected).toHaveBeenCalledWith([seats[0]]);
  unmount();
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});

test("seat map exposes empty and retry states", async () => {
  bookingService.getSeatsByShow.mockResolvedValueOnce([]);
  const { rerender } = render(<SeatMap showId="show-1" onSeatsSelected={jest.fn()} />);
  expect(await screen.findByText(/chưa có ghế/i)).toBeInTheDocument();
  bookingService.getSeatsByShow.mockRejectedValueOnce(new Error("network"));
  rerender(<SeatMap showId="show-2" onSeatsSelected={jest.fn()} />);
  expect(await screen.findByRole("alert")).toBeInTheDocument();
});
