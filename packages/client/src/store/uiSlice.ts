/**
 * @fileoverview UI slice managing client-only UI state such as theme, sidebar, and toasts.
 * Server state lives in TanStack Query per Agent guidelines.
 */
import { createSlice } from "@reduxjs/toolkit";

export type ThemePreference = "light" | "dark" | "system";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
}

export interface UIState {
  theme: ThemePreference;
  isSidebarOpen: boolean;
  toasts: Toast[];
}

const initialState: UIState = {
  theme: "system",
  isSidebarOpen: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    /** Set preferred color theme */
    setTheme(state, action: { payload: ThemePreference }) {
      state.theme = action.payload;
    },
    /** Toggle sidebar open/close */
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    /** Open sidebar */
    openSidebar(state) {
      state.isSidebarOpen = true;
    },
    /** Close sidebar */
    closeSidebar(state) {
      state.isSidebarOpen = false;
    },
    /** Add a toast (caller must provide unique id) */
    addToast(state, action: { payload: Toast }) {
      state.toasts.push(action.payload);
    },
    /** Remove a toast by id */
    removeToast(state, action: { payload: { id: string } }) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload.id);
    },
    /** Clear all toasts */
    clearToasts(state) {
      state.toasts = [];
    },
  },
});

export const {
  setTheme,
  toggleSidebar,
  openSidebar,
  closeSidebar,
  addToast,
  removeToast,
  clearToasts,
} = uiSlice.actions;

export default uiSlice.reducer;


