// src/layouts/MainLayout.tsx
import { ReactNode } from "react";
import Sidebar, { Project } from "../components/Sidebar";

export default function MainLayout({
  header,
  children,
  sidebarCollapsed,
  onToggleSidebar,
  selectedProjectId,
  onSelectProject,
}: {
  header: ReactNode;
  children: ReactNode;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  selectedProjectId?: string;
  onSelectProject: (pj: Project) => void;
}) {
  return (
    <div className="min-h-screen app-bg">
      {header}

      <div className="flex">
        <aside className="w-72 shrink-0">
          <div className="sticky top-[72px] h-[calc(100vh-72px)] p-4">
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={onToggleSidebar}
              selectedProjectId={selectedProjectId}
              onSelectProject={onSelectProject}
            />
          </div>
        </aside>

        <main className="flex-1 px-6 py-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
