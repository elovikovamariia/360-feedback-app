import Link from "next/link";
import { ResultsGate } from "./ResultsGate";

type Props = { params: { revieweeId: string }; searchParams: { cycleId?: string } };

export default function ResultsPage({ params, searchParams }: Props) {
  const { revieweeId } = params;
  const sp = searchParams;
  if (!sp.cycleId) {
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
  return <ResultsGate revieweeId={revieweeId} cycleId={sp.cycleId} />;
}
