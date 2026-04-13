import type { Competency } from "@prisma/client";

export type RoleAverages = Record<
  "SELF" | "MANAGER" | "PEER" | "SUBORDINATE",
  Record<string, { sum: number; count: number }>
>;

export function emptyRoleAverages(): RoleAverages {
  return {
    SELF: {},
    MANAGER: {},
    PEER: {},
    SUBORDINATE: {},
  };
}

export function radarRows(
  competencies: Competency[],
  averages: RoleAverages,
): { competency: string; self?: number; manager?: number; peer?: number; subordinate?: number }[] {
  return competencies.map((c) => ({
    competency: c.title,
    self: avg(averages.SELF[c.id]),
    manager: avg(averages.MANAGER[c.id]),
    peer: avg(averages.PEER[c.id]),
    subordinate: avg(averages.SUBORDINATE[c.id]),
  }));
}

function avg(cell: { sum: number; count: number } | undefined) {
  if (!cell || cell.count === 0) return undefined;
  return Math.round((cell.sum / cell.count) * 10) / 10;
}
