import type { ProviderConnection } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import {
  clearProviderToken,
  loadProviders,
  setProviderBaseUrl,
  setProviderToken,
  upsertConnection,
} from "@/store/actions/providers.actions";
import { providersReducer } from "@/store/reducers/providersReducer";
import type { ProvidersState } from "@/store/types/providers.types";

const initial = (): ProvidersState => providersReducer(undefined, { type: "@@INIT" });

function connection(overrides: Partial<ProviderConnection> = {}): ProviderConnection {
  return {
    providerId: overrides.providerId ?? "github",
    displayName: overrides.displayName ?? "GitHub",
    connected: overrides.connected ?? true,
    username: overrides.username ?? "octocat",
    supportsOauth: overrides.supportsOauth ?? false,
    baseUrl: overrides.baseUrl ?? "https://api.github.com",
  };
}

describe("providersReducer", () => {
  it("upserts a connection keyed by provider id", () => {
    const conn = connection({ providerId: "gitlab", displayName: "GitLab" });
    const next = providersReducer(initial(), upsertConnection(conn));
    expect(next.connections["gitlab"]).toEqual(conn);
  });

  it("sets loading on loadProviders.pending", () => {
    const next = providersReducer(initial(), loadProviders.pending("internal-id", undefined));
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it("replaces the connection map on loadProviders.fulfilled", () => {
    const list = [
      connection({ providerId: "github" }),
      connection({ providerId: "bitbucket", displayName: "Bitbucket" }),
    ];
    const next = providersReducer(
      initial(),
      loadProviders.fulfilled(list, "internal-id", undefined),
    );
    expect(next.loading).toBe(false);
    expect(Object.keys(next.connections).sort()).toEqual(["bitbucket", "github"]);
  });

  it("records the error on loadProviders.rejected", () => {
    const next = providersReducer(
      initial(),
      loadProviders.rejected(new Error("boom"), "internal-id", undefined),
    );
    expect(next.loading).toBe(false);
    expect(next.error).toBe("boom");
  });

  it("stores the returned connection on setProviderToken.fulfilled", () => {
    const conn = connection({ providerId: "github", connected: true });
    const next = providersReducer(
      initial(),
      setProviderToken.fulfilled(conn, "internal-id", { providerId: "github", token: "t" }),
    );
    expect(next.connections["github"]).toEqual(conn);
  });

  it("stores the returned connection on setProviderBaseUrl.fulfilled", () => {
    const conn = connection({ providerId: "gitlab", baseUrl: "https://gl.example.com" });
    const next = providersReducer(
      initial(),
      setProviderBaseUrl.fulfilled(conn, "internal-id", {
        providerId: "gitlab",
        baseUrl: "https://gl.example.com",
      }),
    );
    expect(next.connections["gitlab"]?.baseUrl).toBe("https://gl.example.com");
  });

  it("removes a connection on clearProviderToken.fulfilled", () => {
    const seeded = providersReducer(
      initial(),
      upsertConnection(connection({ providerId: "github" })),
    );
    const next = providersReducer(
      seeded,
      clearProviderToken.fulfilled("github", "internal-id", "github"),
    );
    expect(next.connections["github"]).toBeUndefined();
  });
});
