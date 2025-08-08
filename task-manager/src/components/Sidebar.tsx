import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type Project = { id: string; name: string };

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  selected,
  onSelect,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  selected?: string;
  onSelect: (project: Project) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("projects").select("*").order("name");
      if (!error && data) setProjects(data as Project[]);
    })();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: newName.trim() })
      .select()
      .single();
    if (error) return window.alert(error.message);
    const pj = data as Project;
    setProjects((p) => [...p, pj]);
    onSelect(pj);
    setNewName("");
  };

  const width = collapsed ? "w-16" : "w-72";

  return (
    <aside
      className={[
        "bg-white border-r h-screen sticky top-0",
        "overflow-y-auto overflow-x-hidden",
        "transition-all duration-300",
        width,
      ].join(" ")}
    >
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <button
          className="border rounded px-2 py-1 text-sm hover:bg-gray-100"
          onClick={onToggleCollapse}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? "»" : "«"}
        </button>
        {!collapsed && <h2 className="font-semibold">Proyectos</h2>}
      </div>

      {/* Lista de proyectos */}
      <nav className="p-2">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={[
              "w-full text-left rounded mb-1 hover:bg-gray-100 transition-colors",
              "px-3 py-2",
              selected === p.id ? "bg-gray-200 font-medium" : "",
              collapsed ? "px-0 text-center" : "",
            ].join(" ")}
            title={collapsed ? p.name : undefined}
          >
            {collapsed ? p.name.slice(0, 1).toUpperCase() : p.name}
          </button>
        ))}
        {projects.length === 0 && !collapsed && (
          <div className="text-sm text-gray-500 px-3 py-2">Sin proyectos</div>
        )}
      </nav>

      {/* Crear proyecto (oculto si está colapsado) */}
      {!collapsed && (
        <form onSubmit={create} className="p-3 border-t mt-auto">
          <label className="block text-sm mb-1">Nuevo proyecto</label>
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2 flex-1"
              placeholder="Ej. Personal"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="px-3 rounded bg-black text-white">Crear</button>
          </div>
        </form>
      )}
    </aside>
  );
}
