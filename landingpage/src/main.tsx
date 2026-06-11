import { StrictMode } from "react";

// Self-hosted fonts (weight axis only). Served from our own origin so no
// visitor IP is sent to Google's font CDN — see the privacy policy.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./i18n";
import "./styles/globals.scss";
// Tokens first so custom properties are defined before any component CSS
// references them (same ordering principle as in the app workspace).
import "./styles/tokens.scss";

const container = document.getElementById("root");
if (!container) throw new Error("#root missing from index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
