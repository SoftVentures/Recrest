import { type ReactNode, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import {
  POLLING_INTERVAL_DEFAULT_MS,
  type PullRequest,
  type Repository,
  StorageKey,
  TauriCommand,
} from "@recrest/shared";

import { Switch } from "@/components/atoms/Switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/molecules/compounds/AlertDialog";
import { __resetNotificationBaselineForTests } from "@/hooks/useNotificationTriggers";
import i18n, { clearMissingI18nKeys, getMissingI18nKeys } from "@/i18n";
import {
  getTauriRuntimeVersion,
  revealPathInSystem,
  safeInvoke,
  toggleWebviewDevtools,
} from "@/lib/tauri";
import { systemService } from "@/lib/tauri/services";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearProviderToken } from "@/store/slices/providersSlice";
import { setPrs } from "@/store/slices/prsSlice";
import { upsertRepo } from "@/store/slices/reposSlice";
import { scanForRepos } from "@/store/slices/reposSlice";
import { saveSettings } from "@/store/slices/settingsSlice";
import {
  resetDevFlags,
  setDevFlag,
  setForceUpdaterFallback,
  setHighlightMissingI18n,
  setIpcTrace,
} from "@/store/slices/uiDevFlagsSlice";
import { setUpdaterBanner } from "@/store/slices/uiSlice";

interface DevPaths {
  configDir: string | null;
  dataDir: string | null;
  cacheDir: string | null;
  logDir: string | null;
  binaryDir: string | null;
  workspaceRoot: string | null;
}

/**
 * Debug-only "Developer" settings tab. Six sections (Build, Updater playground,
 * Storage & State, IPC, i18n, Feature flags) all gated behind
 * `import.meta.env.DEV` at the parent level. Tauri-side commands prefixed with
 * `dev:*` only exist in debug Rust builds — outside that, `safeInvoke` returns
 * null and sections gracefully fall back to "—".
 */
export function DeveloperTab() {
  return (
    <div className="flex flex-col gap-6" data-testid="developer-tab">
      <BuildSection />
      <UpdaterPlaygroundSection />
      <NotificationsPlaygroundSection />
      <StorageSection />
      <IpcSection />
      <I18nSection />
      <FeatureFlagsSection />
    </div>
  );
}

/* ------------------------------------------------------------------ Build */

function BuildSection() {
  const { t } = useTranslation("settings");
  const [debugAssertions, setDebugAssertions] = useState<boolean | null>(null);
  const [tauriVersion, setTauriVersion] = useState<string | null>(null);
  const [buildTriple, setBuildTriple] = useState<string | null>(null);
  const [paths, setPaths] = useState<DevPaths | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const platform = await systemService.getPlatformInfo();
      if (!cancelled) setDebugAssertions(platform?.debugAssertions ?? null);
      const v = await getTauriRuntimeVersion();
      if (!cancelled) setTauriVersion(v);
      const triple = await safeInvoke<string>(TauriCommand.GET_BUILD_TRIPLE);
      if (!cancelled) setBuildTriple(triple);
      const p = await safeInvoke<DevPaths>(TauriCommand.GET_DEV_PATHS);
      if (!cancelled) setPaths(p);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: Array<{ label: string; value: ReactNode; mono?: boolean; copyable?: string }> = [
    {
      label: t("developer.build.git_sha"),
      value: __GIT_SHA__,
      mono: true,
      copyable: __GIT_SHA__,
    },
    { label: t("developer.build.build_time"), value: __BUILD_TIME__, mono: true },
    { label: t("developer.build.mode"), value: import.meta.env.MODE, mono: true },
    {
      label: t("developer.build.debug_assertions"),
      value: debugAssertions === null ? "—" : debugAssertions ? "true" : "false",
      mono: true,
    },
    { label: t("developer.build.tauri_runtime"), value: tauriVersion ?? "—", mono: true },
    { label: t("developer.build.build_triple"), value: buildTriple ?? "—", mono: true },
    {
      label: t("developer.build.app_identifier"),
      value: "eu.softventures.recrest",
      mono: true,
      copyable: "eu.softventures.recrest",
    },
  ];

  return (
    <section className="a-set-section" data-testid="dev-section-build">
      <h3>{t("developer.sections.build")}</h3>
      <div className="a-set-card">
        {rows.map((r) => (
          <div key={r.label} className="a-set-row">
            <div className="a-set-row-l">
              <div className="a-set-row-lbl">{r.label}</div>
            </div>
            <div
              className={`a-set-row-r flex items-center gap-2 text-[12.5px] ${r.mono ? "font-mono" : ""}`}
            >
              <span>{r.value}</span>
              {r.copyable && (
                <button
                  type="button"
                  className="r-btn"
                  onClick={() => void copyText(r.copyable!, t("developer.build.copied"))}
                >
                  {t("developer.build.copy")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="a-set-subhead">
        <h3>{t("developer.build.paths_title")}</h3>
      </div>
      <div className="a-set-card">
        <PathRow
          label={t("developer.build.path_config")}
          path={paths?.configDir ?? null}
          copyLabel={t("developer.build.copy")}
          openLabel={t("developer.build.open")}
          copiedLabel={t("developer.build.copied")}
        />
        <PathRow
          label={t("developer.build.path_data")}
          path={paths?.dataDir ?? null}
          copyLabel={t("developer.build.copy")}
          openLabel={t("developer.build.open")}
          copiedLabel={t("developer.build.copied")}
        />
        <PathRow
          label={t("developer.build.path_cache")}
          path={paths?.cacheDir ?? null}
          copyLabel={t("developer.build.copy")}
          openLabel={t("developer.build.open")}
          copiedLabel={t("developer.build.copied")}
        />
        <PathRow
          label={t("developer.build.path_log")}
          path={paths?.logDir ?? null}
          copyLabel={t("developer.build.copy")}
          openLabel={t("developer.build.open")}
          copiedLabel={t("developer.build.copied")}
        />
        <PathRow
          label={t("developer.build.path_binary")}
          path={paths?.binaryDir ?? null}
          copyLabel={t("developer.build.copy")}
          openLabel={t("developer.build.open")}
          copiedLabel={t("developer.build.copied")}
        />
        <PathRow
          label={t("developer.build.path_workspace")}
          path={paths?.workspaceRoot ?? null}
          copyLabel={t("developer.build.copy")}
          openLabel={t("developer.build.open")}
          copiedLabel={t("developer.build.copied")}
        />
      </div>
    </section>
  );
}

function PathRow({
  label,
  path,
  copyLabel,
  openLabel,
  copiedLabel,
}: {
  label: string;
  path: string | null;
  copyLabel: string;
  openLabel: string;
  copiedLabel: string;
}) {
  const openPath = async () => {
    if (!path) return;
    await revealPathInSystem(path);
  };
  return (
    <div className="a-set-row">
      <div className="a-set-row-l">
        <div className="a-set-row-lbl">{label}</div>
        <div className="a-set-row-sub font-mono">{path ?? "—"}</div>
      </div>
      <div className="a-set-row-r flex items-center gap-2">
        <button
          type="button"
          className="r-btn"
          disabled={!path}
          onClick={() => void copyText(path ?? "", copiedLabel)}
        >
          {copyLabel}
        </button>
        <button type="button" className="r-btn" disabled={!path} onClick={() => void openPath()}>
          {openLabel}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- Updater playground */

function UpdaterPlaygroundSection() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const forceFallback = useAppSelector((s) => s.uiDevFlags?.forceUpdaterFallback ?? false);

  const [simVersion, setSimVersion] = useState("99.99.99");
  const [simCanAutoInstall, setSimCanAutoInstall] = useState(true);
  const [endpointOverride, setEndpointOverride] = useState("");

  const forceCheck = async () => {
    await safeInvoke(TauriCommand.CHECK_FOR_UPDATE, {
      autoInstall: false,
      forceFallback,
      endpointOverride: endpointOverride.trim() || null,
    });
    toast.info(t("updates.checking"));
  };

  const emit = () => {
    dispatch(
      setUpdaterBanner({
        version: simVersion.trim() || "99.99.99",
        currentVersion: "dev",
        body: "Simulated event",
        canAutoInstall: simCanAutoInstall,
        downloadUrl: simCanAutoInstall ? null : "https://example.com/download",
      }),
    );
    toast.success(t("developer.updater.banner_emitted"));
  };

  const resetLastSeen = () => {
    try {
      localStorage.removeItem(StorageKey.LAST_SEEN_VERSION);
    } catch {
      /* ignore */
    }
    toast.success(t("developer.updater.reset_last_seen_done"));
  };

  return (
    <section className="a-set-section" data-testid="dev-section-updater">
      <h3>{t("developer.sections.updater_playground")}</h3>
      <div className="a-set-card">
        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.updater.force_check")}</div>
          </div>
          <div className="a-set-row-r">
            <button
              type="button"
              className="r-btn"
              data-testid="dev-updater-force-check"
              onClick={() => void forceCheck()}
            >
              {t("developer.updater.force_check")}
            </button>
          </div>
        </div>

        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.updater.force_fallback")}</div>
          </div>
          <div className="a-set-row-r">
            <Switch
              checked={forceFallback}
              onCheckedChange={(v) => dispatch(setForceUpdaterFallback(v))}
              aria-label={t("developer.updater.force_fallback")}
              data-testid="dev-updater-force-fallback"
            />
          </div>
        </div>

        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.updater.endpoint_override")}</div>
          </div>
          <div className="a-set-row-r">
            <input
              type="text"
              className="r-input min-w-[260px]"
              placeholder={t("developer.updater.endpoint_override_placeholder")}
              value={endpointOverride}
              onChange={(e) => setEndpointOverride(e.target.value)}
              data-testid="dev-updater-endpoint-override"
            />
          </div>
        </div>

        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.updater.simulate")}</div>
          </div>
          <div className="a-set-row-r flex items-center gap-2">
            <input
              type="text"
              className="r-input w-[120px]"
              value={simVersion}
              onChange={(e) => setSimVersion(e.target.value)}
              placeholder="99.99.99"
              data-testid="dev-updater-sim-version"
            />
            <label className="flex items-center gap-1.5 text-xs">
              <Switch
                checked={simCanAutoInstall}
                onCheckedChange={setSimCanAutoInstall}
                aria-label={t("developer.updater.can_auto_install")}
                data-testid="dev-updater-sim-can-auto-install"
              />
              {t("developer.updater.can_auto_install")}
            </label>
            <button type="button" className="r-btn" onClick={emit} data-testid="dev-updater-emit">
              {t("developer.updater.simulate_emit")}
            </button>
          </div>
        </div>

        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.updater.reset_last_seen")}</div>
          </div>
          <div className="a-set-row-r">
            <button
              type="button"
              className="r-btn"
              onClick={resetLastSeen}
              data-testid="dev-updater-reset-last-seen"
            >
              {t("developer.updater.reset_last_seen")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------- Notifications playground */

const BURST_REPO_ID = "dev-burst";

function NotificationsPlaygroundSection() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();

  const burst = () => {
    dispatch(upsertRepo(makeFakeRepo()));
    const prs: PullRequest[] = Array.from({ length: 7 }, (_, i) => makeFakePr(i + 1));
    dispatch(setPrs({ repoId: BURST_REPO_ID, prs }));
    toast.info(t("developer.notifications.burst_dispatched"));
  };

  const clearBurst = () => {
    dispatch(setPrs({ repoId: BURST_REPO_ID, prs: [] }));
    toast.success(t("developer.notifications.clear_burst_done"));
  };

  const clearBaseline = () => {
    __resetNotificationBaselineForTests();
    toast.success(t("developer.notifications.baseline_cleared"));
  };

  return (
    <section className="a-set-section" data-testid="dev-section-notifications">
      <h3>{t("developer.sections.notifications")}</h3>
      <div className="a-set-card">
        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.notifications.send_burst")}</div>
            <div className="a-set-row-sub">{t("developer.notifications.preview_desc")}</div>
          </div>
          <div className="a-set-row-r flex gap-2">
            <button
              type="button"
              className="r-btn"
              onClick={burst}
              data-testid="dev-notif-send-burst"
            >
              {t("developer.notifications.send_burst")}
            </button>
            <button
              type="button"
              className="r-btn"
              onClick={clearBurst}
              data-testid="dev-notif-clear-burst"
            >
              {t("developer.notifications.clear_burst")}
            </button>
          </div>
        </div>
        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.notifications.clear_baseline")}</div>
          </div>
          <div className="a-set-row-r">
            <button
              type="button"
              className="r-btn"
              onClick={clearBaseline}
              data-testid="dev-notif-clear-baseline"
            >
              {t("developer.notifications.clear_baseline")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function makeFakePr(index: number): PullRequest {
  const now = new Date().toISOString();
  return {
    id: `${BURST_REPO_ID}#${index}`,
    number: index,
    title: `Demo burst #${index}`,
    url: `https://example.com/pr/${index}`,
    author: "demo-bot",
    authorAvatarUrl: null,
    state: "open",
    draft: false,
    sourceBranch: `feature/demo-${index}`,
    targetBranch: "main",
    createdAt: now,
    updatedAt: now,
    additions: 10,
    deletions: 2,
    ciStatus: "pending",
  };
}

function makeFakeRepo(): Repository {
  return {
    id: BURST_REPO_ID,
    name: "dev-burst",
    path: "/dev/null/dev-burst",
    groupId: null,
    remoteUrl: null,
    providerId: null,
    status: {
      branch: "main",
      head: null,
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      conflicted: 0,
      dirty: false,
      lastCommit: null,
      remoteUrl: null,
      changedFiles: [],
      changedFilesTruncated: false,
      commitActivity: new Array(14).fill(0) as number[],
      addedLines: 0,
      removedLines: 0,
      language: null,
      languages: null,
    },
    logoPath: null,
    logoDarkPath: null,
  };
}

/* --------------------------------------------------------------- Storage */

function StorageSection() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const providers = useAppSelector((s) => s.providers.connections);
  const scanPaths = useAppSelector((s) => s.settings.scanPaths);
  const [pending, setPending] = useState<null | {
    title: string;
    desc: string;
    run: () => void | Promise<void>;
  }>(null);
  const [typed, setTyped] = useState("");

  const ask = (title: string, desc: string, run: () => void | Promise<void>) => {
    setTyped("");
    setPending({ title, desc, run });
  };

  const confirm = async () => {
    if (typed !== "wipe") return;
    const run = pending?.run;
    setPending(null);
    setTyped("");
    await run?.();
  };

  const copyState = async () => {
    const { store } = await import("@/store");
    const state = redactSensitive(store.getState());
    await copyText(JSON.stringify(state, null, 2), t("developer.storage.copy_state_done"));
  };

  const wipeLocal = () => {
    try {
      localStorage.removeItem(StorageKey.UI_STATE);
    } catch {
      /* ignore */
    }
    toast.success(t("developer.storage.wipe_local_done"));
  };

  const resetSettings = async () => {
    // Real defaults patch mirroring `AppSettings`. Intentionally omits
    // collection-shaped fields (repos, groups, providerSettings) because
    // "reset *settings* to defaults" shouldn't nuke the user's configured
    // data; those have their own explicit wipe affordances.
    await dispatch(
      saveSettings({
        pollingIntervalMs: POLLING_INTERVAL_DEFAULT_MS,
        defaultIde: null,
        theme: "system",
        locale: "en",
        scanPaths: [],
        autoStart: false,
        autoUpdate: "manual",
        startMinimized: false,
        closeToTray: true,
        notifications: { enabled: false, newPr: true, ciFailed: true, mergeReady: true },
        crashReporting: false,
      }),
    );
    toast.success(t("developer.storage.reset_settings_done"));
  };

  const clearTokens = async () => {
    for (const connId of Object.keys(providers) as Array<keyof typeof providers>) {
      const conn = providers[connId];
      if (!conn) continue;
      await dispatch(clearProviderToken(conn.providerId));
    }
    toast.success(t("developer.storage.clear_tokens_done"));
  };

  const retriggerOnboarding = () => {
    try {
      localStorage.removeItem(StorageKey.ONBOARDING_DISMISSED);
    } catch {
      /* ignore */
    }
    toast.success(t("developer.storage.retrigger_onboarding_done"));
    setTimeout(() => window.location.reload(), 250);
  };

  const rescanRepos = async () => {
    if (scanPaths.length === 0) return;
    await dispatch(scanForRepos(scanPaths));
    toast.success(t("developer.storage.rescan_done"));
  };

  const confirmTitle = t("developer.storage.confirm_title");
  const confirmDesc = t("developer.storage.confirm_desc");

  return (
    <section className="a-set-section" data-testid="dev-section-storage">
      <h3>{t("developer.sections.storage")}</h3>
      <div className="a-set-card">
        <SimpleRow
          label={t("developer.storage.copy_state")}
          onClick={() => void copyState()}
          testId="dev-storage-copy-state"
        />
        <SimpleRow
          label={t("developer.storage.wipe_local")}
          onClick={() => ask(confirmTitle, confirmDesc, wipeLocal)}
          testId="dev-storage-wipe-local"
        />
        <SimpleRow
          label={t("developer.storage.reset_settings")}
          onClick={() => ask(confirmTitle, confirmDesc, () => void resetSettings())}
          testId="dev-storage-reset-settings"
        />
        <SimpleRow
          label={t("developer.storage.clear_tokens")}
          onClick={() => ask(confirmTitle, confirmDesc, () => void clearTokens())}
          testId="dev-storage-clear-tokens"
        />
        <SimpleRow
          label={t("developer.storage.retrigger_onboarding")}
          onClick={() => ask(confirmTitle, confirmDesc, retriggerOnboarding)}
          testId="dev-storage-retrigger-onboarding"
        />
        <SimpleRow
          label={t("developer.storage.rescan_repos")}
          onClick={() => void rescanRepos()}
          testId="dev-storage-rescan"
        />
      </div>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => {
          if (!o) {
            setPending(null);
            setTyped("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="text"
            className="r-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={t("developer.storage.confirm_placeholder")}
            data-testid="dev-storage-confirm-input"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("actions.cancel", { ns: "common", defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirm();
              }}
              disabled={typed !== "wipe"}
              data-tone="destructive"
              data-testid="dev-storage-confirm-cta"
            >
              {t("developer.storage.confirm_cta")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/* ------------------------------------------------------------- IPC & Debug */

function IpcSection() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const ipcTrace = useAppSelector((s) => s.uiDevFlags?.ipcTrace ?? false);

  const toggleDevtools = async () => {
    await toggleWebviewDevtools();
  };

  const rendererCrash = () => {
    setTimeout(() => {
      throw new Error("dev-forced renderer crash");
    }, 0);
  };

  const rustPanic = async () => {
    await safeInvoke(TauriCommand.DEV_PANIC);
  };

  return (
    <section className="a-set-section" data-testid="dev-section-ipc">
      <h3>{t("developer.sections.ipc")}</h3>
      <div className="a-set-card">
        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.ipc.toggle_devtools")}</div>
            <div className="a-set-row-sub">{t("developer.ipc.devtools_note")}</div>
          </div>
          <div className="a-set-row-r">
            <button
              type="button"
              className="r-btn"
              onClick={() => void toggleDevtools()}
              data-testid="dev-ipc-toggle-devtools"
            >
              {t("developer.ipc.toggle_devtools")}
            </button>
          </div>
        </div>

        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.ipc.ipc_trace")}</div>
            <div className="a-set-row-sub">{t("developer.ipc.ipc_trace_desc")}</div>
          </div>
          <div className="a-set-row-r">
            <Switch
              checked={ipcTrace}
              onCheckedChange={(v) => dispatch(setIpcTrace(v))}
              aria-label={t("developer.ipc.ipc_trace")}
              data-testid="dev-ipc-trace-switch"
            />
          </div>
        </div>

        <SimpleRow
          label={t("developer.ipc.renderer_crash")}
          onClick={rendererCrash}
          testId="dev-ipc-renderer-crash"
        />
        <SimpleRow
          label={t("developer.ipc.rust_panic")}
          onClick={() => void rustPanic()}
          testId="dev-ipc-rust-panic"
        />

        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.ipc.toast_test")}</div>
          </div>
          <div className="a-set-row-r flex flex-wrap gap-2">
            <button
              type="button"
              className="r-btn"
              onClick={() => toast.success(t("developer.ipc.toast_success"))}
              data-testid="dev-ipc-toast-success"
            >
              {t("developer.ipc.toast_success")}
            </button>
            <button
              type="button"
              className="r-btn"
              onClick={() => toast.error(t("developer.ipc.toast_error"))}
              data-testid="dev-ipc-toast-error"
            >
              {t("developer.ipc.toast_error")}
            </button>
            <button
              type="button"
              className="r-btn"
              onClick={() => toast.info(t("developer.ipc.toast_info"))}
              data-testid="dev-ipc-toast-info"
            >
              {t("developer.ipc.toast_info")}
            </button>
            <button
              type="button"
              className="r-btn"
              onClick={() => toast.warning(t("developer.ipc.toast_warning"))}
              data-testid="dev-ipc-toast-warning"
            >
              {t("developer.ipc.toast_warning")}
            </button>
            <button
              type="button"
              className="r-btn"
              onClick={() => {
                // Sonner loading toasts persist until explicitly resolved. For a
                // demo button we want the user to actually see the transition —
                // fire loading, then settle to success after a short delay.
                const id = toast.loading(t("developer.ipc.toast_loading"));
                setTimeout(() => {
                  toast.success(t("developer.ipc.toast_success"), { id });
                }, 1200);
              }}
              data-testid="dev-ipc-toast-loading"
            >
              {t("developer.ipc.toast_loading")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ i18n */

function I18nSection() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const highlight = useAppSelector((s) => s.uiDevFlags?.highlightMissingI18n ?? false);

  useEffect(() => {
    // Toggle a document-level attribute so CSS can style missing-key spans
    // once a visual highlight is wired up. TODO: add a [data-i18n-missing]
    // stylesheet hook.
    try {
      document.documentElement.dataset.i18nHighlight = highlight ? "true" : "";
    } catch {
      /* ignore */
    }
  }, [highlight]);

  const copyMissing = async () => {
    const keys = getMissingI18nKeys();
    if (keys.length === 0) {
      toast.info(t("developer.i18n.copy_missing_empty"));
      return;
    }
    await copyText(JSON.stringify(keys, null, 2), t("developer.i18n.copy_missing_done"));
  };

  const clearMissing = () => {
    clearMissingI18nKeys();
  };

  return (
    <section className="a-set-section" data-testid="dev-section-i18n">
      <h3>{t("developer.sections.i18n")}</h3>
      <div className="a-set-card">
        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.i18n.highlight_missing")}</div>
            <div className="a-set-row-sub">{t("developer.i18n.highlight_missing_desc")}</div>
          </div>
          <div className="a-set-row-r">
            <Switch
              checked={highlight}
              onCheckedChange={(v) => dispatch(setHighlightMissingI18n(v))}
              aria-label={t("developer.i18n.highlight_missing")}
              data-testid="dev-i18n-highlight-switch"
            />
          </div>
        </div>

        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.i18n.copy_missing")}</div>
          </div>
          <div className="a-set-row-r flex gap-2">
            <button
              type="button"
              className="r-btn"
              onClick={() => void copyMissing()}
              data-testid="dev-i18n-copy-missing"
            >
              {t("developer.i18n.copy_missing")}
            </button>
            <button type="button" className="r-btn" onClick={clearMissing}>
              {t("actions.clear", { ns: "common", defaultValue: "Clear" })}
            </button>
          </div>
        </div>

        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.i18n.locale_label")}</div>
          </div>
          <div className="a-set-row-r flex gap-2">
            <button
              type="button"
              className="r-btn"
              onClick={() => void i18n.changeLanguage("en")}
              data-testid="dev-i18n-locale-en"
            >
              {t("developer.i18n.locale_en")}
            </button>
            <button
              type="button"
              className="r-btn"
              onClick={() => void i18n.changeLanguage("de")}
              data-testid="dev-i18n-locale-de"
            >
              {t("developer.i18n.locale_de")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Feature flags */

interface KnownFlag {
  name: string;
  labelKey: string;
  kind: "boolean" | "enum";
  options?: string[];
  defaultValue: boolean | string;
}

const KNOWN_FLAGS: KnownFlag[] = [
  {
    name: "newRepoRow",
    labelKey: "developer.flags.known_new_repo_row",
    kind: "boolean",
    defaultValue: false,
  },
  {
    name: "activityV2",
    labelKey: "developer.flags.known_activity_v2",
    kind: "boolean",
    defaultValue: false,
  },
  {
    name: "trayBadgeColor",
    labelKey: "developer.flags.known_tray_badge_color",
    kind: "enum",
    options: ["auto", "red", "yellow"],
    defaultValue: "auto",
  },
];

function FeatureFlagsSection() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const flags = useAppSelector((s) => s.uiDevFlags?.flags ?? {});
  const [customName, setCustomName] = useState("");
  const [customValue, setCustomValue] = useState("");

  const setFlag = (name: string, value: boolean | string) => {
    dispatch(setDevFlag({ name, value }));
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    const raw = customValue.trim();
    let value: boolean | string;
    if (raw === "true") value = true;
    else if (raw === "false") value = false;
    else value = raw;
    setFlag(name, value);
    setCustomName("");
    setCustomValue("");
  };

  const resetAll = () => {
    dispatch(resetDevFlags());
    toast.success(t("developer.flags.reset_done"));
  };

  return (
    <section className="a-set-section" data-testid="dev-section-flags">
      <h3>{t("developer.sections.flags")}</h3>
      <div className="a-set-section-desc">{t("developer.flags.intro")}</div>
      <div className="a-set-card">
        {KNOWN_FLAGS.map((f) => {
          const current = flags[f.name] ?? f.defaultValue;
          return (
            <div key={f.name} className="a-set-row">
              <div className="a-set-row-l">
                <div className="a-set-row-lbl">{t(f.labelKey)}</div>
                <div className="a-set-row-sub font-mono">{f.name}</div>
              </div>
              <div className="a-set-row-r">
                {f.kind === "boolean" ? (
                  <Switch
                    checked={current === true}
                    onCheckedChange={(v) => setFlag(f.name, v)}
                    aria-label={t(f.labelKey)}
                    data-testid={`dev-flag-${f.name}`}
                  />
                ) : (
                  <select
                    className="r-input"
                    value={String(current)}
                    onChange={(e) => setFlag(f.name, e.target.value)}
                    data-testid={`dev-flag-${f.name}`}
                  >
                    {f.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {t(`developer.flags.tray_${opt}`, { defaultValue: opt })}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          );
        })}

        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.flags.add")}</div>
          </div>
          <div className="a-set-row-r flex flex-wrap items-center gap-2">
            <input
              type="text"
              className="r-input w-[160px]"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t("developer.flags.custom_name_placeholder")}
              data-testid="dev-flag-custom-name"
            />
            <input
              type="text"
              className="r-input w-[160px]"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder={t("developer.flags.custom_value_placeholder")}
              data-testid="dev-flag-custom-value"
            />
            <button type="button" className="r-btn" onClick={addCustom} data-testid="dev-flag-add">
              {t("developer.flags.add")}
            </button>
          </div>
        </div>

        <div className="a-set-row">
          <div className="a-set-row-l">
            <div className="a-set-row-lbl">{t("developer.flags.reset_all")}</div>
          </div>
          <div className="a-set-row-r">
            <button
              type="button"
              className="r-btn"
              onClick={resetAll}
              data-testid="dev-flag-reset-all"
            >
              {t("developer.flags.reset_all")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- helpers */

function SimpleRow({
  label,
  onClick,
  testId,
}: {
  label: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <div className="a-set-row">
      <div className="a-set-row-l">
        <div className="a-set-row-lbl">{label}</div>
      </div>
      <div className="a-set-row-r">
        <button type="button" className="r-btn" onClick={onClick} data-testid={testId}>
          {label}
        </button>
      </div>
    </div>
  );
}

async function copyText(text: string, successMessage: string): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    }
  } catch (err) {
    console.warn("[dev-tab] clipboard write failed", err);
  }
}

/**
 * Matches keys whose values are expected to be secret-adjacent: tokens,
 * passwords, API keys, credentials, authorization headers, or literal PAT
 * references. Case-insensitive so `authToken`, `apiKey`, `API_KEY`,
 * `authorization` all qualify.
 */
const SENSITIVE_KEY_RE = /token|password|secret|credential|api[-_]?key|\bpat\b|authorization/i;

/**
 * Walks a value recursively, replacing every string whose parent key matches
 * {@link SENSITIVE_KEY_RE} with `"[redacted]"`. Circular refs are guarded via
 * a `WeakSet`. Intentionally shallow on the type side — `unknown` is the
 * right shape for an arbitrary Redux tree.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function redactSensitive(value: any, key?: string, seen = new WeakSet<object>()): any {
  if (value === null || typeof value !== "object") {
    if (typeof value === "string" && key && SENSITIVE_KEY_RE.test(key)) {
      return "[redacted]";
    }
    return value;
  }
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((v) => redactSensitive(v, undefined, seen));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = redactSensitive(v, k, seen);
  }
  return out;
}

/** Default export for `React.lazy` — keeps the dev bundle fully tree-shakeable
 *  from the production `SettingsView` entry. Named export stays for tests and
 *  non-lazy consumers (e.g. Storybook). */
export default DeveloperTab;
