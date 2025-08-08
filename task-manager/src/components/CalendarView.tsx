import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Task } from "./Kanban";

export default function CalendarView({ projectId }: { projectId?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    (async () => {
      if (!projectId) { setTasks([]); return; }
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .not("deadline", "is", null);
      setTasks((data || []) as Task[]);
    })();
  }, [projectId]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth()+1, 0);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - ((firstDay.getDay()+6)%7)); // lunes
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - ((lastDay.getDay()+6)%7)));

  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) days.push(new Date(d));

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!t.deadline) continue;
      const key = t.deadline.length === 10 ? t.deadline : t.deadline.slice(0,10);
      (map[key] ||= []).push(t);
    }
    return map;
  }, [tasks]);

  const toKey = (d: Date) => d.toISOString().slice(0,10);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button className="border app-border app-card rounded-xl px-2 py-1" onClick={()=>setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))}>←</button>
        <div className="font-semibold app-text">
          {month.toLocaleString("es-ES", { month: "long", year: "numeric" })}
        </div>
        <button className="border app-border app-card rounded-xl px-2 py-1" onClick={()=>setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))}>→</button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=>(
          <div key={d} className="text-xs app-muted text-center">{d}</div>
        ))}
        {days.map((d,i)=> {
          const key = toKey(d);
          const isOtherMonth = d.getMonth() !== month.getMonth();
          const dayTasks = tasksByDate[key] || [];
          return (
            <div key={i} className={`border app-border rounded-xl p-2 min-h-24 ${isOtherMonth ? "opacity-70" : ""} app-card`}>
              <div className="text-xs font-medium app-muted mb-1">{d.getDate()}</div>
              <div className="space-y-1">
                {dayTasks.slice(0,4).map(t=>(
                  <div key={t.id} className="text-[11px] truncate app-text">
                    • {t.title}
                  </div>
                ))}
                {dayTasks.length > 4 && (
                  <div className="text-[11px] app-muted">+{dayTasks.length-4} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
