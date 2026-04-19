import { useTranslation } from "react-i18next";

import { Contribute } from "./components/Contribute";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Nav } from "./components/Nav";
import { Privacy } from "./components/Privacy";
import { useDocumentLang } from "./hooks/useDocumentLang";
import { useLegalRoute } from "./hooks/useLegalRoute";
import { useScrollReveal } from "./hooks/useScrollReveal";
import { useTheme } from "./hooks/useTheme";
import { Accessibility } from "./pages/Accessibility";
import { Imprint } from "./pages/Imprint";
import { LegalLayout } from "./pages/LegalLayout";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";

export function App() {
  const { theme, toggle } = useTheme();
  const route = useLegalRoute();
  const { t } = useTranslation();
  useScrollReveal();
  useDocumentLang();

  if (route) {
    const body =
      route === "imprint" ? (
        <Imprint />
      ) : route === "privacy-policy" ? (
        <PrivacyPolicy />
      ) : (
        <Accessibility />
      );
    return (
      <>
        <a className="skip-link" href="#main">
          {t("a11y.skipToContent")}
        </a>
        <LegalLayout theme={theme} onToggleTheme={toggle} current={route}>
          {body}
        </LegalLayout>
      </>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main">
        {t("a11y.skipToContent")}
      </a>
      <Nav theme={theme} onToggleTheme={toggle} />
      <main id="main">
        <Hero />
        <Privacy />
        <Contribute />
      </main>
      <Footer />
    </>
  );
}
