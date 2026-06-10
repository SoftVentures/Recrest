import { useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { DEMO_VIEWPORT, DemoBridgeMessageType } from "@recrest/shared";

import { useDemoScale } from "../hooks/useDemoScale";
import { useDocumentTheme } from "../hooks/useDocumentTheme";
import { type Os, useOsDetect } from "../hooks/useOsDetect";
import { useParallax } from "../hooks/useParallax";
import { buildDemoUrl, toDemoLocale } from "../lib/demoUrl";
import { BrandMark, ExternalLinkIcon } from "./icons";

/* ─── Window controls — Windows 11 style ─────────────── */
function WindowsControls() {
  return (
    <div className="demo-winctrls" aria-hidden>
      <span className="demo-winctrl">
        <svg width={10} height={10} viewBox="0 0 10 10">
          <line x1={0} y1={5.5} x2={10} y2={5.5} stroke="currentColor" strokeWidth={1} />
        </svg>
      </span>
      <span className="demo-winctrl">
        <svg width={10} height={10} viewBox="0 0 10 10">
          <rect x={0.5} y={0.5} width={9} height={9} fill="none" stroke="currentColor" />
        </svg>
      </span>
      <span className="demo-winctrl demo-winctrl-close">
        <svg width={10} height={10} viewBox="0 0 10 10">
          <line x1={0} y1={0} x2={10} y2={10} stroke="currentColor" strokeWidth={1} />
          <line x1={10} y1={0} x2={0} y2={10} stroke="currentColor" strokeWidth={1} />
        </svg>
      </span>
    </div>
  );
}

/* ─── Window controls — macOS traffic lights ─────────── */
function MacTrafficLights() {
  return (
    <div className="demo-macctrls" aria-hidden>
      <span className="demo-mac-light close" />
      <span className="demo-mac-light min" />
      <span className="demo-mac-light max" />
    </div>
  );
}

/* ─── Window controls — GNOME/libadwaita close pill ──── */
function GnomeClose() {
  return (
    <div className="demo-gnomectrls" aria-hidden>
      <span className="demo-gnome-close">
        <svg width={10} height={10} viewBox="0 0 10 10">
          <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth={1.4} />
        </svg>
      </span>
    </div>
  );
}

/** Which chrome variant to render in the demo. "unknown" falls back to Win11. */
function chromeForOs(os: Os): "mac" | "win" | "linux" {
  if (os === "macos") return "mac";
  if (os === "linux") return "linux";
  return "win";
}

/* ─── Main component ─────────────────────────────────── */
export function HeroDemo() {
  const { t, i18n } = useTranslation();

  const frameRef = useRef<HTMLDivElement>(null);
  useParallax(frameRef);

  const chrome = chromeForOs(useOsDetect());
  const theme = useDocumentTheme();

  const liveRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scale = useDemoScale(liveRef, DEMO_VIEWPORT.width);
  const [interactive, setInteractive] = useState(false);

  // The iframe src is fixed at mount (initial theme/locale via query params);
  // later toggles arrive via postMessage so the demo never reloads.
  const [demoSrc] = useState(() =>
    buildDemoUrl({
      base: import.meta.env.BASE_URL,
      dev: import.meta.env.DEV,
      theme,
      locale: toDemoLocale(i18n.resolvedLanguage ?? i18n.language),
    }),
  );

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: DemoBridgeMessageType.SET_THEME, value: theme },
      "*",
    );
  }, [theme]);

  useEffect(() => {
    const locale = toDemoLocale(i18n.resolvedLanguage ?? i18n.language);
    iframeRef.current?.contentWindow?.postMessage(
      { type: DemoBridgeMessageType.SET_LOCALE, value: locale },
      "*",
    );
  }, [i18n.resolvedLanguage, i18n.language]);

  return (
    <div className="hero-screenshot">
      <div className="screenshot-frame demo-frame" ref={frameRef}>
        {/* ─── Titlebar — OS-specific chrome (unchanged) ──── */}
        <div className={`demo-titlebar demo-titlebar-${chrome}`}>
          {chrome === "mac" && <MacTrafficLights />}
          <div className="demo-titlebar-left">
            <div className="demo-titlebar-icon">
              <BrandMark />
            </div>
            <span>Recrest</span>
            <span className="demo-titlebar-version">v{__APP_VERSION__}</span>
          </div>
          <a
            className="demo-titlebar-open"
            href={demoSrc}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLinkIcon />
            {t("hero.demo.openExternal")}
          </a>
          {chrome === "win" && <WindowsControls />}
          {chrome === "linux" && <GnomeClose />}
        </div>

        {/* ─── Live demo — the real web app, seeded ───────── */}
        <div className={`demo-live${interactive ? " interactive" : ""}`} ref={liveRef}>
          <iframe
            ref={iframeRef}
            className="demo-live-frame"
            src={demoSrc}
            title={t("hero.demo.title")}
            width={DEMO_VIEWPORT.width}
            height={DEMO_VIEWPORT.height}
            style={{ transform: `scale(${scale})` }}
          />
          {!interactive && (
            <button
              type="button"
              className="demo-live-overlay"
              onClick={() => setInteractive(true)}
            >
              <span className="demo-live-play">▶</span>
              <span className="demo-live-cta">{t("hero.demo.cta")}</span>
              <span className="demo-live-hint">{t("hero.demo.hint")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
