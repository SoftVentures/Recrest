import React from "react";

import { BrowserRouter } from "react-router-dom";

import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import App from "@/App";
import "@/i18n";
import { store } from "@/store";
import "@/styles/globals.css";

// Opt into React Router v7 behaviour now so there's no surprise at upgrade
// time — silences the dev warnings these flags print otherwise.
const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter future={ROUTER_FUTURE}>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
