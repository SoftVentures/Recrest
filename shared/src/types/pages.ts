// Plan 03/04 C.6 — Pages / deploy status. `null` from the IPC layer means the
// provider has no Pages configured (or doesn't support the concept at all);
// the UI hides the Deployments block in that case.

export interface PagesStatus {
  url: string | null;
  /** `building` | `built` | `errored` | `disabled`. */
  status: string;
  lastDeployedAt: string | null; // ISO-8601
  customDomain: string | null;
}
