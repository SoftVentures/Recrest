import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import type { ProviderConnection, ProviderId } from "@recrest/shared";

import { invoke } from "@/lib/tauri";

export interface ProvidersState {
  connections: Partial<Record<ProviderId, ProviderConnection>>;
  loading: boolean;
  error: string | null;
}

const initialState: ProvidersState = {
  connections: {},
  loading: false,
  error: null,
};

export const loadProviders = createAsyncThunk<ProviderConnection[]>("providers/list", async () =>
  invoke<ProviderConnection[]>("list_providers"),
);

export const setProviderToken = createAsyncThunk<
  ProviderConnection,
  { providerId: ProviderId; token: string; username?: string | null }
>("providers/set-token", async (payload) =>
  invoke<ProviderConnection>("set_provider_token", payload),
);

export const clearProviderToken = createAsyncThunk<ProviderId, ProviderId>(
  "providers/clear-token",
  async (providerId) => {
    await invoke<void>("clear_provider_token", { providerId });
    return providerId;
  },
);

const providersSlice = createSlice({
  name: "providers",
  initialState,
  reducers: {
    upsertConnection(state, action: PayloadAction<ProviderConnection>) {
      state.connections[action.payload.providerId] = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProviders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProviders.fulfilled, (state, action) => {
        state.loading = false;
        state.connections = Object.fromEntries(action.payload.map((c) => [c.providerId, c]));
      })
      .addCase(loadProviders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "failed to load providers";
      })
      .addCase(setProviderToken.fulfilled, (state, action) => {
        state.connections[action.payload.providerId] = action.payload;
      })
      .addCase(clearProviderToken.fulfilled, (state, action) => {
        delete state.connections[action.payload];
      });
  },
});

export const { upsertConnection } = providersSlice.actions;
export const providersReducer = providersSlice.reducer;
