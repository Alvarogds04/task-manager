import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Task } from "./Kanban"; // o desde tus tipos

export default function EditTaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [deadline, setDeadline] = useState(task.deadline ?? "");
  const [priority, setPriority] = useState(task.priority);

  const save = async () => {
    const payload = { title, description: description || null, deadline, priority };
    const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
    if (error) return alert(error.message);
    onClose(); // Realtime refresca
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded p-4 w-full max-w-md space-y-3">
        <h3 className="font-semibold">Editar tarea</h3>
        <input className="border rounded px-3 py-2 w-full" value={title} onChange={e=>setTitle(e.target.value)} />
        <input className="border rounded px-3 py-2 w-full" type="date" value={deadline ?? ""} onChange={e=>setDeadline(e.target.value)} />
        <select className="border rounded px-3 py-2 w-full" value={priority} onChange={e=>setPriority(e.target.value as any)}>
          {["Alta","Media","Baja"].map(p=> <option key={p} value={p}>{p}</option>)}
        </select>
        <textarea className="border rounded px-3 py-2 w-full" rows={3} value={description} onChange={e=>setDescription(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 border rounded" onClick={onClose}>Cancelar</button>
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
