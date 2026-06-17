import { createReducer } from "@reduxjs/toolkit";

import {
  clearProviderToken,
  loadProviders,
  saveProviderCredentials,
  setProviderBaseUrl,
  setProviderToken,
  upsertConnection,
} from "@/store/actions/providers.actions";
import type { ProvidersState } from "@/store/types/providers.types";

const initialState: ProvidersState = {
  connections: {},
  loading: false,
  error: null,
};

export const providersReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(upsertConnection, (state, action) => {
      state.connections[action.payload.providerId] = action.payload;
    })
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
    // saveProviderCredentials.fulfilled is the ONLY path that asserts a
    // provider is "really" connected — it implies a successful verify call.
    // The legacy `setProviderToken.fulfilled` path above is retained for
    // backwards compatibility (e.g. the dev stub bypass) but new UI must
    // route through saveProviderCredentials so `connected = true` is
    // backed by proof rather than just a successful keychain write.
    .addCase(saveProviderCredentials.fulfilled, (state, action) => {
      state.connections[action.payload.connection.providerId] = action.payload.connection;
    })
    .addCase(setProviderBaseUrl.fulfilled, (state, action) => {
      state.connections[action.payload.providerId] = action.payload;
    })
    .addCase(clearProviderToken.fulfilled, (state, action) => {
      delete state.connections[action.payload];
    });
});

export {
  clearProviderToken,
  loadProviders,
  saveProviderCredentials,
  setProviderBaseUrl,
  setProviderToken,
  upsertConnection,
  verifyProviderCredentials,
} from "@/store/actions/providers.actions";

export type { ProvidersState } from "@/store/types/providers.types";
