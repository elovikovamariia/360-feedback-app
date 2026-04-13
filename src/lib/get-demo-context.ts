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
};

export async function getDemoContext(): Promise<DemoContextPayload | null> {
  const cycle = await prisma.reviewCycle.findFirst({ orderBy: { createdAt: "desc" } });
  if (!cycle) return null;
  const anna = await prisma.person.findFirst({
    where: { email: "anna@demo.local" },
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
  };
}
