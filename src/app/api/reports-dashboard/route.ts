import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPreviewRoleFromCookies, resolveViewerPersonId } from "@/lib/demo-session";
import { getManagerCycleCoverage } from "@/lib/manager-coverage";
import { getManagerVisiblePersonIds } from "@/lib/org";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const cookieStore = cookies();
  const role = getPreviewRoleFromCookies(cookieStore);
  const viewerPersonId = await resolveViewerPersonId(cookieStore, role);

  let allowedRevieweeIds: Set<string> | null = null;
  if (role === "manager" && viewerPersonId) {
    allowedRevieweeIds = new Set(await getManagerVisiblePersonIds(viewerPersonId));
  }

  const cycles = await prisma.reviewCycle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      assignments: { select: { revieweeId: true, submittedAt: true } },
      scopedDirections: { include: { direction: { select: { num: true } } } },
    },
  });

  const items = cycles.map((c) => {
    const ass = allowedRevieweeIds
      ? c.assignments.filter((a) => allowedRevieweeIds!.has(a.revieweeId))
      : c.assignments;
    const revieweeIds = [...new Set(ass.map((a) => a.revieweeId))].sort();
    const done = ass.filter((a) => a.submittedAt).length;
    const total = ass.length;
    const firstReviewee = revieweeIds[0];
    const scopeLabel =
      c.scopeType !== "DIRECTIONS" || c.scopedDirections.length === 0
        ? "Вся компания"
        : `Напр.: ${c.scopedDirections
            .map((s) => s.direction.num)
            .sort((a, b) => a - b)
            .join(", ")}`;
    return {
      id: c.id,
      name: c.name,
      scopeLabel,
      revieweeCount: revieweeIds.length,
      completionRate: total ? Math.round((done / total) * 100) : 0,
      firstRevieweeId: firstReviewee,
    };
  });

  const avg =
    items.length === 0 ? 0 : Math.round(items.reduce((a, c) => a + c.completionRate, 0) / items.length);

  const latestCycleId = cycles[0]?.id ?? null;
  let coverage: Awaited<ReturnType<typeof getManagerCycleCoverage>> | null = null;
  if (role === "manager" && viewerPersonId && latestCycleId) {
    coverage = await getManagerCycleCoverage(latestCycleId, viewerPersonId);
  }

  return NextResponse.json({ role, items, avg, latestCycleId, coverage });
}
