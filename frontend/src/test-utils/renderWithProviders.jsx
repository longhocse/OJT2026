import React from "react";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { persistReducer, persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import authReducer from "../redux/slices/authSlice";
import bookingReducer from "../redux/slices/bookingSlice";
import movieReducer from "../redux/slices/movieSlice";

export const createMemoryStorage = () => {
  let values = {};
  return {
    getItem: (key) => Promise.resolve(values[key] ?? null),
    setItem: (key, value) => {
      values[key] = value;
      return Promise.resolve(value);
    },
    removeItem: (key) => {
      delete values[key];
      return Promise.resolve();
    },
    snapshot: () => ({ ...values }),
  };
};

export const createTestStore = ({ preloadedState, storage = createMemoryStorage() } = {}) => {
  const reducer = combineReducers({
    auth: authReducer,
    booking: bookingReducer,
    movies: movieReducer,
  });
  const persistedReducer = persistReducer({ key: "test", storage, whitelist: ["auth"] }, reducer);
  const store = configureStore({
    reducer: persistedReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
  return { store, persistor: persistStore(store), storage };
};

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

export const renderWithProviders = (
  ui,
  {
    route = "/",
    preloadedState,
    storeBundle = createTestStore({ preloadedState }),
    queryClient = createTestQueryClient(),
    includeRouter = true,
    includePersistGate = true,
  } = {},
) => {
  const content = includeRouter ? <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter> : ui;
  const gated = includePersistGate ? (
    <PersistGate
      loading={<div role="status">Restoring test state</div>}
      persistor={storeBundle.persistor}
    >
      {content}
    </PersistGate>
  ) : (
    content
  );
  const result = render(
    <Provider store={storeBundle.store}>
      <QueryClientProvider client={queryClient}>{gated}</QueryClientProvider>
    </Provider>,
  );

  return {
    ...result,
    store: storeBundle.store,
    persistor: storeBundle.persistor,
    storage: storeBundle.storage,
    queryClient,
  };
};
