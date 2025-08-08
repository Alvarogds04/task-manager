import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

type Status = "todo" | "in-progress" | "done";
type Priority = "Alta" | "Media" | "Baja";
type Layout = "horizontal" | "vertical";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  deadline: string | null; // "YYYY-MM-DD" o ISO
  status: Status;
  project_id: string;
}

export interface Project {
  id: string;
  name: string;
}

const COLUMNS: { key: Status; title: string }[] = [
  { key: "todo",        title: "Por hacer" },
  { key: "in-progress", title: "En progreso" },
  { key: "done",        title: "Hecho" },
];

function isOverdue(d?: string | null) {
  if (!d) return false;
  const now = new Date();
  const dt = d.length === 10 ? new Date(`${d}T23:59:59`) : new Date(d);
  return !Number.isNaN(dt.getTime()) && dt < now;
}

function priorityClasses(p: Priority) {
  switch (p) {
    case "Alta":  return "border-l-4 border-red-500 bg-red-50";
    case "Media": return "border-l-4 border-amber-500 bg-amber-50";
    case "Baja":
    default:      return "border-l-4 border-emerald-500 bg-emerald-50";
  }
}

export default function Kanban({
  projectId,
  sidebarCollapsed = false,
  projectName,
}: {
  projectId?: string;
  sidebarCollapsed?: boolean;
  projectName?: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // UI controls
  const [editing, setEditing] = useState<Task | null>(null);
  const [moveTarget, setMoveTarget] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<"Todas" | Priority>("Todas");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<Layout>("horizontal");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("projects").select("*").order("name");
      if (data) setProjects(data as Project[]);
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!projectId) { setTasks([]); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("deadline", { ascending: true });
      if (!error && data) setTasks(data as Task[]);
      setLoading(false);
    };
    load();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        (payload) => {
          setTasks((prev) => {
            if (payload.eventType === "INSERT") return [...prev, payload.new as Task];
            if (payload.eventType === "UPDATE") return prev.map(t => t.id === (payload.new as any).id ? (payload.new as Task) : t);
            if (payload.eventType === "DELETE") return prev.filter(t => t.id !== (payload.old as any).id);
            return prev;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  // Filtros
  const visible = useMemo(() => {
    return tasks.filter(t => {
      if (priorityFilter !== "Todas" && t.priority !== priorityFilter) return false;
      if (onlyOverdue && !isOverdue(t.deadline)) return false;
      if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [tasks, priorityFilter, onlyOverdue, search]);

  // Agrupar por columna
  const grouped = useMemo(() => {
    const g: Record<Status, Task[]> = { "todo": [], "in-progress": [], "done": [] };
    for (const t of visible) g[t.status]?.push(t);
    return g;
  }, [visible]);

  // Drag & drop entre estados
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    const from = source.droppableId as Status;
    const to = destination.droppableId as Status;
    if (from === to && destination.index === source.index) return;

    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: to } : t));
    const { error } = await supabase.from("tasks").update({ status: to }).eq("id", task.id);
    if (error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: from } : t));
      window.alert(error.message);
    }
  };

  const deleteTask = async (id: string) => {
    const ok = window.confirm("¿Eliminar esta tarea?");
    if (!ok) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) window.alert(error.message);
  };

  const moveTaskToProject = async (task: Task, newProjectId: string) => {
    if (newProjectId === task.project_id) return;
    setTasks(prev => prev.filter(t => t.id !== task.id));
    const { error } = await supabase.from("tasks").update({ project_id: newProjectId }).eq("id", task.id);
    if (error) {
      window.alert(error.message);
      setTasks(prev => [...prev, task]);
    }
  };

  // Contenedor del tablero
  const containerClass =
    layout === "horizontal"
      ? (sidebarCollapsed
          ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          : "grid md:grid-cols-3 gap-4")
      : "flex flex-col gap-4";

  // 🔹 Rejilla de tarjetas dentro de cada columna
  const cardsGridClass =
    sidebarCollapsed
      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2"
      : "grid grid-cols-1 gap-2";

  return (
    <div className="mt-4">
      {/* Controles */}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Buscar por título…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as any)}
        >
          {["Todas", "Alta", "Media", "Baja"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} />
          Solo vencidas
        </label>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-gray-500">Disposición:</span>
          <button
            className={`px-2 py-1 border rounded ${layout === "horizontal" ? "bg-gray-200" : ""}`}
            onClick={() => setLayout("horizontal")}
          >
            Horizontal
          </button>
          <button
            className={`px-2 py-1 border rounded ${layout === "vertical" ? "bg-gray-200" : ""}`}
            onClick={() => setLayout("vertical")}
          >
            Vertical
          </button>

          <button
            className="ml-2 px-3 py-1.5 border rounded bg-blue-600 text-white disabled:opacity-50"
            onClick={() => setCreateOpen(true)}
            disabled={!projectId}
            title={projectId ? "Crear tarea" : "Selecciona un proyecto primero"}
          >
            Crear tarea
          </button>
        </div>
      </div>

      {projectName && (
        <div className="text-sm text-gray-600 mb-2">Proyecto: <span className="font-medium">{projectName}</span></div>
      )}

      {loading && <div className="text-sm text-gray-500 mb-2">Cargando tareas…</div>}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className={containerClass}>
          {COLUMNS.map((col) => (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-gray-50 border rounded p-3 min-h-40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{col.title}</h3>
                    <span className="text-xs text-gray-500">
                      {(grouped[col.key] || []).length} tareas
                    </span>
                  </div>

                  {/* 🔹 Rejilla de tarjetas */}
                  <div className={cardsGridClass}>
                    {(grouped[col.key] || []).map((t, idx) => (
                      <Draggable draggableId={t.id} index={idx} key={t.id}>
                        {(p) => (
                          <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="h-full">
                            <div className={`${priorityClasses(t.priority)} bg-white rounded shadow p-3 md:p-4`}>
                              <div className="flex justify-between items-start">
                                <span className="font-medium text-sm md:text-base">{t.title}</span>
                                <span className="text-[10px] md:text-xs px-2 py-0.5 rounded border">
                                  {t.priority}
                                </span>
                              </div>

                              <div className={`text-[11px] md:text-xs mt-1 ${isOverdue(t.deadline) ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                                Límite: {t.deadline ?? "—"}
                              </div>

                              {t.description && (
                                <div className="text-xs md:text-sm text-gray-700 mt-2">{t.description}</div>
                              )}

                              <div className="flex flex-wrap gap-2 mt-3 items-center">
                                <button className="text-xs border rounded px-2" onClick={() => setEditing(t)}>Editar</button>
                                <button className="text-xs border rounded px-2 text-red-600" onClick={() => deleteTask(t.id)}>Borrar</button>
                                <button className="text-xs border rounded px-2" onClick={() => setMoveTarget(t)}>Mover</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {/* placeholder debe ir dentro de la rejilla */}
                    {provided.placeholder}
                  </div>

                  {(grouped[col.key] || []).length === 0 && (
                    <div className="text-sm text-gray-500 mt-1">Sin tareas</div>
                  )}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* Modales */}
      {editing && <EditTaskModal task={editing} onClose={() => setEditing(null)} />}
      {moveTarget && (
        <MoveTaskModal
          task={moveTarget}
          projects={projects.filter(p => p.id !== moveTarget.project_id)}
          onCancel={() => setMoveTarget(null)}
          onMove={async (pid) => {
            const t = moveTarget;
            setMoveTarget(null);
            if (!t) return;
            await moveTaskToProject(t, pid);
          }}
        />
      )}
      {createOpen && projectId && (
        <CreateTaskModal projectId={projectId} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}

/* ===== Modal de edición ===== */
function EditTaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [deadline, setDeadline] = useState(task.deadline ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);

  const save = async () => {
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      deadline: deadline || null,
      priority,
    };
    const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
    if (error) return window.alert(error.message);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded p-4 w-full max-w-md space-y-3">
        <h3 className="font-semibold">Editar tarea</h3>
        <input className="border rounded px-3 py-2 w-full" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <input className="border rounded px-3 py-2 w-full" type="date" value={deadline ?? ""} onChange={(e)=>setDeadline(e.target.value)} />
        <select className="border rounded px-3 py-2 w-full" value={priority} onChange={(e)=>setPriority(e.target.value as Priority)}>
          {["Alta","Media","Baja"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <textarea className="border rounded px-3 py-2 w-full" rows={3} value={description} onChange={(e)=>setDescription(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 border rounded" onClick={onClose}>Cancelar</button>
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Modal mover tarea ===== */
function MoveTaskModal({
  task,
  projects,
  onCancel,
  onMove,
}: {
  task: Task;
  projects: Project[];
  onCancel: () => void;
  onMove: (projectId: string) => void;
}) {
  const [target, setTarget] = useState<string>(projects[0]?.id || "");
  useEffect(() => { setTarget(projects[0]?.id || ""); }, [projects]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded p-4 w-full max-w-md space-y-3">
        <h3 className="font-semibold">Mover “{task.title}” a otro proyecto</h3>
        {projects.length === 0 ? (
          <div className="text-sm text-gray-600">No hay otros proyectos disponibles.</div>
        ) : (
          <select className="border rounded px-3 py-2 w-full" value={target} onChange={(e)=>setTarget(e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 border rounded" onClick={onCancel}>Cancelar</button>
          <button className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50" onClick={()=> target && onMove(target)} disabled={!target}>Mover</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Modal crear tarea ===== */
function CreateTaskModal({ projectId, onClose }: { projectId: string; onClose: () => void; }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("Media");
  const [deadline, setDeadline] = useState<string>("");
  const [status, setStatus] = useState<Status>("todo");
  const [description, setDescription] = useState("");

  const create = async () => {
    if (!title.trim() || !deadline) {
      return window.alert("Título y fecha límite son obligatorios");
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      deadline,
      status,
      project_id: projectId,
    };
    const { error } = await supabase.from("tasks").insert(payload);
    if (error) return window.alert(error.message);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded p-4 w-full max-w-md space-y-3">
        <h3 className="font-semibold">Crear tarea</h3>
        <input className="border rounded px-3 py-2 w-full" placeholder="Título" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <input className="border rounded px-3 py-2 w-full" type="date" value={deadline} onChange={(e)=>setDeadline(e.target.value)} />
        <select className="border rounded px-3 py-2 w-full" value={priority} onChange={(e)=>setPriority(e.target.value as Priority)}>
          {["Alta","Media","Baja"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="border rounded px-3 py-2 w-full" value={status} onChange={(e)=>setStatus(e.target.value as Status)}>
          {["todo","in-progress","done"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <textarea className="border rounded px-3 py-2 w-full" rows={3} placeholder="Descripción (opcional)" value={description} onChange={(e)=>setDescription(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 border rounded" onClick={onClose}>Cancelar</button>
          <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={create}>Crear</button>
        </div>
      </div>
    </div>
  );
}
