import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer, createTransform } from "redux-persist";
import storage from "redux-persist/lib/storage";
import authReducer from "./slices/authSlice";
import movieReducer from "./slices/movieSlice";
import bookingReducer from "./slices/bookingSlice";

const authTokenOnlyTransform = createTransform(
  (authState) => ({ token: authState.token }),
  (persistedAuthState) => ({ token: persistedAuthState?.token || null }),
  { whitelist: ["auth"] },
);

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"],
  transforms: [authTokenOnlyTransform],
};

const rootReducer = combineReducers({
  auth: authReducer,
  movies: movieReducer,
  booking: bookingReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(store);
