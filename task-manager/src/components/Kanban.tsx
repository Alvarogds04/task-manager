import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

/* === Tipos === */
type Status = "todo" | "in-progress" | "done";
type Priority = "Alta" | "Media" | "Baja";
type Layout = "horizontal" | "vertical";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  deadline: string | null;
  status: Status;
  project_id: string;
}
export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  created_at: string;
}
export interface Tag {
  id: string;
  name: string;
  color: string;
}
export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  created_at: string;
}

/* === Constantes/Utils === */
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

/* Colores suaves por prioridad */
function priorityCardClasses(p: Priority) {
  switch (p) {
    case "Alta":
      return "bg-rose-50 ring-1 ring-rose-100";
    case "Media":
      return "bg-amber-50 ring-1 ring-amber-100";
    case "Baja":
    default:
      return "bg-emerald-50 ring-1 ring-emerald-100";
  }
}

/* URL pública desde el SDK (no dependemos de envs) */
const storagePublicURL = (path: string) =>
  supabase.storage.from("attachments").getPublicUrl(path).data.publicUrl;

/* === Kanban === */
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
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<Record<string, Tag[]>>({});
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({});
  const [loading, setLoading] = useState(false);

  // Filtros/UI
  const [editing, setEditing] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<"Todas" | Priority>("Todas");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<Layout>("horizontal");
  const [tagFilter, setTagFilter] = useState<string>("");

  // Menú contextual
  const [ctxMenu, setCtxMenu] = useState<{ open: boolean; x: number; y: number; task?: Task }>({
    open: false, x: 0, y: 0,
  });

  // Mini modales
  const [addSubtaskFor, setAddSubtaskFor] = useState<Task | null>(null);
  const [attachFor, setAttachFor] = useState<Task | null>(null);
  const [showFilesFor, setShowFilesFor] = useState<Task | null>(null);

  /* Cargar tags */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("tags").select("*").order("name");
      if (data) setTags(data as Tag[]);
    })();
  }, []);

  /* Cargar tareas + subtareas + tags + adjuntos */
  useEffect(() => {
    const load = async () => {
      if (!projectId) {
        setTasks([]); setSubtasks({}); setTaskTags({}); setAttachments({});
        return;
      }
      setLoading(true);

      const { data: tasksData } = await supabase
        .from("tasks").select("*")
        .eq("project_id", projectId)
        .order("deadline", { ascending: true });

      const ts = (tasksData || []) as Task[];
      setTasks(ts);

      const ids = ts.map(t => t.id);
      if (ids.length) {
        const [{ data: stData }, { data: ttData }, { data: atData }] = await Promise.all([
          supabase.from("subtasks").select("*").in("task_id", ids).order("created_at", { ascending: true }),
          supabase.from("task_tags").select("task_id, tags:tag_id ( id, name, color )").in("task_id", ids),
          supabase.from("attachments").select("*").in("task_id", ids).order("created_at", { ascending: false }),
        ]);

        const byTask: Record<string, Subtask[]> = {};
        (stData || []).forEach(s => { (byTask[(s as Subtask).task_id] ||= []).push(s as Subtask); });
        setSubtasks(byTask);

        const mapTags: Record<string, Tag[]> = {};
        (ttData || []).forEach((row: any) => {
          const tag: Tag = row.tags; if (!tag) return;
          (mapTags[row.task_id] ||= []).push(tag);
        });
        setTaskTags(mapTags);

        const mapFiles: Record<string, Attachment[]> = {};
        (atData || []).forEach(a => { (mapFiles[(a as Attachment).task_id] ||= []).push(a as Attachment); });
        setAttachments(mapFiles);
      } else {
        setSubtasks({}); setTaskTags({}); setAttachments({});
      }

      setLoading(false);
    };
    load();
  }, [projectId]);

  /* Realtime */
  useEffect(() => {
    if (!projectId) return;

    const chTasks = supabase
      .channel(`tasks-${projectId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        (payload) => {
          setTasks(prev => {
            if (payload.eventType === "INSERT") return [...prev, payload.new as Task];
            if (payload.eventType === "UPDATE") return prev.map(t => t.id === (payload.new as any).id ? (payload.new as Task) : t);
            if (payload.eventType === "DELETE") return prev.filter(t => t.id !== (payload.old as any).id);
            return prev;
          });
        })
      .subscribe();

    const chSubtasks = supabase
      .channel(`subtasks-${projectId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "subtasks" },
        (payload) => {
          setSubtasks(prev => {
            const copy = { ...prev };
            if (payload.eventType === "INSERT") {
              const s = payload.new as Subtask; (copy[s.task_id] ||= []).push(s);
            } else if (payload.eventType === "UPDATE") {
              const s = payload.new as Subtask;
              copy[s.task_id] = (copy[s.task_id] || []).map(x => x.id === s.id ? s : x);
            } else if (payload.eventType === "DELETE") {
              const old: any = payload.old;
              copy[old.task_id] = (copy[old.task_id] || []).filter(x => x.id !== old.id);
            }
            return copy;
          });
        })
      .subscribe();

    const chTaskTags = supabase
      .channel(`task_tags-${projectId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "task_tags" },
        (payload) => {
          setTaskTags(prev => {
            const copy = { ...prev };
            if (payload.eventType === "INSERT") {
              const row: any = payload.new;
              const tag = tags.find(t => t.id === row.tag_id);
              if (tag) (copy[row.task_id] ||= []).push(tag);
            } else if (payload.eventType === "DELETE") {
              const row: any = payload.old;
              copy[row.task_id] = (copy[row.task_id] || []).filter(t => t.id !== row.tag_id);
            }
            return copy;
          });
        })
      .subscribe();

    const chAttachments = supabase
      .channel(`attachments-${projectId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "attachments" },
        (payload) => {
          setAttachments(prev => {
            const copy = { ...prev };
            if (payload.eventType === "INSERT") {
              const a = payload.new as Attachment;
              (copy[a.task_id] ||= []).unshift(a);
            } else if (payload.eventType === "DELETE") {
              const old: any = payload.old;
              copy[old.task_id] = (copy[old.task_id] || []).filter(x => x.id !== old.id);
            }
            return copy;
          });
        })
      .subscribe();

    return () => {
      supabase.removeChannel(chTasks);
      supabase.removeChannel(chSubtasks);
      supabase.removeChannel(chTaskTags);
      supabase.removeChannel(chAttachments);
    };
  }, [projectId, tags]);

  /* Filtros */
  const visible = useMemo(() => {
    return tasks.filter(t => {
      if (priorityFilter !== "Todas" && t.priority !== priorityFilter) return false;
      if (onlyOverdue && !isOverdue(t.deadline)) return false;
      if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (tagFilter) {
        const tt = taskTags[t.id] || [];
        if (!tt.some(tag => tag.id === tagFilter)) return false;
      }
      return true;
    });
  }, [tasks, priorityFilter, onlyOverdue, search, tagFilter, taskTags]);

  const grouped = useMemo(() => {
    const g: Record<Status, Task[]> = { "todo": [], "in-progress": [], "done": [] };
    for (const t of visible) g[t.status]?.push(t);
    return g;
  }, [visible]);

  /* DnD */
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

  /* Subtareas */
  const addSubtask = async (taskId: string, title: string) => {
    if (!title.trim()) return;
    const { data, error } = await supabase
      .from("subtasks").insert({ task_id: taskId, title: title.trim() })
      .select().single();
    if (error) return window.alert(error.message);
    setSubtasks(prev => { const c = { ...prev }; (c[taskId] ||= []).push(data as Subtask); return c; });
  };
  const toggleSubtask = async (s: Subtask) => {
    setSubtasks(prev => ({ ...prev, [s.task_id]: (prev[s.task_id]||[]).map(x => x.id === s.id ? { ...x, done: !x.done } : x) }));
    const { error } = await supabase.from("subtasks").update({ done: !s.done }).eq("id", s.id);
    if (error) window.alert(error.message);
  };
  const deleteSubtask = async (s: Subtask) => {
    setSubtasks(prev => ({ ...prev, [s.task_id]: (prev[s.task_id]||[]).filter(x => x.id !== s.id) }));
    const { error } = await supabase.from("subtasks").delete().eq("id", s.id);
    if (error) window.alert(error.message);
  };

  /* Etiquetas */
  const createTag = async (name: string, color: string) => {
    if (!name.trim()) return null;
    const { data, error } = await supabase.from("tags").insert({ name: name.trim(), color }).select().single();
    if (error) { window.alert(error.message); return null; }
    setTags(prev => [...prev, data as Tag]);
    return (data as Tag).id;
  };
  const attachTag = async (taskId: string, tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    if (tag) setTaskTags(prev => ({ ...prev, [taskId]: [...(prev[taskId]||[]), tag] }));
    const { error } = await supabase.from("task_tags").insert({ task_id: taskId, tag_id: tagId });
    if (error) window.alert(error.message);
  };
  const detachTag = async (taskId: string, tagId: string) => {
    setTaskTags(prev => ({ ...prev, [taskId]: (prev[taskId]||[]).filter(t => t.id !== tagId) }));
    const { error } = await supabase.from("task_tags").delete().match({ task_id: taskId, tag_id: tagId });
    if (error) window.alert(error.message);
  };

  /* Adjuntos */
  const uploadAttachment = async (task: Task, file: File) => {
    const path = `${task.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("attachments").upload(path, file, { upsert: false });
    if (upErr) return window.alert(upErr.message);
    const { data, error } = await supabase
      .from("attachments").insert({ task_id: task.id, file_name: file.name, file_path: path }).select().single();
    if (error) return window.alert(error.message);
    setAttachments(prev => { const c = { ...prev }; (c[task.id] ||= []).unshift(data as Attachment); return c; });
  };
  const deleteAttachment = async (att: Attachment) => {
    await supabase.storage.from("attachments").remove([att.file_path]);
    const { error } = await supabase.from("attachments").delete().eq("id", att.id);
    if (error) window.alert(error.message);
  };

  /* Layout classes */
  const containerClass =
    layout === "horizontal"
      ? (sidebarCollapsed
          ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
          : "grid md:grid-cols-3 gap-6")
      : "flex flex-col gap-6";

  const cardsGridClass =
    sidebarCollapsed ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" : "grid grid-cols-1 gap-4";

  /* Abrir menú contextual desde botón ⋯ */
  const openCardMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setCtxMenu({ open: true, x: rect.left, y: rect.bottom + 4, task });
  };

  return (
    <div className="mt-4" onClick={() => ctxMenu.open && setCtxMenu({ open: false, x: 0, y: 0 })}>
      {/* Controles */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <input className="border rounded-lg px-3 py-2 bg-white/70" placeholder="Buscar por título…" value={search} onChange={(e)=>setSearch(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 bg-white/70" value={priorityFilter} onChange={(e)=>setPriorityFilter(e.target.value as any)}>
          {["Todas","Alta","Media","Baja"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={onlyOverdue} onChange={(e)=>setOnlyOverdue(e.target.checked)} />
          Solo vencidas
        </label>
        <select className="border rounded-lg px-3 py-2 bg-white/70" value={tagFilter} onChange={(e)=>setTagFilter(e.target.value)}>
          <option value="">Todas las etiquetas</option>
          {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-gray-500">Disposición:</span>
          <button className={`px-3 py-1.5 border rounded-lg ${layout==="horizontal"?"bg-gray-200":""}`} onClick={()=>setLayout("horizontal")}>Horizontal</button>
          <button className={`px-3 py-1.5 border rounded-lg ${layout==="vertical"?"bg-gray-200":""}`} onClick={()=>setLayout("vertical")}>Vertical</button>
          <button className="ml-2 px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" onClick={()=>setCreateOpen(true)} disabled={!projectId}>Crear tarea</button>
        </div>
      </div>

      {projectName && <div className="text-sm text-gray-600 mb-3">Proyecto: <span className="font-medium">{projectName}</span></div>}
      {loading && <div className="text-sm text-gray-500 mb-2">Cargando tareas…</div>}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className={containerClass}>
          {COLUMNS.map(col => (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="bg-white/60 border border-gray-200 rounded-2xl p-4 min-h-40">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold tracking-tight text-gray-800">{col.title}</h3>
                    <span className="text-xs text-gray-500">{(grouped[col.key]||[]).length} tareas</span>
                  </div>

                  <div className={cardsGridClass}>
                    {(grouped[col.key]||[]).map((t, idx) => (
                      <Draggable draggableId={t.id} index={idx} key={t.id}>
                        {(p)=>(
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            className="h-full"
                            onContextMenu={(e)=>{ e.preventDefault(); setCtxMenu({ open:true, x:e.clientX, y:e.clientY, task:t }); }}
                          >
                            <div className={`relative ${priorityCardClasses(t.priority)} rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition p-4 flex flex-col`}>
                              {/* Botón de acciones (mismo menú que click derecho) */}
                              <button
                                className="absolute top-2 left-2 text-gray-500 hover:text-gray-700 rounded-md px-2 py-1"
                                title="Acciones"
                                onClick={(e)=>openCardMenu(e, t)}
                              >
                                ⋯
                              </button>

                              {/* Título */}
                              <div className="font-medium text-gray-900 pr-8">{t.title}</div>

                              {/* Etiquetas */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {(taskTags[t.id] || []).map(tag => (
                                  <span key={tag.id} className="text-[10px] md:text-xs px-2 py-0.5 rounded-full border"
                                    style={{ backgroundColor:`${tag.color}20`, borderColor:tag.color }}>
                                    {tag.name}
                                  </span>
                                ))}
                                <TagButton
                                  tags={tags}
                                  onCreate={createTag}
                                  onAttach={(tagId)=>attachTag(t.id, tagId)}
                                  onDetach={(tagId)=>detachTag(t.id, tagId)}
                                  attached={(taskTags[t.id]||[]).map(tt=>tt.id)}
                                />
                              </div>

                              {/* Fecha */}
                              <div className={`text-[11px] md:text-xs mt-2 ${isOverdue(t.deadline) ? "text-red-600 font-semibold":"text-gray-600"}`}>
                                Límite: {t.deadline ?? "—"}
                              </div>

                              {/* Descripción (ajustada, sin desbordes) */}
                              {t.description && (
                                <div className="text-sm text-gray-800 mt-2 whitespace-pre-wrap break-words max-h-28 overflow-auto">
                                  {t.description}
                                </div>
                              )}

                              {/* Subtareas (lista SÓLO; sin input de añadir aquí) */}
                              <Subtasks
                                items={subtasks[t.id] || []}
                                onToggle={toggleSubtask}
                                onDelete={deleteSubtask}
                              />

                              {/* Pie: adjuntos + prioridad abajo derecha */}
                              <div className="mt-3 flex items-center justify-between text-xs">
                                <div className="text-gray-600">
                                  {(attachments[t.id]?.length || 0) > 0 && (
                                    <button className="underline" onClick={()=>setShowFilesFor(t)}>
                                      {attachments[t.id].length} adjunto{attachments[t.id].length!==1?"s":""}
                                    </button>
                                  )}
                                </div>
                                <span className="px-2 py-0.5 rounded-full border bg-white/60">{t.priority}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>

                  {(grouped[col.key]||[]).length===0 && <div className="text-sm text-gray-500 mt-1">Sin tareas</div>}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* Menú contextual */}
      {ctxMenu.open && ctxMenu.task && (
        <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg text-sm min-w-44"
             style={{ top: ctxMenu.y + 2, left: ctxMenu.x + 2 }}
             onClick={(e)=>e.stopPropagation()}>
          <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ setEditing(ctxMenu.task!); setCtxMenu({open:false,x:0,y:0}); }}>Editar…</button>
          <button className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600" onClick={async ()=> {
            const t = ctxMenu.task!; setCtxMenu({open:false,x:0,y:0});
            if (!window.confirm("¿Eliminar esta tarea?")) return;
            const { error } = await supabase.from("tasks").delete().eq("id", t.id);
            if (error) window.alert(error.message);
          }}>Borrar</button>
          <div className="border-t my-1" />
          <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ setAddSubtaskFor(ctxMenu.task!); setCtxMenu({open:false,x:0,y:0}); }}>Añadir subtarea…</button>
          <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ setAttachFor(ctxMenu.task!); setCtxMenu({open:false,x:0,y:0}); }}>Adjuntar archivo…</button>
          <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ setShowFilesFor(ctxMenu.task!); setCtxMenu({open:false,x:0,y:0}); }}>Ver adjuntos…</button>
        </div>
      )}

      {/* Modales */}
      {editing && <EditTaskModal task={editing} onClose={()=>setEditing(null)} />}
      {createOpen && projectId && (
        <CreateTaskModal
          projectId={projectId}
          onClose={()=>setCreateOpen(false)}
          onCreated={(t)=>setTasks(prev=>[...prev, t])}
        />
      )}
      {addSubtaskFor && (
        <AddSubtaskModal
          taskTitle={addSubtaskFor.title}
          onCancel={()=>setAddSubtaskFor(null)}
          onCreate={async (title)=>{ await addSubtask(addSubtaskFor.id, title); setAddSubtaskFor(null); }}
        />
      )}
      {attachFor && (
        <AttachModal
          onCancel={()=>setAttachFor(null)}
          onUpload={async (file)=>{ await uploadAttachment(attachFor, file); setAttachFor(null); }}
        />
      )}
      {showFilesFor && (
        <FilesModal
          files={attachments[showFilesFor.id] || []}
          onClose={()=>setShowFilesFor(null)}
          onDelete={deleteAttachment}
        />
      )}
    </div>
  );
}

/* === Subtareas (SOLO lista) === */
function Subtasks({
  items, onToggle, onDelete,
}: { items: Subtask[]; onToggle: (s: Subtask)=>void; onDelete:(s:Subtask)=>void; }) {
  return (
    <div className="mt-3 space-y-1">
      {items.map(s=>(
        <div key={s.id} className="flex items-center gap-2 text-xs text-gray-800">
          <input type="checkbox" checked={s.done} onChange={()=>onToggle(s)} />
          <span className={s.done ? "line-through text-gray-500":""}>{s.title}</span>
          <button className="ml-auto text-[11px] text-red-600" onClick={()=>onDelete(s)}>✕</button>
        </div>
      ))}
    </div>
  );
}

/* === Etiquetas === */
function TagButton({
  tags, attached, onAttach, onDetach, onCreate,
}: { tags: Tag[]; attached: string[]; onAttach:(id:string)=>void; onDetach:(id:string)=>void; onCreate:(n:string,c:string)=>Promise<string|null>; }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#60a5fa");
  return (
    <div className="relative">
      <button className="text-[10px] md:text-xs border rounded-full px-2 bg-white/60" onClick={()=>setOpen(o=>!o)}>+ etiqueta</button>
      {open && (
        <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-56">
          <div className="max-h-48 overflow-auto mb-2">
            {tags.map(t=>{
              const isOn = attached.includes(t.id);
              return (
                <div key={t.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor:t.color }} />
                    <span>{t.name}</span>
                  </div>
                  <button className="text-[11px] border rounded-lg px-2 bg-white/70" onClick={()=> isOn ? onDetach(t.id) : onAttach(t.id)}>
                    {isOn ? "Quitar" : "Añadir"}
                  </button>
                </div>
              );
            })}
            {tags.length===0 && <div className="text-xs text-gray-500">Sin etiquetas aún</div>}
          </div>

          <div className="border-t pt-2">
            <div className="text-xs font-medium mb-1">Nueva etiqueta</div>
            <div className="flex items-center gap-2 mb-2">
              <input type="color" value={newColor} onChange={(e)=>setNewColor(e.target.value)} />
              <input className="border rounded-lg px-2 py-1 text-xs flex-1" placeholder="Nombre" value={newName} onChange={(e)=>setNewName(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className="text-[11px] border rounded-lg px-2 bg-white/70" onClick={async ()=>{
                const id = await onCreate(newName, newColor); if (id){ setNewName(""); onAttach(id); }
              }}>Crear y añadir</button>
              <button className="text-[11px] ml-auto" onClick={()=>setOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* === Modales === (igual que antes) */
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
      <div className="bg-white rounded-2xl p-4 w-full max-w-md space-y-3">
        <h3 className="font-semibold">Editar tarea</h3>
        <input className="border rounded-lg px-3 py-2 w-full" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <input className="border rounded-lg px-3 py-2 w-full" type="date" value={deadline ?? ""} onChange={(e)=>setDeadline(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 w-full" value={priority} onChange={(e)=>setPriority(e.target.value as Priority)}>
          {["Alta","Media","Baja"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <textarea className="border rounded-lg px-3 py-2 w-full" rows={4} value={description} onChange={(e)=>setDescription(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 border rounded-lg" onClick={onClose}>Cancelar</button>
          <button className="px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function CreateTaskModal({
  projectId, onClose, onCreated,
}: { projectId: string; onClose: () => void; onCreated: (t: Task) => void; }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("Media");
  const [deadline, setDeadline] = useState<string>("");
  const [status, setStatus] = useState<Status>("todo");
  const [description, setDescription] = useState("");

  const create = async () => {
    if (!title.trim() || !deadline) return window.alert("Título y fecha límite son obligatorios");
    const payload = {
      title: title.trim(), description: description.trim() || null, priority, deadline, status, project_id: projectId,
    };
    const { data, error } = await supabase.from("tasks").insert(payload).select().single();
    if (error) return window.alert(error.message);
    onCreated(data as Task);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-4 w-full max-w-md space-y-3">
        <h3 className="font-semibold">Crear tarea</h3>
        <input className="border rounded-lg px-3 py-2 w-full" placeholder="Título" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <input className="border rounded-lg px-3 py-2 w-full" type="date" value={deadline} onChange={(e)=>setDeadline(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 w-full" value={priority} onChange={(e)=>setPriority(e.target.value as Priority)}>
          {["Alta","Media","Baja"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 w-full" value={status} onChange={(e)=>setStatus(e.target.value as Status)}>
          {["todo","in-progress","done"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <textarea className="border rounded-lg px-3 py-2 w-full" rows={3} placeholder="Descripción (opcional)" value={description} onChange={(e)=>setDescription(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 border rounded-lg" onClick={onClose}>Cancelar</button>
          <button className="px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={create}>Crear</button>
        </div>
      </div>
    </div>
  );
}

function AddSubtaskModal({
  taskTitle, onCancel, onCreate,
}: { taskTitle: string; onCancel: () => void; onCreate: (title: string) => void; }) {
  const [title, setTitle] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm space-y-3" onClick={(e)=>e.stopPropagation()}>
        <h3 className="font-semibold">Nueva subtarea para “{taskTitle}”</h3>
        <input className="border rounded-lg px-3 py-2 w-full" placeholder="Descripción de la subtarea" value={title}
               onChange={(e)=>setTitle(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter"){ onCreate(title); } }} />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 border rounded-lg" onClick={onCancel}>Cancelar</button>
          <button className="px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={()=>onCreate(title)}>Crear</button>
        </div>
      </div>
    </div>
  );
}

function AttachModal({
  onCancel, onUpload,
}: { onCancel: () => void; onUpload: (file: File) => void; }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm space-y-3" onClick={(e)=>e.stopPropagation()}>
        <h3 className="font-semibold">Adjuntar archivo</h3>
        <input type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 border rounded-lg" onClick={onCancel}>Cancelar</button>
          <button className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                  disabled={!file} onClick={()=> file && onUpload(file)}>Subir</button>
        </div>
      </div>
    </div>
  );
}

function FilesModal({
  files, onClose, onDelete,
}: { files: Attachment[]; onClose: () => void; onDelete: (a: Attachment) => void; }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-4 w-full max-w-lg space-y-3" onClick={(e)=>e.stopPropagation()}>
        <h3 className="font-semibold">Adjuntos</h3>
        <div className="max-h-80 overflow-auto divide-y">
          {files.length === 0 && <div className="text-sm text-gray-600">No hay adjuntos</div>}
          {files.map(f=>(
            <div key={f.id} className="flex items-center justify-between py-2">
              <a className="text-blue-600 underline text-sm" href={storagePublicURL(f.file_path)} target="_blank" rel="noreferrer">
                {f.file_name}
              </a>
              <button className="text-xs text-red-600" onClick={()=>onDelete(f)}>Eliminar</button>
            </div>
          ))}
        </div>
        <div className="text-right">
          <button className="px-3 py-2 border rounded-lg" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
