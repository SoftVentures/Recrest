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
}

/** Map key → useRef-stored baseline of what we've already notified on. Exposed
 *  via {@link __resetNotificationBaselineForTests} for test / dev-preview
 *  harnesses that want to replay a fresh transition. */
interface InternalState {
  baselined: boolean;
  seen: Map<string, PrSnapshot>;
}

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

    for (const [key, curr] of next) {
      const before = prev.get(key);
      if (!before) {
        transitions.new_pr.push(curr);
        continue;
      }
      if (before.ci !== "failure" && curr.ci === "failure") {
        transitions.ci_failed.push(curr);
      }
      if (before.mergeable !== true && curr.mergeable === true) {
        transitions.merge_ready.push(curr);
      }
    }

    const kinds: Exclude<NotificationKind, "generic">[] = ["new_pr", "ci_failed", "merge_ready"];
    for (const kind of kinds) {
      const list = transitions[kind];
      if (list.length === 0) continue;

      if (list.length > BURST_THRESHOLD) {
        void emit({
          kind,
          title: t(`notifications.${kind}.title`),
          body: t(`notifications.burst.${kind}`, { count: list.length }),
          url: null,
        });
        continue;
      }

      for (const snap of list) {
        const repoName = repos[snap.repoId]?.name ?? snap.repoId;
        void emit({
          kind,
          title: t(`notifications.${kind}.title`),
          body: t(`notifications.${kind}.body`, {
            repo: repoName,
            number: snap.number,
            pr_title: snap.title,
          }),
          url: snap.url,
        });
      }
    }

    stateRef.current = { baselined: true, seen: next };
  }, [enabled, items, details, repos, t]);
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
