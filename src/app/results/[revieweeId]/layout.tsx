import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";

export async function generateStaticParams() {
  try {
    const rows = await prisma.person.findMany({ select: { id: true } });
    return rows.map((r) => ({ revieweeId: r.id }));
  } catch {
    return [];
  }
}

export default function ResultsRevieweeLayout({ children }: { children: ReactNode }) {
  return children;
}
