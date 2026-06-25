import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, MenuItem, type SelectChangeEvent, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  type AppSettings,
  IDE_DEFINITIONS,
  IDE_IDS,
  POLLING_INTERVAL_MAX_MS,
  POLLING_INTERVAL_MIN_MS,
  PROFILE_CAPABLE_TERMINAL_IDS,
  SHELL_DEFINITIONS,
  SHELL_IDS,
  type ShellId,
  TERMINAL_DEFINITIONS,
  TERMINAL_IDS,
  TauriCommand,
  type TerminalId,
} from "@recrest/shared";

import { toast } from "sonner";

import IdeIcon from "@/assets/icons/IdeIcon";
import ShellIcon from "@/assets/icons/ShellIcon";
import TerminalIcon from "@/assets/icons/TerminalIcon";
import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { Platform, usePlatform } from "@/hooks/usePlatform";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";
import { SelectControl } from "@/pages/app/Settings/components/GeneralTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  loadDetectedIdes,
  loadDetectedShells,
  loadDetectedTerminals,
  loadDiscoveredIdes,
  loadDiscoveredTerminals,
  saveSettings,
  setPollingIntervalMinutes,
} from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/** Terminal-select sentinel for the "type my own launch command" mode.
 *  Persisted as `terminal.id = "custom"`; the Rust `open_at` custom-command
 *  path runs before id resolution, so no extra spawn arm is needed. */
const CUSTOM_TERMINAL_ID = "custom";

/** `yarn dev:web` fallback only. In Tauri the real `detect_terminals` /
 *  `detect_shells` IPC probe replaces these; outside Tauri the store stays
 *  `null` and these plausible defaults keep the dropdowns usable. */
const DETECTED_TERMINALS_BY_PLATFORM: Record<Platform, TerminalId[]> = {
  [Platform.MAC]: ["apple-terminal", "iterm2", "warp"],
  [Platform.WINDOWS]: ["windows-terminal", "powershell", "cmd"],
  [Platform.LINUX]: ["gnome-terminal", "xterm"],
};

const DETECTED_SHELLS_BY_PLATFORM: Record<Platform, ShellId[]> = {
  [Platform.MAC]: ["zsh", "bash"],
  [Platform.WINDOWS]: ["powershell-core", "windows-powershell", "cmd", "git-bash"],
  [Platform.LINUX]: ["bash", "zsh"],
};

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / autofocus / IME
const NumberInput = styled("input")(({ theme }) => ({
  width: 80,
  height: 32,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: 12.5,
  fontFamily: "inherit",
  outline: "none",
  "&:focus": { borderColor: theme.palette.border.hover },
}));

// eslint-disable-next-line no-restricted-syntax -- native text input mirrors the NumberInput pattern for free-text settings
const TextInput = styled("input")(({ theme }) => ({
  width: 260,
  height: 32,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: 12.5,
  fontFamily: "inherit",
  outline: "none",
  "&:focus": { borderColor: theme.palette.border.hover },
}));

const WideSelect = styled(SelectControl)({ minWidth: 260 });

const MenuLabel = styled(Box, {
  shouldForwardProp: (p) => p !== "indent" && p !== "dimmed",
})<{ indent?: boolean; dimmed?: boolean }>(({ theme, indent, dimmed }) => ({
  display: "inline-block",
  marginLeft: indent ? theme.spacing(1) : 0,
  opacity: dimmed ? 0.55 : 1,
}));

const CustomCommandRow = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  alignItems: "flex-start",
}));

const CustomCommandInputRow = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  gap: theme.spacing(1),
  alignItems: "center",
}));

const SuccessText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  margin: 0,
  color: theme.palette.success.main,
})) as typeof Typography;

const ErrorText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  margin: 0,
  color: theme.palette.error.main,
})) as typeof Typography;

export function SystemSection() {
  const { t } = useTranslation();
  const platform = usePlatform();
  const dispatch = useAppDispatch();
  const polling = useAppSelector((s) => s.settings.pollingIntervalMinutes);
  // Source of truth is the persisted backend settings, not local state — local
  // state was lost on tab switch (component remount), resetting the dropdowns.
  const backend = useAppSelector((s) => s.settings.backend);
  const testFeedback = useActionFeedback();
  const [testMessage, setTestMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const detectedTerminalsState = useAppSelector((s) => s.settings.detectedTerminals);
  const detectedShellsState = useAppSelector((s) => s.settings.detectedShells);
  const detectedIdesState = useAppSelector((s) => s.settings.detectedIdes);
  const discoveredTerminalsState = useAppSelector((s) => s.settings.discoveredTerminals);
  const discoveredIdesState = useAppSelector((s) => s.settings.discoveredIdes);
  const defaultIde = backend?.defaultIde ?? "auto";
  const defaultTerminal = backend?.terminal?.id ?? "auto";
  const defaultShell = backend?.shell ?? "auto";

  // Tauri-only: kick off the real OS probe once. Outside Tauri the thunks would
  // throw `tauri-ipc-unavailable`, so the stub maps below stay authoritative.
  // Both the legacy PATH-based detect probes and the new bundle/registry-based
  // discovery run side-by-side — discovery is preferred when it resolves, the
  // older probes remain as fallback so the migration is non-breaking.
  //
  // Each probe is guarded on its slice being unloaded (`== null`) so re-opening
  // Settings doesn't re-run the (Windows: registry + filesystem) scans on every
  // mount — those redundant scans + their re-renders made the page lag on open.
  useEffect(() => {
    if (!isTauri()) return;
    if (detectedTerminalsState == null) void dispatch(loadDetectedTerminals());
    if (detectedShellsState == null) void dispatch(loadDetectedShells());
    if (detectedIdesState == null) void dispatch(loadDetectedIdes());
    if (discoveredTerminalsState == null) void dispatch(loadDiscoveredTerminals());
    if (discoveredIdesState == null) void dispatch(loadDiscoveredIdes());
  }, [
    dispatch,
    detectedTerminalsState,
    detectedShellsState,
    detectedIdesState,
    discoveredTerminalsState,
    discoveredIdesState,
  ]);

  const persist = (patch: Partial<AppSettings>) => {
    void dispatch(saveSettings(patch))
      .unwrap()
      .then(() => toast.success(t("settings.saved")))
      .catch((err) => toast.error(String((err as Error)?.message ?? err)));
  };

  // Prefer the new bundle/registry-based discovery when available; fall back to
  // the legacy probes, then to the platform stub. `DiscoveredApp.id` aligns
  // with `IdeId` / `TerminalId` for known apps in the catalog.
  const discoveredIdeIds = discoveredIdesState?.map((a) => a.id) ?? null;
  const detectedSet = new Set<string>(discoveredIdeIds ?? detectedIdesState ?? []);

  const discoveredTerminalIds = discoveredTerminalsState?.map((a) => a.id) ?? null;
  const detectedTerminals = new Set<TerminalId>(
    (discoveredTerminalIds as TerminalId[] | null) ??
      (detectedTerminalsState
        ? detectedTerminalsState.filter((d) => d.available).map((d) => d.id)
        : DETECTED_TERMINALS_BY_PLATFORM[platform]),
  );

  // Lookups for the discovered display names — when present these override
  // the static catalog name so the picker shows what the OS actually calls
  // the app (e.g. "iTerm" vs "iTerm2", localised CFBundleName, …).
  const discoveredTerminalNames = new Map<string, string>(
    discoveredTerminalsState?.map((a) => [a.id, a.displayName]) ?? [],
  );
  const discoveredIdeNames = new Map<string, string>(
    discoveredIdesState?.map((a) => [a.id, a.displayName]) ?? [],
  );
  const terminalName = (id: TerminalId): string =>
    discoveredTerminalNames.get(id) ?? TERMINAL_DEFINITIONS[id].name;
  const ideName = (id: (typeof IDE_IDS)[number]): string =>
    discoveredIdeNames.get(id) ?? IDE_DEFINITIONS[id].name;
  const detectedShells = new Set<ShellId>(
    detectedShellsState
      ? detectedShellsState.filter((d) => d.available).map((d) => d.id)
      : DETECTED_SHELLS_BY_PLATFORM[platform],
  );
  const isProfileCapable = (PROFILE_CAPABLE_TERMINAL_IDS as readonly string[]).includes(
    defaultTerminal,
  );
  const isCustomTerminal = defaultTerminal === CUSTOM_TERMINAL_ID;
  const firstTerminal = TERMINAL_IDS.find((id) => detectedTerminals.has(id)) ?? null;
  const firstShell = SHELL_IDS.find((id) => detectedShells.has(id)) ?? null;
  // Maps the renderer-side platform id (`Platform.MAC = "mac"` etc.) to the
  // wire-contract value used by `TERMINAL_DEFINITIONS.platforms` /
  // `SHELL_DEFINITIONS.platforms` (where macOS rides as the explicit
  // `"macos"` literal). Only the mac slot diverges; the other two pass
  // through. Kept as a small map rather than a runtime branch so adding a
  // future platform stays a one-line edit.
  const platformMap = {
    [Platform.MAC]: "macos" as const,
    [Platform.WINDOWS]: "windows" as const,
    [Platform.LINUX]: "linux" as const,
  };
  const sharedPlatform = platformMap[platform];
  const visibleTerminalIds = TERMINAL_IDS.filter((id) =>
    TERMINAL_DEFINITIONS[id].platforms.includes(sharedPlatform),
  );
  const visibleShellIds = SHELL_IDS.filter((id) =>
    SHELL_DEFINITIONS[id].platforms.includes(sharedPlatform),
  );

  const terminalAutoLabel = firstTerminal
    ? t("settings.terminal.auto_system_default", {
        terminal: terminalName(firstTerminal),
      })
    : t("settings.terminal.no_terminal_detected");
  const shellAutoLabel = firstShell
    ? t("settings.shell.auto_system_default", { shell: SHELL_DEFINITIONS[firstShell].name })
    : t("settings.shell.no_shell_detected");

  const installedTerminalIds = visibleTerminalIds.filter((id) => detectedTerminals.has(id));
  const installedShellIds = visibleShellIds.filter((id) => detectedShells.has(id));
  const installedIdeIds = IDE_IDS.filter((id) => detectedSet.has(id));
  const firstDetected = IDE_IDS.find((id) => detectedSet.has(id)) ?? null;
  const autoLabel = firstDetected
    ? t("settings.ide.auto_system_default", { ide: ideName(firstDetected) })
    : t("settings.ide.no_ide_detected");

  return (
    <SettingsSection title={t("settings.sections.system")}>
      <SettingsRow
        label={t("settings.fields.polling_interval")}
        sub={t("settings.fields.polling_interval_hint")}
      >
        <NumberInput
          type="number"
          min={POLLING_INTERVAL_MIN_MS / 60_000}
          max={POLLING_INTERVAL_MAX_MS / 60_000}
          step={1}
          value={polling}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) dispatch(setPollingIntervalMinutes(n));
          }}
          aria-label={t("settings.fields.polling_interval")}
          data-testid={TEST_IDS.settings.general.pollingInput}
        />
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.default_ide")}
        sub={!firstDetected ? t("settings.ide.detection_hint") : undefined}
      >
        <WideSelect
          size="small"
          value={defaultIde}
          onChange={(e: SelectChangeEvent<unknown>) => {
            const v = e.target.value as string;
            persist({ defaultIde: v === "auto" ? null : v });
          }}
          slotProps={{ input: { "aria-label": t("settings.fields.default_ide") } }}
          data-testid={TEST_IDS.settings.general.defaultIdeSelect}
          renderValue={(value) => {
            const v = value as string;
            if (v === "auto") {
              return (
                <>
                  {firstDetected && <IdeIcon id={firstDetected} size={14} />}
                  {autoLabel}
                </>
              );
            }
            return (
              <>
                <IdeIcon id={v as (typeof IDE_IDS)[number]} size={14} />
                {ideName(v as (typeof IDE_IDS)[number])}
              </>
            );
          }}
        >
          <MenuItem value="auto">
            {firstDetected && <IdeIcon id={firstDetected} size={14} />}
            <MenuLabel indent={!!firstDetected}>{autoLabel}</MenuLabel>
          </MenuItem>
          {installedIdeIds.map((id) => (
            <MenuItem key={id} value={id}>
              <IdeIcon id={id} size={14} color="brand" />
              <MenuLabel indent>{ideName(id)}</MenuLabel>
            </MenuItem>
          ))}
        </WideSelect>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.default_terminal")}
        sub={
          !firstTerminal
            ? t("settings.terminal.detection_hint")
            : t("settings.terminal.detection_done")
        }
      >
        <WideSelect
          size="small"
          value={defaultTerminal}
          onChange={(e: SelectChangeEvent<unknown>) => {
            const v = e.target.value as string;
            persist({
              terminal: {
                id: v === "auto" ? null : v,
                profile: backend?.terminal?.profile ?? null,
                customCommand: backend?.terminal?.customCommand ?? null,
              },
            });
          }}
          slotProps={{ input: { "aria-label": t("settings.fields.default_terminal") } }}
          data-testid={TEST_IDS.settings.general.defaultTerminalSelect}
          renderValue={(value) => {
            const v = value as string;
            if (v === "auto") {
              return (
                <>
                  {firstTerminal && <TerminalIcon id={firstTerminal} size={16} />}
                  {terminalAutoLabel}
                </>
              );
            }
            if (v === CUSTOM_TERMINAL_ID) {
              return <>{t("settings.terminal.custom_option")}</>;
            }
            return (
              <>
                <TerminalIcon id={v as TerminalId} size={16} />
                {terminalName(v as TerminalId)}
              </>
            );
          }}
        >
          <MenuItem value="auto">
            {firstTerminal && <TerminalIcon id={firstTerminal} size={16} />}
            <MenuLabel indent={!!firstTerminal}>{terminalAutoLabel}</MenuLabel>
          </MenuItem>
          {installedTerminalIds.map((id) => (
            <MenuItem key={id} value={id}>
              <TerminalIcon id={id} size={16} />
              <MenuLabel indent>{terminalName(id)}</MenuLabel>
            </MenuItem>
          ))}
          <MenuItem value={CUSTOM_TERMINAL_ID}>
            <MenuLabel indent>{t("settings.terminal.custom_option")}</MenuLabel>
          </MenuItem>
        </WideSelect>
      </SettingsRow>

      {isProfileCapable && (
        <SettingsRow
          label={t("settings.terminal.profile_label")}
          sub={t("settings.terminal.profile_hint")}
        >
          <TextInput
            key={`profile-${defaultTerminal}`}
            type="text"
            defaultValue={backend?.terminal?.profile ?? ""}
            onBlur={(e) =>
              persist({
                terminal: {
                  id: backend?.terminal?.id ?? null,
                  profile: e.target.value.trim() || null,
                  customCommand: backend?.terminal?.customCommand ?? null,
                },
              })
            }
            aria-label={t("settings.terminal.profile_label")}
            data-testid={TEST_IDS.settings.general.terminalProfileInput}
          />
        </SettingsRow>
      )}

      {isCustomTerminal && (
        <SettingsRow
          label={t("settings.terminal.custom_command_label")}
          sub={t("settings.terminal.custom_command_hint")}
        >
          <CustomCommandRow>
            <CustomCommandInputRow>
              <TextInput
                key="custom-command"
                type="text"
                defaultValue={backend?.terminal?.customCommand ?? ""}
                onBlur={(e) => {
                  setTestMessage(null);
                  persist({
                    terminal: {
                      id: CUSTOM_TERMINAL_ID,
                      profile: backend?.terminal?.profile ?? null,
                      customCommand: e.target.value.trim() || null,
                    },
                  });
                }}
                aria-label={t("settings.terminal.custom_command_label")}
                data-testid={TEST_IDS.settings.general.terminalCustomCommandInput}
              />
              <GeneralButton
                variant="outline"
                size="default"
                onClick={() => {
                  const command = (backend?.terminal?.customCommand ?? "").trim();
                  if (!command) {
                    setTestMessage({
                      tone: "error",
                      text: t("settings.terminal.test_empty_command"),
                    });
                    return;
                  }
                  setTestMessage(null);
                  void testFeedback
                    .run(async () => {
                      // Empty cwd → backend resolves to $HOME.
                      await invoke<void>(TauriCommand.TEST_CUSTOM_TERMINAL, { command, cwd: "" });
                    })
                    .then(() => {
                      setTestMessage({
                        tone: "success",
                        text: t("settings.terminal.test_success"),
                      });
                    })
                    .catch((err: unknown) => {
                      const message =
                        err instanceof Error
                          ? err.message
                          : typeof err === "object" && err !== null && "message" in err
                            ? String((err as { message: unknown }).message)
                            : String(err);
                      setTestMessage({
                        tone: "error",
                        text: t("settings.terminal.test_failure", { error: message }),
                      });
                    });
                }}
                disabled={testFeedback.state === "loading"}
                feedbackState={testFeedback.state}
                loading={testFeedback.state === "loading"}
                data-testid={TEST_IDS.settings.general.terminalCustomCommandTest}
              >
                {t("settings.terminal.test_button")}
              </GeneralButton>
            </CustomCommandInputRow>
            {testMessage &&
              (testMessage.tone === "success" ? (
                <SuccessText component="p">{testMessage.text}</SuccessText>
              ) : (
                <ErrorText component="p">{testMessage.text}</ErrorText>
              ))}
          </CustomCommandRow>
        </SettingsRow>
      )}

      <SettingsRow
        label={t("settings.fields.default_shell")}
        sub={!firstShell ? t("settings.shell.detection_hint") : t("settings.shell.detection_done")}
      >
        <WideSelect
          size="small"
          value={defaultShell}
          onChange={(e: SelectChangeEvent<unknown>) => {
            const v = e.target.value as string;
            persist({ shell: v === "auto" ? null : v });
          }}
          slotProps={{ input: { "aria-label": t("settings.fields.default_shell") } }}
          data-testid={TEST_IDS.settings.general.defaultShellSelect}
          renderValue={(value) => {
            const v = value as string;
            if (v === "auto") {
              return (
                <>
                  {firstShell && <ShellIcon id={firstShell} size={16} />}
                  {shellAutoLabel}
                </>
              );
            }
            return (
              <>
                <ShellIcon id={v as ShellId} size={16} />
                {SHELL_DEFINITIONS[v as ShellId].name}
              </>
            );
          }}
        >
          <MenuItem value="auto">
            {firstShell && <ShellIcon id={firstShell} size={16} />}
            <MenuLabel indent={!!firstShell}>{shellAutoLabel}</MenuLabel>
          </MenuItem>
          {installedShellIds.map((id) => (
            <MenuItem key={id} value={id}>
              <ShellIcon id={id} size={16} />
              <MenuLabel indent>{SHELL_DEFINITIONS[id].name}</MenuLabel>
            </MenuItem>
          ))}
        </WideSelect>
      </SettingsRow>
    </SettingsSection>
  );
}

export default SystemSection;
