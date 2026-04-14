/**
 * Роли и доступ — ориентир: business_analysis_360_feedback_service.md.
 * Режим «просмотр как…» для предпросмотра интерфейса; в продакшене — RBAC из корпоративного каталога.
 */

export const PREVIEW_ROLE_STORAGE_KEY = "360_feedback_preview_role";

export type PreviewRoleId = "hr_admin" | "manager" | "employee" | "respondent" | "executive";

export type AccessKey =
  | "hr_cycles"
  | "reports"
  | "directory"
  | "own_results"
  | "respondent_tasks"
  | "company_rollups";

export const PREVIEW_ROLES: {
  id: PreviewRoleId;
  label: string;
  shortLabel: string;
  description: string;
  access: Record<AccessKey, boolean>;
}[] = [
  {
    id: "hr_admin",
    label: "HR / People Partner / HR Admin",
    shortLabel: "HR",
    description: "Запуск и сопровождение циклов, контроль заполнения, отчёты по компании.",
    access: {
      hr_cycles: true,
      reports: true,
      directory: false,
      own_results: false,
      respondent_tasks: true,
      company_rollups: true,
    },
  },
  {
    id: "manager",
    label: "Руководитель",
    shortLabel: "Руководитель",
    description: "Команда вниз по иерархии, контроль заполнения, свои анкеты (самооценка + оценка подчинённых), отчёты.",
    access: {
      hr_cycles: false,
      reports: true,
      directory: true,
      own_results: true,
      respondent_tasks: true,
      company_rollups: false,
    },
  },
  {
    id: "employee",
    label: "Сотрудник (оцениваемый)",
    shortLabel: "Сотрудник",
    description: "Самооценка и анкета коллеги, итоги 360° и рекомендации (пример: Анна Соколова).",
    access: {
      hr_cycles: false,
      reports: false,
      directory: false,
      own_results: true,
      respondent_tasks: true,
      company_rollups: false,
    },
  },
  {
    id: "respondent",
    label: "Респондент",
    shortLabel: "Респондент",
    description: "Заполнение назначенных анкет и архив (пример: Борис Панов, анкета на коллегу).",
    access: {
      hr_cycles: false,
      reports: false,
      directory: false,
      own_results: false,
      respondent_tasks: true,
      company_rollups: false,
    },
  },
  {
    id: "executive",
    label: "Top Management",
    shortLabel: "Top Management",
    description: "Сводные отчёты по организации без операционной HR-панели.",
    access: {
      hr_cycles: false,
      reports: true,
      directory: false,
      own_results: false,
      respondent_tasks: false,
      company_rollups: true,
    },
  },
];

export const DEFAULT_PREVIEW_ROLE: PreviewRoleId = "hr_admin";

export function roleMeta(id: PreviewRoleId) {
  const r = PREVIEW_ROLES.find((x) => x.id === id);
  return r ?? PREVIEW_ROLES[0];
}

export function canAccess(role: PreviewRoleId, key: AccessKey): boolean {
  return roleMeta(role).access[key];
}

export const ROLE_NAV_ITEMS: { href: string; label: string; require: AccessKey | null }[] = [
  { href: "/", label: "Главная", require: null },
  { href: "/hr", label: "Оценка 360", require: "hr_cycles" },
  { href: "/tasks", label: "Мои анкеты", require: "respondent_tasks" },
  { href: "/me", label: "Мои результаты", require: "own_results" },
  { href: "/reports", label: "Отчёты", require: "reports" },
  { href: "/team", label: "Команда", require: "directory" },
];

export function navForRole(role: PreviewRoleId) {
  return ROLE_NAV_ITEMS.filter((item) => item.require === null || canAccess(role, item.require));
}

export function parsePreviewRole(raw: string | null | undefined): PreviewRoleId {
  if (!raw) return DEFAULT_PREVIEW_ROLE;
  const ok = PREVIEW_ROLES.some((r) => r.id === raw);
  return ok ? (raw as PreviewRoleId) : DEFAULT_PREVIEW_ROLE;
}

export const ACCESS_HELP: Record<AccessKey, { title: string; bullets: string[] }> = {
  hr_cycles: {
    title: "Панель циклов оценки",
    bullets: ["Создание и настройка циклов", "Назначение респондентов", "Контроль заполнения анкет"],
  },
  reports: {
    title: "Отчёты и графики",
    bullets: ["Сводка по циклам", "Переход к детальным результатам по сотруднику"],
  },
  directory: {
    title: "Справочник команды",
    bullets: ["Список участников для ориентира при подборе респондентов"],
  },
  own_results: {
    title: "Личные результаты",
    bullets: [
      "Радар и средние баллы по группам",
      "Без сырых текстов комментариев — только AI-сводка по их смыслу",
    ],
  },
  respondent_tasks: {
    title: "Анкеты респондента",
    bullets: [
      "Активные приглашения и архив отправленных ответов",
      "Список строится по выбранной роли предпросмотра (без отдельного входа в этом режиме)",
    ],
  },
  company_rollups: {
    title: "Сводка для руководства",
    bullets: [
      "Агрегированные показатели без операционной HR-панели",
      "Карточка цикла: выбор цикла, сводка по компании и переход к отчёту по каждому оцениваемому",
    ],
  },
};
