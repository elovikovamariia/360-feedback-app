import { prisma } from "@/lib/prisma";
import { getManagerVisiblePersonIds } from "@/lib/org";

export type ManagerCoverageRow = {
  revieweeId: string;
  revieweeName: string;
  selfSubmitted: boolean;
  pendingAssignments: { id: string; reviewerName: string; relationship: string }[];
};

export async function getManagerCycleCoverage(
  cycleId: string,
  managerPersonId: string,
): Promise<ManagerCoverageRow[]> {
  const visible = await getManagerVisiblePersonIds(managerPersonId);
  const ass = await prisma.reviewAssignment.findMany({
    where: { cycleId, revieweeId: { in: visible } },
    include: {
      reviewee: { select: { id: true, name: true } },
      reviewer: { select: { name: true } },
    },
    orderBy: [{ reviewee: { name: "asc" } }, { relationship: "asc" }],
  });
  const byRv = new Map<string, typeof ass>();
  for (const a of ass) {
    if (!byRv.has(a.revieweeId)) byRv.set(a.revieweeId, []);
    byRv.get(a.revieweeId)!.push(a);
  }
  const rows: ManagerCoverageRow[] = [];
  for (const rid of visible) {
    const list = byRv.get(rid) ?? [];
    if (list.length === 0) continue;
    const name = list[0]!.reviewee.name;
    const self = list.find((x) => x.relationship === "SELF");
    const selfSubmitted = Boolean(self?.submittedAt);
    const pendingAssignments = list
      .filter((x) => !x.submittedAt)
      .map((x) => ({
        id: x.id,
        reviewerName: x.reviewer.name,
        relationship: x.relationship,
      }));
    rows.push({ revieweeId: rid, revieweeName: name, selfSubmitted, pendingAssignments });
  }
  rows.sort((a, b) => a.revieweeName.localeCompare(b.revieweeName, "ru"));
  return rows;
}
