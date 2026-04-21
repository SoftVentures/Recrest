import { StrictMode } from "react";

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
