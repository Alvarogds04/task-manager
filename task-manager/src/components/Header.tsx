import ThemeToggle from "./ThemeToggle";

export default function Header({
  title,
  tab,
  onTab,
}: {
  title: string;
  tab: "kanban" | "calendar";
  onTab: (t: "kanban" | "calendar") => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b app-border app-surface backdrop-blur">
      <div className="mx-auto max-w-[1400px] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight app-text">
            {title}
          </h1>
          <ThemeToggle />
        </div>
        <div className="mt-3 flex justify-center">
          <div className="bg-[color:var(--card)] border app-border rounded-2xl p-1 shadow-sm inline-flex">
            <button
              onClick={() => onTab("kanban")}
              className={`px-6 py-2 rounded-xl transition ${
                tab === "kanban"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                  : "app-text hover:opacity-90"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => onTab("calendar")}
              className={`px-6 py-2 rounded-xl transition ${
                tab === "calendar"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                  : "app-text hover:opacity-90"
              }`}
            >
              Calendario
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
