import { useState } from "react";
import Kanban from "./components/Kanban";
import Sidebar, { Project } from "./components/Sidebar";

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectId, setProjectId] = useState<string>();
  const [projectName, setProjectName] = useState<string>("");

  const selectProject = (pj: Project) => {
    setProjectId(pj.id);
    setProjectName(pj.name);
  };

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      {/* Sidebar SIEMPRE fijo a la izquierda */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        selected={projectId}
        onSelect={selectProject}
      />

      {/* Contenido principal: ocupa todo el resto */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header superior */}
        <header className="sticky top-0 bg-white border-b z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold">
              {projectName ? `Gestor de tareas — ${projectName}` : "Gestor de tareas"}
            </h1>
            <div className="ml-auto text-sm text-gray-600">
              {projectId ? "Proyecto activo" : "Selecciona un proyecto"}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="px-4 py-4">
          <p className="text-sm text-gray-600 mb-2">
            El menú de la izquierda es fijo y se puede colapsar con «» para ganar espacio.
          </p>

          <Kanban
            projectId={projectId}
            sidebarCollapsed={sidebarCollapsed}
            projectName={projectName}
          />
        </main>
      </div>
    </div>
  );
}
