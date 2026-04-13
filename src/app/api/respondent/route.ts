import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Список анкет респондента: активные (не отправлены) или архив (отправлены). Демо: без авторизации, по reviewerId из браузера. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reviewerId = searchParams.get("reviewerId");
  const status = searchParams.get("status") ?? "pending";
  if (!reviewerId?.trim()) {
    return NextResponse.json({ error: "Не указан идентификатор респондента" }, { status: 400 });
  }
  if (status !== "pending" && status !== "archive") {
    return NextResponse.json({ error: "status должен быть pending или archive" }, { status: 400 });
  }

  const items = await prisma.reviewAssignment.findMany({
    where: {
      reviewerId,
      ...(status === "pending" ? { submittedAt: null } : { submittedAt: { not: null } }),
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      cycle: { select: { id: true, name: true, startsAt: true, endsAt: true } },
      reviewee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    items: items.map((a) => ({
      token: a.inviteToken,
      cycleId: a.cycleId,
      cycleName: a.cycle.name,
      collectionStartsAt: a.cycle.startsAt?.toISOString() ?? null,
      collectionEndsAt: a.cycle.endsAt?.toISOString() ?? null,
      revieweeId: a.revieweeId,
      revieweeName: a.reviewee.name,
      relationship: a.relationship,
      submittedAt: a.submittedAt?.toISOString() ?? null,
    })),
  });
}
