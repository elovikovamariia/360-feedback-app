"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RoleGuardAny } from "@/components/RoleGuard";
import { ResultsClient } from "@/components/ResultsClient";

export function ResultsGate() {
  const searchParams = useSearchParams();
  const revieweeId = searchParams.get("revieweeId")?.trim();
  const cycleId = searchParams.get("cycleId")?.trim();

  if (!revieweeId || !cycleId) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="text-lg font-semibold text-slate-900">Нужна полная ссылка</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          В адресе должны быть параметры{" "}
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs">revieweeId=…</code> и{" "}
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs">cycleId=…</code> (кнопка «Результаты
          и AI» в карточке цикла).
        </p>
        <Link href="/hr" className="btn-primary mt-6 inline-flex">
          Перейти в HR-панель
        </Link>
      </div>
    );
  }

  return (
    <RoleGuardAny anyOf={["reports", "own_results", "hr_cycles"]}>
      <ResultsClient revieweeId={revieweeId} cycleId={cycleId} />
    </RoleGuardAny>
  );
}
