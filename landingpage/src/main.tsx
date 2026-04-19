import { StrictMode } from "react";

import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./i18n";
import "./styles/globals.css";
import "./styles/tokens.css";

const container = document.getElementById("root");
if (!container) throw new Error("#root missing from index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
