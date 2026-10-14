// The brand mark (three book spines, the last one leaning) and, optionally, the name beside it
export default function Logo({ withName = true, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="w-8 h-8 rounded-[0.6rem] bg-(--color-primary) flex items-center justify-center shrink-0 shadow-(--shadow-sm)">
        <svg viewBox="0 0 20 20" className="w-5 h-5" aria-hidden="true">
          <rect x="3" y="4" width="3.4" height="12" rx="0.9" fill="var(--color-primary-foreground)" />
          <rect x="7.6" y="6" width="3.4" height="10" rx="0.9" fill="var(--color-primary-foreground)" opacity="0.65" />
          <rect x="12.4" y="4.6" width="3.4" height="11.4" rx="0.9" fill="var(--color-accent)" transform="rotate(14 14.1 16)" />
        </svg>
      </span>
      {withName && (
        <span className="font-serif text-lg font-semibold tracking-tight text-(--color-foreground) leading-none">
          Book Inventory
        </span>
      )}
    </span>
  );
}
