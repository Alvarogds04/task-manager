// src/components/Kanban.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

type Status = "todo" | "in-progress" | "done";
type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "Alta" | "Media" | "Baja";
  deadline: string | null;
  status: Status;
  project_id: string;
  user_id?: string;
};
const COLUMNS: { key: Status; title: string }[] = [
  { key: "todo",        title: "Por hacer" },
  { key: "in-progress", title: "En progreso" },
  { key: "done",        title: "Hecho" },
];

function isOverdue(d?: string | null) {
  if (!d) return false;
  const today = new Date();
  const dt = d.length === 10 ? new Date(`${d}T23:59:59`) : new Date(d);
  return dt < today && !Number.isNaN(dt.getTime());
}

export default function Kanban({ projectId }: { projectId?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!projectId) {
        setTasks([]);
        return;
      }
      setLoading(true);

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;

      const q = supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("deadline", { ascending: true });

      // Si tus políticas RLS requieren user_id:
      const { data, error } = uid ? await q.eq("user_id", uid) : await q;

      if (!error && data) setTasks(data as Task[]);
      setLoading(false);
    };
    load();

    if (!projectId) return;

    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        (payload) => {
          setTasks((prev) => {
            if (payload.eventType === "INSERT") return [...prev, payload.new as Task];
            if (payload.eventType === "UPDATE")
              return prev.map((t) => (t.id === (payload.new as any).id ? (payload.new as Task) : t));
            if (payload.eventType === "DELETE")
              return prev.filter((t) => t.id !== (payload.old as any).id);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const grouped = useMemo(() => {
    const g: Record<Status, Task[]> = { "todo": [], "in-progress": [], "done": [] };
    for (const t of tasks) g[t.status]?.push(t);
    return g;
  }, [tasks]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const from = source.droppableId as Status;
    const to = destination.droppableId as Status;

    if (from === to && destination.index === source.index) return;

    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;

    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: to } : t)));

    const { error } = await supabase.from("tasks").update({ status: to }).eq("id", task.id);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: from } : t)));
      alert(error.message);
    }
  };

  return (
    <div className="mt-4">
      {loading && <div className="text-sm text-gray-500 mb-2">Cargando tareas…</div>}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-[color:var(--card)] border rounded-xl p-3 min-h-40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{col.title}</h3>
                    <span className="text-xs text-gray-500">
                      {(grouped[col.key] || []).length} tareas
                    </span>
                  </div>

                  {(grouped[col.key] || []).map((t, idx) => (
                    <Draggable draggableId={t.id} index={idx} key={t.id}>
                      {(p) => (
                        <div
                          ref={p.innerRef}
                          {...p.draggableProps}
                          {...p.dragHandleProps}
                          className="bg-white dark:bg-gray-900 rounded-xl shadow p-3 mb-2 ring-1 ring-black/5 dark:ring-white/10"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium text-lg leading-tight">{t.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded border">{t.priority}</span>
                          </div>

                          <div
                            className={`text-xs mt-1 ${
                              isOverdue(t.deadline) ? "text-red-600 font-semibold" : "text-gray-600"
                            }`}
                          >
                            Límite: {t.deadline ?? "—"}
                          </div>

                          {t.description && (
                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 break-words whitespace-pre-wrap">
                              {t.description}
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}

                  {(grouped[col.key] || []).length === 0 && (
                    <div className="text-sm text-gray-500">Sin tareas</div>
                  )}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
