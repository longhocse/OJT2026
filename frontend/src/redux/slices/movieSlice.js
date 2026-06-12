import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  nowShowing: [],
  upcoming: [],
  selectedMovie: null,
  loading: false,
};

const movieSlice = createSlice({
  name: "movies",
  initialState,
  reducers: {
    setNowShowing: (state, action) => {
      state.nowShowing = action.payload;
    },
    setUpcoming: (state, action) => {
      state.upcoming = action.payload;
    },
    setSelectedMovie: (state, action) => {
      state.selectedMovie = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setNowShowing, setUpcoming, setSelectedMovie, setLoading } = movieSlice.actions;
export default movieSlice.reducer;