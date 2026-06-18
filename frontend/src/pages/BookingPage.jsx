import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import SeatMap from '../components/booking/SeatMap';
import api from '../services/api';
import { motion } from 'framer-motion';

const BookingPage = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [show, setShow] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lockTimer, setLockTimer] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/booking/${showId}` } });
      return;
    }
    fetchShowDetails();
  }, [showId, isAuthenticated]);

  const fetchShowDetails = async () => {
    try {
      const res = await api.get(`/shows/${showId}`);
      setShow(res.data);
    } catch (error) {
      console.error(error);
      navigate('/movies');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatsSelected = async (seats) => {
    setSelectedSeats(seats);
    // Lock seats when selected
    if (seats.length > 0) {
      try {
        await api.post('/bookings/seats/lock', {
          showId,
          seatIds: seats.map(s => s.id),
          duration: 600
        });
        // Set timer to auto-unlock after 10 minutes
        if (lockTimer) clearTimeout(lockTimer);
        const timer = setTimeout(() => {
          alert('Your seat selection has expired. Please select again.');
          setSelectedSeats([]);
        }, 10 * 60 * 1000);
        setLockTimer(timer);
      } catch (error) {
        console.error('Failed to lock seats', error);
      }
    } else {
      // Unlock seats when deselected
      if (lockTimer) {
        clearTimeout(lockTimer);
        setLockTimer(null);
      }
    }
  };

  const calculateTotal = () => {
    if (!show) return 0;
    const basePrice = parseFloat(show.price);
    return selectedSeats.reduce((total, seat) => {
      let price = basePrice;
      if (seat.type === 'vip') price *= 1.5;
      if (seat.type === 'couple') price *= 1.8;
      return total + price;
    }, 0);
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat');
      return;
    }
    navigate('/checkout', {
      state: {
        selectedSeats,
        show,
        totalAmount: calculateTotal()
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">{show.movie?.title}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-on-surface-variant">
            <span>{new Date(show.start_time).toLocaleDateString()}</span>
            <span>•</span>
            <span>{new Date(show.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>•</span>
            <span>{show.screen?.theater?.name}</span>
            <span>•</span>
            <span>Screen: {show.screen?.name}</span>
          </div>
        </div>

        {/* Seat Map */}
        <div className="bg-surface-container rounded-xl p-6 mb-8 overflow-x-auto">
          <SeatMap showId={showId} onSeatsSelected={handleSeatsSelected} maxSeats={8} />
        </div>

        {/* Sticky Footer */}
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-surface-container-high border-t border-white/10 p-4 z-40"
        >
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm text-on-surface-variant">Selected Seats</p>
              <p className="font-semibold">
                {selectedSeats.length === 0
                  ? 'None'
                  : selectedSeats.map(s => `${s.row}${s.number}`).join(', ')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-on-surface-variant">Total</p>
              <p className="text-2xl font-bold text-primary">
                {calculateTotal().toLocaleString()} VND
              </p>
            </div>
            <button
              onClick={handleContinue}
              disabled={selectedSeats.length === 0}
              className="px-8 py-3 bg-primary text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              Continue to Checkout
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BookingPage;