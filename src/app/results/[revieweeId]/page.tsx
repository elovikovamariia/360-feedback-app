import { Suspense } from "react";
import { ResultsGate } from "./ResultsGate";

type Props = { params: { revieweeId: string } };

export default function ResultsPage({ params }: Props) {
  return (
    <Suspense
      fallback={<div className="card mx-auto max-w-lg p-8 text-center text-slate-600">Загрузка…</div>}
    >
      <ResultsGate revieweeId={params.revieweeId} />
    </Suspense>
  );
}
