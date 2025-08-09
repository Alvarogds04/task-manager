// src/auth/AuthPage.tsx
import { useState } from "react";
import { supabase } from "../lib/supabase";
import ThemeToggle from "../components/ThemeToggle";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState<"google" | "signin" | "signup" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const resetFeedback = () => { setErr(null); setMsg(null); };

  const handleGoogle = async () => {
    resetFeedback();
    setLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setErr(error.message);
    setLoading(null);
  };

  const handleSignin = async () => {
    resetFeedback();
    setLoading("signin");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    setLoading(null);
  };

  const handleSignup = async () => {
    resetFeedback();
    if (password.length < 6) { setErr("La contraseña debe tener al menos 6 caracteres."); return; }
    if (password !== password2) { setErr("Las contraseñas no coinciden."); return; }

    setLoading("signup");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setErr(error.message);
    else {
      if (data.session || data.user?.email_confirmed_at) {
        setMsg("Cuenta creada. Ya puedes entrar.");
      } else {
        setMsg("Te enviamos un correo para confirmar la cuenta.");
      }
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen app-bg grid place-items-center px-4">
      {/* Tema */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[480px] app-card app-border rounded-2xl p-8 animate-fade">

        {/* Título */}
        <div className="text-center mb-6 animate-up">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Inicia sesión</h1>
          <p className="text-sm app-muted mt-1">Usa Google o tu correo. Todo centrado.</p>
        </div>

        {/* Google */}
        <div className="flex justify-center animate-up">
          <button
            onClick={handleGoogle}
            disabled={loading === "google"}
            className="w-full border app-border rounded-xl h-11 flex items-center justify-center gap-2
                       hover:bg-gray-50 dark:hover:bg-white/10 transition"
          >
            <GoogleIcon />
            <span className="font-medium">
              {loading === "google" ? "Abriendo Google…" : "Continuar con Google"}
            </span>
          </button>
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3 my-5 animate-fade">
          <div className="h-px flex-1 bg-black/10 dark:bg-white/20" />
          <span className="text-xs app-muted">o con tu correo</span>
          <div className="h-px flex-1 bg-black/10 dark:bg-white/20" />
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => { e.preventDefault(); /* no submit directo, usamos botones abajo */ }}
          className="space-y-3 animate-up"
        >
          <input
            className="w-full border app-border rounded-xl px-3 h-11 app-surface
                       focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <input
            className="w-full border app-border rounded-xl px-3 h-11 app-surface
                       focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {/* El segundo campo sólo afecta a "Crear cuenta" */}
          <input
            className="w-full border app-border rounded-xl px-3 h-11 app-surface
                       focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
            type="password"
            placeholder="Repite la contraseña (para crear cuenta)"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
        </form>

        {/* Feedback */}
        {err && (
          <div className="text-sm bg-red-50 text-red-600 border border-red-500/20 rounded-lg p-2 mt-3 animate-fade">
            {err}
          </div>
        )}
        {msg && (
          <div className="text-sm bg-blue-50 text-blue-600 border border-blue-500/20 rounded-lg p-2 mt-3 animate-fade">
            {msg}
          </div>
        )}

        {/* Botones principales (centrados) */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 animate-up">
          <button
            onClick={handleSignin}
            disabled={loading === "signin"}
            className="btn-contrast w-full sm:w-auto"
            title="Entrar con email y contraseña"
          >
            {loading === "signin" ? "Entrando…" : "Continuar"}
          </button>

          <button
            onClick={handleSignup}
            disabled={loading === "signup"}
            className="btn-contrast w-full sm:w-auto"
            title="Crear cuenta nueva"
          >
            {loading === "signup" ? "Creando…" : "Crear cuenta"}
          </button>
        </div>

        {/* Nota pie */}
        <p className="text-xs app-muted mt-5 text-center">
          En modo oscuro, el fondo es gris oscuro, las superficies (menús) gris intermedio,
          y los botones principales son blancos para resaltar.
        </p>
        <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* tu tarjeta */}
      <div className="w-full max-w-[480px] app-card app-border p-8">
        {/* ... */}
      </div>
        
      </div>
    </div>
    


  );
  



}

/* Icono Google */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.84h5.44c-.24 1.28-1.6 3.76-5.44 3.76-3.28 0-5.96-2.72-5.96-6.08S8.72 5.64 12 5.64c1.88 0 3.16.8 3.88 1.48l2.64-2.56C16.72 2.8 14.56 2 12 2 6.72 2 2.44 6.28 2.44 11.52 2.44 16.76 6.72 21 12 21c6.88 0 9.56-4.84 9.56-7.36 0-.5-.04-.82-.12-1.16H12z"
      />
    </svg>
  );
}


