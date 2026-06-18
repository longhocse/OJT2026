import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const SuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { booking, show, seats, total } = location.state || {};
  const [countdown, setCountdown] = useState({ hours: 2, minutes: 30, seconds: 0 });

  useEffect(() => {
    if (!booking) {
      navigate("/");
    }
    // Simulate countdown to showtime
    if (show?.start_time) {
      const showTime = new Date(show.start_time);
      const updateCountdown = () => {
        const now = new Date();
        const diff = showTime - now;
        if (diff <= 0) {
          setCountdown({ hours: 0, minutes: 0, seconds: 0 });
          return;
        }
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (3600000)) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setCountdown({ hours, minutes, seconds });
      };
      updateCountdown();
      const timer = setInterval(updateCountdown, 1000);
      return () => clearInterval(timer);
    }
  }, [booking, show, navigate]);

  if (!booking) return null;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-surface-container rounded-2xl p-8 text-center"
      >
        <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-5xl text-secondary">check_circle</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Booking Successful!</h1>
        <p className="text-on-surface-variant mb-8">
          Your tickets have been confirmed. Check your email for details.
        </p>

        {/* Countdown */}
        <div className="bg-surface-container-high rounded-xl p-6 mb-8">
          <p className="text-sm uppercase tracking-wider text-on-surface-variant mb-2">
            Movie starts in
          </p>
          <p className="text-3xl font-mono font-bold text-primary">
            {String(countdown.hours).padStart(2, "0")}h {String(countdown.minutes).padStart(2, "0")}m{" "}
            {String(countdown.seconds).padStart(2, "0")}s
          </p>
        </div>

        {/* Ticket Details */}
        <div className="border-t border-white/10 pt-6 mb-8 text-left">
          <h3 className="font-semibold mb-4">Ticket Details</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-on-surface-variant">Movie:</span> {show?.movie?.title}
            </p>
            <p>
              <span className="text-on-surface-variant">Showtime:</span>{" "}
              {new Date(show?.start_time).toLocaleString()}
            </p>
            <p>
              <span className="text-on-surface-variant">Theater:</span> {show?.screen?.theater?.name}
            </p>
            <p>
              <span className="text-on-surface-variant">Seats:</span>{" "}
              {seats?.map((s) => `${s.row}${s.number}`).join(", ")}
            </p>
            <p>
              <span className="text-on-surface-variant">Total:</span>{" "}
              <span className="font-bold text-primary">{total?.toLocaleString()} VND</span>
            </p>
            <p>
              <span className="text-on-surface-variant">Booking ID:</span> {booking.bookingId}
            </p>
          </div>
        </div>

        {/* QR Code Placeholder */}
        <div className="flex justify-center mb-8">
          <div className="w-32 h-32 bg-white p-2 rounded-lg">
            <div className="w-full h-full bg-black flex items-center justify-center text-white text-xs">
              QR Code
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/my-bookings")}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
          >
            My Bookings
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 border border-white/20 rounded-lg font-semibold hover:bg-white/5"
          >
            Back to Home
          </button>
          <button
            onClick={() => alert("Share feature coming soon")}
            className="px-6 py-3 border border-white/20 rounded-lg font-semibold hover:bg-white/5"
          >
            Share
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SuccessPage;