import { createSlice } from "@reduxjs/toolkit";

export const initialAuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  verificationStatus: "idle",
};

const clearSession = (state) => {
  state.user = null;
  state.token = null;
  state.isAuthenticated = false;
  state.verificationStatus = "anonymous";
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialAuthState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.verificationStatus = "authenticated";
    },
    startSessionVerification: (state) => {
      state.verificationStatus = "verifying";
    },
    sessionVerified: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.verificationStatus = "authenticated";
    },
    sessionVerificationFailed: (state) => {
      state.verificationStatus = state.token ? "authenticated" : "idle";
      state.isAuthenticated = Boolean(state.token);
    },
    logout: clearSession,
  },
});

export const {
  setCredentials,
  startSessionVerification,
  sessionVerified,
  sessionVerificationFailed,
  logout,
} = authSlice.actions;
export default authSlice.reducer;
