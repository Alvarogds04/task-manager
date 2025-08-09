// src/auth/AuthGate.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] =
    useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setLoading(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center app-bg">
        <div className="card p-4">Cargando…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center app-bg">
        <div className="card p-6 w-full max-w-sm">
          <h2 className="text-xl font-semibold mb-3">Inicia sesión</h2>
          <p className="text-sm app-muted mb-4">
            Usa Google para continuar.
          </p>
          <button
            className="btn-primary w-full"
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.origin },
              })
            }
          >
            Continuar con Google
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
