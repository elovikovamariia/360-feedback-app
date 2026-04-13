import { prisma } from "@/lib/prisma";

export type CycleScopeInfo = {
  scopeType: string;
  directionIds: string[];
  directionNums: number[];
  directionNames: string[];
};

export async function getCycleScopeInfo(cycleId: string): Promise<CycleScopeInfo> {
  const cycle = await prisma.reviewCycle.findUnique({
    where: { id: cycleId },
    select: {
      scopeType: true,
      scopedDirections: {
        include: { direction: { select: { id: true, num: true, name: true } } },
      },
    },
  });
  if (!cycle) {
    return { scopeType: "COMPANY", directionIds: [], directionNums: [], directionNames: [] };
  }
  const dirs = cycle.scopedDirections.map((s) => s.direction).sort((a, b) => a.num - b.num);
  return {
    scopeType: cycle.scopeType,
    directionIds: dirs.map((d) => d.id),
    directionNums: dirs.map((d) => d.num),
    directionNames: dirs.map((d) => d.name),
  };
}

export function formatScopeLabel(info: CycleScopeInfo): string {
  if (info.scopeType !== "DIRECTIONS" || info.directionNums.length === 0) {
    return "Вся компания";
  }
  return `Направления: ${info.directionNums.join(", ")}`;
}

export type DirectionBreakdownRow = {
  directionId: string;
  directionNum: number;
  directionName: string;
  employeesInOrg: number;
  assignmentsInCycle: number;
  assignmentsDone: number;
  completionRate: number;
};

/** Статистика по направлениям: штат в оргструктуре vs анкеты в цикле. */
export async function getCycleDirectionBreakdown(cycleId: string): Promise<DirectionBreakdownRow[]> {
  const directions = await prisma.orgDirection.findMany({ orderBy: { num: "asc" } });
  const rows: DirectionBreakdownRow[] = [];

  for (const d of directions) {
    const employeesInOrg = await prisma.person.count({
      where: {
        orgGroup: {
          subdivision: { department: { directionId: d.id } },
        },
      },
    });

    const ass = await prisma.reviewAssignment.findMany({
      where: {
        cycleId,
        reviewee: {
          orgGroup: {
            subdivision: { department: { directionId: d.id } },
          },
        },
      },
      select: { submittedAt: true },
    });

    const assignmentsInCycle = ass.length;
    const assignmentsDone = ass.filter((a) => a.submittedAt).length;
    const completionRate = assignmentsInCycle
      ? Math.round((assignmentsDone / assignmentsInCycle) * 100)
      : 0;

    rows.push({
      directionId: d.id,
      directionNum: d.num,
      directionName: d.name,
      employeesInOrg,
      assignmentsInCycle,
      assignmentsDone,
      completionRate,
    });
  }

  return rows;
}
