/**
 * @fileoverview Redux store configuration for client-only UI state.
 * Keep server data in TanStack Query; use Redux for UI preferences and ephemeral UI state.
 */
import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./uiSlice";
import authReducer from "./authSlice";
import categoriesReducer from "./categorySlice";
import transactionsReducer from "./transactionSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    categories: categoriesReducer,
    transactions: transactionsReducer,
  },
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


