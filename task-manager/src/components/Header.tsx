export default function Header({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 bg-white border-b z-10">
      <div className="px-4 py-3 flex items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
        <div className="ml-auto">{right}</div>
      </div>
    </header>
  );
}
