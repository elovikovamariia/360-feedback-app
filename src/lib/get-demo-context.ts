import { formatHrSemesterSummary } from "@/lib/employee-past-semesters";
import { DEMO_PERSON_EMAIL } from "@/lib/demo-personas";
import { prisma } from "@/lib/prisma";

export type DemoPendingAssignment = {
  inviteToken: string;
  revieweeName: string;
  reviewerName: string;
  relationship: string;
};

export type DemoContextPayload = {
  cycleId: string;
  cycleName: string;
  revieweeId: string;
  pending: DemoPendingAssignment[];
  /** Оцениваемый — персона Анна из данных: показывается архив полугодий на «Мои результаты». */
  isDemoAnnaEmployee?: boolean;
  semesterPeriodStartsAt?: string | null;
  semesterPeriodEndsAt?: string | null;
  /** Подпись к периоду полугодия из цикла (как задал HR). */
  evaluationSemesterLabel?: string | null;
};

export async function getDemoContext(): Promise<DemoContextPayload | null> {
  const cycle = await prisma.reviewCycle.findFirst({ orderBy: { createdAt: "desc" } });
  if (!cycle) return null;
  const anna = await prisma.person.findFirst({
    where: { email: DEMO_PERSON_EMAIL.employee },
    select: { id: true },
  });
  const annaInCycle = anna
    ? await prisma.reviewAssignment.findFirst({
        where: { cycleId: cycle.id, revieweeId: anna.id },
        select: { revieweeId: true },
      })
    : null;
  const firstAss = await prisma.reviewAssignment.findFirst({
    where: { cycleId: cycle.id },
    select: { revieweeId: true },
  });
  const anchorRevieweeId = annaInCycle?.revieweeId ?? firstAss?.revieweeId;
  if (!anchorRevieweeId) return null;
  const pending = await prisma.reviewAssignment.findMany({
    where: { cycleId: cycle.id, submittedAt: null },
    include: {
      reviewee: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
    orderBy: { id: "asc" },
    take: 40,
  });
  const isDemoAnnaEmployee = Boolean(anna && anchorRevieweeId === anna.id);
  const semesterPeriodStartsAt = cycle.semesterPeriodStartsAt?.toISOString() ?? null;
  const semesterPeriodEndsAt = cycle.semesterPeriodEndsAt?.toISOString() ?? null;
  return {
    cycleId: cycle.id,
    cycleName: cycle.name,
    revieweeId: anchorRevieweeId,
    pending: pending.map((p) => ({
      inviteToken: p.inviteToken,
      revieweeName: p.reviewee.name,
      reviewerName: p.reviewer.name,
      relationship: p.relationship,
    })),
    isDemoAnnaEmployee,
    semesterPeriodStartsAt,
    semesterPeriodEndsAt,
    evaluationSemesterLabel: formatHrSemesterSummary(semesterPeriodStartsAt, semesterPeriodEndsAt),
  };
}
