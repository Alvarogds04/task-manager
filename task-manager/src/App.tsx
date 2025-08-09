// src/App.tsx
import { useState } from "react";
import Header from "./components/Header";
import MainLayout from "./layouts/MainLayout";
import Kanban from "./components/Kanban";
import CalendarView from "./components/CalendarView";
import type { Project } from "./components/Sidebar";

export default function App() {
  const [tab, setTab] = useState<"kanban" | "calendar">("kanban");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

  return (
    <MainLayout
      header={
        <Header
          title="Gestor de tareas"
          tab={tab}
          onTab={setTab}
        />
      }
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
      selectedProjectId={project?.id}
      onSelectProject={setProject}
    >
      {tab === "kanban" ? (
        <Kanban
          projectId={project?.id}
          projectName={project?.name}
          sidebarCollapsed={sidebarCollapsed}
        />
      ) : (
        <CalendarView projectId={project?.id} />
      )}
    </MainLayout>
  );
}
