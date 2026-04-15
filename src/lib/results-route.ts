/** Страница результатов: query вместо динамического сегмента — GitHub Pages (output: export). */
export function resultsDetailHref(revieweeId: string, cycleId: string): string {
  return `/results/view?revieweeId=${encodeURIComponent(revieweeId)}&cycleId=${encodeURIComponent(cycleId)}`;
}
