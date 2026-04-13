"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  cycleId: string;
  cycleName: string;
  /** После удаления открыть этот путь (по умолчанию обновить текущую страницу) */
  redirectTo?: string;
  className?: string;
};

export function HrCycleDeleteButton({ cycleId, cycleName, redirectTo, className = "" }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    const ok = window.confirm(
      `Удалить цикл «${cycleName}»? Все анкеты, ответы и AI-отчёты этого цикла будут удалены безвозвратно.`,
    );
    if (!ok) return;
    setPending(true);
    try {
      const res = await fetch(`/api/cycles/${cycleId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Не удалось удалить");
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200/80 transition hover:bg-red-50 disabled:opacity-50 ${className}`}
    >
      {pending ? "Удаление…" : "Удалить цикл"}
    </button>
  );
}
