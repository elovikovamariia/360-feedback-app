"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HrCycleDetailPageClient } from "@/components/HrCycleDetailPageClient";

function CycleDetailFromQuery() {
  const sp = useSearchParams();
  const id = sp.get("id");
  if (!id) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-slate-600">
        <p className="text-slate-800">Не указан цикл.</p>
        <p className="mt-2 text-sm">
          Откройте цикл из списка на странице «Оценка 360» или добавьте в адрес параметр{" "}
          <code className="rounded bg-slate-100 px-1">?id=…</code>.
        </p>
      </div>
    );
  }
  return <HrCycleDetailPageClient id={id} />;
}

export default function HrCycleByQueryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500" role="status">
          Загрузка…
        </div>
      }
    >
      <CycleDetailFromQuery />
    </Suspense>
  );
}
