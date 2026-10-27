export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest text-sand">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M6 12c2.4-3 9.6-3 12 0M6 12c2.4 3 9.6 3 12 0"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
      </span>
      <span className="display text-lg tracking-tight">Turma Certa</span>
    </span>
  );
}
