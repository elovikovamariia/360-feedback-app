import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";

export async function generateStaticParams() {
  try {
    const rows = await prisma.reviewAssignment.findMany({ select: { inviteToken: true } });
    return rows.map((r) => ({ token: r.inviteToken }));
  } catch {
    return [];
  }
}

export default function SurveyTokenLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl">{children}</div>;
}
