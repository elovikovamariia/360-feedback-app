"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { navForRole } from "@/lib/roles";
import { useRolePreview } from "@/components/RolePreviewProvider";
import { RoleSwitcher } from "@/components/RoleSwitcher";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();
  const { role } = useRolePreview();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = useMemo(() => navForRole(role), [role]);

  const tabletShortcut = useMemo(() => {
    return (
      nav.find((i) => i.href === "/hr") ??
      nav.find((i) => i.href === "/reports") ??
      nav.find((i) => i.href === "/tasks") ??
      nav.find((i) => i.href === "/me") ??
      nav.find((i) => i.href !== "/")
    );
  }, [nav]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-400/25 to-transparent"
        aria-hidden
      />
      <div className="mx-auto flex h-[3.25rem] max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6">
        <Link
          href="/"
          className="group flex min-w-0 shrink items-center gap-2.5 rounded-xl py-1.5 pr-1 outline-none ring-brand-500/40 focus-visible:ring-2 sm:pr-2"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-md shadow-brand-500/30 transition group-hover:scale-[1.02] group-hover:shadow-lg">
            360
          </span>
          <span className="min-w-0 flex-col leading-tight">
            <span className="max-w-[10rem] truncate text-sm font-semibold tracking-tightish text-slate-900 sm:max-w-none sm:text-[0.95rem]">
              Feedback Studio
            </span>
            <span className="hidden text-[11px] font-medium text-slate-500 sm:block">демо 360° · тестовое задание</span>
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-full bg-slate-100/95 p-1 shadow-inner ring-1 ring-slate-200/80 lg:flex"
          aria-label="Основное меню"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 xl:px-4 ${
                isActive(pathname, item.href)
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:block">
            <RoleSwitcher variant="desktop" />
          </div>
          {tabletShortcut ? (
            <Link href={tabletShortcut.href} className="btn-secondary hidden px-3 py-2 text-xs sm:inline-flex lg:hidden">
              {tabletShortcut.label}
            </Link>
          ) : null}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="sr-only">Меню</span>
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" id="mobile-nav">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-slate-200 bg-white p-4 pt-16 shadow-2xl"
            aria-label="Мобильное меню"
          >
            <div className="flex-1 space-y-1 overflow-y-auto">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-4 py-3.5 text-base font-semibold transition ${
                    isActive(pathname, item.href) ? "bg-brand-50 text-brand-900 ring-1 ring-brand-100" : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 shrink-0 border-t border-slate-100 px-1 pb-2 pt-4">
              <RoleSwitcher variant="drawer" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
