import type { CiStatus, PrState } from "../types/pr.js";

/** All pull-request states supported by the provider abstraction. Frozen
 *  list backing both type-narrowing and UI dropdowns. */
export const PR_STATES = ["open", "closed", "merged"] as const satisfies readonly PrState[];

/** All CI summary states emitted by the provider abstraction. `none` covers
 *  the "no checks reported" case (provider returned an empty set). */
export const CI_STATES = [
  "pending",
  "running",
  "success",
  "failure",
  "none",
] as const satisfies readonly CiStatus[];

export type PrStateName = (typeof PR_STATES)[number];
export type CiStateName = (typeof CI_STATES)[number];
