import { describe, expect, it } from "vitest";

import { IMPRINT_ENV_KEYS, loadImprint } from "./legal.js";

const fullEnv: Record<string, string | undefined> = {
  [IMPRINT_ENV_KEYS.name]: "SoftVentures UG",
  [IMPRINT_ENV_KEYS.street]: "Beispielstraße 1",
  [IMPRINT_ENV_KEYS.postalCode]: "10115",
  [IMPRINT_ENV_KEYS.city]: "Berlin",
  [IMPRINT_ENV_KEYS.country]: "Deutschland",
  [IMPRINT_ENV_KEYS.email]: "legal@example.com",
  [IMPRINT_ENV_KEYS.phone]: "+49 30 1234567",
  [IMPRINT_ENV_KEYS.responsiblePerson]: "Max Mustermann",
};

describe("loadImprint", () => {
  it("returns imprint when all required fields are present", () => {
    const result = loadImprint(fullEnv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.imprint.name).toBe("SoftVentures UG");
      expect(result.imprint.phone).toBe("+49 30 1234567");
      expect(result.imprint.responsiblePerson).toBe("Max Mustermann");
    }
  });

  it("omits optional fields when empty or whitespace", () => {
    const result = loadImprint({
      ...fullEnv,
      [IMPRINT_ENV_KEYS.phone]: "   ",
      [IMPRINT_ENV_KEYS.responsiblePerson]: undefined,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.imprint.phone).toBeUndefined();
      expect(result.imprint.responsiblePerson).toBeUndefined();
    }
  });

  it("reports all missing required fields", () => {
    const result = loadImprint({
      [IMPRINT_ENV_KEYS.name]: "Only name",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.missing).toEqual([
        IMPRINT_ENV_KEYS.street,
        IMPRINT_ENV_KEYS.postalCode,
        IMPRINT_ENV_KEYS.city,
        IMPRINT_ENV_KEYS.country,
        IMPRINT_ENV_KEYS.email,
      ]);
    }
  });

  it("treats whitespace-only required fields as missing", () => {
    const result = loadImprint({
      ...fullEnv,
      [IMPRINT_ENV_KEYS.email]: "   ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.missing).toContain(IMPRINT_ENV_KEYS.email);
    }
  });

  it("trims surrounding whitespace from values", () => {
    const result = loadImprint({
      ...fullEnv,
      [IMPRINT_ENV_KEYS.city]: "  Berlin  ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.imprint.city).toBe("Berlin");
    }
  });
});
