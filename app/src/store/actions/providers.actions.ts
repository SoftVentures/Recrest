import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

import {
  type ProviderConnection,
  type ProviderId,
  type ProviderVerifyError,
  TauriCommand,
  type VerifiedAccount,
} from "@recrest/shared";

import { invoke } from "@/lib/tauri";
import { normalizeProviderBaseUrl } from "@/lib/utils/url.utils";

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

export interface SaveProviderCredentialsInput {
  providerId: ProviderId;
  /** Optional self-hosted base URL override. Normalised via
   *  `normalizeProviderBaseUrl` before being sent to the backend. */
  baseUrl?: string | null;
  token: string;
  /** Required for Bitbucket basic auth, ignored elsewhere. */
  username?: string | null;
}

export interface SaveProviderCredentialsResult {
  connection: ProviderConnection;
  account: VerifiedAccount;
}

/**
 * Save a provider PAT only after `verify_credentials` proves it actually
 * authenticates. The flow is:
 *
 *   1. (Optional) persist the base URL override so the verify call below
 *      hits the right host.
 *   2. `verify_credentials` — throws a structured `ProviderVerifyError`
 *      on any auth / network / TLS / body-mismatch failure.
 *   3. Only on verify success: `set_provider_token` persists into the OS
 *      keychain (or dev-tokens file).
 *
 * Reject reasons are typed as `ProviderVerifyError` so the UI can render
 * a localized message via `errorMessage(err, t)`.
 */
export const saveProviderCredentials = createAsyncThunk<
  SaveProviderCredentialsResult,
  SaveProviderCredentialsInput,
  { rejectValue: ProviderVerifyError }
>("providers/save-credentials", async (input, thunkApi) => {
  const trimmedBaseUrl =
    typeof input.baseUrl === "string" && input.baseUrl.trim().length > 0
      ? normalizeProviderBaseUrl(input.baseUrl)
      : null;
  const username =
    input.username && input.username.trim().length > 0 ? input.username.trim() : null;

  // 1. Persist the base URL override first so the subsequent verify call
  // (which goes through the same registry) hits the right host. We use the
  // existing IPC instead of a second arg on verify so the persisted setting
  // and the verified host stay in lock-step on success.
  if (trimmedBaseUrl !== null) {
    try {
      await invoke<ProviderConnection>(TauriCommand.SET_PROVIDER_BASE_URL, {
        providerId: input.providerId,
        baseUrl: trimmedBaseUrl,
      });
    } catch (err) {
      // Persist failure isn't a verify failure — surface it as Unknown so
      // the UI can render *something*; the user can retry.
      return thunkApi.rejectWithValue({
        kind: "unknown",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2. Real authenticated probe. Rejects with `ProviderVerifyError`.
  let account: VerifiedAccount;
  try {
    account = await invoke<VerifiedAccount>(TauriCommand.VERIFY_CREDENTIALS, {
      provider: input.providerId,
      baseUrl: trimmedBaseUrl,
      token: input.token,
      username,
    });
  } catch (err) {
    // Tauri delivers backend errors as plain objects matching the serde
    // shape — `{ kind, ... }`. Pass through, falling back to Unknown for
    // anything that doesn't look like one of our variants.
    if (err && typeof err === "object" && "kind" in err) {
      return thunkApi.rejectWithValue(err as ProviderVerifyError);
    }
    return thunkApi.rejectWithValue({
      kind: "unknown",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Only persist the token after the verify call proves it's good.
  try {
    const connection = await invoke<ProviderConnection>(TauriCommand.SET_PROVIDER_TOKEN, {
      providerId: input.providerId,
      token: input.token,
      username,
    });
    return { connection, account };
  } catch (err) {
    return thunkApi.rejectWithValue({
      kind: "unknown",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * Run only the verify probe — no token persistence. Used by the "Verify
 * connection" button on the Provider-Card so the user can sanity-check a
 * URL/token combo without committing it.
 */
export const verifyProviderCredentials = createAsyncThunk<
  VerifiedAccount,
  SaveProviderCredentialsInput,
  { rejectValue: ProviderVerifyError }
>("providers/verify-credentials", async (input, thunkApi) => {
  const trimmedBaseUrl =
    typeof input.baseUrl === "string" && input.baseUrl.trim().length > 0
      ? normalizeProviderBaseUrl(input.baseUrl)
      : null;
  const username =
    input.username && input.username.trim().length > 0 ? input.username.trim() : null;
  try {
    const account = await invoke<VerifiedAccount>(TauriCommand.VERIFY_CREDENTIALS, {
      provider: input.providerId,
      baseUrl: trimmedBaseUrl,
      token: input.token,
      username,
    });
    return account;
  } catch (err) {
    if (err && typeof err === "object" && "kind" in err) {
      return thunkApi.rejectWithValue(err as ProviderVerifyError);
    }
    return thunkApi.rejectWithValue({
      kind: "unknown",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
