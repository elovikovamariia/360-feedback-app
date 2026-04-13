import Link from "next/link";

const WHY_BLOCKS = [
  {
    title: "Общий язык о развитии",
    text: "Оценка со стороны руководителя, коллег и команды даёт целостную картину: где сильны, где мешают привычки, что поддерживать в работе.",
  },
  {
    title: "Справедливость и ясность",
    text: "Одинаковые критерии и шкала для всех участников цикла. Результаты проще сопоставлять между людьми и командами — в рамках политики компании.",
  },
  {
    title: "Опора для решений",
    text: "HR и руководители видят заполнение и качество обратной связи; сотрудник — свои баллы и нейтральную сводку по смыслу комментариев (в т.ч. с помощью AI).",
  },
];

const HOW_STEPS = [
  {
    step: "1",
    title: "Цикл и охват",
    text: "Компания запускает цикл на всю организацию. Участникам назначаются роли: кого оцениваем и кто даёт обратную связь.",
  },
  {
    step: "2",
    title: "Анкеты",
    text: "Сотрудник проходит самооценку; руководитель и коллеги отвечают по тем же компетенциям (шкала и короткий текст). Так собирается полная картина.",
  },
  {
    step: "3",
    title: "Итоги",
    text: "Сводка по компетенциям, сравнение групп (самооценка, руководитель, коллеги и др.) и аккуратные рекомендации для развития.",
  },
];

const COMPETENCIES = [
  {
    key: "Patient first",
    titleRu: "Клиент и результат",
    desc: "Насколько человек держит в фокусе ценность для клиента и конечный результат, а не только «процесс ради процесса».",
  },
  {
    key: "Play to win",
    titleRu: "Ответственность до результата",
    desc: "Берёт ответственность, доводит задачи до логичного финиша, не «теряет» темы при сложности.",
  },
  {
    key: "Unite efforts",
    titleRu: "Совместная работа",
    desc: "Делится информацией, помогает коллегам, строит конструктивное взаимодействие вместо изоляции команд.",
  },
  {
    key: "Embrace change",
    titleRu: "Гибкость и изменения",
    desc: "Адаптируется к новым условиям, предлагает улучшения, не сопротивляется разумным переменам.",
  },
  {
    key: "Less is more",
    titleRu: "Фокус и простота",
    desc: "Умеет расставлять приоритеты, убирает лишнее, чтобы команда не распылялась на второстепенное.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-16 sm:space-y-20">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700/90">Оценка 360°</p>
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Зачем компании оценка 360°
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
          Это не «контроль», а способ честно посмотреть на сильные стороны и зоны роста с разных точек зрения. Когда
          обратная связь структурирована и повторяется в ритме полугодий или года, проще планировать развитие людей и
          команд — прозрачно для сотрудника и понятно для бизнеса.
        </p>
      </header>

      <section aria-labelledby="why-heading">
        <h2 id="why-heading" className="sr-only">
          Ценность для компании
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {WHY_BLOCKS.map((b) => (
            <li
              key={b.title}
              className="rounded-2xl border border-slate-200/90 bg-white/90 px-5 py-6 shadow-sm ring-1 ring-slate-100/80"
            >
              <h3 className="text-sm font-semibold text-slate-900">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{b.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white/80 px-6 py-8 sm:px-10 sm:py-10" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-center text-lg font-semibold text-slate-900">
          Как это выглядит в одном цикле
        </h2>
        <ol className="mx-auto mt-8 max-w-2xl space-y-6">
          {HOW_STEPS.map((s) => (
            <li key={s.step} className="flex gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white"
                aria-hidden
              >
                {s.step}
              </span>
              <div>
                <h3 className="font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="comp-heading">
        <div className="text-center">
          <h2 id="comp-heading" className="text-lg font-semibold text-slate-900">
            Компетенции в анкете
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Пять опорных областей — по ним выставляются баллы и при необходимости короткие комментарии. Названия на
            английском совпадают с корпоративной рамкой; ниже — смысл простыми словами.
          </p>
        </div>
        <ul className="mt-8 space-y-3">
          {COMPETENCIES.map((c) => (
            <li
              key={c.key}
              className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-white/95 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-6 sm:px-6"
            >
              <div className="min-w-0 shrink-0 sm:w-52">
                <span className="font-mono text-xs font-medium text-brand-800">{c.key}</span>
                <span className="mt-0.5 block text-sm font-semibold text-slate-900">{c.titleRu}</span>
              </div>
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-600">{c.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-2xl border border-slate-200/90 bg-white px-6 py-8 sm:px-10"
        aria-labelledby="demo-chain-heading"
      >
        <h2 id="demo-chain-heading" className="text-center text-lg font-semibold text-slate-900">
          Типовой сценарий для демо
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">
          Короткая цепочка из тестового задания: от запуска цикла до статистики и отчётов. Роль переключается в шапке
          («Д» → роль для демо).
        </p>
        <ol className="mx-auto mt-8 max-w-xl space-y-5">
          {[
            {
              n: "1",
              title: "HR — цикл на компанию",
              text: "Роль HR. Раздел «Циклы 360°»: создайте цикл на всю компанию (полугодие подставится в название).",
              href: "/hr",
              link: "Открыть циклы",
            },
            {
              n: "2",
              title: "HR — кто оценивает",
              text: "Откройте карточку цикла и назначьте оцениваемого, самооценку, руководителя и коллег — появятся ссылки на анкеты.",
              href: "/hr",
              link: "К списку циклов",
            },
            {
              n: "3",
              title: "Анкеты — два блока на одной странице",
              text: "Роли «Сотрудник», «Руководитель» или «Респондент»: «Мои анкеты» — отдельно самооценка (шаг при запуске цикла) и отдельно оценка коллег или подчинённых. Демо-персона: Анна / Дмитрий.",
              href: "/tasks",
              link: "Мои анкеты",
            },
            {
              n: "4",
              title: "HR — статус и показатели",
              text: "Снова роль HR. В «Отчёты» — заполнение по циклам; по сотруднику — радар по компетенциям и срез по ролям.",
              href: "/reports",
              link: "Отчёты",
            },
          ].map((row) => (
            <li key={row.n} className="flex gap-4 border-b border-slate-100 pb-5 last:border-0 last:pb-0">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
                aria-hidden
              >
                {row.n}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900">{row.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{row.text}</p>
                <Link href={row.href} className="mt-2 inline-block text-sm font-semibold text-brand-800 hover:underline">
                  {row.link} →
                </Link>
              </div>
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-8 max-w-lg text-center text-xs text-slate-500">
          Сотрудник и руководитель: анкеты в «Мои анкеты», итоги — в «Мои результаты»; без сырых комментариев к лицу, с
          опциональной AI-сводкой на странице результатов.
        </p>
      </section>

      <p className="text-center text-xs text-slate-500">
        Если список циклов пуст, в папке проекта выполните{" "}
        <code className="rounded bg-slate-200/60 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">npx prisma db push</code>{" "}
        и{" "}
        <code className="rounded bg-slate-200/60 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">npm run db:seed</code>
        , затем обновите страницу.
      </p>
    </div>
  );
}
