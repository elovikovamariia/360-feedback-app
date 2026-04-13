import { ghPagesHandleRequest } from "@/lib/gh-pages/static-api";

/** Публичный basePath (например /360-feedback-app) для GitHub Project Pages. */
export function appBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

/** Префикс для относительных URL (Link сам подставляет basePath; для fetch — вручную). */
export function withBasePath(path: string): string {
  const b = appBasePath();
  if (!path.startsWith("/")) return `${b}/${path}`.replace(/\/{2,}/g, "/") || "/";
  return `${b}${path}`.replace(/\/{2,}/g, "/") || "/";
}

const isStaticClient = process.env.NEXT_PUBLIC_GH_PAGES === "true";

export async function appFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  const isApi = url.includes("/api/");
  if (typeof window !== "undefined" && isStaticClient && isApi) {
    const cookieHeader = typeof document !== "undefined" ? document.cookie : "";
    return ghPagesHandleRequest(url, init, { basePath: appBasePath(), cookieHeader });
  }
  const resolved = url.startsWith("http") ? url : withBasePath(url.startsWith("/") ? url : `/${url}`);
  return fetch(resolved, init);
}
