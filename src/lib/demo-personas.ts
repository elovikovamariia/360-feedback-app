/**
 * Стабильные email персон в данных (совпадают с prisma/seed).
 * Респондент-коллега с анкетой PEER на оцениваемого сотрудника.
 */
export const DEMO_PERSON_EMAIL = {
  employee: "anna@demo.local",
  respondentPeer: "boris.panov@nordium.demo",
  manager: "dm@demo.local",
} as const;

export const DEMO_PERSON_LABEL = {
  employee: "Анна Соколова",
  respondent: "Борис Панов",
  manager: "Дмитрий Волков",
} as const;
