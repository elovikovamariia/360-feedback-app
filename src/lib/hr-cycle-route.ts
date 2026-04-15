/** Карточка цикла HR: query вместо динамического сегмента — так работает GitHub Pages (output: export). */
export function hrCycleDetailHref(cycleId: string): string {
  return `/hr/cycle?id=${encodeURIComponent(cycleId)}`;
}
