import type { Competency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emptyRoleAverages, type RoleAverages } from "@/lib/aggregates";

export async function loadCycleSummary(
  cycleId: string,
  revieweeId: string,
  opts?: { includeVerbatimFeedback?: boolean },
) {
  const includeVerbatim = opts?.includeVerbatimFeedback ?? true;
  const [cycle, reviewee, competencies, assignments] = await Promise.all([
    prisma.reviewCycle.findUnique({ where: { id: cycleId } }),
    prisma.person.findUnique({ where: { id: revieweeId } }),
    prisma.competency.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.reviewAssignment.findMany({
      where: { cycleId, revieweeId },
      include: {
        ratings: true,
        texts: true,
        reviewer: { select: { id: true, name: true } },
      },
    }),
  ]);

  if (!cycle || !reviewee) return null;

  const averages: RoleAverages = emptyRoleAverages();
  const texts: string[] = [];

  for (const a of assignments) {
    const role = relationshipToKey(a.relationship);
    const roleTag = relationshipToBundleTag(a.relationship);
    for (const r of a.ratings) {
      if (!averages[role][r.competencyId]) averages[role][r.competencyId] = { sum: 0, count: 0 };
      averages[role][r.competencyId]!.sum += r.score;
      averages[role][r.competencyId]!.count += 1;
    }
    if (includeVerbatim) {
      for (const t of a.texts) texts.push(`${roleTag}${t.body}`);
      for (const r of a.ratings) {
        if (r.comment && r.comment.trim()) {
          const comp = competencies.find((c) => c.id === r.competencyId);
          const title = comp?.title ?? "компетенция";
          texts.push(`${roleTag}По «${title}»: ${r.comment.trim()}`);
        }
      }
    }
  }

  const roleAveragesByCompetency = competencyAveragesMap(competencies, averages);

  const completed = assignments.filter((a) => a.submittedAt).length;
  const total = assignments.length;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const { selfAvg, othersAvg } = globalAverages(competencies, averages);

  return {
    cycle,
    reviewee,
    competencies,
    assignments: assignments.map((a) => ({
      id: a.id,
      relationship: a.relationship,
      submittedAt: a.submittedAt,
      reviewerName: a.reviewer.name,
      inviteToken: a.inviteToken,
    })),
    averages,
    roleAveragesByCompetency,
    anonymousTextBundle: texts.map((t, i) => `Фрагмент ${i + 1}: ${t}`).join("\n\n"),
    completion: { completed, total, completionRate },
    selfAvg,
    othersAvg,
  };
}

function relationshipToKey(r: string): keyof RoleAverages {
  switch (r) {
    case "SELF":
      return "SELF";
    case "MANAGER":
      return "MANAGER";
    case "PEER":
      return "PEER";
    case "SUBORDINATE":
      return "SUBORDINATE";
    default:
      return "PEER";
  }
}

/** Префикс для обезличенного пакета текстов к ИИ (без имён респондентов). */
function relationshipToBundleTag(r: string): string {
  switch (r) {
    case "SELF":
      return "[Самооценка] ";
    case "MANAGER":
      return "[Руководитель] ";
    case "PEER":
      return "[Коллега] ";
    case "SUBORDINATE":
      return "[Подчинённый] ";
    default:
      return "[Респондент] ";
  }
}

function competencyAveragesMap(competencies: Competency[], averages: RoleAverages) {
  const out: Record<string, { SELF?: number; MANAGER?: number; PEER?: number; SUBORDINATE?: number }> = {};
  for (const c of competencies) {
    out[c.id] = {
      SELF: cellAvg(averages.SELF[c.id]),
      MANAGER: cellAvg(averages.MANAGER[c.id]),
      PEER: cellAvg(averages.PEER[c.id]),
      SUBORDINATE: cellAvg(averages.SUBORDINATE[c.id]),
    };
  }
  return out;
}

function cellAvg(cell: { sum: number; count: number } | undefined) {
  if (!cell || cell.count === 0) return undefined;
  return Math.round((cell.sum / cell.count) * 10) / 10;
}

function globalAverages(competencies: Competency[], averages: RoleAverages) {
  let selfSum = 0;
  let selfN = 0;
  let otherSum = 0;
  let otherN = 0;
  for (const c of competencies) {
    const s = averages.SELF[c.id];
    if (s && s.count) {
      selfSum += s.sum;
      selfN += s.count;
    }
    for (const role of ["MANAGER", "PEER", "SUBORDINATE"] as const) {
      const cell = averages[role][c.id];
      if (cell && cell.count) {
        otherSum += cell.sum;
        otherN += cell.count;
      }
    }
  }
  return {
    selfAvg: selfN ? Math.round((selfSum / selfN) * 10) / 10 : null,
    othersAvg: otherN ? Math.round((otherSum / otherN) * 10) / 10 : null,
  };
}
