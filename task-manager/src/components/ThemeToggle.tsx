import { useEffect, useState } from "react";
import {
  toggleTheme,
  getPreferredTheme,
  watchSystemTheme,
  applyTheme,
} from "../lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getPreferredTheme());

  useEffect(() => {
    // Sincroniza con el sistema SOLO si el usuario no ha guardado preferencia
    const un = watchSystemTheme((t) => {
      const saved = localStorage.getItem("ui-theme");
      if (!saved) {
        applyTheme(t);
        setTheme(t);
      }
    });
    return un;
  }, []);

  const onClick = () => setTheme(toggleTheme());

  return (
    <button
      onClick={onClick}
      aria-label="Cambiar tema"
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5
                 bg-white text-gray-900 shadow hover:opacity-90
                 dark:bg-white dark:text-black
                 transition"
    >
      <span className="text-lg">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span className="text-sm font-medium">
        {theme === "dark" ? "Oscuro" : "Claro"}
      </span>
    </button>
  );
}
