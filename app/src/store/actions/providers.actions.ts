import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

import { type ProviderConnection, type ProviderId, TauriCommand } from "@recrest/shared";

import { invoke } from "@/lib/tauri";

export const upsertConnection = createAction<ProviderConnection>("providers/upsertConnection");

export const loadProviders = createAsyncThunk<ProviderConnection[]>("providers/list", async () =>
  invoke<ProviderConnection[]>(TauriCommand.LIST_PROVIDERS),
);

export const setProviderToken = createAsyncThunk<
  ProviderConnection,
  { providerId: ProviderId; token: string; username?: string | null }
>("providers/set-token", async (payload) =>
  invoke<ProviderConnection>(TauriCommand.SET_PROVIDER_TOKEN, payload),
);

export const clearProviderToken = createAsyncThunk<ProviderId, ProviderId>(
  "providers/clear-token",
  async (providerId) => {
    await invoke<void>(TauriCommand.CLEAR_PROVIDER_TOKEN, { providerId });
    return providerId;
  },
);

export const setProviderBaseUrl = createAsyncThunk<
  ProviderConnection,
  { providerId: ProviderId; baseUrl: string | null }
>("providers/set-base-url", async (payload) =>
  invoke<ProviderConnection>(TauriCommand.SET_PROVIDER_BASE_URL, payload),
);
