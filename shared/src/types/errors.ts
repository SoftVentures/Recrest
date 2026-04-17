/**
 * Shape returned by the Rust `CommandError::serialize` impl. Stable across
 * the IPC boundary — the frontend maps `kind` to an i18n key.
 */
export interface CommandErrorDto {
  kind: ErrorKind;
  message: string;
}

export type ErrorKind =
  | "not_found"
  | "bad_request"
  | "unauthorized"
  | "io"
  | "git"
  | "serialize"
  | "http"
  | "keyring"
  | "internal";

export const ERROR_KINDS: ErrorKind[] = [
  "not_found",
  "bad_request",
  "unauthorized",
  "io",
  "git",
  "serialize",
  "http",
  "keyring",
  "internal",
];

export function isCommandError(value: unknown): value is CommandErrorDto {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "message" in value &&
    typeof (value as { kind: unknown }).kind === "string"
  );
}

/**
 * Returns the i18n key for a thrown IPC error (`errors.<kind>`), falling back
 * to `errors.unknown` when the error shape is unexpected.
 */
export function errorKey(err: unknown): string {
  if (isCommandError(err)) return `errors.${err.kind}`;
  return "errors.unknown";
}
