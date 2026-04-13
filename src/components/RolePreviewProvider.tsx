"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PREVIEW_ROLE_COOKIE } from "@/lib/demo-session";
import {
  DEFAULT_PREVIEW_ROLE,
  PREVIEW_ROLE_STORAGE_KEY,
  type PreviewRoleId,
  parsePreviewRole,
  roleMeta,
} from "@/lib/roles";

function setPreviewRoleCookie(role: PreviewRoleId) {
  try {
    const maxAge = 60 * 60 * 24 * 400;
    document.cookie = `${PREVIEW_ROLE_COOKIE}=${encodeURIComponent(role)};path=/;max-age=${maxAge};SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

type Ctx = {
  role: PreviewRoleId;
  setRole: (r: PreviewRoleId) => void;
  meta: ReturnType<typeof roleMeta>;
};

const RolePreviewContext = createContext<Ctx | null>(null);

export function RolePreviewProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [role, setRoleState] = useState<PreviewRoleId>(DEFAULT_PREVIEW_ROLE);

  useEffect(() => {
    try {
      const v = localStorage.getItem(PREVIEW_ROLE_STORAGE_KEY);
      const next = v ? parsePreviewRole(v) : DEFAULT_PREVIEW_ROLE;
      setRoleState(next);
      setPreviewRoleCookie(next);
    } catch {
      /* ignore */
    }
  }, []);

  const setRole = useCallback(
    (r: PreviewRoleId) => {
      setRoleState(r);
      setPreviewRoleCookie(r);
      try {
        localStorage.setItem(PREVIEW_ROLE_STORAGE_KEY, r);
      } catch {
        /* ignore */
      }
      router.refresh();
    },
    [router],
  );

  const value = useMemo(
    () => ({
      role,
      setRole,
      meta: roleMeta(role),
    }),
    [role, setRole],
  );

  return <RolePreviewContext.Provider value={value}>{children}</RolePreviewContext.Provider>;
}

export function useRolePreview() {
  const v = useContext(RolePreviewContext);
  if (!v) throw new Error("useRolePreview must be used within RolePreviewProvider");
  return v;
}
