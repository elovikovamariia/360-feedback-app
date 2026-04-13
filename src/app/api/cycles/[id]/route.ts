import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const { id } = params;
  const cycle = await prisma.reviewCycle.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          reviewee: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!cycle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const byReviewee = new Map<
    string,
    { reviewee: { id: string; name: string }; completed: number; total: number }
  >();
  for (const a of cycle.assignments) {
    const cur = byReviewee.get(a.revieweeId) ?? {
      reviewee: a.reviewee,
      completed: 0,
      total: 0,
    };
    cur.total += 1;
    if (a.submittedAt) cur.completed += 1;
    byReviewee.set(a.revieweeId, cur);
  }

  return NextResponse.json({
    cycle: { id: cycle.id, name: cycle.name, startsAt: cycle.startsAt, endsAt: cycle.endsAt },
    reviewees: [...byReviewee.values()].map((v) => ({
      ...v.reviewee,
      completed: v.completed,
      total: v.total,
      completionRate: v.total ? Math.round((v.completed / v.total) * 100) : 0,
    })),
    assignments: cycle.assignments.map((a) => ({
      id: a.id,
      revieweeId: a.revieweeId,
      revieweeName: a.reviewee.name,
      reviewerId: a.reviewerId,
      reviewerName: a.reviewer.name,
      relationship: a.relationship,
      submittedAt: a.submittedAt,
      surveyUrl: `/survey/${a.inviteToken}`,
    })),
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = params;
  try {
    await prisma.reviewCycle.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Цикл не найден или уже удалён" }, { status: 404 });
  }
}
