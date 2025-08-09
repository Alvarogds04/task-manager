export type Theme = "light" | "dark";
const STORAGE_KEY = "ui-theme";

/** Lee la preferencia guardada o la del sistema. */
export function getPreferredTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  return mq?.matches ? "dark" : "light";
}

/** Aplica el tema poniendo/quitarndo la clase `dark` en <html> y lo guarda. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

/** Asegura que el tema esté aplicado ANTES de renderizar React (evita FOUC). */
export function ensureInitialTheme() {
  try {
    applyTheme(getPreferredTheme());
  } catch {}
}

/** Alterna y devuelve el tema resultante. */
export function toggleTheme(): Theme {
  const next: Theme = document.documentElement.classList.contains("dark")
    ? "light"
    : "dark";
  applyTheme(next);
  return next;
}

/** Si no hay preferencia guardada, sigue los cambios del sistema. */
export function watchSystemTheme(cb: (t: Theme) => void) {
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!mq) return () => {};
  const handler = (e: MediaQueryListEvent) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) cb(e.matches ? "dark" : "light");
  };
  mq.addEventListener?.("change", handler);
  return () => mq.removeEventListener?.("change", handler);
}
