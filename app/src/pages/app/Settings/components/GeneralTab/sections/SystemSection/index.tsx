import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, MenuItem, type SelectChangeEvent, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  IDE_DEFINITIONS,
  IDE_IDS,
  type IdeId,
  POLLING_INTERVAL_MAX_MS,
  POLLING_INTERVAL_MIN_MS,
  SHELL_DEFINITIONS,
  SHELL_IDS,
  type ShellId,
  TERMINAL_DEFINITIONS,
  TERMINAL_IDS,
  type TerminalId,
} from "@recrest/shared";

import IdeIcon from "@/assets/icons/IdeIcon";
import ShellIcon from "@/assets/icons/ShellIcon";
import TerminalIcon from "@/assets/icons/TerminalIcon";
import { Platform, usePlatform } from "@/hooks/usePlatform";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SelectControl } from "@/pages/app/Settings/components/GeneralTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { setPollingIntervalMinutes } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const DETECTED_IDES: IdeId[] = ["vscode", "cursor"];

/** Stub-detected terminals + shells per platform. In Tauri-land Rust runs the
 *  real `which`/`where.exe` probe; in `yarn dev:web` we return a plausible
 *  default set so the dropdowns are usable for visual / interaction testing. */
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

export function SystemSection() {
  const { t } = useTranslation();
  const platform = usePlatform();
  const dispatch = useAppDispatch();
  const polling = useAppSelector((s) => s.settings.pollingIntervalMinutes);
  const [defaultIde, setDefaultIde] = useState<string>("auto");
  const [defaultTerminal, setDefaultTerminal] = useState<string>("auto");
  const [defaultShell, setDefaultShell] = useState<string>("auto");
  const detectedSet = new Set(DETECTED_IDES);

  const detectedTerminals = new Set<TerminalId>(DETECTED_TERMINALS_BY_PLATFORM[platform]);
  const detectedShells = new Set<ShellId>(DETECTED_SHELLS_BY_PLATFORM[platform]);
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
          data-testid={TEST_IDS.settings.general.pollingInput}
        />
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.default_ide")}
        sub={!firstDetected ? t("settings.ide.detection_hint") : undefined}
      >
        <SelectControl
          size="small"
          value={defaultIde}
          onChange={(e: SelectChangeEvent<unknown>) => setDefaultIde(e.target.value as string)}
          sx={{ minWidth: 260 }}
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
            <Box component="span" sx={{ ml: firstDetected ? 1 : 0 }}>
              {autoLabel}
            </Box>
          </MenuItem>
          {IDE_IDS.map((id) => {
            const detected = detectedSet.has(id);
            return (
              <MenuItem key={id} value={id} disabled={!detected}>
                <IdeIcon id={id} size={14} color={detected ? "brand" : "currentColor"} />
                <Box component="span" sx={{ ml: 1, opacity: detected ? 1 : 0.55 }}>
                  {IDE_DEFINITIONS[id].name}
                </Box>
                {!detected && (
                  <NotInstalledTag component="span" variant="caption">
                    {t("settings.ide.not_installed_tag")}
                  </NotInstalledTag>
                )}
              </MenuItem>
            );
          })}
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.default_terminal")}
        sub={
          !firstTerminal
            ? t("settings.terminal.detection_hint")
            : t("settings.terminal.detection_done")
        }
      >
        <SelectControl
          size="small"
          value={defaultTerminal}
          onChange={(e: SelectChangeEvent<unknown>) => setDefaultTerminal(e.target.value as string)}
          sx={{ minWidth: 260 }}
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
            <Box component="span" sx={{ ml: firstTerminal ? 1 : 0 }}>
              {terminalAutoLabel}
            </Box>
          </MenuItem>
          {installedTerminalIds.map((id) => (
            <MenuItem key={id} value={id}>
              <TerminalIcon id={id} size={16} />
              <Box component="span" sx={{ ml: 1 }}>
                {TERMINAL_DEFINITIONS[id].name}
              </Box>
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.default_shell")}
        sub={!firstShell ? t("settings.shell.detection_hint") : t("settings.shell.detection_done")}
      >
        <SelectControl
          size="small"
          value={defaultShell}
          onChange={(e: SelectChangeEvent<unknown>) => setDefaultShell(e.target.value as string)}
          sx={{ minWidth: 260 }}
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
            <Box component="span" sx={{ ml: firstShell ? 1 : 0 }}>
              {shellAutoLabel}
            </Box>
          </MenuItem>
          {installedShellIds.map((id) => (
            <MenuItem key={id} value={id}>
              <ShellIcon id={id} size={16} />
              <Box component="span" sx={{ ml: 1 }}>
                {SHELL_DEFINITIONS[id].name}
              </Box>
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>
    </SettingsSection>
  );
}

export default SystemSection;
