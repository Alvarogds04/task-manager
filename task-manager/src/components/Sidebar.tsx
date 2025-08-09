// src/components/Sidebar.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Project = { id: string; name: string; user_id: string };

export default function Sidebar({
  selectedProjectId,
  onSelectProject,
}: {
  selectedProjectId?: string;
  onSelectProject: (p: Project) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", uid)
        .order("name", { ascending: true });

      if (!mounted) return;
      if (!error && data) setProjects(data as Project[]);
    };

    load();

    const ch = supabase
      .channel("projects")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        load
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const createProject = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      alert("Debes iniciar sesión para crear proyectos");
      return;
    }

    const { error } = await supabase
      .from("projects")
      .insert({ name: trimmed, user_id: uid });

    if (error) {
      alert(error.message);
      return;
    }
    setNewName("");
  };

  return (
    <aside className="w-72 shrink-0 border-r bg-[color:var(--card)] p-4">
      <h3 className="font-semibold mb-3">Proyectos</h3>

      <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
        {projects.length === 0 && (
          <div className="text-sm text-gray-500">Sin proyectos aún</div>
        )}
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectProject(p)}
            className={`w-full text-left rounded-lg px-3 py-2 hover:bg-black/5 transition ${
              selectedProjectId === p.id ? "ring-1 ring-[var(--ring-high)]" : ""
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1">
          Nuevo proyecto
        </label>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej. Personal"
            className="flex-1 h-9 rounded-lg px-3 shadow-sm outline focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
          />
          <button
            onClick={createProject}
            className="h-9 px-4 rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
          >
            Crear
          </button>
        </div>
      </div>
    </aside>
  );
}
