"use client";

import { useEffect, useRef, useState } from "react";
import { PREVIEW_ROLES, type PreviewRoleId } from "@/lib/roles";
import { useRolePreview } from "@/components/RolePreviewProvider";

export function RoleSwitcher({ variant = "desktop" }: { variant?: "desktop" | "drawer" }) {
  const { role, setRole, meta } = useRolePreview();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (variant === "drawer") {
    return (
      <div className="border-t border-slate-100 pt-4">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Просмотр как</p>
        <select
          aria-label="Роль для предпросмотра интерфейса"
          className="input-text mt-2 font-medium"
          value={role}
          onChange={(e) => setRole(e.target.value as PreviewRoleId)}
        >
          {PREVIEW_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.shortLabel} — {r.label}
            </option>
          ))}
        </select>
        <p className="mt-2 px-1 text-xs leading-snug text-slate-500">{meta.description}</p>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[14rem] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:max-w-xs sm:text-sm"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-white sm:text-xs">
          Д
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-900">{meta.shortLabel}</span>
          <span className="block truncate text-[11px] text-slate-500">Роль для демо</span>
        </span>
        <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-[60] mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-slate-900/5"
          role="listbox"
        >
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Роль (тестовое демо)</p>
          {PREVIEW_ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="option"
              aria-selected={role === r.id}
              onClick={() => {
                setRole(r.id);
                setOpen(false);
              }}
              className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                role === r.id ? "bg-brand-50/80" : ""
              }`}
            >
              <span className="font-semibold text-slate-900">{r.label}</span>
              <span className="text-xs leading-snug text-slate-600">{r.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
