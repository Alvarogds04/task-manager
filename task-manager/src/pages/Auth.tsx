import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Revisa tu correo para confirmar tu cuenta.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    // Redirige a Google y vuelve a tu app tras loguear
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin, // vuelve a tu / (ajústalo si tienes ruta /app)
      },
    });
    if (error) alert(error.message);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-full max-w-sm">
        <h2 className="text-xl font-semibold mb-4">
          {mode === "login" ? "Iniciar sesión" : "Registrarse"}
        </h2>

        <button
          onClick={signInWithGoogle}
          className="w-full border rounded px-3 py-2 mb-3 flex items-center justify-center gap-2 hover:bg-gray-50"
        >
          {/* Puedes poner un SVG del logo si quieres */}
          <span>Continuar con Google</span>
        </button>

        <div className="relative my-3">
          <div className="border-t" />
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2 text-xs text-gray-500">
            o con email
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            className="border px-3 py-2 w-full mb-3 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="border px-3 py-2 w-full mb-3 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button disabled={loading} className="bg-black text-white px-3 py-2 rounded w-full">
            {loading ? "Cargando..." : mode === "login" ? "Entrar" : "Registrarme"}
          </button>
        </form>

        <p
          className="text-sm text-center mt-3 cursor-pointer text-blue-600"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </p>
      </div>
    </div>
  );
}
