// src/auth/AuthGate.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import AuthPage from "./AuthPage";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(!!data.session);
      setLoading(false);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-gray-500">Comprobando sesión…</div>
      </div>
    );
  }

  return hasSession ? <>{children}</> : <AuthPage />;
}
