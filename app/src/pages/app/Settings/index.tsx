import { Suspense, lazy, useCallback } from "react";

import { useSearchParams } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { APP_VERSION } from "@recrest/shared";

import {
  Box as BoxIcon,
  Code2,
  FolderOpen,
  GitBranch,
  Keyboard,
  Settings as SettingsIcon,
  User,
  Wrench,
} from "lucide-react";

import DataSizesPanel from "@/components/molecules/DataSizesPanel";
import SystemInfoPanel from "@/components/molecules/SystemInfoPanel";
import { useFullbleedScroll } from "@/hooks/useFullbleedScroll";
import { platformLabel, usePlatform } from "@/hooks/usePlatform";
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  pgRise,
  pgSlideL,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { SETTINGS_TAB_QUERY_PARAM, SettingsTab } from "@/lib/constants/settings.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { AboutSection } from "@/pages/app/Settings/components/AboutTab";
import { AccountsSection } from "@/pages/app/Settings/components/AccountsTab";
import {
  AccessibilitySection,
  AppearanceSection,
  DesktopSection,
  NotificationsSection,
  SystemSection,
  UpdatesSection,
} from "@/pages/app/Settings/components/GeneralTab";
import { GitConfigSection } from "@/pages/app/Settings/components/GitConfigTab";
import { IntegrationsSection } from "@/pages/app/Settings/components/IntegrationsTab";
import { SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { ShortcutsSection } from "@/pages/app/Settings/components/ShortcutsTab";
import { StorageSection } from "@/pages/app/Settings/components/StorageTab";

const DeveloperTabLazy = import.meta.env.DEV
  ? lazy(() => import("@/pages/app/Settings/components/DeveloperTab"))
  : () => null;

type TabId =
  | "general"
  | "accounts"
  | "integrations"
  | "git"
  | "shortcuts"
  | "storage"
  | "about"
  | "developer";

interface TabDescriptor {
  id: TabId;
  icon: typeof SettingsIcon;
  labelKey: string;
}

const TABS: TabDescriptor[] = [
  { id: "general", icon: SettingsIcon, labelKey: "settings.tab.general" },
  { id: "accounts", icon: User, labelKey: "settings.tab.accounts" },
  { id: "integrations", icon: Code2, labelKey: "settings.tab.integrations" },
  { id: "git", icon: GitBranch, labelKey: "settings.tab.git" },
  { id: "shortcuts", icon: Keyboard, labelKey: "settings.tab.shortcuts" },
  { id: "storage", icon: FolderOpen, labelKey: "settings.tab.storage" },
  { id: "about", icon: BoxIcon, labelKey: "settings.tab.about" },
  ...(import.meta.env.DEV
    ? [{ id: "developer" as const, icon: Wrench, labelKey: "settings.tab.developer" }]
    : []),
];

const Root = styled(Box)({
  display: "flex",
  gap: 16,
  // Right padding is intentionally 0 so the Body scrollbar sits flush against
  // the viewport edge — same visual rhythm as Activity/Repos. The Body owns
  // its own right-side breathing room via PageInner's paddingRight.
  padding: "16px 0 16px 24px",
  minHeight: 0,
  height: "100%",
  overflow: "hidden",
}) as typeof Box;

const Nav = styled(Box)(({ theme }) => ({
  flex: "0 0 220px",
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: 8,
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflowY: "auto",
  // Tab strip slides in from the left — matches src-old
  // `.p-settings .a-settings-nav`.
  animation: `${pgSlideL} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
})) as typeof Box;

const NavFooter = styled(Box)(({ theme }) => ({
  // Auto top-margin pushes the brand+version block to the bottom of the
  // tab nav regardless of how many tabs are visible (dev mode adds one).
  marginTop: "auto",
  padding: "10px 12px 6px",
  borderTop: `1px solid ${theme.palette.divider}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Box;

const FooterName = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.secondary,
})) as typeof Typography;

const FooterDot = styled(Typography)(({ theme }) => ({
  width: 3,
  height: 3,
  borderRadius: "50%",
  backgroundColor: theme.palette.text.informationLight,
  flexShrink: 0,
})) as typeof Typography;

const FooterVersion = styled(Typography)(({ theme }) => ({
  fontFamily: MONO_STACK,
  fontSize: 10.5,
  color: theme.palette.text.information,
})) as typeof Typography;

interface TabBtnProps {
  active?: boolean;
}
// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const TabBtn = styled("button", {
  shouldForwardProp: (p) => p !== "active",
})<TabBtnProps>(({ theme, active }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  background: active
    ? `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`
    : "transparent",
  border: 0,
  textAlign: "left",
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  fontSize: 12.5,
  fontWeight: active ? 600 : 500,
  cursor: "pointer",
  borderRadius: 8,
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: active
      ? `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`
      : theme.palette.surface.interface.active,
    color: active ? theme.palette.primary.main : theme.palette.text.primary,
  },
}));

const Body = styled(Box)({
  flex: "1 1 auto",
  minWidth: 0,
  minHeight: 0,
  overflowY: "auto",
}) as typeof Box;

const PageInner = styled(Box)({
  // Right padding lives on the content (not the scroll container) so the
  // scrollbar can sit at the viewport edge. Set to 24 so the right edge
  // aligns with the header's `paddingRight: 24` across every page.
  paddingRight: 24,
  paddingBottom: 40,
  // Each section block rises in with a 40ms-stagger after the 120ms head delay.
  // Matches src-old `.p-settings .a-set-page > .a-set-section`.
  "& > *": {
    animation: `${pgRise} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
    animationDelay: "120ms",
  },
  "& > *:nth-of-type(2)": { animationDelay: "160ms" },
  "& > *:nth-of-type(3)": { animationDelay: "200ms" },
  "& > *:nth-of-type(4)": { animationDelay: "240ms" },
  "& > *:nth-of-type(5)": { animationDelay: "280ms" },
  "& > *:nth-of-type(n + 6)": { animationDelay: "320ms" },
  ...prefersReducedMotionGuard,
}) as typeof Box;

const PageHead = styled(Box)({
  marginBottom: 20,
  // Header block (h2 + intro paragraph) drops down. Matches src-old
  // `.p-settings .a-set-head` with 40ms delay.
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  animationDelay: "40ms",
  ...prefersReducedMotionGuard,
}) as typeof Box;

const PageH2 = styled(Typography)(({ theme }) => ({
  fontSize: 18,
  fontWeight: 700,
  color: theme.palette.text.primary,
  margin: "0 0 4px",
  letterSpacing: "-0.01em",
})) as typeof Typography;

const PageIntro = styled(Typography)(({ theme }) => ({
  fontSize: 12.5,
  color: theme.palette.text.information,
  margin: 0,
})) as typeof Typography;

const KNOWN_TAB_IDS = new Set<TabId>([
  "general",
  "accounts",
  "integrations",
  "git",
  "shortcuts",
  "storage",
  "about",
  "developer",
]);

function SettingsPage() {
  const { t } = useTranslation();
  const platform = usePlatform();
  // Two-pane layout (sticky tab nav + scrolling body) needs the outer
  // ContentScroll out of the way so we don't end up with stacked scrollbars.
  useFullbleedScroll();
  // The selected tab is mirrored to `?tab=…` so deeplinks (Settings docs,
  // troubleshooting links, Playwright fixtures) can drop a user straight on
  // the relevant panel. `useSearchParams` is the React-Router-owned source
  // of truth — we deliberately don't fall back to internal state to avoid
  // the two getting out of sync when the user navigates Back/Forward.
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get(SETTINGS_TAB_QUERY_PARAM) as TabId | null;
  const tab: TabId = queryTab && KNOWN_TAB_IDS.has(queryTab) ? queryTab : SettingsTab.GENERAL;

  const setTab = useCallback(
    (next: TabId) => {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (next === SettingsTab.GENERAL) {
            // Default tab — keep the URL clean (no `?tab=general`).
            sp.delete(SETTINGS_TAB_QUERY_PARAM);
          } else {
            sp.set(SETTINGS_TAB_QUERY_PARAM, next);
          }
          return sp;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <Root data-testid={TEST_IDS.settings.view}>
      <Nav component="aside" role="tablist" data-testid={TEST_IDS.settings.tabs}>
        {TABS.map((tb) => {
          const Icon = tb.icon;
          return (
            <TabBtn
              key={tb.id}
              type="button"
              role="tab"
              active={tab === tb.id}
              aria-selected={tab === tb.id}
              data-testid={TEST_IDS.settings.tab(tb.id)}
              onClick={() => setTab(tb.id)}
            >
              <Icon size={13} />
              <Box component="span">{t(tb.labelKey)}</Box>
            </TabBtn>
          );
        })}
        <NavFooter data-testid={TEST_IDS.settings.navFooter}>
          <FooterName component="span" variant="caption">
            {t("brand_name", { ns: I18nNamespace.SETTINGS })}
          </FooterName>
          <FooterDot component="span" variant="caption" aria-hidden />
          <FooterVersion component="span" variant="caption">
            {t("version_prefix", { ns: I18nNamespace.SETTINGS, version: APP_VERSION })}
          </FooterVersion>
        </NavFooter>
      </Nav>

      <Body data-testid={TEST_IDS.settings.panel(tab)}>
        {tab === "general" && (
          <PageInner>
            <PageHead>
              <PageH2 component="h2">{t("settings.general.title")}</PageH2>
              <PageIntro>{t("settings.general.intro")}</PageIntro>
            </PageHead>
            <AppearanceSection />
            <AccessibilitySection />
            <SystemSection />
            <DesktopSection />
            <NotificationsSection />
            <UpdatesSection />
          </PageInner>
        )}
        {tab === "accounts" && (
          <PageInner>
            <PageHead>
              <PageH2 component="h2">{t("settings.accounts.title")}</PageH2>
              <PageIntro>{t("settings.accounts.intro")}</PageIntro>
            </PageHead>
            <AccountsSection />
          </PageInner>
        )}
        {tab === "integrations" && (
          <PageInner>
            <PageHead>
              <PageH2 component="h2">{t("settings.integrations.title")}</PageH2>
              <PageIntro>{t("settings.integrations.intro")}</PageIntro>
            </PageHead>
            <IntegrationsSection />
          </PageInner>
        )}
        {tab === "git" && (
          <PageInner>
            <PageHead>
              <PageH2 component="h2">{t("settings.git.title")}</PageH2>
              <PageIntro>{t("settings.git.intro")}</PageIntro>
            </PageHead>
            <GitConfigSection />
          </PageInner>
        )}
        {tab === "shortcuts" && (
          <PageInner>
            <PageHead>
              <PageH2 component="h2">{t("settings.shortcuts.title")}</PageH2>
              <PageIntro>
                {t("settings.shortcuts.intro")}{" "}
                {t("shortcuts_detected", {
                  ns: I18nNamespace.SETTINGS,
                  platform: platformLabel(platform),
                })}
              </PageIntro>
            </PageHead>
            <ShortcutsSection />
          </PageInner>
        )}
        {tab === "storage" && (
          <PageInner>
            <PageHead>
              <PageH2 component="h2">{t("settings.storage.title")}</PageH2>
              <PageIntro>{t("settings.storage.intro")}</PageIntro>
            </PageHead>
            <StorageSection />
            <SettingsSection title={t("settings:sections.system")}>
              <SystemInfoPanel />
            </SettingsSection>
            <SettingsSection title={t("storage.facts_title", { ns: I18nNamespace.SETTINGS })}>
              <DataSizesPanel />
            </SettingsSection>
          </PageInner>
        )}
        {tab === "about" && (
          <PageInner>
            <PageHead>
              <PageH2 component="h2">{t("settings.about.title")}</PageH2>
              <PageIntro>{t("settings.about.intro")}</PageIntro>
            </PageHead>
            <AboutSection />
          </PageInner>
        )}
        {tab === "developer" && import.meta.env.DEV && (
          <PageInner>
            <PageHead>
              <PageH2 component="h2">{t("settings.developer.title")}</PageH2>
              <PageIntro>{t("settings.developer.intro")}</PageIntro>
            </PageHead>
            <Suspense fallback={null}>
              <DeveloperTabLazy />
            </Suspense>
          </PageInner>
        )}
      </Body>
    </Root>
  );
}

export default SettingsPage;
