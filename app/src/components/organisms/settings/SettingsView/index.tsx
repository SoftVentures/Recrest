import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Icon, type IconName } from "@/components/atoms/Icon";
import { ProviderAuth } from "@/components/organisms/settings/ProviderAuth";
import { RepoSources } from "@/components/organisms/settings/RepoSources";
import { AboutTabBody } from "@/components/organisms/settings/tabs/AboutTab";
import { AppearanceSettings } from "@/components/organisms/settings/tabs/AppearanceSettings";
import { DesktopSettings } from "@/components/organisms/settings/tabs/DesktopSettings";
import { DiagnosticsSettings } from "@/components/organisms/settings/tabs/DiagnosticsSettings";
import { NotificationSettings } from "@/components/organisms/settings/tabs/NotificationSettings";
import { SystemSettings } from "@/components/organisms/settings/tabs/SystemSettings";
import { UpdatesSettings } from "@/components/organisms/settings/tabs/UpdatesSettings";
import { formatShortcut, usePlatform } from "@/hooks/usePlatform";
import { useAppDispatch } from "@/store/hooks";
import { loadProviders } from "@/store/slices/providersSlice";
import { loadSettings } from "@/store/slices/settingsSlice";

type TabId = "general" | "accounts" | "integrations" | "shortcuts" | "storage" | "about";

const TABS: { id: TabId; icon: IconName; labelKey: string }[] = [
  { id: "general", icon: "settings", labelKey: "settings.tab.general" },
  { id: "accounts", icon: "user", labelKey: "settings.tab.accounts" },
  { id: "integrations", icon: "code", labelKey: "settings.tab.integrations" },
  { id: "shortcuts", icon: "terminal", labelKey: "settings.tab.shortcuts" },
  { id: "storage", icon: "folder", labelKey: "settings.tab.storage" },
  { id: "about", icon: "box", labelKey: "settings.tab.about" },
];

export function SettingsView() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<TabId>("general");

  useEffect(() => {
    void dispatch(loadSettings());
    void dispatch(loadProviders());
  }, [dispatch]);

  return (
    <div className="a-settings p-settings" data-testid="settings-view">
      <aside className="a-settings-nav" role="tablist" data-testid="settings-tabs">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            className="a-settings-tab"
            data-active={tab === tb.id ? "true" : undefined}
            data-testid={`settings-tab-${tb.id}`}
            onClick={() => setTab(tb.id)}
          >
            <Icon name={tb.icon} size={13} />
            <span>{t(tb.labelKey)}</span>
          </button>
        ))}
      </aside>
      <div className="a-settings-body" data-testid={`settings-panel-${tab}`}>
        {tab === "general" && <SettingsGeneralTab />}
        {tab === "accounts" && <SettingsAccountsTab />}
        {tab === "integrations" && <SettingsIntegrationsTab />}
        {tab === "shortcuts" && <SettingsShortcutsTab />}
        {tab === "storage" && <SettingsStorageTab />}
        {tab === "about" && <SettingsAboutTab />}
      </div>
    </div>
  );
}

function SettingsGeneralTab() {
  const { t } = useTranslation();

  return (
    <div className="a-set-page">
      <div className="a-set-head">
        <h2>{t("settings.general.title")}</h2>
        <p>{t("settings.general.intro")}</p>
      </div>
      <AppearanceSettings />
      <SystemSettings />
      <DesktopSettings />
      <NotificationSettings />
      <UpdatesSettings />
    </div>
  );
}

function SettingsAccountsTab() {
  const { t } = useTranslation();
  return (
    <div className="a-set-page">
      <div className="a-set-head">
        <h2>{t("settings.accounts.title")}</h2>
        <p>{t("settings.accounts.intro")}</p>
      </div>
      <ProviderAuth />
    </div>
  );
}

function SettingsIntegrationsTab() {
  const { t } = useTranslation();
  return (
    <div className="a-set-page">
      <div className="a-set-head">
        <h2>{t("settings.integrations.title")}</h2>
        <p>{t("settings.integrations.intro")}</p>
      </div>
      <RepoSources />
    </div>
  );
}

function SettingsShortcutsTab() {
  const { t } = useTranslation();
  const platform = usePlatform();

  const fmt = (k: Parameters<typeof formatShortcut>[1]) => formatShortcut(platform, k);

  const rows: { label: string; keys: string[] }[] = [
    { label: t("settings.shortcuts.jump"), keys: [fmt({ mod: true, key: "K" })] },
    {
      label: t("settings.shortcuts.pull"),
      keys: [fmt({ mod: true, shift: true, key: "P" })],
    },
    { label: t("settings.shortcuts.fetch_all"), keys: [fmt({ mod: true, key: "F" })] },
    { label: t("settings.shortcuts.toggle_detail"), keys: [fmt({ mod: true, key: "]" })] },
    { label: t("settings.shortcuts.next_prev_repo"), keys: ["↓", "↑"] },
    { label: t("settings.shortcuts.open_editor"), keys: [fmt({ mod: true, key: "↵" })] },
    { label: t("settings.shortcuts.open_terminal"), keys: [fmt({ mod: true, key: "T" })] },
    {
      label: t("settings.shortcuts.open_settings", { defaultValue: "Open settings" }),
      keys: [fmt({ mod: true, key: "," })],
    },
  ];

  return (
    <div className="a-set-page">
      <div className="a-set-head">
        <h2>{t("settings.shortcuts.title")}</h2>
        <p>
          {t("settings.shortcuts.intro")}{" "}
          <span style={{ color: "var(--ink-3)" }}>
            ·{" "}
            {t("settings.shortcuts.os_hint", {
              os: platform === "mac" ? "macOS" : platform === "linux" ? "Linux" : "Windows",
              defaultValue: "Detected: {{os}}",
            })}
          </span>
        </p>
      </div>
      <section className="a-set-section">
        <h3>{t("settings.shortcuts.navigation")}</h3>
        <div className="a-set-card">
          <div className="a-sc-list">
            {rows.map(({ label, keys }) => (
              <div key={label} className="a-sc-row">
                <span className="a-sc-lbl">{label}</span>
                <span className="a-sc-keys">
                  {keys.map((k, i) => (
                    <span key={i} className="kbd">
                      {k}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsStorageTab() {
  const { t } = useTranslation();
  return (
    <div className="a-set-page">
      <div className="a-set-head">
        <h2>{t("settings.storage.title")}</h2>
        <p>{t("settings.storage.intro")}</p>
      </div>
      <DiagnosticsSettings />
    </div>
  );
}

function SettingsAboutTab() {
  return <AboutTabBody />;
}
