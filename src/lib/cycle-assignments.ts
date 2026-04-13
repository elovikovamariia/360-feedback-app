import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/** Клиент транзакции Prisma для createMany внутри $transaction */
export type CycleAssignmentDb = Pick<
  Prisma.TransactionClient,
  "person" | "reviewAssignment"
>;

function inviteToken() {
  return randomBytes(24).toString("hex");
}

/**
 * Для каждого сотрудника с орггруппой: самооценка, руководитель из managerId,
 * один коллега из той же команды (не сам и не руководитель, если возможно).
 */
export async function bulkCreateStructuredAssignments(
  cycleId: string,
  opts?: { onlyOrgGroupId?: string; db?: CycleAssignmentDb },
): Promise<{ created: number }> {
  const db = opts?.db ?? prisma;
  const where: Prisma.PersonWhereInput = {
    orgGroupId: { not: null },
    ...(opts?.onlyOrgGroupId ? { orgGroupId: opts.onlyOrgGroupId } : {}),
  };

  const people = await db.person.findMany({
    where,
    select: { id: true, orgGroupId: true, managerId: true },
  });

  const byGroup = new Map<string, string[]>();
  for (const p of people) {
    const gid = p.orgGroupId!;
    const arr = byGroup.get(gid) ?? [];
    arr.push(p.id);
    byGroup.set(gid, arr);
  }

  const rows: Prisma.ReviewAssignmentCreateManyInput[] = [];

  for (const p of people) {
    const gid = p.orgGroupId!;
    const inGroup = byGroup.get(gid) ?? [];
    const others = inGroup.filter((id) => id !== p.id);

    rows.push({
      cycleId,
      revieweeId: p.id,
      reviewerId: p.id,
      relationship: "SELF",
      inviteToken: inviteToken(),
    });

    if (p.managerId) {
      rows.push({
        cycleId,
        revieweeId: p.id,
        reviewerId: p.managerId,
        relationship: "MANAGER",
        inviteToken: inviteToken(),
      });
    }

    const withoutManager = p.managerId ? others.filter((id) => id !== p.managerId) : others;
    const peerPool = withoutManager.length > 0 ? withoutManager : others.filter((id) => id !== p.id);
    const sortedPeers = [...peerPool].sort();
    const peerId = sortedPeers[0];
    if (!peerId || peerId === p.managerId) continue;

    rows.push({
      cycleId,
      revieweeId: p.id,
      reviewerId: peerId,
      relationship: "PEER",
      inviteToken: inviteToken(),
    });
  }

  const chunk = 40;
  for (let i = 0; i < rows.length; i += chunk) {
    await db.reviewAssignment.createMany({ data: rows.slice(i, i + chunk) });
  }

  return { created: rows.length };
}
