import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";

export async function generateStaticParams() {
  try {
    const rows = await prisma.reviewCycle.findMany({ select: { id: true } });
    return rows.map((r) => ({ id: r.id }));
  } catch {
    return [];
  }
}

export default function CycleLayout({ children }: { children: ReactNode }) {
  return children;
}
