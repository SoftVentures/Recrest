import type { ReactNode } from "react";

import { useTranslation } from "react-i18next";

import { Footer } from "../components/Footer";
import { Nav } from "../components/Nav";
import type { LegalRoute } from "../hooks/useLegalRoute";
import type { Theme } from "../hooks/useTheme";

type Props = {
  theme: Theme;
  onToggleTheme: () => void;
  current: LegalRoute;
  children: ReactNode;
};

const ROUTE_KEYS: Record<LegalRoute, string> = {
  imprint: "legal.nav.imprint",
  "privacy-policy": "legal.nav.privacyPolicy",
  accessibility: "legal.nav.accessibility",
};

export function LegalLayout({ theme, onToggleTheme, current, children }: Props) {
  const { t } = useTranslation();
  const routes: LegalRoute[] = ["imprint", "privacy-policy", "accessibility"];

  return (
    <>
      <Nav theme={theme} onToggleTheme={onToggleTheme} />
      <main id="main" className="legal-main">
        <div className="wrap legal-wrap">
          <a href="#" className="legal-back">
            ← {t("legal.backToHome")}
          </a>
          <nav className="legal-tabs" aria-label={t("footer.columns.legal")}>
            {routes.map((route) => (
              <a
                key={route}
                href={`#/legal/${route}`}
                className={`legal-tab${current === route ? " active" : ""}`}
                aria-current={current === route ? "page" : undefined}
              >
                {t(ROUTE_KEYS[route])}
              </a>
            ))}
          </nav>
          <article className="legal-article">{children}</article>
        </div>
      </main>
      <Footer />
    </>
  );
}
