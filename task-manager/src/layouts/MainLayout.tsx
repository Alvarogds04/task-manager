import Sidebar, { Project } from "../components/Sidebar";

export default function MainLayout({
  children,
  header,
  sidebarCollapsed,
  onToggleSidebar,
  selectedProjectId,
  onSelectProject,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  selectedProjectId?: string;
  onSelectProject: (pj: Project) => void;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
        selected={selectedProjectId}
        onSelect={onSelectProject}
      />

      {/* Contenido principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        {header}
        <main className="px-4 py-4">{children}</main>
      </div>
    </div>
  );
}
