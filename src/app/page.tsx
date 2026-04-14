import Link from "next/link";
import { cookies } from "next/headers";
import { COMPETENCIES_SHOWCASE } from "@/lib/competency-visuals";
import { getPreviewRoleFromCookies } from "@/lib/demo-session";

const WHY_BLOCKS = [
  {
    icon: "💬",
    title: "Общий язык о развитии",
    text: "Руководитель, коллеги и команда дают разные углы зрения: где сильны, что мешает, что усилить.",
  },
  {
    icon: "⚖️",
    title: "Прозрачные критерии",
    text: "Одна шкала и одни компетенции для всех — проще сравнивать динамику и вести честный разговор.",
  },
  {
    icon: "📈",
    title: "Опора для решений",
    text: "HR видит заполнение цикла; сотрудник — баллы и аккуратную сводку смысла обратной связи, в том числе с ИИ.",
  },
];

const HOW_STEPS_DEFAULT = [
  {
    step: "1",
    title: "Запуск цикла",
    text: "HR задаёт сроки сбора. Участникам автоматически назначаются роли: самооценка, руководитель, коллега.",
  },
  { step: "2", title: "Анкеты", text: "Каждый заполняет свою ссылку: шкала 1–5 и короткий текст по компетенциям." },
  { step: "3", title: "Итоги", text: "Радар по ролям, сравнение «я / окружение» и рекомендации для развития." },
];

const HOW_STEPS_EMPLOYEE = [
  {
    step: "1",
    title: "Ваше участие",
    text: "Вам приходит ссылка на анкету; сроки сбора задаются для цикла. Сначала самооценка, затем при необходимости — оценка коллеги.",
  },
  { step: "2", title: "Анкеты", text: "Шкала 1–5 и короткий комментарий по компетенциям — чем конкретнее примеры, тем полезнее итог." },
  { step: "3", title: "Итоги", text: "Радар по ролям и аккуратная сводка смысла обратной связи, в том числе с участием ИИ." },
];

const DEMO_CHAIN_FULL = [
  {
    n: "1",
    title: "HR — новый цикл",
    text: "Раздел «Оценка 360», форма запуска, даты сбора.",
    href: "/hr",
    link: "Открыть",
  },
  {
    n: "2",
    title: "HR — ссылки на анкеты",
    text: "Карточка цикла: кто кого оценивает, статусы отправки.",
    href: "/hr",
    link: "К циклам",
  },
  {
    n: "3",
    title: "Заполнение",
    text: "«Мои анкеты»: самооценка и оценка коллеги/руководителя.",
    href: "/tasks",
    link: "Анкеты",
  },
  {
    n: "4",
    title: "Итоги",
    text: "«Отчёты» и карточка сотрудника: радар, ИИ-сводка.",
    href: "/reports",
    link: "Отчёты",
  },
];

const DEMO_CHAIN_EMPLOYEE = [
  {
    n: "1",
    title: "Заполнение",
    text: "«Мои анкеты»: самооценка и при необходимости оценка коллеги или руководителя.",
    href: "/tasks",
    link: "Анкеты",
  },
  {
    n: "2",
    title: "Итоги",
    text: "«Отчёты» и страница результатов: радар и ИИ-сводка (по политике доступа).",
    href: "/reports",
    link: "Отчёты",
  },
];

export default async function HomePage() {
  const role = getPreviewRoleFromCookies(cookies());
  const hideHrLaunch = role === "employee";
  const howSteps = hideHrLaunch ? HOW_STEPS_EMPLOYEE : HOW_STEPS_DEFAULT;
  const demoRows = hideHrLaunch ? DEMO_CHAIN_EMPLOYEE : DEMO_CHAIN_FULL;

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-1 sm:space-y-16 sm:px-0">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-brand-50/40 px-5 py-10 shadow-card ring-1 ring-slate-100/80 sm:px-10 sm:py-12">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-400/15 blur-3xl"
          aria-hidden
        />
        <div className="relative text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">Оценка 360°</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl sm:leading-tight">
            Честная обратная связь для роста людей и команд
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-slate-600 sm:text-base sm:leading-relaxed">
            Не контроль ради отчёта, а структурированный взгляд с разных сторон. Удобно сотруднику, понятно руководителю,
            измеримо для HR — в ритме полугодий или года.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {hideHrLaunch ? null : (
              <Link href="/hr" className="btn-primary order-1 min-h-[48px] w-full px-6 sm:order-none sm:w-auto">
                Запуск цикла (HR)
              </Link>
            )}
            <Link
              href="/tasks"
              className={`min-h-[48px] w-full px-6 sm:w-auto ${hideHrLaunch ? "btn-primary order-1 sm:order-none" : "btn-secondary order-2 sm:order-none"}`}
            >
              Мои анкеты
            </Link>
            <Link
              href="/reports"
              className={`btn-secondary min-h-[48px] w-full px-6 sm:w-auto ${hideHrLaunch ? "order-2 sm:order-none" : "order-3 sm:order-none"}`}
            >
              Отчёты
            </Link>
          </div>
          <p className="mx-auto mt-6 max-w-md text-center text-[11px] leading-snug text-slate-500 sm:text-xs">
            {hideHrLaunch
              ? "Роль можно сменить в шапке. Откройте «Мои анкеты», чтобы пройти самооценку или оценку коллеги."
              : "Роль можно сменить в шапке. Начните с HR или откройте «Мои анкеты» как сотрудник."}
          </p>
        </div>
      </section>

      <section aria-labelledby="why-heading">
        <h2 id="why-heading" className="text-center text-lg font-semibold text-slate-900 sm:text-xl">
          Зачем это компании
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {WHY_BLOCKS.map((b) => (
            <li
              key={b.title}
              className="flex flex-col rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-sm ring-1 ring-slate-100/80 sm:p-6"
            >
              <span className="text-2xl" aria-hidden>
                {b.icon}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{b.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-8 shadow-sm sm:px-8 sm:py-10"
        aria-labelledby="how-heading"
      >
        <h2 id="how-heading" className="text-center text-lg font-semibold text-slate-900 sm:text-xl">
          Как проходит один цикл
        </h2>
        <ol className="mx-auto mt-8 max-w-xl space-y-5 sm:space-y-6">
          {howSteps.map((s) => (
            <li key={s.step} className="flex gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-md"
                aria-hidden
              >
                {s.step}
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="comp-heading">
        <div className="text-center">
          <h2 id="comp-heading" className="text-lg font-semibold text-slate-900 sm:text-xl">
            Пять компетенций в анкете
          </h2>
          <p className="mx-auto mt-2 max-w-xl px-1 text-sm text-slate-600">
            По каждой — балл и при желании короткий комментарий. Ниже — смысл «простыми словами».
          </p>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
          {COMPETENCIES_SHOWCASE.map((c) => (
            <li
              key={c.key}
              className="flex gap-4 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-sm ring-1 ring-slate-100/90 sm:p-5"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-brand-50/80 text-2xl shadow-inner ring-1 ring-slate-200/60"
                aria-hidden
              >
                {c.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold leading-snug text-slate-900">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{c.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-3xl border border-brand-100/80 bg-gradient-to-br from-brand-50/50 via-white to-violet-50/30 px-5 py-8 sm:px-8 sm:py-10"
        aria-labelledby="demo-chain-heading"
      >
        <h2 id="demo-chain-heading" className="text-center text-lg font-semibold text-slate-900 sm:text-xl">
          Быстрый маршрут
        </h2>
        <p className="mx-auto mt-2 max-w-lg px-1 text-center text-sm text-slate-600">
          {hideHrLaunch
            ? "В роли сотрудника пройдите анкеты и откройте итоги. Подробный сценарий проверки: "
            : "Четыре шага — от запуска до отчёта. Подробности: "}
          <code className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 ring-1 ring-slate-200/80">
            docs/TEST_SCENARIO_360.md
          </code>
        </p>
        <ol className="mx-auto mt-8 max-w-xl space-y-4">
          {demoRows.map((row) => (
            <li
              key={row.n}
              className="flex gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm ring-1 ring-slate-100/80 sm:gap-4 sm:p-4"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-md"
                aria-hidden
              >
                {row.n}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900">{row.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{row.text}</p>
                <Link
                  href={row.href}
                  className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
                >
                  {row.link} →
                </Link>
              </div>
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-6 max-w-md text-center text-xs leading-relaxed text-slate-500">
          Сотрудник в «Мои результаты» видит баллы и ИИ-рекомендации без дословных чужих комментариев.
        </p>
      </section>

      <p className="px-2 text-center text-[11px] leading-relaxed text-slate-500 sm:text-xs">
        Если список циклов пуст, проверьте настройку базы данных и наличие записей о циклах оценки.
      </p>
    </div>
  );
}
