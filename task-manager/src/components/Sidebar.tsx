// src/components/Sidebar.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface Project {
  id: string;
  name: string;
  user_id?: string | null;
}

export default function Sidebar({
  collapsed,
  onToggle,
  selectedProjectId,
  onSelectProject,
}: {
  collapsed: boolean;
  onToggle: () => void;
  selectedProjectId?: string;
  onSelectProject: (p: Project) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("name");
      if (error) {
        console.error("load projects", error);
        alert(error.message);
      } else {
        setProjects(data as Project[]);
      }
    };
    load();

    const ch = supabase
      .channel("projects-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch); // cleanup SIN Promise
    };
  }, []);

  const createProject = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      alert("Necesitas iniciar sesión.");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({ name: trimmed, user_id: uid }) // ← fuerza owner
      .select()
      .single();

    if (error) {
      console.error("insert project", error);
      alert(error.message);
      return;
    }

    setProjects((prev) => [...prev, data as Project]);
    setName("");
    onSelectProject(data as Project);
  };

  return (
    <div className="card p-3 app-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Proyectos</h3>
        <button
          className="border app-border rounded-full w-8 h-8 hover:bg-gray-50 dark:hover:bg-white/10 transition"
          onClick={onToggle}
          title={collapsed ? "Mostrar" : "Ocultar"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <div className="space-y-1 overflow-y-auto flex-1">
        {projects.length === 0 && (
          <div className="text-sm app-muted">Sin proyectos aún</div>
        )}
        {projects.map((p) => {
          const active = p.id === selectedProjectId;
          return (
            <button
              key={p.id}
              onClick={() => onSelectProject(p)}
              className={`w-full text-left px-3 py-2 rounded-xl border app-border hover:bg-gray-50 dark:hover:bg-white/10 transition ${
                active
                  ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                  : "app-card"
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <div className="text-sm app-muted mb-1">Nuevo proyecto</div>
        <div className="flex gap-2">
          <input
            className="flex-1 border app-border rounded-xl px-3 py-2 app-card"
            placeholder="Ej. Personal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createProject()}
          />
          <button className="btn-primary" onClick={createProject}>
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
