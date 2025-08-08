import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Project } from "../types";

export default function ProjectPicker({
  value,
  onChange,
}: { value?: string; onChange: (id: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("projects").select("*").order("name");
    if (!error) setProjects(data as Project[]);
  };

  useEffect(() => { load(); }, []);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { data, error } = await supabase.from("projects").insert({ name }).select().single();
    if (!error && data) {
      setProjects((p) => [...p, data as Project]);
      onChange((data as Project).id);
      setName("");
    } else {
      alert(error?.message);
    }
  };

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-sm font-medium mb-1">Proyecto</label>
        <select
          className="border rounded px-3 py-2"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>Selecciona un proyecto…</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <form onSubmit={createProject} className="flex gap-2">
        <div>
          <label className="block text-sm font-medium mb-1">Nuevo proyecto</label>
          <input
            className="border rounded px-3 py-2"
            placeholder="Ej. App tareas"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button className="h-9 px-3 rounded bg-black text-white mt-6">Crear</button>
      </form>
    </div>
  );
}
