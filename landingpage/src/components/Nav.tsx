import { useEffect, useId, useState } from "react";

import { useTranslation } from "react-i18next";

import { useDevice } from "../hooks/useDevice";
import { useScrolledNav } from "../hooks/useScrolledNav";
import type { Theme } from "../hooks/useTheme";
import { ThemeToggle } from "./ThemeToggle";
import { BrandMark, GithubIcon } from "./icons";

type Props = {
  theme: Theme;
  onToggleTheme: () => void;
};

export function Nav({ theme, onToggleTheme }: Props) {
  const { t } = useTranslation();
  const scrolled = useScrolledNav();
  const device = useDevice();
  const isNarrow = device.isMobile || device.isTablet;
  const menuId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isNarrow) setOpen(false);
  }, [isNarrow]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const navLinks = (
    <>
      <a href="#privacy" onClick={() => setOpen(false)}>
        {t("nav.overview")}
      </a>
      <a href="#privacy" onClick={() => setOpen(false)}>
        {t("nav.privacy")}
      </a>
      <a href="#contribute" onClick={() => setOpen(false)}>
        {t("nav.contribute")}
      </a>
    </>
  );

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="wrap nav-inner">
        <a href="#" className="brand">
          <span className="brand-mark">
            <BrandMark />
          </span>
          Recrest
        </a>

        {!isNarrow ? <div className="nav-links">{navLinks}</div> : null}

        <div className="nav-right">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {!isNarrow ? (
            <a
              href={__REPO_URL__}
              className="btn btn-ghost btn-sm"
              target="_blank"
              rel="noreferrer noopener"
            >
              <GithubIcon width={14} height={14} />
              {t("nav.github")}
            </a>
          ) : null}
          <a href="#download" className="btn btn-primary btn-sm">
            {t("nav.download")}
          </a>
          {isNarrow ? (
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={t("nav.menu")}
              onClick={() => setOpen((v) => !v)}
            >
              <span className={`nav-toggle-bars${open ? " open" : ""}`} />
            </button>
          ) : null}
        </div>
      </div>

      {isNarrow ? (
        <div id={menuId} className={`nav-drawer${open ? " open" : ""}`} hidden={!open}>
          <div className="wrap nav-drawer-inner">
            {navLinks}
            <a
              href={__REPO_URL__}
              className="btn btn-ghost btn-sm"
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => setOpen(false)}
            >
              <GithubIcon width={14} height={14} />
              {t("nav.github")}
            </a>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
