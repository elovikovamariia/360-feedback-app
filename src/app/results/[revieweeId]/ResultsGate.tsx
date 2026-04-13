"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RoleGuardAny } from "@/components/RoleGuard";
import { ResultsClient } from "@/components/ResultsClient";

export function ResultsGate({ revieweeId }: { revieweeId: string }) {
  const searchParams = useSearchParams();
  const cycleId = searchParams.get("cycleId")?.trim();

  if (!cycleId) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="text-lg font-semibold text-slate-900">Нужна ссылка с циклом</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Откройте эту страницу из HR-панели (кнопка «Результаты и AI») — в адресе должен быть параметр{" "}
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs">cycleId=…</code>
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
