# Phase 9 — Landingpage-Download + Quality — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eigene `/download`-Seite mit OS-/Architektur-Auswahl, direkten Download-Links (kein neuer Tab, keine ZIPs), Code-Signing-Bypass-Anleitungen pro OS. Plus Landingpage-Quality-Pass für kaputte Sections, falsche Akzente, Grammatik, „Laptops"-only Wording.

**Architecture:** Neue Astro/React-Route auf der Landingpage. Download-Links sind statische `<a href download>`-Tags, die auf konkrete GitHub-Release-Assets zeigen. OS-Detection via User-Agent für Initial-View.

**Tech Stack:** Landingpage-Stack (Astro o.ä., plain React + SCSS — kein MUI laut Root-CLAUDE.md).

---

## File Structure

- Create: `landingpage/src/pages/download.astro` (oder analog je nach Routing)
- Create: `landingpage/src/components/DownloadCard/index.tsx`
- Create: `landingpage/src/components/InstallInstructions/index.tsx`
- Modify: bestehender Download-Button auf der Landingpage → linked auf `/download`
- Modify: GitHub-Release-Workflow falls heute ZIPs erzeugt werden
- Modify: betroffene Landingpage-Komponenten (basierend auf Quality-Audit)

---

## Task 1: Release-Asset-Naming (Vorbedingung)

**Files:**

- Modify: `.github/workflows/release-*.yml` (falls existiert) — Asset-Suffixe

- [ ] **Step 1: Aktuelles Release-Workflow inspizieren**

Run: `ls .github/workflows && grep -l "release\\|tag" .github/workflows/*.yml`

- [ ] **Step 2: Asset-Namen sicherstellen**

Erwartete Assets pro Tag-Release:

- `Recrest-{version}-mac-arm64.dmg`
- `Recrest-{version}-mac-x64.dmg`
- `Recrest-{version}-windows-x64.exe`
- `Recrest-{version}-windows-arm64.exe`
- `Recrest-{version}-linux-x64.AppImage`
- `Recrest-{version}-linux-x64.deb`
- `Recrest-{version}-linux-x64.rpm`

Falls aktuell ZIPs erzeugt werden: Workflow-Step entfernen oder direkte Installer-Outputs nutzen.

- [ ] **Step 3: Commit (falls Workflow geändert)**

```bash
git add .github/workflows
git commit -m "ci: release native installers without zip wrapper"
```

---

## Task 2: `/download`-Route

**Files:**

- Create: `landingpage/src/pages/download.astro`
- Create: `landingpage/src/components/DownloadCard/index.tsx`

- [ ] **Step 1: Route + Page-Layout**

```astro
---
// landingpage/src/pages/download.astro
import Layout from "../layouts/Layout.astro";
import DownloadGrid from "../components/DownloadGrid";
const version = import.meta.env.PUBLIC_RECREST_VERSION ?? "latest";
---
<Layout title="Download Recrest">
  <DownloadGrid client:load version={version} />
</Layout>
```

(Genaue Mechanik je nach Landingpage-Stack — Astro mit React-Inseln, oder pure React, oder pure Astro.)

- [ ] **Step 2: DownloadCard-Komponente**

```tsx
// landingpage/src/components/DownloadCard/index.tsx
interface Asset {
  label: string;
  href: string;
  hint?: string;
}
interface Props {
  os: "macos" | "windows" | "linux";
  assets: Asset[];
}

export function DownloadCard({ os, assets }: Props) {
  return (
    <section className="download-card">
      <h2>{osLabel(os)}</h2>
      <ul className="assets">
        {assets.map((a) => (
          <li key={a.href}>
            <a href={a.href} download className="download-link">
              {a.label}
            </a>
            {a.hint && <span className="hint">{a.hint}</span>}
          </li>
        ))}
      </ul>
      <InstallInstructions os={os} />
    </section>
  );
}
```

- [ ] **Step 3: Asset-Liste pro OS**

```ts
const GH = (file: string) => `https://github.com/<owner>/recrest/releases/latest/download/${file}`;
const ASSETS = {
  macos: [
    { label: "Apple Silicon (.dmg)", href: GH("Recrest-mac-arm64.dmg"), hint: "M1, M2, M3, M4" },
    { label: "Intel (.dmg)", href: GH("Recrest-mac-x64.dmg"), hint: "Macs bis 2020" },
  ],
  windows: [
    { label: "Windows x64 (.exe)", href: GH("Recrest-windows-x64.exe"), hint: "Standard-PCs" },
    {
      label: "Windows ARM64 (.exe)",
      href: GH("Recrest-windows-arm64.exe"),
      hint: "Surface Pro X, Snapdragon",
    },
  ],
  linux: [
    { label: "Linux x64 (.AppImage)", href: GH("Recrest-linux-x64.AppImage") },
    { label: "Debian/Ubuntu (.deb)", href: GH("Recrest-linux-x64.deb") },
    { label: "Fedora/RHEL (.rpm)", href: GH("Recrest-linux-x64.rpm") },
  ],
} as const;
```

- [ ] **Step 4: Initial-OS via User-Agent**

```ts
function detectOs(): "macos" | "windows" | "linux" {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "macos";
  if (ua.includes("win")) return "windows";
  return "linux";
}
const initial = detectOs();
// alle drei Cards rendern, initial entdecktes OS expandiert/ganz oben
```

- [ ] **Step 5: Commit**

```bash
git add landingpage/src
git commit -m "feat(landingpage): /download route with direct asset links per OS and arch"
```

---

## Task 3: Install-Instructions ohne Code-Signing

**Files:**

- Create: `landingpage/src/components/InstallInstructions/index.tsx`

- [ ] **Step 1: Component pro OS**

```tsx
export function InstallInstructions({ os }: { os: "macos" | "windows" | "linux" }) {
  if (os === "macos")
    return (
      <details className="install-instructions">
        <summary>Erste Schritte (ohne Apple-Notarization)</summary>
        <ol>
          <li>DMG öffnen und Recrest in den Programme-Ordner ziehen.</li>
          <li>
            Beim ersten Start zeigt macOS eine Warnung. Rechtsklick auf Recrest → "Öffnen" →
            "Öffnen" bestätigen.
          </li>
          <li>
            Falls die Warnung trotzdem blockiert: Terminal öffnen und ausführen:{" "}
            <code>xattr -d com.apple.quarantine /Applications/Recrest.app</code>
          </li>
        </ol>
      </details>
    );
  if (os === "windows")
    return (
      <details className="install-instructions">
        <summary>Erste Schritte (SmartScreen)</summary>
        <ol>
          <li>EXE starten.</li>
          <li>SmartScreen-Warnung erscheint → "Weitere Informationen" → "Trotzdem ausführen".</li>
        </ol>
      </details>
    );
  return (
    <details className="install-instructions">
      <summary>Linux-Installation</summary>
      <ol>
        <li>
          <strong>AppImage:</strong>{" "}
          <code>chmod +x Recrest-linux-x64.AppImage && ./Recrest-linux-x64.AppImage</code>
        </li>
        <li>
          <strong>Debian/Ubuntu:</strong> <code>sudo apt install ./Recrest-linux-x64.deb</code>
        </li>
        <li>
          <strong>Fedora/RHEL:</strong> <code>sudo dnf install ./Recrest-linux-x64.rpm</code>
        </li>
      </ol>
    </details>
  );
}
```

(EN-Variante parallel pflegen je nach Landingpage-i18n-Setup.)

- [ ] **Step 2: Commit**

```bash
git add landingpage/src
git commit -m "feat(landingpage): per-OS install instructions for unsigned binaries"
```

---

## Task 4: Bestehender Download-Button auf /download umlenken

**Files:**

- Modify: bestehender Download-Button (CTA auf Hero / Header)

- [ ] **Step 1: Button-Link**

```tsx
<a href="/Recrest/download" className="cta-button">
  Download
</a>
```

Kein JavaScript-Redirect, kein `window.open`, kein `window.close`. Reine `<a href>`-Navigation.

- [ ] **Step 2: Smoke**

`yarn dev:landingpage` → Klick auf Download-CTA navigiert zu `/download` ohne Tab-Aufblitz.

- [ ] **Step 3: Commit**

```bash
git add landingpage/src
git commit -m "fix(landingpage): cta button navigates to /download instead of opening release tab"
```

---

## Task 5: Landingpage Quality-Audit

**Files:**

- Modify: betroffene Landingpage-Komponenten (basierend auf Findings)

- [ ] **Step 1: Section-Loading-Bug**

Run: `yarn dev:landingpage` → Page in Browser öffnen, DevTools-Console + Netzwerk-Tab beobachten. Pro nicht ladende Sektion:

- 404 für Asset? → Pfad fixen
- IntersectionObserver / Lazy-Mount-Bug? → Boundary anpassen
- JS-Fehler? → Stack-Trace folgen

Findings notieren, einzeln fixen.

- [ ] **Step 2: Akzentfarben prüfen**

Visuelle Inspektion in Light + Dark Theme der Landingpage. Pro Stelle mit „falscher Akzent":

- SCSS-Variable / Theme-Token mit Tatsächlichem Wert abgleichen
- Hover-States, CTA-Buttons, Section-Highlights checken

- [ ] **Step 3: Grammatik + Wording**

Durchlauf aller sichtbaren Texte (DE + EN):

- Tippfehler
- „Laptops" → „Mac, Windows und Linux" oder „auf jedem Desktop" (Recrest ist nicht laptop-only)
- Singular/Plural-Konsistenz
- Begriffe synchron mit App (Pull Request, Merge Request, Repository — siehe Phase 1.5)

- [ ] **Step 4: Responsive-Sweep**

In DevTools Breakpoints 1024px, 1280px, 1440px, 1920px durchklicken. Memory: `feedback_no_mobile_widths` — keine Mobile-Tests nötig.

- [ ] **Step 5: Findings einzeln commiten**

Pro Finding ein eigener Commit mit prägnanter Message.

- [ ] **Step 6: Final-Visual-Check**

Run: Drei-Browser-Sweep (Chrome, Safari, Firefox) auf der lokalen Preview. Keine kaputten Sections, keine falschen Akzente, kein „Laptops"-Wording, keine offensichtlichen Tippfehler.

```bash
git add landingpage
git commit -m "polish(landingpage): section-loading fixes, accent corrections, wording cleanup"
```

---

## Verification

- [ ] `yarn build:landingpage && yarn preview:landingpage` → Page lädt ohne Fehler
- [ ] **Manueller Smoke**: Klick auf Download-CTA → `/download` öffnet ohne Tab-Aufblitz; jeder Download-Link triggert nativen Browser-Download ohne JS dazwischen
- [ ] Install-Instructions pro OS sichtbar und korrekt
- [ ] Drei-Browser-Quality-Sweep (Chrome/Safari/Firefox) zeigt keine kaputten Sections oder falschen Akzente
- [ ] Keine „Laptops"-only Formulierungen mehr
