import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Priority, Status, Task } from "../types";

const PRIORITIES: Priority[] = ["Alta", "Media", "Baja"];
const STATUSES: Status[] = ["todo", "in-progress", "done"];

export default function TaskForm({ projectId, onCreated }:{
  projectId?: string;
  onCreated: (t: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("Media");
  const [deadline, setDeadline] = useState<string>("");
  const [status, setStatus] = useState<Status>("todo");
  const [description, setDescription] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return alert("Selecciona un proyecto");
    if (!title.trim() || !deadline) return alert("Título y fecha límite son obligatorios");

    // ✅ Convertimos la fecha YYYY-MM-DD en formato ISO para timestamp
    const deadlineISO = new Date(deadline + "T00:00:00").toISOString();

    const payload = {
      title,
      description: description || null,
      priority,
      deadline: deadlineISO, // aquí ya es válido para timestamp
      status: status || "todo",
      project_id: projectId
    };

    const { data, error } = await supabase.from("tasks").insert(payload).select().single();
    if (error) return alert(error.message);

    onCreated(data as Task);
    setTitle("");
    setDescription("");
    setDeadline("");
    setStatus("todo");
    setPriority("Media");
  };

  return (
    <form onSubmit={submit} className="bg-white p-4 rounded shadow flex flex-wrap gap-3">
      <input
        className="border rounded px-3 py-2 flex-1 min-w-[220px]"
        placeholder="Título de la tarea"
        value={title}
        onChange={e=>setTitle(e.target.value)}
      />
      <input
        className="border rounded px-3 py-2"
        type="date"
        value={deadline}
        onChange={e=>setDeadline(e.target.value)}
      />
      <select
        className="border rounded px-3 py-2"
        value={priority}
        onChange={e=>setPriority(e.target.value as Priority)}
      >
        {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
      </select>
      <select
        className="border rounded px-3 py-2"
        value={status}
        onChange={e=>setStatus(e.target.value as Status)}
      >
        {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      <input
        className="border rounded px-3 py-2 flex-[2] min-w-[260px]"
        placeholder="Descripción (opcional)"
        value={description}
        onChange={e=>setDescription(e.target.value)}
      />
      <button className="px-4 py-2 rounded bg-blue-600 text-white">Añadir</button>
    </form>
  );
}
