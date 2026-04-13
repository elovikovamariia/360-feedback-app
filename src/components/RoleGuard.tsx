"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ACCESS_HELP, type AccessKey, canAccess, PREVIEW_ROLES } from "@/lib/roles";
import { useRolePreview } from "@/components/RolePreviewProvider";

function rolesThatAllowAny(keys: AccessKey[]) {
  const labels = new Set<string>();
  for (const k of keys) {
    for (const r of PREVIEW_ROLES) {
      if (r.access[k]) labels.add(r.shortLabel);
    }
  }
  return [...labels].join(", ");
}

function AccessDenied({ keys }: { keys: AccessKey[] }) {
  const primary = keys[0]!;
  const help = ACCESS_HELP[primary];

  return (
    <div className="card mx-auto max-w-xl p-8 text-center shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Нет доступа в режиме просмотра</p>
      <h1 className="mt-2 text-xl font-bold text-slate-900">{help.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Для этой роли раздел скрыт. Переключите роль в шапке страницы («Просмотр как…»), чтобы увидеть интерфейс с
        нужными правами.
      </p>
      <ul className="mt-4 list-inside list-disc text-left text-sm text-slate-600">
        {help.bullets.map((u) => (
          <li key={u}>{u}</li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-500">
        Раздел доступен ролям:{" "}
        <span className="font-semibold text-slate-700">{rolesThatAllowAny(keys)}</span>.
      </p>
      <Link href="/" className="btn-primary mt-6 inline-flex">
        На главную
      </Link>
    </div>
  );
}

export function RoleGuard({ need, children }: { need: AccessKey; children: ReactNode }) {
  const { role } = useRolePreview();
  if (canAccess(role, need)) return <>{children}</>;
  return <AccessDenied keys={[need]} />;
}

export function RoleGuardAny({ anyOf, children }: { anyOf: AccessKey[]; children: ReactNode }) {
  const { role } = useRolePreview();
  if (anyOf.some((k) => canAccess(role, k))) return <>{children}</>;
  return <AccessDenied keys={anyOf} />;
}
