export type Status = "todo" | "in-progress" | "done";
export type Priority = "Alta" | "Media" | "Baja";

export interface Project {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  deadline: string;          // ISO date (YYYY-MM-DD)
  status: Status;
  project_id: string;
}
