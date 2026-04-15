"use client";

import { Suspense } from "react";
import { ResultsGate } from "@/components/ResultsGate";

export default function ResultsViewPage() {
  return (
    <Suspense
      fallback={
        <div className="card mx-auto max-w-lg p-8 text-center text-slate-600" role="status">
          Загрузка…
        </div>
      }
    >
      <ResultsGate />
    </Suspense>
  );
}
