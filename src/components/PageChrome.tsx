import type { ReactNode } from "react";
import Link from "next/link";

export type BreadcrumbItem = { href?: string; label: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Навигация по разделам" className="mb-6 flex flex-wrap items-center gap-1 text-sm">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 ? (
            <span className="mx-0.5 select-none text-slate-300" aria-hidden>
              /
            </span>
          ) : null}
          {item.href ? (
            <Link
              href={item.href}
              className="rounded-lg px-2 py-1 font-medium text-slate-500 transition hover:bg-white/80 hover:text-slate-900 hover:shadow-sm hover:ring-1 hover:ring-slate-200/80"
            >
              {item.label}
            </Link>
          ) : (
            <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHero({
  kicker,
  title,
  description,
  children,
}: {
  kicker?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 shadow-card sm:p-9">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-brand-400/20 to-violet-300/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {kicker ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{kicker}</p>
          ) : null}
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem] sm:leading-tight">{title}</h1>
          {description ? <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-[1.05rem]">{description}</p> : null}
        </div>
        {children ? <div className="flex shrink-0 flex-wrap gap-3 lg:justify-end">{children}</div> : null}
      </div>
    </div>
  );
}

export function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-center shadow-inner ring-1 ring-white/60 sm:min-w-[7.5rem]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
