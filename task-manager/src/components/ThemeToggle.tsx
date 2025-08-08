import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme','dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme','light');
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(v => !v)}
      className="rounded-xl border app-border px-3 py-1.5 text-sm app-text hover:bg-white/10"
      title={dark ? "Tema claro" : "Tema oscuro"}
    >
      {dark ? "☀️ Claro" : "🌙 Oscuro"}
    </button>
  );
}
