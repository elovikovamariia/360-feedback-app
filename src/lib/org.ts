import { prisma } from "@/lib/prisma";

/** Все подчинённые вниз по иерархии (без самого root). */
export async function getSubtreePersonIds(rootManagerId: string): Promise<string[]> {
  const all = await prisma.person.findMany({ select: { id: true, managerId: true } });
  const byManager = new Map<string, string[]>();
  for (const p of all) {
    if (!p.managerId) continue;
    if (!byManager.has(p.managerId)) byManager.set(p.managerId, []);
    byManager.get(p.managerId)!.push(p.id);
  }
  const seen = new Set<string>();
  const stack = [...(byManager.get(rootManagerId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const c of byManager.get(id) ?? []) stack.push(c);
  }
  return [...seen];
}

/** Прямые подчинённые + все ниже по дереву + сам руководитель. */
export async function getManagerVisiblePersonIds(managerPersonId: string): Promise<string[]> {
  const sub = await getSubtreePersonIds(managerPersonId);
  return [managerPersonId, ...sub];
}
