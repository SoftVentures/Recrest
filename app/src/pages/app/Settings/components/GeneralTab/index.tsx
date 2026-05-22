import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, MenuItem, Select, type SelectChangeEvent, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  type AccentId,
  type AutoUpdateMode,
  FONT_LABELS,
  type FontId,
  type FontSizeId,
  IDE_DEFINITIONS,
  IDE_IDS,
  type IdeId,
  MONO_FONT_IDS,
  POLLING_INTERVAL_MAX_MS,
  POLLING_INTERVAL_MIN_MS,
  SANS_FONT_IDS,
  SHELL_DEFINITIONS,
  SHELL_IDS,
  type ShellId,
  TERMINAL_DEFINITIONS,
  TERMINAL_IDS,
  TauriCommand,
  type TerminalId,
} from "@recrest/shared";

import {
  AArrowDown,
  AArrowUp,
  ALargeSmall,
  Ban,
  BellRing,
  DownloadCloud,
  Layers,
  Monitor,
  Moon,
  Send,
  Sparkles,
  Sun,
  Type,
} from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralIdeIcon from "@/components/atoms/icons/IdeIcon";
import GeneralShellIcon from "@/components/atoms/icons/ShellIcon";
import GeneralTerminalIcon from "@/components/atoms/icons/TerminalIcon";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { usePlatform } from "@/hooks/usePlatform";
import {
  PRIMARY_COLOR_SCHEMES,
  type PrimaryColorScheme,
  THEMES,
  type ThemeId,
} from "@/lib/constants/theme.constants";
import { invoke, isTauri } from "@/lib/tauri";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  setDesktopAutoStart,
  setDesktopCloseToTray,
  setDesktopStartMinimized,
  setFollowsSystem,
  setFont,
  setFontSize,
  setHighContrast,
  setLocale,
  setNotificationsCiFailed,
  setNotificationsEnabled,
  setNotificationsMergeReady,
  setNotificationsNewPr,
  setPollingIntervalMinutes,
  setPrimaryColor,
  setReducedMotion,
  setThemeId,
  setUnderlineLinks,
  setUpdateMode,
} from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const SelectControl = styled(Select)(({ theme }) => ({
  minWidth: 180,
  height: 32,
  backgroundColor: theme.palette.surface.interface.backElevation,
  borderRadius: 8,
  fontSize: 12.5,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.divider },
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
}));

const Swatches = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
});

interface SwatchProps {
  color: string;
  active?: boolean;
}
const Swatch = styled("button", {
  shouldForwardProp: (p) => p !== "color" && p !== "active",
})<SwatchProps>(({ theme, color, active }) => ({
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: color,
  border: 0,
  cursor: "pointer",
  padding: 0,
  outline: active ? `2px solid ${theme.palette.text.primary}` : "none",
  outlineOffset: 2,
  transition: "outline-color 0.15s ease",
  "&:hover": { outline: `2px solid ${theme.palette.text.secondary}`, outlineOffset: 2 },
}));

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

const InlineRow = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
});

const TestBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  height: 28,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

const VersionText = styled("span")(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12,
  color: theme.palette.text.information,
}));

const HintText = styled("span")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
}));

const LOCALES: { code: string; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

const ACCENT_SCHEME_MAP: Record<AccentId, PrimaryColorScheme> = {
  coral: "default",
  blue: "blue",
  green: "green",
  purple: "purple",
  pink: "pink",
  amber: "amber",
};
const SCHEME_TO_ACCENT: Record<PrimaryColorScheme, AccentId> = {
  default: "coral",
  blue: "blue",
  green: "green",
  purple: "purple",
  pink: "pink",
  amber: "amber",
};
const ACCENT_IDS: AccentId[] = ["coral", "blue", "green", "purple", "pink", "amber"];

const FONT_SIZE_IDS: FontSizeId[] = ["sm", "md", "lg", "xl"];

function fontCssFamily(id: FontId): string {
  switch (id) {
    case "inter":
      return "Inter, system-ui, sans-serif";
    case "manrope":
      return "Manrope, system-ui, sans-serif";
    case "plex":
      return '"IBM Plex Sans", system-ui, sans-serif';
    case "geist":
      return "Geist, system-ui, sans-serif";
    case "system":
      return "-apple-system, 'Segoe UI', system-ui, sans-serif";
    case "opendyslexic":
      return "OpenDyslexic, system-ui, sans-serif";
    case "jetbrains-mono":
      return '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "fira-code":
      return '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "geist-mono":
      return '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "plex-mono":
      return '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "sf-mono":
      return 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
  }
}

function fontSizeLabel(id: FontSizeId): string {
  switch (id) {
    case "sm":
      return "Small";
    case "md":
      return "Medium";
    case "lg":
      return "Large";
    case "xl":
      return "Extra large";
  }
}

function FontSizeIcon({ id }: { id: FontSizeId }) {
  switch (id) {
    case "sm":
      return <AArrowDown size={13} />;
    case "md":
      return <ALargeSmall size={13} />;
    case "lg":
      return <Type size={13} />;
    case "xl":
      return <AArrowUp size={13} />;
  }
}

type ThemeChoice = "system" | ThemeId;

function ThemeChoiceIcon({ choice }: { choice: ThemeChoice }) {
  if (choice === "system") return <Monitor size={13} />;
  if (choice === "light") return <Sun size={13} />;
  if (choice === "dark") return <Moon size={13} />;
  if (choice === "oled") return <Layers size={13} />;
  if (choice === "glassy") return <Sparkles size={13} />;
  return <Monitor size={13} />;
}

function themeChoiceLabel(choice: ThemeChoice): string {
  if (choice === "system") return "System";
  const t = THEMES.find((th) => th.id === choice);
  return t?.label ?? "Light";
}

const THEME_CHOICES: ThemeChoice[] = ["system", "light", "dark", "oled", "glassy"];

/* ─── Appearance ─── */

export function AppearanceSection() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const primaryColor = useAppSelector((s) => s.settings.primaryColor);

  const themeId = useAppSelector((s) => s.settings.themeId);
  const followsSystem = useAppSelector((s) => s.settings.followsSystem);
  const themeChoice: ThemeChoice = followsSystem ? "system" : themeId;
  const font = useAppSelector((s) => s.settings.font);
  const fontSize = useAppSelector((s) => s.settings.fontSize);

  const onThemeChoice = (choice: ThemeChoice) => {
    if (choice === "system") {
      dispatch(setFollowsSystem(true));
    } else {
      dispatch(setThemeId(choice));
    }
  };

  const currentAccent = SCHEME_TO_ACCENT[primaryColor];

  return (
    <SettingsSection title={t("settings.general.appearance", "Appearance")}>
      <SettingsRow
        label={t("settings.fields.theme", { defaultValue: "Theme" })}
        sub={t("settings.fields.theme_sub", { defaultValue: "Light, dark, or follow the OS." })}
      >
        <SelectControl
          size="small"
          value={themeChoice}
          onChange={(e: SelectChangeEvent<unknown>) => onThemeChoice(e.target.value as ThemeChoice)}
          data-testid="settings-theme-select"
          sx={{ minWidth: 200 }}
          renderValue={(value) => {
            const c = value as ThemeChoice;
            return (
              <>
                <ThemeChoiceIcon choice={c} />
                {themeChoiceLabel(c)}
              </>
            );
          }}
        >
          {THEME_CHOICES.map((c) => (
            <MenuItem key={c} value={c}>
              <ThemeChoiceIcon choice={c} />
              <Box component="span" sx={{ ml: 1 }}>
                {themeChoiceLabel(c)}
              </Box>
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.language", { defaultValue: "Language" })}
        sub={t("settings.fields.language_sub", { defaultValue: "Interface language." })}
      >
        <SelectControl
          size="small"
          value={i18n.language.split("-")[0] ?? "en"}
          onChange={(e: SelectChangeEvent<unknown>) => {
            const next = e.target.value as string;
            void i18n.changeLanguage(next);
            dispatch(setLocale(next));
          }}
          data-testid="settings-locale-select"
        >
          {LOCALES.map((l) => (
            <MenuItem key={l.code} value={l.code}>
              <Box component="span" sx={{ mr: 1 }}>
                {l.flag}
              </Box>
              {l.label}
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.accent", { defaultValue: "Accent" })}
        sub={t("settings.fields.accent_sub", {
          defaultValue: "Pick the highlight colour used across the app.",
        })}
      >
        <Swatches data-testid="settings-accent-swatches">
          {ACCENT_IDS.map((id) => {
            const scheme = ACCENT_SCHEME_MAP[id];
            return (
              <Tooltip key={id} title={id} arrow placement="top">
                <Swatch
                  type="button"
                  color={PRIMARY_COLOR_SCHEMES[scheme].MAIN}
                  active={currentAccent === id}
                  aria-label={id}
                  aria-pressed={currentAccent === id}
                  data-testid={`accent-chip-${id}`}
                  onClick={() => dispatch(setPrimaryColor(scheme))}
                />
              </Tooltip>
            );
          })}
        </Swatches>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.font", { defaultValue: "Font" })}
        sub={t("settings.fields.font_sub", {
          defaultValue:
            "Typeface used across the interface. OpenDyslexic is a dyslexia-friendly font.",
        })}
      >
        <SelectControl
          size="small"
          value={font}
          onChange={(e: SelectChangeEvent<unknown>) => dispatch(setFont(e.target.value as FontId))}
          sx={{ minWidth: 220 }}
          data-testid="settings-font-select"
          renderValue={(value) => (
            <span style={{ fontFamily: fontCssFamily(value as FontId) }}>
              {FONT_LABELS[value as FontId]}
            </span>
          )}
        >
          <Box
            component="li"
            sx={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "text.information",
              px: 2,
              py: 1,
              pointerEvents: "none",
            }}
          >
            Sans
          </Box>
          {SANS_FONT_IDS.map((f) => (
            <MenuItem key={f} value={f}>
              <span style={{ fontFamily: fontCssFamily(f) }}>{FONT_LABELS[f]}</span>
            </MenuItem>
          ))}
          <Box
            component="li"
            sx={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "text.information",
              px: 2,
              py: 1,
              pointerEvents: "none",
              borderTop: (t) => `1px solid ${t.palette.divider}`,
              mt: 0.5,
            }}
          >
            Monospace
          </Box>
          {MONO_FONT_IDS.map((f) => (
            <MenuItem key={f} value={f}>
              <span style={{ fontFamily: fontCssFamily(f) }}>{FONT_LABELS[f]}</span>
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.font_size", { defaultValue: "Font size" })}
        sub={t("settings.fields.font_size_sub", {
          defaultValue: "Scale text everywhere from compact to spacious.",
        })}
      >
        <SelectControl
          size="small"
          value={fontSize}
          onChange={(e: SelectChangeEvent<unknown>) =>
            dispatch(setFontSize(e.target.value as FontSizeId))
          }
          sx={{ minWidth: 180 }}
          data-testid="settings-font-size-select"
          renderValue={(value) => (
            <>
              <FontSizeIcon id={value as FontSizeId} />
              {fontSizeLabel(value as FontSizeId)}
            </>
          )}
        >
          {FONT_SIZE_IDS.map((sz) => (
            <MenuItem key={sz} value={sz}>
              <FontSizeIcon id={sz} />
              <Box component="span" sx={{ ml: 1 }}>
                {fontSizeLabel(sz)}
              </Box>
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>
    </SettingsSection>
  );
}

/* ─── Accessibility ─── */

export function AccessibilitySection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const highContrast = useAppSelector((s) => s.settings.highContrast);
  const reducedMotion = useAppSelector((s) => s.settings.reducedMotion);
  const underlineLinks = useAppSelector((s) => s.settings.underlineLinks);

  return (
    <SettingsSection title={t("settings.accessibility.title", "Accessibility")}>
      <SettingsRow
        label={t("settings.accessibility.high_contrast", { defaultValue: "High contrast" })}
        sub={t("settings.accessibility.high_contrast_sub", {
          defaultValue: "Reinforce borders and dim text for better legibility.",
        })}
      >
        <GeneralSwitchInput
          checked={highContrast}
          onCheckedChange={(v) => dispatch(setHighContrast(v))}
          data-testid="settings-a11y-high-contrast"
        />
      </SettingsRow>
      <SettingsRow
        label={t("settings.accessibility.reduced_motion", { defaultValue: "Reduce motion" })}
        sub={t("settings.accessibility.reduced_motion_sub", {
          defaultValue: "Disable non-essential animations and transitions.",
        })}
      >
        <GeneralSwitchInput
          checked={reducedMotion}
          onCheckedChange={(v) => dispatch(setReducedMotion(v))}
          data-testid="settings-a11y-reduced-motion"
        />
      </SettingsRow>
      <SettingsRow
        label={t("settings.accessibility.underline_links", { defaultValue: "Underline links" })}
        sub={t("settings.accessibility.underline_links_sub", {
          defaultValue: "Always underline links instead of only on hover.",
        })}
      >
        <GeneralSwitchInput
          checked={underlineLinks}
          onCheckedChange={(v) => dispatch(setUnderlineLinks(v))}
          data-testid="settings-a11y-underline-links"
        />
      </SettingsRow>
    </SettingsSection>
  );
}

/* ─── System (Polling + Default IDE) ─── */

const IDE_NOT_INSTALLED_TAG = styled("span")(({ theme }) => ({
  marginLeft: 6,
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "1px 6px",
  borderRadius: 100,
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.information,
}));

const DETECTED_IDES: IdeId[] = ["vscode", "cursor"];

/** Stub-detected terminals + shells per platform. In Tauri-land Rust runs the
 *  real `which`/`where.exe` probe; in `yarn dev:web` we return a plausible
 *  default set so the dropdowns are usable for visual / interaction testing. */
const DETECTED_TERMINALS_BY_PLATFORM: Record<"mac" | "windows" | "linux", TerminalId[]> = {
  mac: ["apple-terminal", "iterm2", "warp"],
  windows: ["windows-terminal", "powershell", "cmd"],
  linux: ["gnome-terminal", "xterm"],
};

const DETECTED_SHELLS_BY_PLATFORM: Record<"mac" | "windows" | "linux", ShellId[]> = {
  mac: ["zsh", "bash"],
  windows: ["powershell-core", "windows-powershell", "cmd", "git-bash"],
  linux: ["bash", "zsh"],
};

function TerminalIconFor({ id }: { id: TerminalId }) {
  return <GeneralTerminalIcon id={id} size={16} />;
}

function ShellIconFor({ id }: { id: ShellId }) {
  return <GeneralShellIcon id={id} size={16} />;
}

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
  // Platform-filtered display order — only show terminals/shells that can
  // actually run on the current OS; the rest would never light up anyway.
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
        defaultValue: `System default · ${TERMINAL_DEFINITIONS[firstTerminal].name}`,
      })
    : t("settings.terminal.no_terminal_detected", {
        defaultValue: "No terminal detected",
      });
  const shellAutoLabel = firstShell
    ? t("settings.shell.auto_system_default", {
        shell: SHELL_DEFINITIONS[firstShell].name,
        defaultValue: `System default · ${SHELL_DEFINITIONS[firstShell].name}`,
      })
    : t("settings.shell.no_shell_detected", { defaultValue: "No shell detected" });

  // Only show terminals / shells that are actually installed on this
  // machine. "not installed" rows would just be noise — the user can
  // re-open the dropdown after installing what they need.
  const installedTerminalIds = visibleTerminalIds.filter((id) => detectedTerminals.has(id));
  const installedShellIds = visibleShellIds.filter((id) => detectedShells.has(id));
  const firstDetected = IDE_IDS.find((id) => detectedSet.has(id)) ?? null;
  const autoLabel = firstDetected
    ? t("settings.ide.auto_system_default", {
        ide: IDE_DEFINITIONS[firstDetected].name,
        defaultValue: `Auto · ${IDE_DEFINITIONS[firstDetected].name}`,
      })
    : t("settings.ide.no_ide_detected", { defaultValue: "No IDE detected" });

  return (
    <SettingsSection title={t("settings.sections.system", "System")}>
      <SettingsRow
        label={t("settings.fields.polling_interval", {
          defaultValue: "Polling interval (minutes)",
        })}
        sub={t("settings.fields.polling_interval_hint", {
          defaultValue: "How often Recrest refreshes git state in the background.",
        })}
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
          data-testid="settings-polling-input"
        />
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.default_ide", { defaultValue: "Default IDE" })}
        sub={
          !firstDetected
            ? t("settings.ide.detection_hint", {
                defaultValue:
                  "We didn't find a known IDE on $PATH. Install one or pick manually below.",
              })
            : undefined
        }
      >
        <SelectControl
          size="small"
          value={defaultIde}
          onChange={(e: SelectChangeEvent<unknown>) => setDefaultIde(e.target.value as string)}
          sx={{ minWidth: 260 }}
          data-testid="settings-default-ide-select"
          renderValue={(value) => {
            const v = value as string;
            if (v === "auto") {
              return (
                <>
                  {firstDetected && <GeneralIdeIcon id={firstDetected} size={14} />}
                  {autoLabel}
                </>
              );
            }
            return (
              <>
                <GeneralIdeIcon id={v as (typeof IDE_IDS)[number]} size={14} />
                {IDE_DEFINITIONS[v as (typeof IDE_IDS)[number]].name}
              </>
            );
          }}
        >
          <MenuItem value="auto">
            {firstDetected && <GeneralIdeIcon id={firstDetected} size={14} />}
            <Box component="span" sx={{ ml: firstDetected ? 1 : 0 }}>
              {autoLabel}
            </Box>
          </MenuItem>
          {IDE_IDS.map((id) => {
            const detected = detectedSet.has(id);
            return (
              <MenuItem key={id} value={id} disabled={!detected}>
                <GeneralIdeIcon id={id} size={14} color={detected ? "brand" : "currentColor"} />
                <Box component="span" sx={{ ml: 1, opacity: detected ? 1 : 0.55 }}>
                  {IDE_DEFINITIONS[id].name}
                </Box>
                {!detected && (
                  <IDE_NOT_INSTALLED_TAG>
                    {t("settings.ide.not_installed_tag", { defaultValue: "not installed" })}
                  </IDE_NOT_INSTALLED_TAG>
                )}
              </MenuItem>
            );
          })}
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.default_terminal", { defaultValue: "Default terminal" })}
        sub={
          !firstTerminal
            ? t("settings.terminal.detection_hint", {
                defaultValue:
                  "No installed terminal emulators were detected. Install one to enable this dropdown.",
              })
            : t("settings.terminal.detection_done", {
                defaultValue: "Opens this terminal when you trigger “Open terminal”.",
              })
        }
      >
        <SelectControl
          size="small"
          value={defaultTerminal}
          onChange={(e: SelectChangeEvent<unknown>) => setDefaultTerminal(e.target.value as string)}
          sx={{ minWidth: 260 }}
          data-testid="settings-default-terminal-select"
          renderValue={(value) => {
            const v = value as string;
            if (v === "auto") {
              return (
                <>
                  {firstTerminal && <TerminalIconFor id={firstTerminal} />}
                  {terminalAutoLabel}
                </>
              );
            }
            return (
              <>
                <TerminalIconFor id={v as TerminalId} />
                {TERMINAL_DEFINITIONS[v as TerminalId].name}
              </>
            );
          }}
        >
          <MenuItem value="auto">
            {firstTerminal && <TerminalIconFor id={firstTerminal} />}
            <Box component="span" sx={{ ml: firstTerminal ? 1 : 0 }}>
              {terminalAutoLabel}
            </Box>
          </MenuItem>
          {installedTerminalIds.map((id) => (
            <MenuItem key={id} value={id}>
              <TerminalIconFor id={id} />
              <Box component="span" sx={{ ml: 1 }}>
                {TERMINAL_DEFINITIONS[id].name}
              </Box>
            </MenuItem>
          ))}
        </SelectControl>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.default_shell", { defaultValue: "Default shell" })}
        sub={
          !firstShell
            ? t("settings.shell.detection_hint", {
                defaultValue:
                  "No shells were detected on $PATH. Install one or pick manually below.",
              })
            : t("settings.shell.detection_done", {
                defaultValue: "Shell launched inside the terminal above.",
              })
        }
      >
        <SelectControl
          size="small"
          value={defaultShell}
          onChange={(e: SelectChangeEvent<unknown>) => setDefaultShell(e.target.value as string)}
          sx={{ minWidth: 260 }}
          data-testid="settings-default-shell-select"
          renderValue={(value) => {
            const v = value as string;
            if (v === "auto") {
              return (
                <>
                  {firstShell && <ShellIconFor id={firstShell} />}
                  {shellAutoLabel}
                </>
              );
            }
            return (
              <>
                <ShellIconFor id={v as ShellId} />
                {SHELL_DEFINITIONS[v as ShellId].name}
              </>
            );
          }}
        >
          <MenuItem value="auto">
            {firstShell && <ShellIconFor id={firstShell} />}
            <Box component="span" sx={{ ml: firstShell ? 1 : 0 }}>
              {shellAutoLabel}
            </Box>
          </MenuItem>
          {installedShellIds.map((id) => (
            <MenuItem key={id} value={id}>
              <ShellIconFor id={id} />
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

/* ─── Desktop (auto-start / start-minimized / close-to-tray) ─── */

export function DesktopSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { autoStart, startMinimized, closeToTray } = useAppSelector((s) => s.settings.desktop);

  return (
    <SettingsSection title={t("settings.sections.desktop", "Desktop")}>
      <SettingsRow
        label={t("settings.desktop.auto_start", { defaultValue: "Start on system login" })}
        sub={t("settings.desktop.auto_start_desc", {
          defaultValue: "Launch Recrest automatically when you sign in to your OS.",
        })}
      >
        <GeneralSwitchInput
          checked={autoStart}
          onCheckedChange={(v) => dispatch(setDesktopAutoStart(v))}
          data-testid="settings-desktop-auto-start"
        />
      </SettingsRow>
      <SettingsRow
        label={t("settings.desktop.start_minimized", { defaultValue: "Start minimized" })}
        sub={t("settings.desktop.start_minimized_desc", {
          defaultValue: "Open silently to the tray instead of foregrounding the window.",
        })}
      >
        <GeneralSwitchInput
          checked={startMinimized}
          onCheckedChange={(v) => dispatch(setDesktopStartMinimized(v))}
          data-testid="settings-desktop-start-minimized"
        />
      </SettingsRow>
      <SettingsRow
        label={t("settings.desktop.close_to_tray", { defaultValue: "Close to tray" })}
        sub={t("settings.desktop.close_to_tray_desc", {
          defaultValue:
            "Closing the window keeps Recrest running in the tray. Quit from the tray menu.",
        })}
      >
        <GeneralSwitchInput
          checked={closeToTray}
          onCheckedChange={(v) => dispatch(setDesktopCloseToTray(v))}
          data-testid="settings-desktop-close-to-tray"
        />
      </SettingsRow>
    </SettingsSection>
  );
}

/* ─── Notifications (master + 3 child + test buttons) ─── */

type NotificationKind = "new_pr" | "ci_failed" | "merge_ready" | "generic";

async function sendTestNotification(kind: NotificationKind): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke(TauriCommand.NOTIFY, {
      kind,
      title:
        kind === "new_pr"
          ? "New merge request"
          : kind === "ci_failed"
            ? "CI failed"
            : kind === "merge_ready"
              ? "Ready to merge"
              : "Recrest",
      body: "This is a test notification from Recrest settings.",
    });
  } catch (err) {
    console.warn("[settings] test notification failed", err);
  }
}

export function NotificationsSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enabled, newPr, ciFailed, mergeReady } = useAppSelector((s) => s.settings.notifications);
  const setEnabled = (v: boolean) => dispatch(setNotificationsEnabled(v));
  const setNewPr = (v: boolean) => dispatch(setNotificationsNewPr(v));
  const setCiFailed = (v: boolean) => dispatch(setNotificationsCiFailed(v));
  const setMergeReady = (v: boolean) => dispatch(setNotificationsMergeReady(v));

  const TestPair = ({
    checked,
    onChange,
    show,
    testId,
    kind,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    show: boolean;
    testId: string;
    kind: NotificationKind;
  }) => (
    <InlineRow>
      {show && (
        <TestBtn
          type="button"
          aria-label="Send test notification"
          onClick={() => void sendTestNotification(kind)}
        >
          <Send size={11} /> Test
        </TestBtn>
      )}
      <GeneralSwitchInput
        checked={checked}
        onCheckedChange={onChange}
        disabled={!enabled && testId !== "master"}
        data-testid={`settings-notifications-${testId}`}
      />
    </InlineRow>
  );

  return (
    <SettingsSection title={t("settings.sections.notifications", "Notifications")}>
      <SettingsRow
        label={t("settings.notifications.enabled", { defaultValue: "Desktop notifications" })}
        sub={t("settings.notifications.enabled_desc", {
          defaultValue: "Surface new MRs and CI failures as system notifications.",
        })}
      >
        <InlineRow>
          {enabled && (
            <TestBtn
              type="button"
              aria-label="Send test notification"
              onClick={() => void sendTestNotification("generic")}
            >
              <Send size={11} /> Test
            </TestBtn>
          )}
          <GeneralSwitchInput
            checked={enabled}
            onCheckedChange={setEnabled}
            data-testid="settings-notifications-master"
          />
        </InlineRow>
      </SettingsRow>
      <SettingsRow
        label={t("settings.notifications.new_pr", { defaultValue: "New merge request" })}
      >
        <TestPair
          checked={newPr}
          onChange={setNewPr}
          show={enabled && newPr}
          testId="new-pr"
          kind="new_pr"
        />
      </SettingsRow>
      <SettingsRow label={t("settings.notifications.ci_failed", { defaultValue: "CI failed" })}>
        <TestPair
          checked={ciFailed}
          onChange={setCiFailed}
          show={enabled && ciFailed}
          testId="ci-failed"
          kind="ci_failed"
        />
      </SettingsRow>
      <SettingsRow
        label={t("settings.notifications.merge_ready", { defaultValue: "Ready to merge" })}
      >
        <TestPair
          checked={mergeReady}
          onChange={setMergeReady}
          show={enabled && mergeReady}
          testId="merge-ready"
          kind="merge_ready"
        />
      </SettingsRow>
    </SettingsSection>
  );
}

/* ─── Updates ─── */

const UPDATE_MODES: { value: AutoUpdateMode; label: string; icon: typeof DownloadCloud }[] = [
  { value: "auto", label: "Automatic", icon: DownloadCloud },
  { value: "manual", label: "Manual", icon: BellRing },
  { value: "off", label: "Off", icon: Ban },
];

export function UpdatesSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.settings.updates.mode);
  const [checking, setChecking] = useState(false);

  return (
    <SettingsSection title={t("settings.sections.updates", "Updates")}>
      <SettingsRow
        label={t("settings.updates.current_version_label", { defaultValue: "Current version" })}
      >
        <VersionText>v0.7.0</VersionText>
      </SettingsRow>
      <SettingsRow
        label={t("settings.updates.mode", { defaultValue: "Update mode" })}
        sub={t("settings.updates.mode_hint", {
          defaultValue:
            "Automatic downloads + installs silently. Manual prompts a banner. Off disables checks.",
        })}
      >
        <SelectControl
          size="small"
          value={mode}
          onChange={(e: SelectChangeEvent<unknown>) =>
            dispatch(setUpdateMode(e.target.value as AutoUpdateMode))
          }
          sx={{ minWidth: 200 }}
          data-testid="settings-update-mode-select"
        >
          {UPDATE_MODES.map((m) => {
            const I = m.icon;
            return (
              <MenuItem key={m.value} value={m.value}>
                <I size={13} />
                <Box component="span" sx={{ ml: 1 }}>
                  {m.label}
                </Box>
              </MenuItem>
            );
          })}
        </SelectControl>
      </SettingsRow>
      <SettingsRow label={t("settings.updates.check_now", { defaultValue: "Check for updates" })}>
        <GeneralButton
          variant="outline"
          size="sm"
          loading={checking}
          onClick={async () => {
            setChecking(true);
            try {
              if (isTauri()) await invoke(TauriCommand.CHECK_FOR_UPDATE);
            } catch (err) {
              console.warn("[settings] update check failed", err);
            } finally {
              setChecking(false);
            }
          }}
          data-testid="settings-update-check-now"
        >
          {checking
            ? t("settings.updates.checking", { defaultValue: "Checking…" })
            : t("settings.updates.check_now", { defaultValue: "Check now" })}
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

// Silence the unused-warning for the hint helper used only in tooltips.
void HintText;
