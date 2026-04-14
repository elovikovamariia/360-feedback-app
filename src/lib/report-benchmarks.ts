import type { AiBenchmarkBundle } from "@/lib/ai-report";
import { prisma } from "@/lib/prisma";
import { loadCycleSummary } from "@/lib/summary";

export type CompanyBenchmark = {
  overallOthersAvg: number | null;
  /** Средняя оценка «окружения» (не SELF) по компетенции, весь цикл */
  byCompetencyTitle: Record<string, number>;
  nReviewees: number;
};

export type JobTitleBenchmark = {
  jobTitle: string | null;
  overallOthersAvg: number | null;
  nRevieweesInCohort: number;
};

export type PreviousCycleSnapshot = {
  cycleId: string;
  cycleName: string;
  selfAvg: number | null;
  othersAvg: number | null;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Средние баллы по компетенциям и в целом: все оценки не-SELF в цикле. */
async function aggregateOthersInCycle(
  cycleId: string,
  revieweeIdFilter: Set<string> | null,
): Promise<{ byCompetencyId: Map<string, { sum: number; count: number }>; overall: { sum: number; count: number } }> {
  const assignments = await prisma.reviewAssignment.findMany({
    where: {
      cycleId,
      submittedAt: { not: null },
      ...(revieweeIdFilter
        ? { revieweeId: { in: [...revieweeIdFilter] } }
        : {}),
      relationship: { not: "SELF" },
    },
    include: { ratings: true },
  });

  const byComp = new Map<string, { sum: number; count: number }>();
  let overallSum = 0;
  let overallCount = 0;

  for (const a of assignments) {
    for (const r of a.ratings) {
      const cell = byComp.get(r.competencyId) ?? { sum: 0, count: 0 };
      cell.sum += r.score;
      cell.count += 1;
      byComp.set(r.competencyId, cell);
      overallSum += r.score;
      overallCount += 1;
    }
  }

  return {
    byCompetencyId: byComp,
    overall: { sum: overallSum, count: overallCount },
  };
}

export async function loadCompanyBenchmark(cycleId: string, competencies: { id: string; title: string }[]) {
  const agg = await aggregateOthersInCycle(cycleId, null);
  const reviewees = await prisma.reviewAssignment.findMany({
    where: { cycleId },
    distinct: ["revieweeId"],
    select: { revieweeId: true },
  });
  const nReviewees = reviewees.length;
  const byCompetencyTitle: Record<string, number> = {};
  for (const c of competencies) {
    const cell = agg.byCompetencyId.get(c.id);
    if (cell && cell.count > 0) byCompetencyTitle[c.title] = round1(cell.sum / cell.count);
  }
  const overallOthersAvg =
    agg.overall.count > 0 ? round1(agg.overall.sum / agg.overall.count) : null;
  return { overallOthersAvg, byCompetencyTitle, nReviewees } satisfies CompanyBenchmark;
}

export async function loadJobTitleBenchmark(
  cycleId: string,
  revieweeId: string,
  competencies: { id: string; title: string }[],
) {
  const person = await prisma.person.findUnique({
    where: { id: revieweeId },
    select: { title: true },
  });
  const jobTitle = person?.title?.trim() || null;
  if (!jobTitle) {
    return {
      jobTitle: null,
      overallOthersAvg: null,
      nRevieweesInCohort: 0,
    } satisfies JobTitleBenchmark;
  }

  const cohort = await prisma.person.findMany({
    where: { title: jobTitle },
    select: { id: true },
  });
  const ids = new Set(cohort.map((p) => p.id));
  if (!ids.size) {
    return { jobTitle, overallOthersAvg: null, nRevieweesInCohort: 0 } satisfies JobTitleBenchmark;
  }

  const agg = await aggregateOthersInCycle(cycleId, ids);
  const overallOthersAvg =
    agg.overall.count > 0 ? round1(agg.overall.sum / agg.overall.count) : null;
  return {
    jobTitle,
    overallOthersAvg,
    nRevieweesInCohort: ids.size,
  } satisfies JobTitleBenchmark;
}

export async function loadPreviousCycleSnapshot(
  cycleId: string,
  revieweeId: string,
): Promise<PreviousCycleSnapshot | null> {
  const cycles = await prisma.reviewCycle.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, createdAt: true },
  });
  const idx = cycles.findIndex((c) => c.id === cycleId);
  if (idx <= 0) return null;
  const prev = cycles[idx - 1]!;
  const prevSummary = await loadCycleSummary(prev.id, revieweeId, { includeVerbatimFeedback: false });
  if (!prevSummary) return null;
  return {
    cycleId: prev.id,
    cycleName: prev.name,
    selfAvg: prevSummary.selfAvg,
    othersAvg: prevSummary.othersAvg,
  };
}

export async function loadAiBenchmarkBundle(
  cycleId: string,
  revieweeId: string,
  competencies: { id: string; title: string }[],
): Promise<AiBenchmarkBundle> {
  const [company, jt, prev] = await Promise.all([
    loadCompanyBenchmark(cycleId, competencies),
    loadJobTitleBenchmark(cycleId, revieweeId, competencies),
    loadPreviousCycleSnapshot(cycleId, revieweeId),
  ]);
  return {
    company: {
      overallOthersAvg: company.overallOthersAvg,
      byCompetencyTitle: company.byCompetencyTitle,
      nReviewees: company.nReviewees,
    },
    jobTitle: {
      jobTitle: jt.jobTitle,
      overallOthersAvg: jt.overallOthersAvg,
      nRevieweesInCohort: jt.nRevieweesInCohort,
    },
    previous: prev
      ? { cycleName: prev.cycleName, selfAvg: prev.selfAvg, othersAvg: prev.othersAvg }
      : null,
  };
}
