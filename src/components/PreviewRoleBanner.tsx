"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getContextualDemoHint } from "@/lib/demo-scenario";
import { useRolePreview } from "@/components/RolePreviewProvider";

export function PreviewRoleBanner() {
  const pathname = usePathname() ?? "/";
  const { role, meta } = useRolePreview();

  if (pathname.startsWith("/survey/")) return null;

  const hint = getContextualDemoHint(role, pathname);

  return (
    <div className="border-b border-slate-200/90 bg-slate-50/95">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-6 sm:gap-y-1">
          <p className="text-xs leading-snug text-slate-700">
            <span className="font-semibold text-slate-900">Тестовое демо</span>
            <span className="mx-1.5 text-slate-300" aria-hidden>
              ·
            </span>
            <span className="text-slate-600">Сейчас:</span>{" "}
            <span className="font-medium text-slate-900">{meta.shortLabel}</span>
            <span className="text-slate-500"> — {meta.label}</span>
          </p>
          {hint?.ctaHref && hint.ctaLabel ? (
            <Link
              href={hint.ctaHref}
              className="shrink-0 text-xs font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
            >
              {hint.ctaLabel}
            </Link>
          ) : null}
        </div>
        {hint ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-[13px]">
            <span className="mr-1.5 inline-flex items-center rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-800 ring-1 ring-brand-100">
              {hint.tag}
            </span>
            {hint.message}
          </p>
        ) : null}
        <p className="mt-1.5 text-[10px] leading-snug text-slate-400 sm:text-[11px]">
          В продукте роль и права задаются каталогом сотрудников и политиками доступа, а не переключателем в интерфейсе.
        </p>
      </div>
    </div>
  );
}
