import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

type Status = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: "Alta" | "Media" | "Baja";
  deadline: string | null;
  status: Status;
  project_id: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

const COLUMNS: { key: Status; title: string }[] = [
  { key: "todo",        title: "Por hacer" },
  { key: "in-progress", title: "En progreso" },
  { key: "done",        title: "Hecho" },
];

const PRIORITY_BG: Record<Task["priority"], string> = {
  Alta:  "bg-[var(--p-high)] ring-1 ring-[var(--ring-high)]",
  Media: "bg-[var(--p-medium)] ring-1 ring-[var(--ring-medium)]",
  Baja:  "bg-[var(--p-low)] ring-1 ring-[var(--ring-low)]",
};

const PRIORITY_BORDER: Record<Task["priority"], string> = {
  Alta:  "border-red-500",
  Media: "border-amber-500",
  Baja:  "border-emerald-500",
};

function isOverdue(d?: string | null) {
  if (!d) return false;
  const today = new Date();
  const dt = d.length === 10 ? new Date(`${d}T23:59:59`) : new Date(d);
  return !Number.isNaN(dt.getTime()) && dt < today;
}

export default function Kanban({
  projectId,
  projectName,
  sidebarCollapsed = false,
}: {
  projectId?: string;
  projectName?: string;
  sidebarCollapsed?: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<
    "Todas" | "Alta" | "Media" | "Baja"
  >("Todas");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const [tags, setTags] = useState<Tag[]>([]);
  const [tagFilter, setTagFilter] = useState<string>("");
  const [taskTags, setTaskTags] = useState<Record<string, string[]>>({});

  const [layout, setLayout] = useState<"horizontal" | "vertical">("horizontal");

  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [moveTask, setMoveTask] = useState<Task | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!projectId) {
        setTasks([]);
        return;
      }
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
            if (payload.eventType === "INSERT") {
              return [...prev, payload.new as Task];
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((t) =>
                t.id === (payload.new as any).id ? (payload.new as Task) : t
              );
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((t) => t.id !== (payload.old as any).id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  useEffect(() => {
    (async () => {
      try {
        const { data: tagsData } = await supabase.from("tags").select("*");
        if (tagsData) setTags(tagsData as Tag[]);

        if (projectId) {
          const { data: tt } = await supabase
            .from("task_tags")
            .select("task_id, tag_id");
          if (tt) {
            const map: Record<string, string[]> = {};
            for (const row of tt as any[]) {
              if (!map[row.task_id]) map[row.task_id] = [];
              map[row.task_id].push(row.tag_id);
            }
            setTaskTags(map);
          }
        }
      } catch {/* tablas opcionales → ignorar */}
    })();
  }, [projectId]);

  useEffect(() => {
    if (!moveTask) return;
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("name");
      if (!error && data) setProjects(data as Project[]);
    })();
  }, [moveTask]);

  const visibleTasks = useMemo(() => {
    let list = tasks;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
      );
    }

    if (priorityFilter !== "Todas") {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    if (onlyOverdue) {
      list = list.filter((t) => isOverdue(t.deadline));
    }

    if (tagFilter) {
      list = list.filter((t) => (taskTags[t.id] || []).includes(tagFilter));
    }

    return list;
  }, [tasks, search, priorityFilter, onlyOverdue, tagFilter, taskTags]);

  const grouped = useMemo(() => {
    const g: Record<Status, Task[]> = { "todo": [], "in-progress": [], "done": [] };
    for (const t of visibleTasks) g[t.status]?.push(t);
    return g;
  }, [visibleTasks]);

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

  const openMenu = (taskId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpenFor(taskId);
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as any)) {
        setMenuOpenFor(null);
        setMenuPos(null);
      }
    };
    if (menuOpenFor) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpenFor]);

  const handleDelete = async (task: Task) => {
    if (!confirm(`¿Borrar "${task.title}"?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) alert(error.message);
  };

  const handleMoveToProject = (task: Task) => {
    setMoveTask(task);
    setMenuOpenFor(null);
    setMenuPos(null);
  };

  const doMoveToProject = async (task: Task, targetProjectId: string) => {
    if (task.project_id === targetProjectId) return setMoveTask(null);
    const { error } = await supabase
      .from("tasks")
      .update({ project_id: targetProjectId })
      .eq("id", task.id);
    if (error) alert(error.message);
    setMoveTask(null);
  };

  const containerClass =
    layout === "horizontal"
      ? sidebarCollapsed
        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
        : "grid md:grid-cols-3 gap-6"
      : "flex flex-col gap-6";

  const cardsGridClass =
    sidebarCollapsed ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" : "grid grid-cols-1 gap-4";

  return (
    <div className="mt-2">
      <div className="toolbar mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="border app-border rounded-xl px-3 py-2 app-card min-w-[220px]"
            placeholder="Buscar por título…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="border app-border rounded-xl px-3 py-2 app-card"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
          >
            {["Todas", "Alta", "Media", "Baja"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <label className="text-sm flex items-center gap-2 app-text">
            <input
              type="checkbox"
              className="accent-[var(--primary)]"
              checked={onlyOverdue}
              onChange={(e) => setOnlyOverdue(e.target.checked)}
            />
            Solo vencidas
          </label>

          <select
            className="border app-border rounded-xl px-3 py-2 app-card"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">Todas las etiquetas</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="app-muted">Disposición:</span>
            <button
              className={`px-3 py-1.5 border app-border rounded-xl ${layout==="horizontal"?"app-card":""}`}
              onClick={()=>setLayout("horizontal")}
            >Horizontal</button>
            <button
              className={`px-3 py-1.5 border app-border rounded-xl ${layout==="vertical"?"app-card":""}`}
              onClick={()=>setLayout("vertical")}
            >Vertical</button>
            <button
              className="btn-primary ml-2 disabled:opacity-50"
              onClick={()=>setCreateOpen(true)}
              disabled={!projectId}
            >Crear tarea</button>
          </div>
        </div>

        {projectName && (
          <div className="text-sm app-muted mt-2">
            Proyecto: <span className="font-medium app-text">{projectName}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-sm app-muted mb-3">Cargando tareas…</div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className={containerClass}>
          {COLUMNS.map((col) => (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="card p-4 min-h-40"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold tracking-tight app-text">{col.title}</h3>
                    <span className="text-xs app-muted">
                      {(grouped[col.key] || []).length} tareas
                    </span>
                  </div>

                  <div className={cardsGridClass}>
                    {(grouped[col.key] || []).map((t, idx) => (
                      <Draggable draggableId={t.id} index={idx} key={t.id}>
                        {(p) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            onContextMenu={(e) => openMenu(t.id, e)}
                            className={`rounded-2xl border app-border p-3 ${PRIORITY_BG[t.priority]} border-l-4 ${PRIORITY_BORDER[t.priority]} relative hover:shadow-md transition`}
                          >
                            <button
                              className="absolute top-2 right-2 text-xs border app-border rounded-xl px-2 py-1 app-card"
                              onClick={(e) => openMenu(t.id, e)}
                              title="Acciones"
                            >
                              ⋯
                            </button>

                            <div className="text-lg font-semibold leading-tight app-text break-words pr-6">
                              {t.title}
                            </div>

                            <div className="text-xs app-muted mt-2">
                              Límite:{" "}
                              <span className={isOverdue(t.deadline) ? "text-red-600 font-semibold" : ""}>
                                {t.deadline ?? "—"}
                              </span>
                            </div>

                            {t.description && (
                              <div className="text-sm app-text mt-2 whitespace-pre-wrap break-words">
                                {t.description}
                              </div>
                            )}

                            <div className="mt-3 flex justify-end">
                              <span className="text-xs border app-border rounded-xl px-2 py-1 app-card">
                                {t.priority}
                              </span>
                            </div>

                            {menuOpenFor === t.id && menuPos && (
                              <div
                                ref={menuRef}
                                style={{ top: menuPos.y, left: menuPos.x, position: "fixed" }}
                                className="card p-2 z-50 min-w-44"
                              >
                                <MenuItem onClick={() => { setEditTask(t); setMenuOpenFor(null); setMenuPos(null); }}>
                                  ✏️ Editar
                                </MenuItem>
                                <MenuItem onClick={() => { handleDelete(t); setMenuOpenFor(null); setMenuPos(null); }}>
                                  🗑️ Borrar
                                </MenuItem>
                                <MenuItem onClick={() => { alert("Subtareas - pendiente"); setMenuOpenFor(null); setMenuPos(null); }}>
                                  ✅ Subtareas
                                </MenuItem>
                                <MenuItem onClick={() => handleMoveToProject(t)}>
                                  ↪️ Mover a proyecto…
                                </MenuItem>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>

                  {provided.placeholder}

                  {(grouped[col.key] || []).length === 0 && (
                    <div className="text-sm app-muted">Sin tareas</div>
                  )}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {createOpen && projectId && (
        <TaskModal
          title="Crear tarea"
          initial={{
            title: "",
            description: "",
            deadline: null,
            priority: "Media",
            status: "todo",
          }}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (values) => {
            const payload = { ...values, project_id: projectId };
            const { error } = await supabase.from("tasks").insert(payload);
            if (error) alert(error.message);
            setCreateOpen(false);
          }}
        />
      )}

      {editTask && (
        <TaskModal
          title="Editar tarea"
          initial={{
            title: editTask.title,
            description: editTask.description || "",
            deadline: editTask.deadline,
            priority: editTask.priority,
            status: editTask.status,
          }}
          onClose={() => setEditTask(null)}
          onSubmit={async (values) => {
            const { error } = await supabase
              .from("tasks")
              .update(values)
              .eq("id", editTask.id);
            if (error) alert(error.message);
            setEditTask(null);
          }}
        />
      )}

      {moveTask && (
        <MoveModal
          taskTitle={moveTask.title}
          projects={projects}
          currentProjectId={moveTask.project_id}
          onClose={() => setMoveTask(null)}
          onSelect={(pid) => doMoveToProject(moveTask, pid)}
        />
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TaskModal({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: {
    title: string;
    description: string | null;
    deadline: string | null;
    priority: Task["priority"];
    status: Status;
  };
  onClose: () => void;
  onSubmit: (values: Omit<Task, "id" | "project_id">) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-sm app-muted border app-border rounded-xl px-2 py-1" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm app-muted">Título</label>
            <input
              className="w-full border app-border rounded-xl px-3 py-2 app-card"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm app-muted">Descripción</label>
            <textarea
              className="w-full border app-border rounded-xl px-3 py-2 app-card min-h-24"
              value={form.description || ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm app-muted">Límite</label>
              <input
                type="date"
                className="w-full border app-border rounded-xl px-3 py-2 app-card"
                value={form.deadline ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value || null }))}
              />
            </div>
            <div>
              <label className="text-sm app-muted">Prioridad</label>
              <select
                className="w-full border app-border rounded-xl px-3 py-2 app-card"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as Task["priority"] }))
                }
              >
                {(["Alta", "Media", "Baja"] as const).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm app-muted">Estado</label>
            <select
              className="w-full border app-border rounded-xl px-3 py-2 app-card"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as Status }))
              }
            >
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="border app-border rounded-xl px-3 py-2 app-card" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary disabled:opacity-50"
            disabled={!form.title.trim()}
            onClick={() =>
              onSubmit({
                title: form.title.trim(),
                description: form.description || null,
                deadline: form.deadline || null,
                priority: form.priority,
                status: form.status,
                project_id: "" as any,
                id: "" as any,
              } as any)
            }
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function MoveModal({
  taskTitle,
  projects,
  currentProjectId,
  onClose,
  onSelect,
}: {
  taskTitle: string;
  projects: Project[];
  currentProjectId: string;
  onClose: () => void;
  onSelect: (projectId: string) => void;
}) {
  const [pid, setPid] = useState(currentProjectId);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Mover “{taskTitle}”</h3>
          <button className="text-sm app-muted border app-border rounded-xl px-2 py-1" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-sm app-muted">Proyecto destino</label>
          <select
            className="w-full border app-border rounded-xl px-3 py-2 app-card"
            value={pid}
            onChange={(e) => setPid(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="border app-border rounded-xl px-3 py-2 app-card" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => onSelect(pid)}>
            Mover
          </button>
        </div>
      </div>
    </div>
  );
}
