import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

export type ActiveView = "repos" | "prs" | "settings";

export interface UiState {
  sidebarCollapsed: boolean;
  searchOpen: boolean;
  activeView: ActiveView;
  selectedRepoId: string | null;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  searchOpen: false,
  activeView: "repos",
  selectedRepoId: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    setSearchOpen(state, action: PayloadAction<boolean>) {
      state.searchOpen = action.payload;
    },
    setActiveView(state, action: PayloadAction<ActiveView>) {
      state.activeView = action.payload;
    },
    setSelectedRepo(state, action: PayloadAction<string | null>) {
      state.selectedRepoId = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarCollapsed, setSearchOpen, setActiveView, setSelectedRepo } =
  uiSlice.actions;
export const uiReducer = uiSlice.reducer;
