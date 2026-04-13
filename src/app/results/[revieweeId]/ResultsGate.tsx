"use client";

import { RoleGuardAny } from "@/components/RoleGuard";
import { ResultsClient } from "@/components/ResultsClient";

export function ResultsGate({ revieweeId, cycleId }: { revieweeId: string; cycleId: string }) {
  return (
    <RoleGuardAny anyOf={["reports", "own_results", "hr_cycles"]}>
      <ResultsClient revieweeId={revieweeId} cycleId={cycleId} />
    </RoleGuardAny>
  );
}
