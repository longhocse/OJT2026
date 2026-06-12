import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import api from "../services/api";

const MyBookingsPage = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchBookings();
  }, [isAuthenticated, navigate]);

  const fetchBookings = async () => {
    try {
      const res = await api.get(`/bookings/user/${user.id}`);
      setBookings(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancellingId(bookingId);
    try {
      await api.put(`/bookings/${bookingId}/cancel`);
      await fetchBookings();
    } catch (error) {
      alert(error.response?.data?.message || "Cancellation failed");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">My Bookings</h1>
      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-on-surface-variant mb-4">You haven't made any bookings yet.</p>
          <button
            onClick={() => navigate("/movies")}
            className="px-6 py-2 bg-primary text-white rounded-lg"
          >
            Browse Movies
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const showTime = new Date(booking.show.start_time);
            const isUpcoming = showTime > new Date();
            const canCancel = isUpcoming && booking.status === "confirmed";

            return (
              <div
                key={booking.id}
                className="bg-surface-container rounded-xl p-6 flex flex-col md:flex-row gap-6"
              >
                <img
                  src={booking.show.movie?.poster_url || "/placeholder.jpg"}
                  alt={booking.show.movie?.title}
                  className="w-32 h-40 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{booking.show.movie?.title}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-on-surface-variant">Date & Time</p>
                      <p>{format(showTime, "PPP p")}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant">Theater</p>
                      <p>{booking.show.screen?.theater?.name}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant">Seats</p>
                      <p>
                        {booking.bookingSeats
                          ?.map((bs) => `${bs.seat.row}${bs.seat.number}`)
                          .join(", ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant">Total</p>
                      <p className="font-semibold text-primary">
                        {booking.total_price?.toLocaleString()} VND
                      </p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant">Status</p>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${booking.status === "confirmed"
                            ? "bg-green-500/20 text-green-500"
                            : booking.status === "cancelled"
                              ? "bg-red-500/20 text-red-500"
                              : "bg-yellow-500/20 text-yellow-500"
                          }`}
                      >
                        {booking.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 justify-center">
                  {canCancel && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="px-4 py-2 border border-error text-error rounded-lg hover:bg-error/10 disabled:opacity-50"
                    >
                      {cancellingId === booking.id ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/booking/${booking.show.id}`)}
                    className="px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30"
                  >
                    Book Again
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;