"use client";

type Tab = { id: string; label: string };

export function ChartTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="flex w-full rounded-2xl bg-slate-100/95 p-1 shadow-inner ring-1 ring-slate-200/80 sm:inline-flex sm:w-auto"
      role="tablist"
      aria-label="Тип диаграммы"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`min-h-[var(--touch-min,44px)] flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 sm:flex-none sm:px-4 ${
            active === t.id
              ? "bg-white text-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-200/90"
              : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
