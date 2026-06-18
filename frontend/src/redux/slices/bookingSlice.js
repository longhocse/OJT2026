import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedSeats: [],
  showDetails: null,
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
    setBookingInfo: (state, action) => {
      state.bookingInfo = action.payload;
    },
    clearBooking: (state) => {
      state.selectedSeats = [];
      state.showDetails = null;
      state.bookingInfo = null;
    },
  },
});

export const { setSelectedSeats, setShowDetails, setBookingInfo, clearBooking } = bookingSlice.actions;
export default bookingSlice.reducer;