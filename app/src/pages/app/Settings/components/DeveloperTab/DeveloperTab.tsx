import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  type AppSettings,
  POLLING_INTERVAL_DEFAULT_MS,
  type PlatformInfo,
  type PullRequest,
  type Repository,
  StorageKey,
  TauriCommand,
} from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { invoke, isTauri, safeInvoke, toggleWebviewDevtools } from "@/lib/tauri";
import i18nInstance from "@/locales";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { clearProviderToken } from "@/store/actions/providers.actions";
import { setPrs } from "@/store/actions/prs.actions";
import { scanForRepos, upsertRepo } from "@/store/actions/repos.actions";
import { saveSettings } from "@/store/actions/settings.actions";
import { setUpdaterBanner } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/* ─── Styled primitives ─── */

const ButtonRow = styled(Box)({
  display: "inline-flex",
  gap: 6,
  flexWrap: "wrap",
  alignItems: "center",
});

const TextInput = styled("input")(({ theme }) => ({
  height: 30,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  outline: "none",
  "&::placeholder": { color: theme.palette.text.informationLight },
  "&:focus": { borderColor: theme.palette.border.hover },
}));

const SelectNative = styled("select")(({ theme }) => ({
  height: 30,
  padding: "0 8px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.primary,
  fontSize: 12,
  fontFamily: "inherit",
  outline: "none",
}));

const FactRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-child": { borderBottom: 0 },
}));

const FactKey = styled("div")(({ theme }) => ({
  flex: 1,
  fontSize: 12.5,
  color: theme.palette.text.primary,
  fontWeight: 500,
}));

const FactVal = styled("div")(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12,
  color: theme.palette.text.information,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
}));

const Card = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
  marginBottom: 18,
}));

const InlineLabel = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: theme.palette.text.secondary,
}));

/* ─── Build section ─── */

const SectionHeading = styled("h3")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  margin: "0 0 10px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
}));

const SectionWrap = styled("section")({
  marginBottom: 22,
});

interface PathRowProps {
  label: string;
  path: string | null;
}

function PathRow({ label, path }: PathRowProps) {
  const dash = "—";
  return (
    <FactRow>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <FactKey>{label}</FactKey>
        <FactVal sx={{ display: "block", marginTop: "2px", wordBreak: "break-all" }}>
          {path ?? dash}
        </FactVal>
      </Box>
      <ButtonRow>
        <GeneralButton
          size="sm"
          variant="outline"
          disabled={!path}
          onClick={() => path && navigator.clipboard?.writeText(path)}
        >
          Copy
        </GeneralButton>
        <GeneralButton size="sm" variant="outline" disabled={!path}>
          Open
        </GeneralButton>
      </ButtonRow>
    </FactRow>
  );
}

interface DevPaths {
  configDir: string | null;
  dataDir: string | null;
  cacheDir: string | null;
  logDir: string | null;
  binaryDir: string | null;
  workspaceRoot: string | null;
}

function BuildSection() {
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [tauriVersion, setTauriVersion] = useState<string | null>(null);
  const [buildTriple, setBuildTriple] = useState<string | null>(null);
  const [paths, setPaths] = useState<DevPaths | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    void (async () => {
      try {
        const p = await invoke<PlatformInfo>(TauriCommand.GET_PLATFORM_INFO);
        if (!cancelled) setPlatform(p);
      } catch {
        /* noop */
      }
      try {
        const app = await import("@tauri-apps/api/app");
        const v = await app.getTauriVersion();
        if (!cancelled) setTauriVersion(v);
      } catch {
        /* noop */
      }
      try {
        const triple = await invoke<string>(TauriCommand.GET_BUILD_TRIPLE);
        if (!cancelled) setBuildTriple(triple);
      } catch {
        /* noop */
      }
      try {
        const p = await invoke<DevPaths>(TauriCommand.GET_DEV_PATHS);
        if (!cancelled) setPaths(p);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dash = "—";
  const buildSha = typeof __GIT_SHA__ === "string" && __GIT_SHA__.length > 0 ? __GIT_SHA__ : dash;
  const buildTime =
    typeof __BUILD_TIME__ === "string" && __BUILD_TIME__.length > 0 ? __BUILD_TIME__ : dash;

  const rows: { key: string; value: string; copyable?: boolean }[] = [
    { key: "Git SHA", value: buildSha, copyable: true },
    { key: "Build time", value: buildTime },
    { key: "Mode", value: import.meta.env.MODE },
    {
      key: "Debug assertions",
      value: platform?.debugAssertions == null ? dash : String(platform.debugAssertions),
    },
    { key: "Tauri runtime", value: tauriVersion ?? dash },
    { key: "Build triple", value: buildTriple ?? dash },
    { key: "App identifier", value: "eu.softventures.recrest", copyable: true },
  ];

  return (
    <>
      <SectionWrap data-testid="dev-section-build">
        <SectionHeading>Build</SectionHeading>
        <Card>
          {rows.map((r) => (
            <FactRow key={r.key}>
              <FactKey>{r.key}</FactKey>
              <FactVal>
                <span>{r.value}</span>
                {r.copyable && r.value !== dash && (
                  <GeneralButton
                    size="sm"
                    variant="outline"
                    onClick={() => navigator.clipboard?.writeText(r.value)}
                  >
                    Copy
                  </GeneralButton>
                )}
              </FactVal>
            </FactRow>
          ))}
        </Card>
      </SectionWrap>

      <SectionWrap>
        <SectionHeading>Paths</SectionHeading>
        <Card>
          <PathRow label="Config dir" path={paths?.configDir ?? null} />
          <PathRow label="Data dir" path={paths?.dataDir ?? null} />
          <PathRow label="Cache dir" path={paths?.cacheDir ?? null} />
          <PathRow label="Log dir" path={paths?.logDir ?? null} />
          <PathRow label="Binary dir" path={paths?.binaryDir ?? null} />
          <PathRow label="Workspace root" path={paths?.workspaceRoot ?? null} />
        </Card>
      </SectionWrap>
    </>
  );
}

/* ─── Updater playground ─── */

function UpdaterPlaygroundSection() {
  const dispatch = useAppDispatch();
  const [forceFallback, setForceFallback] = useState(false);
  const [simVersion, setSimVersion] = useState("99.99.99");
  const [simCanAutoInstall, setSimCanAutoInstall] = useState(true);
  const [endpointOverride, setEndpointOverride] = useState("");

  const forceCheck = async () => {
    await safeInvoke(TauriCommand.CHECK_FOR_UPDATE, {
      autoInstall: false,
      forceFallback,
      endpointOverride: endpointOverride.trim() || null,
    });
    toast.info("Checking for updates…");
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
    toast.success("Updater banner emitted");
  };

  const resetLastSeen = () => {
    try {
      localStorage.removeItem(StorageKey.LAST_SEEN_VERSION);
    } catch {
      /* ignore */
    }
    toast.success("Last-seen version reset");
  };

  return (
    <SettingsSection title="Updater playground" testId="dev-section-updater">
      <SettingsRow label="Force check now">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-updater-force-check"
          onClick={() => void forceCheck()}
        >
          Force check
        </GeneralButton>
      </SettingsRow>
      <SettingsRow
        label="Force download fallback"
        sub="Treat the auto-installer path as broken — surface the manual download link instead."
      >
        <GeneralSwitchInput
          checked={forceFallback}
          onCheckedChange={setForceFallback}
          data-testid="dev-updater-force-fallback"
        />
      </SettingsRow>
      <SettingsRow label="Endpoint override">
        <TextInput
          type="text"
          placeholder="https://updates.example.com/manifest.json"
          value={endpointOverride}
          onChange={(e) => setEndpointOverride(e.target.value)}
          style={{ minWidth: 260 }}
          data-testid="dev-updater-endpoint-override"
        />
      </SettingsRow>
      <SettingsRow label="Simulate update event">
        <ButtonRow>
          <TextInput
            type="text"
            value={simVersion}
            onChange={(e) => setSimVersion(e.target.value)}
            placeholder="99.99.99"
            style={{ width: 120 }}
            data-testid="dev-updater-sim-version"
          />
          <InlineLabel>
            <GeneralSwitchInput
              checked={simCanAutoInstall}
              onCheckedChange={setSimCanAutoInstall}
              data-testid="dev-updater-sim-can-auto-install"
            />
            canAutoInstall
          </InlineLabel>
          <GeneralButton size="sm" variant="outline" onClick={emit} data-testid="dev-updater-emit">
            Emit
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow
        label="Reset last-seen version"
        sub="Make the update banner appear again for the current version."
      >
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-updater-reset-last-seen"
          onClick={resetLastSeen}
        >
          Reset
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

/* ─── Notifications playground ─── */

const BURST_REPO_ID = "dev-burst";

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

function NotificationsPlaygroundSection() {
  const dispatch = useAppDispatch();

  const burst = () => {
    dispatch(upsertRepo(makeFakeRepo()));
    const prs = Array.from({ length: 7 }, (_, i) => makeFakePr(i + 1));
    dispatch(setPrs({ repoId: BURST_REPO_ID, prs }));
    toast.info("Notification burst dispatched");
  };

  const clearBurst = () => {
    dispatch(setPrs({ repoId: BURST_REPO_ID, prs: [] }));
    toast.success("Burst cleared");
  };

  const clearBaseline = () => {
    // Notification baseline tracking lives in localStorage under recrest:notif:*.
    // Wipe every recrest-prefixed key that looks notification-related.
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith("recrest:notif")) localStorage.removeItem(key);
      }
      toast.success("Notification baseline cleared");
    } catch {
      toast.error("Could not access localStorage");
    }
  };

  return (
    <SettingsSection title="Notifications playground" testId="dev-section-notifications">
      <SettingsRow
        label="Send burst"
        sub="Inject 7 fake PRs from a dev-burst repo to test coalescing behavior."
      >
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid="dev-notif-send-burst"
            onClick={burst}
          >
            Send burst
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="ghost"
            data-testid="dev-notif-clear-burst"
            onClick={clearBurst}
          >
            Clear burst
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow label="Clear notification baseline">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-notif-clear-baseline"
          onClick={clearBaseline}
        >
          Clear baseline
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

/* ─── Storage (dev wipes) ─── */

function StorageSection() {
  const dispatch = useAppDispatch();
  const providers = useAppSelector((s) => s.providers.connections);
  const scanPaths = useAppSelector((s) => s.repos.scanPaths);

  const copyState = async () => {
    try {
      const { store } = await import("@/store");
      const state = store.getState();
      // Redact obvious secrets — token fields, anything under provider tokens.
      const redacted = JSON.parse(
        JSON.stringify(state, (key, value) =>
          typeof value === "string" && /token|secret|password/i.test(key) ? "[redacted]" : value,
        ),
      );
      await navigator.clipboard?.writeText(JSON.stringify(redacted, null, 2));
      toast.success("Redux state copied");
    } catch {
      toast.error("Could not copy state");
    }
  };

  const wipeLocal = () => {
    if (!window.confirm("Wipe localStorage? Type-to-confirm replaced by browser prompt.")) return;
    try {
      localStorage.removeItem(StorageKey.UI_STATE);
      toast.success("localStorage wiped");
    } catch {
      toast.error("Could not access localStorage");
    }
  };

  const resetSettings = async () => {
    if (!window.confirm("Reset all settings to defaults?")) return;
    const defaults: Partial<AppSettings> = {
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
    };
    await dispatch(saveSettings(defaults));
    toast.success("Settings reset to defaults");
  };

  const clearTokens = async () => {
    if (!window.confirm("Clear ALL provider tokens from keychain?")) return;
    for (const conn of Object.values(providers)) {
      if (!conn) continue;
      await dispatch(clearProviderToken(conn.providerId));
    }
    toast.success("Provider tokens cleared");
  };

  const retriggerOnboarding = () => {
    if (!window.confirm("Re-trigger onboarding? Page will reload.")) return;
    try {
      localStorage.removeItem(StorageKey.ONBOARDING_DISMISSED);
    } catch {
      /* ignore */
    }
    toast.success("Onboarding re-triggered");
    setTimeout(() => window.location.reload(), 250);
  };

  const rescanRepos = async () => {
    if (scanPaths.length === 0) {
      toast.info("No scan paths configured");
      return;
    }
    await dispatch(scanForRepos(scanPaths));
    toast.success("Rescan complete");
  };

  return (
    <SettingsSection title="Storage" testId="dev-section-storage">
      <SettingsRow label="Copy Redux state" sub="Snapshot the store as JSON with secrets redacted.">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-storage-copy-state"
          onClick={() => void copyState()}
        >
          Copy state
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Wipe localStorage" sub="Removes every `recrest:*` key.">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-storage-wipe-local"
          onClick={wipeLocal}
        >
          Wipe
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Reset settings to defaults">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-storage-reset-settings"
          onClick={() => void resetSettings()}
        >
          Reset
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Clear all provider tokens" sub="Removes tokens from the keychain.">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-storage-clear-tokens"
          onClick={() => void clearTokens()}
        >
          Clear tokens
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Re-trigger onboarding">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-storage-retrigger-onboarding"
          onClick={retriggerOnboarding}
        >
          Re-trigger
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Rescan repositories">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-storage-rescan"
          onClick={() => void rescanRepos()}
        >
          Rescan
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

/* ─── IPC & Debug ─── */

function IpcSection() {
  const [ipcTrace, setIpcTrace] = useState(false);

  const rendererCrash = () => {
    setTimeout(() => {
      throw new Error("dev-forced renderer crash");
    }, 0);
  };

  const rustPanic = async () => {
    await safeInvoke(TauriCommand.DEV_PANIC);
  };

  return (
    <SettingsSection title="IPC & Debug" testId="dev-section-ipc">
      <SettingsRow
        label="Toggle DevTools"
        sub="Opens the webview's built-in inspector (Tauri only)."
      >
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-ipc-toggle-devtools"
          onClick={() => void toggleWebviewDevtools()}
        >
          Toggle DevTools
        </GeneralButton>
      </SettingsRow>
      <SettingsRow
        label="Trace IPC calls"
        sub="Log every invoke + event to the dev console with timing info."
      >
        <GeneralSwitchInput
          checked={ipcTrace}
          onCheckedChange={setIpcTrace}
          data-testid="dev-ipc-trace-switch"
        />
      </SettingsRow>
      <SettingsRow label="Force renderer crash">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-ipc-renderer-crash"
          onClick={rendererCrash}
        >
          Force renderer crash
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Force Rust panic">
        <GeneralButton
          size="sm"
          variant="outline"
          data-testid="dev-ipc-rust-panic"
          onClick={() => void rustPanic()}
        >
          Force Rust panic
        </GeneralButton>
      </SettingsRow>
      <SettingsRow label="Toast tests">
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid="dev-ipc-toast-success"
            onClick={() => toast.success("Success toast")}
          >
            Success
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid="dev-ipc-toast-error"
            onClick={() => toast.error("Error toast")}
          >
            Error
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid="dev-ipc-toast-info"
            onClick={() => toast.info("Info toast")}
          >
            Info
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid="dev-ipc-toast-warning"
            onClick={() => toast.warning("Warning toast")}
          >
            Warning
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid="dev-ipc-toast-loading"
            onClick={() => {
              const id = toast.loading("Loading…");
              setTimeout(() => toast.success("Done!", { id }), 1200);
            }}
          >
            Loading
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
    </SettingsSection>
  );
}

/* ─── i18n ─── */

// Renderer-side cache of i18n keys that fell through to defaultValue. The old
// app exposed `getMissingI18nKeys` from `@/i18n` — replicate the same idea here
// via i18next's `missingKeyHandler`, but lazily so we only attach when this
// section mounts.
const missingI18nKeys = new Set<string>();
let missingHandlerAttached = false;
function ensureMissingHandler() {
  if (missingHandlerAttached) return;
  missingHandlerAttached = true;
  i18nInstance.on("missingKey", (_lngs, _ns, key) => {
    if (typeof key === "string") missingI18nKeys.add(key);
  });
}

function I18nSection() {
  const { i18n } = useTranslation();
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    ensureMissingHandler();
    try {
      document.documentElement.dataset.i18nHighlight = highlight ? "true" : "";
    } catch {
      /* ignore */
    }
  }, [highlight]);

  const copyMissing = async () => {
    const keys = [...missingI18nKeys];
    if (keys.length === 0) {
      toast.info("No missing translations recorded yet");
      return;
    }
    try {
      await navigator.clipboard?.writeText(JSON.stringify(keys, null, 2));
      toast.success(`Copied ${keys.length} missing key${keys.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const clearMissing = () => {
    missingI18nKeys.clear();
    toast.success("Missing-key list cleared");
  };

  return (
    <SettingsSection title="i18n" testId="dev-section-i18n">
      <SettingsRow
        label="Highlight missing translations"
        sub="Underline strings that fall through to the default value."
      >
        <GeneralSwitchInput
          checked={highlight}
          onCheckedChange={setHighlight}
          data-testid="dev-i18n-highlight-switch"
        />
      </SettingsRow>
      <SettingsRow label="Copy missing keys">
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid="dev-i18n-copy-missing"
            onClick={() => void copyMissing()}
          >
            Copy
          </GeneralButton>
          <GeneralButton size="sm" variant="ghost" onClick={clearMissing}>
            Clear
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow label="Switch locale">
        <ButtonRow>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid="dev-i18n-locale-en"
            onClick={() => void i18n.changeLanguage("en")}
          >
            English
          </GeneralButton>
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid="dev-i18n-locale-de"
            onClick={() => void i18n.changeLanguage("de")}
          >
            Deutsch
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
    </SettingsSection>
  );
}

/* ─── Feature flags ─── */

const KNOWN_FLAGS = [
  { name: "newRepoRow", label: "New repo row layout", kind: "boolean" as const, def: false },
  { name: "activityV2", label: "Activity v2", kind: "boolean" as const, def: false },
  {
    name: "trayBadgeColor",
    label: "Tray badge color",
    kind: "enum" as const,
    options: ["auto", "red", "yellow"],
    def: "auto",
  },
];

function FeatureFlagsSection() {
  const [flags, setFlags] = useState<Record<string, boolean | string>>({});
  const [customName, setCustomName] = useState("");
  const [customValue, setCustomValue] = useState("");

  const setFlag = (name: string, value: boolean | string) => {
    setFlags((f) => ({ ...f, [name]: value }));
  };

  return (
    <SettingsSection title="Feature flags" testId="dev-section-flags">
      {KNOWN_FLAGS.map((f) => {
        const current = flags[f.name] ?? f.def;
        return (
          <SettingsRow key={f.name} label={f.label} sub={f.name}>
            {f.kind === "boolean" ? (
              <GeneralSwitchInput
                checked={current === true}
                onCheckedChange={(v) => setFlag(f.name, v)}
                data-testid={`dev-flag-${f.name}`}
              />
            ) : (
              <SelectNative
                value={String(current)}
                onChange={(e) => setFlag(f.name, e.target.value)}
                data-testid={`dev-flag-${f.name}`}
              >
                {f.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </SelectNative>
            )}
          </SettingsRow>
        );
      })}
      <SettingsRow label="Add custom flag">
        <ButtonRow>
          <TextInput
            type="text"
            placeholder="name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            style={{ width: 140 }}
            data-testid="dev-flag-custom-name"
          />
          <TextInput
            type="text"
            placeholder="value"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            style={{ width: 140 }}
            data-testid="dev-flag-custom-value"
          />
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid="dev-flag-add"
            onClick={() => {
              if (!customName.trim()) return;
              const raw = customValue.trim();
              const v = raw === "true" ? true : raw === "false" ? false : raw;
              setFlag(customName.trim(), v);
              setCustomName("");
              setCustomValue("");
            }}
          >
            Add
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow label="Reset all flags">
        <GeneralButton
          size="sm"
          variant="ghost"
          data-testid="dev-flag-reset-all"
          onClick={() => {
            setFlags({});
            toast.success("Feature flags reset");
          }}
        >
          Reset
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

/* ─── Factory reset ─── */

function FactoryResetSection() {
  const [running, setRunning] = useState(false);

  const runReset = async () => {
    if (
      !window.confirm(
        "Reset Recrest to factory defaults? This wipes settings, tokens, localStorage, and re-runs onboarding. The page will reload.",
      )
    ) {
      return;
    }
    setRunning(true);
    try {
      try {
        await safeInvoke(TauriCommand.FACTORY_RESET);
      } catch (err) {
        console.warn("[factory-reset] backend reset failed", err);
      }
      try {
        // Wipe every recrest:* key from localStorage.
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith("recrest:")) localStorage.removeItem(key);
        }
      } catch {
        /* ignore */
      }
      toast.success("Factory reset complete. Reloading…");
      setTimeout(() => window.location.reload(), 250);
    } finally {
      setRunning(false);
    }
  };

  return (
    <SettingsSection title="Factory reset" testId="dev-section-factory-reset">
      <SettingsRow
        label="Reset to factory defaults"
        sub="Wipes settings, tokens, localStorage, and re-runs onboarding."
      >
        <GeneralButton
          size="sm"
          variant="destructive"
          data-testid="dev-factory-reset-button"
          disabled={running}
          onClick={() => void runReset()}
        >
          Reset
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

export function DeveloperTab() {
  return (
    <Box data-testid="developer-tab">
      <BuildSection />
      <UpdaterPlaygroundSection />
      <NotificationsPlaygroundSection />
      <StorageSection />
      <IpcSection />
      <I18nSection />
      <FeatureFlagsSection />
      <FactoryResetSection />
    </Box>
  );
}
