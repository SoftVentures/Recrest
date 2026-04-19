export interface Imprint {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone?: string;
  responsiblePerson?: string;
}

export interface ImprintLoadError {
  kind: "missing-fields";
  missing: string[];
}

export type ImprintLoadResult =
  | { ok: true; imprint: Imprint }
  | { ok: false; error: ImprintLoadError };
