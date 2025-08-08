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
    <header className="sticky top-0 bg-white/80 backdrop-blur border-b z-10">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 text-center">
          {title}
        </h1>

        {/* Botones centrales debajo del título */}
        <div className="mt-3 flex justify-center">
          <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
            <button
              onClick={() => onTab("kanban")}
              className={`py-3 rounded-xl text-center border transition ${
                tab === "kanban"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white hover:bg-gray-50 border-gray-300 text-gray-800"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => onTab("calendar")}
              className={`py-3 rounded-xl text-center border transition ${
                tab === "calendar"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white hover:bg-gray-50 border-gray-300 text-gray-800"
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
