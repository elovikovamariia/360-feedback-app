import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPreviewRoleFromCookies, resolveViewerPersonId } from "@/lib/demo-session";
import { prisma } from "@/lib/prisma";

/**
 * Анкеты, где текущий просмотрщик демо — респондент (по cookie роли + ACTOR или дефолт Анна/Дмитрий).
 * Не требует reviewerId в query — в отличие от /api/respondent.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";
  if (status !== "pending" && status !== "archive") {
    return NextResponse.json({ error: "status должен быть pending или archive" }, { status: 400 });
  }

  const cookieStore = cookies();
  const role = getPreviewRoleFromCookies(cookieStore);
  const viewerId = await resolveViewerPersonId(cookieStore, role);
  if (!viewerId) {
    return NextResponse.json({ reviewerId: null, items: [] });
  }

  const items = await prisma.reviewAssignment.findMany({
    where: {
      reviewerId: viewerId,
      ...(status === "pending" ? { submittedAt: null } : { submittedAt: { not: null } }),
    },
    orderBy: { createdAt: "desc" },
    take: 120,
    include: {
      cycle: { select: { id: true, name: true, startsAt: true, endsAt: true } },
      reviewee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    reviewerId: viewerId,
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
