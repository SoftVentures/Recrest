import { useEffect } from "react";

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
  type TerminalId,
} from "@recrest/shared";

import { toast } from "sonner";

import IdeIcon from "@/assets/icons/IdeIcon";
import ShellIcon from "@/assets/icons/ShellIcon";
import TerminalIcon from "@/assets/icons/TerminalIcon";
import { Platform, usePlatform } from "@/hooks/usePlatform";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import { SelectControl } from "@/pages/app/Settings/components/GeneralTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  loadDetectedIdes,
  loadDetectedShells,
  loadDetectedTerminals,
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

const NotInstalledTag = styled(Typography)(({ theme }) => ({
  marginLeft: 6,
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "1px 6px",
  borderRadius: 100,
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.information,
})) as typeof Typography;

const WideSelect = styled(SelectControl)({ minWidth: 260 });

const MenuLabel = styled(Box, {
  shouldForwardProp: (p) => p !== "indent" && p !== "dimmed",
})<{ indent?: boolean; dimmed?: boolean }>(({ theme, indent, dimmed }) => ({
  display: "inline-block",
  marginLeft: indent ? theme.spacing(1) : 0,
  opacity: dimmed ? 0.55 : 1,
}));

export function SystemSection() {
  const { t } = useTranslation();
  const platform = usePlatform();
  const dispatch = useAppDispatch();
  const polling = useAppSelector((s) => s.settings.pollingIntervalMinutes);
  // Source of truth is the persisted backend settings, not local state — local
  // state was lost on tab switch (component remount), resetting the dropdowns.
  const backend = useAppSelector((s) => s.settings.backend);
  const detectedTerminalsState = useAppSelector((s) => s.settings.detectedTerminals);
  const detectedShellsState = useAppSelector((s) => s.settings.detectedShells);
  const detectedIdesState = useAppSelector((s) => s.settings.detectedIdes);
  const defaultIde = backend?.defaultIde ?? "auto";
  const defaultTerminal = backend?.terminal?.id ?? "auto";
  const defaultShell = backend?.shell ?? "auto";

  // Tauri-only: kick off the real OS probe once. Outside Tauri the thunks would
  // throw `tauri-ipc-unavailable`, so the stub maps below stay authoritative.
  useEffect(() => {
    if (!isTauri()) return;
    void dispatch(loadDetectedTerminals());
    void dispatch(loadDetectedShells());
    void dispatch(loadDetectedIdes());
  }, [dispatch]);

  const persist = (patch: Partial<AppSettings>) => {
    void dispatch(saveSettings(patch))
      .unwrap()
      .then(() => toast.success(t("settings.saved")))
      .catch((err) => toast.error(String((err as Error)?.message ?? err)));
  };

  // Real OS probe (`detect_ides`); `null` until it resolves (and in non-Tauri
  // contexts like Storybook) → no IDE shown as installed until we actually know.
  const detectedSet = new Set<string>(detectedIdesState ?? []);

  const detectedTerminals = new Set<TerminalId>(
    detectedTerminalsState
      ? detectedTerminalsState.filter((d) => d.available).map((d) => d.id)
      : DETECTED_TERMINALS_BY_PLATFORM[platform],
  );
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
  const platformMap = {
    mac: "macos" as const,
    windows: "windows" as const,
    linux: "linux" as const,
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
        terminal: TERMINAL_DEFINITIONS[firstTerminal].name,
      })
    : t("settings.terminal.no_terminal_detected");
  const shellAutoLabel = firstShell
    ? t("settings.shell.auto_system_default", { shell: SHELL_DEFINITIONS[firstShell].name })
    : t("settings.shell.no_shell_detected");

  const installedTerminalIds = visibleTerminalIds.filter((id) => detectedTerminals.has(id));
  const installedShellIds = visibleShellIds.filter((id) => detectedShells.has(id));
  const firstDetected = IDE_IDS.find((id) => detectedSet.has(id)) ?? null;
  const autoLabel = firstDetected
    ? t("settings.ide.auto_system_default", { ide: IDE_DEFINITIONS[firstDetected].name })
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
                {IDE_DEFINITIONS[v as (typeof IDE_IDS)[number]].name}
              </>
            );
          }}
        >
          <MenuItem value="auto">
            {firstDetected && <IdeIcon id={firstDetected} size={14} />}
            <MenuLabel indent={!!firstDetected}>{autoLabel}</MenuLabel>
          </MenuItem>
          {IDE_IDS.map((id) => {
            const detected = detectedSet.has(id);
            return (
              <MenuItem key={id} value={id} disabled={!detected}>
                <IdeIcon id={id} size={14} color={detected ? "brand" : "currentColor"} />
                <MenuLabel indent dimmed={!detected}>
                  {IDE_DEFINITIONS[id].name}
                </MenuLabel>
                {!detected && (
                  <NotInstalledTag component="span" variant="caption">
                    {t("settings.ide.not_installed_tag")}
                  </NotInstalledTag>
                )}
              </MenuItem>
            );
          })}
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
                {TERMINAL_DEFINITIONS[v as TerminalId].name}
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
              <MenuLabel indent>{TERMINAL_DEFINITIONS[id].name}</MenuLabel>
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
          <TextInput
            key="custom-command"
            type="text"
            defaultValue={backend?.terminal?.customCommand ?? ""}
            onBlur={(e) =>
              persist({
                terminal: {
                  id: CUSTOM_TERMINAL_ID,
                  profile: backend?.terminal?.profile ?? null,
                  customCommand: e.target.value.trim() || null,
                },
              })
            }
            aria-label={t("settings.terminal.custom_command_label")}
            data-testid={TEST_IDS.settings.general.terminalCustomCommandInput}
          />
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
