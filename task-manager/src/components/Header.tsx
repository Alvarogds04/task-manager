import { supabase } from "../lib/supabase";
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // AuthGate detecta sesión null y muestra Login automáticamente
  };

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Gestor de tareas</h1>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/10"
          title="Cerrar sesión"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
