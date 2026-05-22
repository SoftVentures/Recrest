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
  Keyboard,
  Settings as SettingsIcon,
  User,
  Wrench,
} from "lucide-react";

import { useFullbleedScroll } from "@/hooks/useFullbleedScroll";
import { usePlatform } from "@/hooks/usePlatform";
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  pgRise,
  pgSlideL,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
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
import { IntegrationsSection } from "@/pages/app/Settings/components/IntegrationsTab";
import { ShortcutsSection } from "@/pages/app/Settings/components/ShortcutsTab";
import { StorageSection } from "@/pages/app/Settings/components/StorageTab";

const DeveloperTabLazy = import.meta.env.DEV
  ? lazy(() => import("@/pages/app/Settings/components/DeveloperTab"))
  : () => null;

type TabId =
  | "general"
  | "accounts"
  | "integrations"
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
  padding: "16px 0 16px 16px",
  minHeight: 0,
  height: "100%",
  overflow: "hidden",
});

const Nav = styled("aside")(({ theme }) => ({
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
}));

const NavFooter = styled("div")(({ theme }) => ({
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
}));

const FooterName = styled("span")(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.secondary,
}));

const FooterDot = styled("span")(({ theme }) => ({
  width: 3,
  height: 3,
  borderRadius: "50%",
  backgroundColor: theme.palette.text.informationLight,
  flexShrink: 0,
}));

const FooterVersion = styled("span")(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 10.5,
  color: theme.palette.text.information,
}));

interface TabBtnProps {
  active?: boolean;
}
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
});

const PageInner = styled(Box)({
  // Right padding lives on the content (not the scroll container) so the
  // scrollbar can sit at the viewport edge. Matches the breathing room the
  // old `Body.paddingRight: 22` provided.
  paddingRight: 22,
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
});

const PageHead = styled(Box)({
  marginBottom: 20,
  // Header block (h2 + intro paragraph) drops down. Matches src-old
  // `.p-settings .a-set-head` with 40ms delay.
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  animationDelay: "40ms",
  ...prefersReducedMotionGuard,
});

const PageH2 = styled("h2")(({ theme }) => ({
  fontSize: 18,
  fontWeight: 700,
  color: theme.palette.text.primary,
  margin: "0 0 4px",
  letterSpacing: "-0.01em",
}));

const PageIntro = styled(Typography)(({ theme }) => ({
  fontSize: 12.5,
  color: theme.palette.text.information,
  margin: 0,
}));

const KNOWN_TAB_IDS = new Set<TabId>([
  "general",
  "accounts",
  "integrations",
  "shortcuts",
  "storage",
  "about",
  "developer",
]);

function platformLabel(p: ReturnType<typeof usePlatform>): string {
  switch (p) {
    case "mac":
      return "macOS";
    case "windows":
      return "Windows";
    case "linux":
      return "Linux";
  }
}

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
  const queryTab = searchParams.get("tab") as TabId | null;
  const tab: TabId = queryTab && KNOWN_TAB_IDS.has(queryTab) ? queryTab : "general";

  const setTab = useCallback(
    (next: TabId) => {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (next === "general") {
            // Default tab — keep the URL clean (no `?tab=general`).
            sp.delete("tab");
          } else {
            sp.set("tab", next);
          }
          return sp;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <Root data-testid="settings-view">
      <Nav role="tablist" data-testid="settings-tabs">
        {TABS.map((tb) => {
          const Icon = tb.icon;
          return (
            <TabBtn
              key={tb.id}
              type="button"
              role="tab"
              active={tab === tb.id}
              aria-selected={tab === tb.id}
              data-testid={`settings-tab-${tb.id}`}
              onClick={() => setTab(tb.id)}
            >
              <Icon size={13} />
              <span>{t(tb.labelKey)}</span>
            </TabBtn>
          );
        })}
        <NavFooter data-testid="settings-nav-footer">
          <FooterName>Recrest</FooterName>
          <FooterDot aria-hidden />
          <FooterVersion>v{APP_VERSION}</FooterVersion>
        </NavFooter>
      </Nav>

      <Body data-testid={`settings-panel-${tab}`}>
        {tab === "general" && (
          <PageInner>
            <PageHead>
              <PageH2>{t("settings.general.title")}</PageH2>
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
              <PageH2>{t("settings.accounts.title")}</PageH2>
              <PageIntro>{t("settings.accounts.intro")}</PageIntro>
            </PageHead>
            <AccountsSection />
          </PageInner>
        )}
        {tab === "integrations" && (
          <PageInner>
            <PageHead>
              <PageH2>{t("settings.integrations.title")}</PageH2>
              <PageIntro>{t("settings.integrations.intro")}</PageIntro>
            </PageHead>
            <IntegrationsSection />
          </PageInner>
        )}
        {tab === "shortcuts" && (
          <PageInner>
            <PageHead>
              <PageH2>{t("settings.shortcuts.title")}</PageH2>
              <PageIntro>
                {t("settings.shortcuts.intro")} · Detected: {platformLabel(platform)}
              </PageIntro>
            </PageHead>
            <ShortcutsSection />
          </PageInner>
        )}
        {tab === "storage" && (
          <PageInner>
            <PageHead>
              <PageH2>{t("settings.storage.title")}</PageH2>
              <PageIntro>{t("settings.storage.intro")}</PageIntro>
            </PageHead>
            <StorageSection />
          </PageInner>
        )}
        {tab === "about" && (
          <PageInner>
            <PageHead>
              <PageH2>{t("settings.about.title")}</PageH2>
              <PageIntro>{t("settings.about.intro")}</PageIntro>
            </PageHead>
            <AboutSection />
          </PageInner>
        )}
        {tab === "developer" && import.meta.env.DEV && (
          <PageInner>
            <PageHead>
              <PageH2>{t("settings.developer.title")}</PageH2>
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
