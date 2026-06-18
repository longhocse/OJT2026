import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "../../services/api";

const SeatMap = ({ showId, onSeatsSelected, maxSeats = 8 }) => {
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSeats, 30000);
    return () => clearInterval(interval);
  }, [showId]);

  const fetchSeats = async () => {
    try {
      const res = await api.get(`/shows/${showId}/seats`);
      setSeats(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch seats", error);
      setLoading(false);
    }
  };

  const handleSeatClick = (seat) => {
    if (seat.status === "occupied" || seat.status === "locked") return;
    const isSelected = selectedSeats.find((s) => s.id === seat.id);
    if (isSelected) {
      const newSelected = selectedSeats.filter((s) => s.id !== seat.id);
      setSelectedSeats(newSelected);
      onSeatsSelected?.(newSelected);
    } else {
      if (selectedSeats.length >= maxSeats) {
        alert(`You can only select up to ${maxSeats} seats`);
        return;
      }
      const newSelected = [...selectedSeats, seat];
      setSelectedSeats(newSelected);
      onSeatsSelected?.(newSelected);
    }
  };

  const getSeatColor = (seat) => {
    if (selectedSeats.find((s) => s.id === seat.id)) return "bg-primary";
    if (seat.status === "occupied") return "bg-gray-600 cursor-not-allowed";
    if (seat.status === "locked") return "bg-yellow-600 cursor-not-allowed";
    if (seat.type === "vip") return "bg-secondary";
    if (seat.type === "couple") return "bg-purple-600";
    return "bg-surface-container-high";
  };

  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {});

  const rows = Object.keys(seatsByRow).sort();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Screen */}
        <div className="relative mb-12">
          <div className="w-full h-3 bg-primary/30 rounded-t-full mx-auto max-w-md"></div>
          <p className="text-center text-sm text-on-surface-variant mt-2 uppercase tracking-wider">
            SCREEN
          </p>
        </div>

        {/* Seats Grid */}
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row} className="flex justify-center items-center gap-2">
              <span className="w-8 text-sm font-bold text-on-surface-variant">
                {row}
              </span>
              <div className="flex gap-2 flex-wrap justify-center">
                {seatsByRow[row]
                  .sort((a, b) => a.number - b.number)
                  .map((seat) => (
                    <motion.button
                      key={seat.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSeatClick(seat)}
                      disabled={seat.status === "occupied" || seat.status === "locked"}
                      className={`
                        w-10 h-10 rounded-t-lg flex items-center justify-center text-xs font-medium
                        transition-all duration-200 shadow-md
                        ${getSeatColor(seat)}
                        ${seat.status === "occupied" || seat.status === "locked"
                          ? "opacity-50"
                          : "hover:shadow-lg cursor-pointer"
                        }
                      `}
                    >
                      {seat.type === "couple" ? (
                        <span className="material-symbols-outlined text-sm">favorite</span>
                      ) : (
                        seat.number
                      )}
                    </motion.button>
                  ))}
              </div>
              <span className="w-8 text-sm font-bold text-on-surface-variant">
                {row}
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 mt-12 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-surface-container-high"></div>
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-primary"></div>
            <span className="text-sm">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-gray-600"></div>
            <span className="text-sm">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-yellow-600"></div>
            <span className="text-sm">Locked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-secondary"></div>
            <span className="text-sm">VIP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-t bg-purple-600"></div>
            <span className="text-sm">Couple</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatMap;