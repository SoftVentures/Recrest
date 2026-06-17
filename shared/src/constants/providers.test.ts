import { describe, expect, it } from "vitest";

import { PROVIDER_PAT_INFO } from "./providers.js";

describe("PROVIDER_PAT_INFO.gitlab.createUrl", () => {
  const scopes = ["read_api", "read_repository", "read_user"] as const;

  it("strips the /api/v4 suffix so the deep link targets the host root", () => {
    expect(PROVIDER_PAT_INFO.gitlab.createUrl("https://gitlab.com/api/v4", scopes)).toBe(
      "https://gitlab.com/-/user_settings/personal_access_tokens?name=Recrest&scopes=read_api,read_repository,read_user",
    );
  });

  it("strips a trailing slash on the API suffix", () => {
    expect(PROVIDER_PAT_INFO.gitlab.createUrl("https://gitlab.com/api/v4/", scopes)).toBe(
      "https://gitlab.com/-/user_settings/personal_access_tokens?name=Recrest&scopes=read_api,read_repository,read_user",
    );
  });

  it("accepts a bare host root unchanged", () => {
    expect(PROVIDER_PAT_INFO.gitlab.createUrl("https://gl.acme.test", scopes)).toBe(
      "https://gl.acme.test/-/user_settings/personal_access_tokens?name=Recrest&scopes=read_api,read_repository,read_user",
    );
  });

  it("falls back to gitlab.com on empty base", () => {
    expect(PROVIDER_PAT_INFO.gitlab.createUrl("", scopes)).toBe(
      "https://gitlab.com/-/user_settings/personal_access_tokens?name=Recrest&scopes=read_api,read_repository,read_user",
    );
  });
});
