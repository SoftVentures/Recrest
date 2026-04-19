import type { Imprint, ImprintLoadResult } from "../types/legal.js";

export const IMPRINT_ENV_KEYS = {
  name: "VITE_IMPRINT_NAME",
  street: "VITE_IMPRINT_STREET",
  postalCode: "VITE_IMPRINT_POSTAL_CODE",
  city: "VITE_IMPRINT_CITY",
  country: "VITE_IMPRINT_COUNTRY",
  email: "VITE_IMPRINT_EMAIL",
  phone: "VITE_IMPRINT_PHONE",
  responsiblePerson: "VITE_IMPRINT_RESPONSIBLE_PERSON",
} as const satisfies Record<keyof Imprint, string>;

const REQUIRED_FIELDS = [
  "name",
  "street",
  "postalCode",
  "city",
  "country",
  "email",
] as const satisfies ReadonlyArray<keyof Imprint>;

export type EnvRecord = Record<string, string | undefined>;

export function loadImprint(env: EnvRecord): ImprintLoadResult {
  const read = (key: keyof typeof IMPRINT_ENV_KEYS): string | undefined => {
    const raw = env[IMPRINT_ENV_KEYS[key]];
    const trimmed = raw?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  };

  const values: Partial<Imprint> = {
    name: read("name"),
    street: read("street"),
    postalCode: read("postalCode"),
    city: read("city"),
    country: read("country"),
    email: read("email"),
    phone: read("phone"),
    responsiblePerson: read("responsiblePerson"),
  };

  const missing = REQUIRED_FIELDS.filter((field) => !values[field]).map(
    (field) => IMPRINT_ENV_KEYS[field],
  );

  if (missing.length > 0) {
    return { ok: false, error: { kind: "missing-fields", missing } };
  }

  return {
    ok: true,
    imprint: {
      name: values.name!,
      street: values.street!,
      postalCode: values.postalCode!,
      city: values.city!,
      country: values.country!,
      email: values.email!,
      ...(values.phone ? { phone: values.phone } : {}),
      ...(values.responsiblePerson ? { responsiblePerson: values.responsiblePerson } : {}),
    },
  };
}
