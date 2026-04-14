import type { Competency } from "@prisma/client";
import { emptyRoleAverages, type RoleAverages } from "@/lib/aggregates";

export type HrAnomalySeverity = "info" | "watch" | "alert";

export type HrAnomaly = {
  id: string;
  severity: HrAnomalySeverity;
  title: string;
  detail: string;
  competencyTitle?: string;
};

export type HrRevieweeInsight = {
  revieweeId: string;
  revieweeName: string;
  selfAvg: number | null;
  othersAvg: number | null;
  gapSelfOthers: number | null;
  anomalies: HrAnomaly[];
};

export type Hr360ReportPayload = {
  ready: boolean;
  completedAssignments: number;
  totalAssignments: number;
  reviewees: HrRevieweeInsight[];
};

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

function cellAvg(cell: { sum: number; count: number } | undefined) {
  if (!cell || cell.count === 0) return undefined;
  return Math.round((cell.sum / cell.count) * 10) / 10;
}

function globalAverages(competencies: Pick<Competency, "id">[], averages: RoleAverages) {
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

function addRatingsToAverages(
  averages: RoleAverages,
  relationship: string,
  ratings: { competencyId: string; score: number }[],
) {
  const role = relationshipToKey(relationship);
  for (const r of ratings) {
    if (!averages[role][r.competencyId]) averages[role][r.competencyId] = { sum: 0, count: 0 };
    averages[role][r.competencyId]!.sum += r.score;
    averages[role][r.competencyId]!.count += 1;
  }
}

/**
 * Эвристики для HR: не диагноз, а повод к калибровке.
 * Пороги на шкале 1–5 (типичная 360).
 */
export function computeAnomaliesFromAverages(
  competencies: Pick<Competency, "id" | "title">[],
  averages: RoleAverages,
  selfAvg: number | null,
  othersAvg: number | null,
): HrAnomaly[] {
  const out: HrAnomaly[] = [];
  let seq = 0;
  const push = (a: Omit<HrAnomaly, "id">) => {
    seq += 1;
    out.push({ ...a, id: `anom_${seq}` });
  };

  if (selfAvg != null && othersAvg != null) {
    const gap = Math.round((selfAvg - othersAvg) * 10) / 10;
    const abs = Math.abs(gap);
    if (abs >= 1.5) {
      push({
        severity: "alert",
        title: "Сильный разрыв «самооценка — окружение»",
        detail:
          gap > 0
            ? "Самооценка заметно выше среднего по ролям руководитель/коллеги. Имеет смысл обсудить ожидания и примеры поведения на 1:1 и при калибровке."
            : "Окружение оценивает заметно выше, чем человек себя. Проверьте, нет ли заниженной самооценки или недопонимания критериев.",
      });
    } else if (abs >= 1.0) {
      push({
        severity: "watch",
        title: "Умеренный разрыв «самооценка — окружение»",
        detail: "Разница достаточна для уточняющего разговора; сопоставьте с комментариями в полном отчёте.",
      });
    } else if (abs >= 0.6) {
      push({
        severity: "info",
        title: "Лёгкий перекос самооценки и окружения",
        detail: "В пределах ожидаемого разброса, но полезно держать в поле зрения при разборе компетенций.",
      });
    }
  }

  for (const c of competencies) {
    const self = cellAvg(averages.SELF[c.id]);
    const mgr = cellAvg(averages.MANAGER[c.id]);
    const peer = cellAvg(averages.PEER[c.id]);
    const sub = cellAvg(averages.SUBORDINATE[c.id]);
    const parts = [self, mgr, peer, sub].filter((x): x is number => x != null);
    if (parts.length < 2) continue;

    const spread = Math.max(...parts) - Math.min(...parts);
    if (spread >= 2) {
      push({
        severity: "alert",
        title: "Сильный разброс оценок по ролям",
        detail: `На одной компетенции мнения ролей расходятся ≥ 2 баллов — рекомендуется калибровка с руководителем.`,
        competencyTitle: c.title,
      });
    } else if (spread >= 1.5) {
      push({
        severity: "watch",
        title: "Заметный разброс между ролями",
        detail: "Сравните формулировки в открытых ответах и убедитесь, что респонденты понимали одинаковые критерии.",
        competencyTitle: c.title,
      });
    }

    if (self != null && mgr != null) {
      const d = Math.abs(self - mgr);
      if (d >= 1.5) {
        push({
          severity: "alert",
          title: "Расхождение самооценки и руководителя",
          detail:
            self > mgr
              ? "Сотрудник видит себя существенно выше, чем руководитель, по этой компетенции."
              : "Руководитель оценивает существенно выше самооценки — уточните контекст задач и наблюдений.",
          competencyTitle: c.title,
        });
      } else if (d >= 1.0) {
        push({
          severity: "watch",
          title: "Умеренное расхождение с руководителем",
          detail: "Имеет смысл включить в повестку калибровки или ИПР.",
          competencyTitle: c.title,
        });
      }
    }

    if (mgr != null && peer != null) {
      const d = Math.abs(mgr - peer);
      if (d >= 1.5) {
        push({
          severity: "watch",
          title: "Различие «руководитель — коллега»",
          detail:
            "Сильно разное видение по компетенции: проверьте, не разные ли контексты наблюдения (проект vs операционка).",
          competencyTitle: c.title,
        });
      }
    }
  }

  const severityOrder: Record<HrAnomalySeverity, number> = { alert: 0, watch: 1, info: 2 };
  out.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const seen = new Set<string>();
  const deduped: HrAnomaly[] = [];
  for (const a of out) {
    const key = `${a.severity}|${a.title}|${a.competencyTitle ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
  }
  return deduped.slice(0, 12);
}

export type AssignmentRatingRow = {
  assignmentId: string;
  revieweeId: string;
  revieweeName: string;
  relationship: string;
  submittedAt: string | null;
  ratings: { competencyId: string; score: number }[];
};

export function buildHr360ReportFromAssignments(
  assignments: AssignmentRatingRow[],
  competencies: Pick<Competency, "id" | "title">[],
): Hr360ReportPayload {
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter((a) => a.submittedAt).length;
  const ready = totalAssignments > 0 && completedAssignments === totalAssignments;

  if (!ready) {
    return { ready: false, completedAssignments, totalAssignments, reviewees: [] };
  }

  const byReviewee = new Map<string, { name: string; rows: AssignmentRatingRow[] }>();
  for (const a of assignments) {
    const cur = byReviewee.get(a.revieweeId) ?? { name: a.revieweeName, rows: [] };
    cur.rows.push(a);
    byReviewee.set(a.revieweeId, cur);
  }

  const reviewees: HrRevieweeInsight[] = [];
  for (const [revieweeId, bundle] of byReviewee) {
    const averages = emptyRoleAverages();
    for (const row of bundle.rows) {
      addRatingsToAverages(averages, row.relationship, row.ratings);
    }
    const { selfAvg, othersAvg } = globalAverages(competencies, averages);
    const gapSelfOthers =
      selfAvg != null && othersAvg != null ? Math.round((selfAvg - othersAvg) * 10) / 10 : null;
    const anomalies = computeAnomaliesFromAverages(competencies, averages, selfAvg, othersAvg).map((a, i) => ({
      ...a,
      id: `${revieweeId}_${i}_${a.id}`,
    }));
    reviewees.push({
      revieweeId,
      revieweeName: bundle.name,
      selfAvg,
      othersAvg,
      gapSelfOthers,
      anomalies,
    });
  }

  reviewees.sort((a, b) => a.revieweeName.localeCompare(b.revieweeName, "ru"));
  return { ready: true, completedAssignments, totalAssignments, reviewees };
}
