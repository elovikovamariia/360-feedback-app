import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canViewRevieweeResults } from "@/lib/access";
import { getPreviewRoleFromCookies, resolveViewerPersonId } from "@/lib/demo-session";
import { prisma } from "@/lib/prisma";
import { loadCycleSummary } from "@/lib/summary";

type Params = { params: { revieweeId: string } };

export async function GET(req: Request, { params }: Params) {
  const { revieweeId } = params;
  const { searchParams } = new URL(req.url);
  const limitRaw = searchParams.get("limit");
  const limit = Math.max(2, Math.min(12, Number(limitRaw ?? 6) || 6));

  const cookieStore = cookies();
  const role = getPreviewRoleFromCookies(cookieStore);
  const viewerPersonId = await resolveViewerPersonId(cookieStore, role);
  const allowed = await canViewRevieweeResults(role, viewerPersonId, revieweeId);
  if (!allowed) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const cycles = await prisma.reviewCycle.findMany({
    where: { assignments: { some: { revieweeId } } },
    orderBy: [{ endsAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: { id: true, name: true, createdAt: true, endsAt: true },
  });

  const items = (
    await Promise.all(
      cycles.map(async (c) => {
        const s = await loadCycleSummary(c.id, revieweeId, { includeVerbatimFeedback: false });
        return {
          cycleId: c.id,
          cycleName: c.name,
          createdAt: c.createdAt,
          endsAt: c.endsAt,
          completionRate: s?.completion.completionRate ?? 0,
          selfAvg: s?.selfAvg ?? null,
          othersAvg: s?.othersAvg ?? null,
        };
      }),
    )
  ).filter(Boolean);

  return NextResponse.json({ revieweeId, items });
}

