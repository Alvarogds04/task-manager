import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

(function initTheme() {
  try {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const shouldDark = saved ? saved === "dark" : !!prefersDark;
    const root = document.documentElement;
    if (shouldDark) root.classList.add("dark");
    else root.classList.remove("dark");
  } catch {}
})();

const root = document.getElementById("root");
if (!root) throw new Error("No se encontró #root");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
