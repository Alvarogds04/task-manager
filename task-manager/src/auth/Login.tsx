import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";

export default function Login() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [err, setErr] = useState<string | null>(null);

  const onGoogle = async () => {
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) setErr(error.message);
    setLoading(false);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!email || !pass || pass !== pass2) throw new Error("Revisa el correo y que ambas contraseñas coincidan.");
        const { error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-6">
      <div className="w-full max-w-[520px] rounded-2xl bg-surface shadow-card p-8 animate-[fadeIn_.25s_ease]">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-2">
          Inicia sesión
        </h1>
        <p className="text-center text-muted mb-6">Usa Google o tu correo. Todo centrado.</p>

        <button
          onClick={onGoogle}
          disabled={loading}
          className="btn-ghost w-full mb-4"
        >
          <span className="mr-2">🟠</span> Continuar con Google
        </button>

        <div className="text-center text-muted my-2">o con tu correo</div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="input"
            placeholder="correo@ejemplo.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            placeholder="Contraseña"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          {mode === "signup" && (
            <input
              className="input"
              placeholder="Repite la contraseña (para crear cuenta)"
              type="password"
              autoComplete="new-password"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
            />
          )}

          {err && <div className="text-red-600 text-sm">{err}</div>}

          <div className="flex items-center justify-center gap-4 pt-1">
            <button type="submit" disabled={loading} className="btn-primary">
              {mode === "signin" ? "Continuar" : "Crear cuenta"}
            </button>
            <button
              type="button"
              className="link"
              onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            >
              {mode === "signin" ? "Crear cuenta" : "Entrar"}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-muted mt-6">
          En modo oscuro, el fondo es gris oscuro; las superficies son gris intermedio y los botones principales son blancos.
        </p>
      </div>
    </div>
  );
}
