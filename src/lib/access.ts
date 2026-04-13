import { getSubtreePersonIds } from "@/lib/org";
import type { PreviewRoleId } from "@/lib/roles";

export async function canViewRevieweeResults(
  role: PreviewRoleId,
  viewerPersonId: string | null,
  revieweeId: string,
): Promise<boolean> {
  if (role === "hr_admin") return true;
  if (role === "executive") return true;
  if (role === "respondent") return false;
  if (!viewerPersonId) return false;
  if (role === "employee") return viewerPersonId === revieweeId;
  if (role === "manager") {
    if (viewerPersonId === revieweeId) return true;
    const sub = await getSubtreePersonIds(viewerPersonId);
    return sub.includes(revieweeId);
  }
  return false;
}

/** Показывать сырой текст комментариев и ответы на открытые вопросы (не для просмотра «о себе»). */
export function includeVerbatimFeedbackForViewer(
  role: PreviewRoleId,
  viewerPersonId: string | null,
  revieweeId: string,
) {
  if (role === "hr_admin" || role === "executive") return true;
  if (role === "manager" && viewerPersonId && viewerPersonId !== revieweeId) return true;
  if ((role === "employee" || role === "manager") && viewerPersonId === revieweeId) return false;
  return true;
}
