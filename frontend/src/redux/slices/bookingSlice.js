import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedSeats: [],
  showDetails: null,
  checkoutSession: null,
  bookingInfo: null,
};

const bookingSlice = createSlice({
  name: "booking",
  initialState,
  reducers: {
    setSelectedSeats: (state, action) => {
      state.selectedSeats = action.payload;
    },
    setShowDetails: (state, action) => {
      state.showDetails = action.payload;
    },
    setCheckoutSession: (state, action) => {
      state.checkoutSession = action.payload;
    },
    setBookingInfo: (state, action) => {
      state.bookingInfo = action.payload;
    },
    clearBooking: () => initialState,
  },
});

export const {
  setSelectedSeats,
  setShowDetails,
  setCheckoutSession,
  setBookingInfo,
  clearBooking,
} = bookingSlice.actions;
export default bookingSlice.reducer;
