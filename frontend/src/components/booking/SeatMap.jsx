import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MAX_BOOKING_SEATS } from "../../booking/bookingContract";
import { bookingService } from "../../services/bookingService";

const SeatMap = ({
  showId,
  selectedSeats = [],
  onSeatsSelected,
  onAvailabilityChange,
  refreshKey = 0,
  maxSeats = MAX_BOOKING_SEATS,
}) => {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectionError, setSelectionError] = useState("");

  const fetchSeats = useCallback(async () => {
    try {
      setError("");
      const data = await bookingService.getSeatsByShow(showId);
      const nextSeats = Array.isArray(data) ? data : [];
      setSeats(nextSeats);
      onAvailabilityChange?.(nextSeats.filter((seat) => seat.status === "available").length);
    } catch {
      setError("Không thể tải sơ đồ ghế. Vui lòng thử lại.");
      onAvailabilityChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [onAvailabilityChange, showId]);

  useEffect(() => {
    fetchSeats();
    const interval = setInterval(fetchSeats, 30000);
    return () => clearInterval(interval);
  }, [fetchSeats, refreshKey]);

  const selectedIds = useMemo(
    () => new Set(selectedSeats.map((seat) => String(seat.id).toLowerCase())),
    [selectedSeats],
  );

  const handleSeatClick = (seat) => {
    const seatId = String(seat.id).toLowerCase();
    const isSelected = selectedIds.has(seatId);
    if (
      !isSelected &&
      (seat.status === "occupied" || seat.status === "locked" || seat.status === "disabled")
    )
      return;

    if (isSelected) {
      setSelectionError("");
      onSeatsSelected(selectedSeats.filter((item) => String(item.id).toLowerCase() !== seatId));
      return;
    }

    if (selectedSeats.length >= maxSeats) {
      setSelectionError(`Chỉ được chọn tối đa ${maxSeats} ghế.`);
      return;
    }

    setSelectionError("");
    onSeatsSelected([...selectedSeats, seat]);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12" role="status" aria-label="Đang tải sơ đồ ghế">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="py-10 text-center">
        <p className="text-error">{error}</p>
        <button
          type="button"
          onClick={fetchSeats}
          className="mt-4 rounded-lg bg-primary px-5 py-2 text-white"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (seats.length === 0) {
    return (
      <div role="status" className="py-12 text-center text-on-surface-variant">
        Suất chiếu này chưa có ghế khả dụng. Bạn không thể tiếp tục checkout.
      </div>
    );
  }

  const seatsByRow = seats.reduce((rows, seat) => {
    const row = seat.row || "?";
    if (!rows[row]) rows[row] = [];
    rows[row].push(seat);
    return rows;
  }, {});

  const seatColor = (seat) => {
    if (selectedIds.has(String(seat.id).toLowerCase())) return "bg-primary";
    if (seat.status === "occupied") return "bg-gray-600 cursor-not-allowed";
    if (seat.status === "locked") return "bg-yellow-600 cursor-not-allowed";
    if (seat.status === "disabled") return "bg-gray-800 cursor-not-allowed opacity-40";
    if (seat.type === "vip") return "bg-secondary";
    if (seat.type === "couple") return "bg-purple-600";
    return "bg-surface-container-high";
  };

  return (
    <div className="w-full overflow-x-auto">
      {selectionError && (
        <p role="alert" className="mb-4 text-center text-error">
          {selectionError}
        </p>
      )}
      <div className="min-w-[600px]">
        <div className="relative mb-12">
          <div className="mx-auto h-3 w-full max-w-md rounded-t-full bg-primary/30" />
          <p className="mt-2 text-center text-sm uppercase tracking-wider text-on-surface-variant">
            Màn hình
          </p>
        </div>

        <div className="space-y-3">
          {Object.keys(seatsByRow)
            .sort()
            .map((row) => (
              <div key={row} className="flex items-center justify-center gap-2">
                <span className="w-8 text-sm font-bold text-on-surface-variant">{row}</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {seatsByRow[row]
                    .sort((a, b) => Number(a.number) - Number(b.number))
                    .map((seat) => {
                      const selected = selectedIds.has(String(seat.id).toLowerCase());
                      const unavailable =
                        !selected &&
                        (seat.status === "occupied" ||
                          seat.status === "locked" ||
                          seat.status === "disabled");
                      return (
                        <motion.button
                          key={seat.id}
                          type="button"
                          whileHover={unavailable ? undefined : { scale: 1.1 }}
                          whileTap={unavailable ? undefined : { scale: 0.95 }}
                          onClick={() => handleSeatClick(seat)}
                          disabled={unavailable}
                          aria-pressed={selected}
                          aria-label={`Ghế ${row}${seat.number}`}
                          className={`flex h-10 w-10 items-center justify-center rounded-t-lg text-xs font-medium shadow-md transition-all duration-200 ${seatColor(seat)} ${unavailable ? "opacity-50" : "cursor-pointer hover:shadow-lg"}`}
                        >
                          {seat.number}
                        </motion.button>
                      );
                    })}
                </div>
                <span className="w-8 text-sm font-bold text-on-surface-variant">{row}</span>
              </div>
            ))}
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-6 border-t border-white/10 pt-6 text-sm">
          <Legend color="bg-surface-container-high" label="Còn trống" />
          <Legend color="bg-primary" label="Đã chọn" />
          <Legend color="bg-gray-600" label="Đã đặt" />
          <Legend color="bg-yellow-600" label="Đang được giữ" />
          <Legend color="bg-gray-800 opacity-40" label="Tạm khóa" />
          <Legend color="bg-secondary" label="VIP" />
          <Legend color="bg-purple-600" label="Ghế đôi" />
        </div>
      </div>
    </div>
  );
};

const Legend = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className={`h-6 w-6 rounded-t ${color}`} />
    <span>{label}</span>
  </div>
);

export default SeatMap;
