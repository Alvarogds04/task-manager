import { useState } from "react";
import { signInWithEmail, signOut, getCurrentUser } from "../lib/auth";
import { useEffect } from "react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  async function handleLogin() {
    try {
      await signInWithEmail(email);
      alert("Revisa tu correo para el enlace de acceso.");
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">Hola, {user.email}</span>
        <button
          onClick={signOut}
          className="bg-red-500 text-white px-2 py-1 rounded text-xs"
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Tu email"
        className="border p-1 text-sm"
      />
      <button
        onClick={handleLogin}
        className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
      >
        Entrar
      </button>
    </div>
  );
}
