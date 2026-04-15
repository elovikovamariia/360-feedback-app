/**
 * Контекстные подсказки по экрану и роли (режим предпросмотра).
 */

import type { PreviewRoleId } from "./roles";
import { canAccess } from "./roles";

export type DemoContextualHint = {
  tag: string;
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function getContextualDemoHint(role: PreviewRoleId, pathname: string): DemoContextualHint | null {
  const p = pathname || "/";

  if (p.startsWith("/survey/")) return null;

  if (p === "/") {
    return {
      tag: "Старт",
      message:
        "Переключите роль в шапке: HR запускает цикл → участники получают ссылки на анкеты → после заполнения смотрите отчёты и ИИ-сводку.",
      ctaHref: "/hr",
      ctaLabel: "К оценке 360 (HR)",
    };
  }

  if (p === "/hr") {
    if (role === "hr_admin") {
      return {
        tag: "Запуск",
        message:
          "Создайте цикл на компанию (полугодие и даты подставятся из формы). Откройте карточку цикла — там ссылки на анкеты для каждого участника.",
      };
    }
    return {
      tag: "Доступ",
      message: "Эта страница только для роли HR. В шапке выберите «Просмотр как…» → HR.",
      ctaHref: "/",
      ctaLabel: "На главную",
    };
  }

  if (p.startsWith("/hr/cycles/") || p === "/hr/cycle") {
    if (role === "hr_admin") {
      return {
        tag: "Назначения",
        message:
          "Вверху можно переключить цикл. Ниже — сводка по компании и таблица респондентов; по каждому оцениваемому — переход к радару и ИИ.",
      };
    }
    if (role === "executive") {
      return {
        tag: "Сводка",
        message:
          "Выберите цикл в списке, откройте блок «Обобщённая оценка по компании», затем при необходимости — отчёт по конкретному сотруднику.",
      };
    }
    return {
      tag: "Доступ",
      message: "Карточка цикла в этом режиме доступна ролям HR и Top Management.",
      ctaHref: "/",
      ctaLabel: "На главную",
    };
  }

  if (p === "/tasks") {
    if (!canAccess(role, "respondent_tasks")) {
      return {
        tag: "Роль",
        message: "«Мои анкеты» доступны в ролях Сотрудник, Руководитель, Респондент и HR.",
      };
    }
    return {
      tag: "Анкеты",
      message:
        "Сотрудник — Анна Соколова (самооценка и оценка коллеги). Руководитель — Дмитрий Волков. Респондент — Борис Панов с анкетой на Анну. Баллы 1–5 и текст попадут в отчёт цикла.",
    };
  }

  if (p === "/reports") {
    if (!canAccess(role, "reports")) {
      return {
        tag: "Доступ",
        message: "Отчёты доступны в ролях HR, Руководитель или Top Management.",
        ctaHref: "/",
        ctaLabel: "На главную",
      };
    }
    if (role === "manager") {
      return {
        tag: "Команда",
        message: "Сводка по циклам в рамках вашей команды: заполнение и переход к радару по сотруднику.",
      };
    }
    if (role === "executive") {
      return {
        tag: "Обзор",
        message: "Агрегированные показатели по циклам — для динамики без операционной рутины HR.",
      };
    }
    return {
      tag: "Статус циклов",
      message: "По каждому циклу видно охват и заполнение. Откройте сотрудника — радар и срез «вы / руководитель / коллеги».",
    };
  }

  if (p === "/me") {
    if (!canAccess(role, "own_results")) {
      return {
        tag: "Доступ",
        message: "«Мои результаты» открыты для ролей Сотрудник и Руководитель.",
        ctaHref: "/",
        ctaLabel: "На главную",
      };
    }
    if (role === "manager") {
      return {
        tag: "Ваш профиль",
        message: "Итоги по вам: радар и группы; дословные комментарии скрыты — есть ИИ-сводка на странице результатов.",
      };
    }
    return {
      tag: "Итоги",
      message: "Краткий вход к результатам по активному циклу: радар, средние по ролям и обезличенная ИИ-сводка.",
    };
  }

  if (p === "/team") {
    if (!canAccess(role, "directory")) {
      return {
        tag: "Доступ",
        message: "Справочник команды доступен в ролях HR и Руководитель.",
        ctaHref: "/",
        ctaLabel: "На главную",
      };
    }
    return {
      tag: "Справочник",
      message: "Список в оргструктуре — ориентир при подборе респондентов к циклу.",
    };
  }

  if (p.startsWith("/results/") || p === "/results/view") {
    return {
      tag: "Отчёт",
      message: "Радар, сравнение самооценки с окружением и блок ИИ с рекомендациями по развитию.",
    };
  }

  return {
    tag: "Навигация",
    message: "Выберите раздел в меню или переключите роль предпросмотра, чтобы увидеть интерфейс для другой роли.",
  };
}
