import { describe, expect, it } from "vitest";

import { mockRepos } from "./mockRepos";

describe("mockRepos", () => {
  it("renders five rows — the design matches the hero screenshot", () => {
    expect(mockRepos).toHaveLength(5);
  });

  it("every row has a non-empty CI strip", () => {
    for (const repo of mockRepos) {
      expect(repo.ci.length).toBeGreaterThan(0);
    }
  });

  it("every row has at least one badge", () => {
    for (const repo of mockRepos) {
      expect(repo.badges.length).toBeGreaterThan(0);
    }
  });
});
