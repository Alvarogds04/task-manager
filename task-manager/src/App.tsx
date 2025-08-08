import { useState } from "react";
import MainLayout from "./layouts/MainLayout";
import Header from "./components/Header";
import Kanban from "./components/Kanban";
import { Project } from "./components/Sidebar";

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectId, setProjectId] = useState<string>();
  const [projectName, setProjectName] = useState<string>("");

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
          right={
            <div className="text-sm text-gray-600">
              {projectId ? "Proyecto activo" : "Selecciona un proyecto"}
            </div>
          }
        />
      }
    >
      <p className="text-sm text-gray-600 mb-2">
        El menú de la izquierda es fijo y se puede colapsar con «» para ganar espacio.
      </p>

      <Kanban
        projectId={projectId}
        sidebarCollapsed={sidebarCollapsed}
        projectName={projectName}
      />
    </MainLayout>
  );
}
