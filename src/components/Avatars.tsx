const PEOPLE = [
  { id: "Felix", bg: "#e4e4e7" },
  { id: "Aneka", bg: "#d4d4d8" },
  { id: "Jude", bg: "#a1a1aa" },
  { id: "Oliver", bg: "#71717a" },
  { id: "Amaya", bg: "#52525b" },
];

export function Avatars({ className = "" }: { className?: string }) {
  return (
    <div className={`flex -space-x-2.5 ${className}`} aria-hidden="true">
      {PEOPLE.map((p) => (
        <div
          key={p.id}
          className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/15 ring-2 ring-ink-950 sm:h-9 sm:w-9 shadow-sm"
          style={{ backgroundColor: p.bg }}
        >
          <img
            src={`https://api.dicebear.com/9.x/micah/svg?seed=${p.id}&backgroundColor=transparent`}
            alt={p.id}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

