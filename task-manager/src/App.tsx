import { useState } from "react";
import MainLayout from "./layouts/MainLayout";
import Header from "./components/Header";
import Kanban from "./components/Kanban";
import CalendarView from "./components/CalendarView";
import { Project } from "./components/Sidebar";

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectId, setProjectId] = useState<string>();
  const [projectName, setProjectName] = useState<string>("");
  const [tab, setTab] = useState<"kanban"|"calendar">("kanban");

  const selectProject = (pj: Project) => {
    setProjectId(pj.id);
    setProjectName(pj.name);
  };

  return (
    <MainLayout
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
      selectedProjectId={projectId}
      onSelectProject={selectProject}
      header={
        <Header
          title={projectName ? `Gestor de tareas — ${projectName}` : "Gestor de tareas"}
          tab={tab}
          onTab={setTab}
        />
      }
    >
      {tab === "kanban" ? (
        <Kanban projectId={projectId} sidebarCollapsed={sidebarCollapsed} projectName={projectName} />
      ) : (
        <CalendarView projectId={projectId} />
      )}
    </MainLayout>
  );
}
