/**
 * Иконки и короткие подсказки для компетенций (анкета, главная).
 * Синхронизировано с `prisma/seed.ts` по названиям (модель «Концепция 360°»).
 */
const BY_TITLE: Record<string, string> = {
  "Patient first": "🫶",
  "Play to win": "🏆",
  "Unite efforts": "🤝",
  "Embrace change": "🔄",
  "Less is more": "⚡",
};

/** Иконка для заголовка компетенции в анкете и на маркетинговых экранах. */
export function competencyIconForTitle(title: string): string {
  return BY_TITLE[title] ?? "📋";
}

/** Блок для главной: те же компетенции, что в сиде, с коротким описанием для пользователя. */
export const COMPETENCIES_SHOWCASE = [
  {
    key: "patient_first",
    icon: "🫶",
    title: "Patient first",
    desc: "Потребности клиента в решениях и ясная ценность результата.",
  },
  {
    key: "play_to_win",
    icon: "🏆",
    title: "Play to win",
    desc: "Ответственность за результат и доведение задач до конца.",
  },
  {
    key: "unite_efforts",
    icon: "🤝",
    title: "Unite efforts",
    desc: "Обмен информацией и конструктивное взаимодействие.",
  },
  {
    key: "embrace_change",
    icon: "🔄",
    title: "Embrace change",
    desc: "Адаптация к изменениям и инициативы по улучшению.",
  },
  {
    key: "less_is_more",
    icon: "⚡",
    title: "Less is more",
    desc: "Упрощение процессов и фокус на приоритетах.",
  },
] as const;
