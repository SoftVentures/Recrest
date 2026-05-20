import { useEffect, useRef } from "react";

import { useTranslation } from "react-i18next";

import { type NotificationKind, type NotifyPayload, TauriCommand } from "@recrest/shared";

import { invoke } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

/** Upper bound per-kind, per-effect-pass transitions. Anything above and we
 *  coalesce into a single "N new merge requests" style burst notification
 *  so the user isn't spammed during initial remote refresh or after coming
 *  back from PTO. The 1–5 common case still fires per-item. */
const BURST_THRESHOLD = 5;

interface PrSnapshot {
  ci: string | null;
  mergeable: boolean | null;
  title: string;
  url: string;
  repoId: string;
  number: number;
  /** Plan 1 §A.2: Provider id of the parent repo, used to scope the
   *  assignee/reviewer match to the right provider so a username collision
   *  across providers (e.g. same login on GitHub and GitLab) doesn't
   *  spuriously trigger notifications. */
  providerId: string | null;
  /** Lowercased usernames assigned to the PR. */
  assignees: string[];
  /** Lowercased usernames whose review is requested. */
  requestedReviewers: string[];
}

/** Returns true when `me` is among the PR's assignees or requested
 *  reviewers (case-insensitive) — used by the notification trigger to gate
 *  emits. Returns false when `me` is unknown so we don't spam during the
 *  identity-loading window. */
export function isAssigneeOrReviewer(
  pr: Pick<PrSnapshot, "assignees" | "requestedReviewers">,
  me: string | null,
): boolean {
  if (!me) return false;
  const needle = me.toLowerCase();
  if (pr.assignees.includes(needle)) return true;
  if (pr.requestedReviewers.includes(needle)) return true;
  return false;
}

/** Map key → useRef-stored baseline of what we've already notified on. Exposed
 *  via {@link __resetNotificationBaselineForTests} for test / dev-preview
 *  harnesses that want to replay a fresh transition. */
interface InternalState {
  baselined: boolean;
  seen: Map<string, PrSnapshot>;
}

/** Stable empty providers fallback so `useAppSelector` doesn't return a new
 *  object every render when the providers slice is missing (tests). The
 *  identity is no longer used to detect the missing-slice case (we read a
 *  separate boolean for that — see below) but the constant still backs
 *  the `?? EMPTY_PROVIDERS` fallback to satisfy the hook's exhaustive deps
 *  without churning identity. */
const EMPTY_PROVIDERS: Record<string, never> = {};

const RESET_LISTENERS = new Set<() => void>();

/**
 * Test/dev-only helper — clears the in-memory baseline of every live
 * `useNotificationTriggers` caller so the next store update re-seeds from
 * scratch. Used by DevNotificationPreview to replay a transition on demand.
 * Not part of the public hook contract; do not call from production code.
 */
export function __resetNotificationBaselineForTests(): void {
  for (const reset of RESET_LISTENERS) reset();
}

/**
 * Watches the Redux PR cache and emits desktop notifications on meaningful
 * state transitions:
 *   - a new PR appears                                    → `new_pr`
 *   - a known PR's CI flips to failure                    → `ci_failed`
 *   - a known PR's `mergeable` flips null/false → true    → `merge_ready`
 *
 * Strings are pre-translated on the TS side and pushed through the Rust
 * `notify` command, which is the single source of truth for whether a
 * notification actually fires (gates on settings.notifications.*).
 *
 * `enabled` mirrors the other Tauri-aware hooks: pass `isTauri()` at the
 * call-site so the hook no-ops in plain-browser dev and in non-Tauri tests
 * that still mount AppShell.
 */
export function useNotificationTriggers(enabled: boolean): void {
  const items = useAppSelector((s) => s.prs.items);
  const details = useAppSelector((s) => s.prs.detail);
  const repos = useAppSelector((s) => s.repos.items);
  // Defensive selector for tests / preview harnesses that don't preload the
  // providers slice. Using a stable empty-object reference avoids the
  // "selector returned a different value" warning that comes with `?? {}`.
  const providers = useAppSelector((s) => s.providers?.connections) ?? EMPTY_PROVIDERS;
  // True when the providers slice is registered in the store. Tests that
  // mount AppShell without preloading the slice deliberately omit it; we
  // need that signal explicitly because `connections` is `{}` both when
  // the slice is missing AND when it's loaded with no remembered
  // connection — only the former should fall through to "trust ownership
  // unconditionally".
  const providersSliceLoaded = useAppSelector((s) => s.providers !== undefined);
  const { t } = useTranslation();

  // Only start emitting notifications once we've actually seen a non-empty
  // PR cache. The first render always has `items = {}`; snapshotting that
  // as the baseline means every PR that subsequently *loaded* from the
  // provider would fire a bogus "New merge request" toast on every boot.
  const stateRef = useRef<InternalState>({ baselined: false, seen: new Map() });

  // Register a reset hook so DevNotificationPreview / tests can re-seed the
  // baseline on demand. The effect owns the registration lifecycle.
  useEffect(() => {
    const reset = () => {
      stateRef.current = { baselined: false, seen: new Map() };
    };
    RESET_LISTENERS.add(reset);
    return () => {
      RESET_LISTENERS.delete(reset);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const next = new Map<string, PrSnapshot>();
    for (const [repoId, prs] of Object.entries(items)) {
      if (!prs) continue;
      const providerId = repos[repoId]?.providerId ?? null;
      for (const pr of prs) {
        const key = `${repoId}#${pr.number}`;
        const detail = details[key];
        next.set(key, {
          ci: pr.ciStatus,
          mergeable: detail?.mergeable ?? null,
          title: pr.title,
          url: pr.url,
          repoId,
          number: pr.number,
          providerId,
          assignees: (pr.assignees ?? []).map((u) => u.toLowerCase()),
          requestedReviewers: (pr.requestedReviewers ?? []).map((u) => u.toLowerCase()),
        });
      }
    }

    // Defer the baseline snapshot until the cache is actually populated.
    // An empty cache is the loading state, not a zero-PR steady state.
    if (!stateRef.current.baselined) {
      if (next.size === 0) return;
      stateRef.current = { baselined: true, seen: next };
      return;
    }

    const prev = stateRef.current.seen;
    const transitions: Record<NotificationKind, PrSnapshot[]> = {
      new_pr: [],
      ci_failed: [],
      merge_ready: [],
      generic: [],
    };

    // Plan 1 §A.2: only fire notifications for PRs the current user owns
    // (assignee or requested reviewer). Identity comes from the matching
    // provider's `username`. There are two distinct "no identity" cases:
    //
    //   (a) The providers slice is fully absent (test harness / preview).
    //       Fall through and notify like the pre-A.2 hook so existing
    //       tests don't have to seed identity. Detected via the explicit
    //       `providersSliceLoaded` selector — robust against the empty
    //       fallback object being recreated or reused elsewhere.
    //   (b) A connection exists but its `username` is null — the slice
    //       loaded but the `/user` call hasn't resolved yet. Per plan §A.2
    //       step 5, early-return *without* baselining so the next tick
    //       re-runs once identity arrives, instead of silently locking in
    //       the snapshot and then firing a wave of `new_pr` later.
    const providersUnknown = !providersSliceLoaded;
    if (!providersUnknown) {
      const seenProviders = new Set<string>();
      for (const snap of next.values()) {
        if (snap.providerId) seenProviders.add(snap.providerId);
      }
      // If any provider relevant to a PR in the snapshot has no username
      // yet, we don't know who "me" is — bail without baselining.
      for (const pid of seenProviders) {
        const conn = providers[pid as keyof typeof providers];
        if (!conn || !conn.username) {
          return;
        }
      }
    }

    const meFor = (providerId: string | null): string | null => {
      if (!providerId) return null;
      return providers[providerId as keyof typeof providers]?.username ?? null;
    };
    const ownsPr = (snap: PrSnapshot): boolean => {
      if (providersUnknown) return true; // case (a) — preserve old behaviour
      const me = meFor(snap.providerId);
      if (!me) return true; // shouldn't happen — early-return above caught this
      return isAssigneeOrReviewer(snap, me);
    };

    for (const [key, curr] of next) {
      const before = prev.get(key);
      const owned = ownsPr(curr);
      if (!before) {
        if (owned) transitions.new_pr.push(curr);
        continue;
      }
      if (owned && before.ci !== "failure" && curr.ci === "failure") {
        transitions.ci_failed.push(curr);
      }
      if (owned && before.mergeable !== true && curr.mergeable === true) {
        transitions.merge_ready.push(curr);
      }
    }

    const kinds: Exclude<NotificationKind, "generic">[] = ["new_pr", "ci_failed", "merge_ready"];
    for (const kind of kinds) {
      const list = transitions[kind];
      if (list.length === 0) continue;

      // Plan 1 §A.6: title resolution depends on provider for `ci_failed`.
      // For burst we don't have a single provider (the burst aggregates
      // across the whole tick) — use the `default` variant.
      const titleForKind = (providerId: string | null): string => {
        if (kind === "ci_failed") {
          return t(`notifications.ci_failed.${providerId ?? "default"}.title`, {
            defaultValue: t("notifications.ci_failed.default.title"),
          });
        }
        return t(`notifications.${kind}.title`);
      };

      if (list.length > BURST_THRESHOLD) {
        void emit({
          kind,
          title: titleForKind(null),
          body: t(`notifications.burst.${kind}`, { count: list.length }),
          url: null,
        });
        continue;
      }

      for (const snap of list) {
        const repo = repos[snap.repoId];
        const repoName = repo?.name ?? snap.repoId;
        // Plan 1 §A.6: terminology depends on provider — GitHub calls them
        // "Checks", GitLab/Bitbucket "Pipelines". The `default` variant is
        // the safety-net for unknown / null providers and for kinds other
        // than `ci_failed` (which keep their existing flat key).
        const providerId = repo?.providerId ?? null;
        const title = titleForKind(providerId);
        const body =
          kind === "ci_failed"
            ? t(`notifications.ci_failed.${providerId ?? "default"}.body`, {
                defaultValue: t("notifications.ci_failed.default.body", {
                  repo: repoName,
                  number: snap.number,
                  pr_title: snap.title,
                }),
                repo: repoName,
                number: snap.number,
                pr_title: snap.title,
              })
            : t(`notifications.${kind}.body`, {
                repo: repoName,
                number: snap.number,
                pr_title: snap.title,
              });
        void emit({ kind, title, body, url: snap.url });
      }
    }

    stateRef.current = { baselined: true, seen: next };
  }, [enabled, items, details, repos, providers, providersSliceLoaded, t]);
}

async function emit(payload: NotifyPayload): Promise<void> {
  try {
    await invoke<void>(TauriCommand.NOTIFY, {
      kind: payload.kind,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
    });
  } catch (err) {
    console.warn("[tauri] notify invoke failed:", err);
  }
}
