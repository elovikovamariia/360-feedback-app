# Сервис оценки 360° с AI-аналитикой

Веб-приложение на **Next.js 13 (App Router)**, **Prisma 5**, **SQLite** (локально), **Recharts** (радар и столбцы). Интерфейс **адаптивный** (ПК и мобильные браузеры): safe-area, удобные зоны нажатия, горизонтальный скролл широких таблиц.

AI-отчёт: вызов **OpenAI Chat Completions** при наличии `OPENAI_API_KEY`, иначе — **локальный генератор** на сервере (та же структура JSON). Стек рассчитан на **Node.js 16.14+** (в т.ч. 18).

## Соответствие заданию 4 (что сдать)

| Требование | Где в репозитории |
|------------|-------------------|
| Работающее приложение (URL) | После деплоя подставьте ссылку; см. [docs/SUBMISSION.md](docs/SUBMISSION.md) |
| Репозиторий | Ваш GitHub/GitLab |
| README (описание, архитектура, запуск) | Этот файл |
| История промптов (.md) | [prompts.md](prompts.md) |

Чеклист и шаблон письма заказчику: **[docs/SUBMISSION.md](docs/SUBMISSION.md)**.

## Основные возможности

- Цикл оценки, назначение респондентов (самооценка, руководитель, коллеги, подчинённые).
- Анкета: шкала 1–5 по 5 компетенциям + обязательный свободный текст.
- Интерфейс оценщика по уникальной ссылке; в HR-таблице статусы «Отправлено / Ожидает», % заполнения.
- Радар по компетенциям, сравнение средних по группам (self / manager / peers / subordinates).
- **ИИ-агент** (`hr-360-report-v2`): HR-отчёт по схеме v2 (инсайты self vs others, слепые зоны, топ-3 сильных/рост, противоречия ролей, анализ текста с тональностью, бенчмаркинг, сигналы рисков, план 90 дней). Сырые тексты в ответ API для клиента **не** отдаются — только на сервере для генерации.
- Роли предпросмотра (HR, руководитель, сотрудник, респондент, Top Management), сводка по циклу для HR и руководства, иллюстрация «крупной выборки» для презентации масштаба.

## ИИ-агент

1. **Код агента:** `src/lib/hr-ai-agent.ts` — единая точка входа; вызов LLM и локальный режим — в `src/lib/ai-report.ts`.
2. **Генерация отчёта:** `POST /api/reviewees/:revieweeId/ai?cycleId=…` (после установки сессии предпросмотра в браузере).
3. **Проверка LLM:** `GET /api/ai/agent` — `configured: true/false`, `mode: "llm" | "demo"`, без секретов (`demo` — технический режим без внешнего API).
4. **Включить LLM:** локальный `.env` (не в git) — см. `.env.example`. Для **OpenRouter**: `OPENAI_API_KEY`, `OPENAI_BASE_URL=https://openrouter.ai/api/v1`, `OPENAI_MODEL=openai/gpt-4o-mini`. После перезапуска `npm run dev` проверьте `GET /api/ai/agent` → `"mode":"llm"`.
5. **Промпты к ассистенту при разработке:** [prompts.md](prompts.md).
6. **Сценарий приёмки:** [docs/TEST_SCENARIO_360.md](docs/TEST_SCENARIO_360.md).

## Быстрый старт

1. Установка зависимостей:

```bash
npm install
```

2. Файл `.env` (можно скопировать из `.env.example`):

```env
DATABASE_URL="file:./dev.db"
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini
```

3. Схема БД и сиды:

```bash
npx prisma db push
npm run db:seed
```

4. Запуск:

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) → **Оценка 360** (HR) → цикл → анкеты и **Результаты + AI**.

## Архитектура

- `prisma/schema.prisma` — люди, цикл, назначения с токеном, ответы (оценки + текст), кэш AI-отчёта.
- `src/app/api/*` — маршруты циклов, анкеты, агрегаты, AI.
- `src/lib/summary.ts` — средние по ролям и обезличенный пакет текстов для модели.
- `src/lib/hr-ai-agent.ts` — фасад ИИ-агента; `src/lib/ai-report.ts` — LLM или локальный отчёт v2.
- `src/app/api/ai/agent/route.ts` — статус агента.

## Деплой

- **SQLite** на «бессерверных» хостингах без диска не подходит для продакшена. Варианты: [Neon](https://neon.tech) / Supabase + PostgreSQL в Prisma, либо PaaS с постоянным диском (Railway, Render).
- На хостинге: `DATABASE_URL`, при необходимости `OPENAI_API_KEY`, `OPENAI_MODEL`.

### GitHub Pages (статическая сборка)

Сборка с `output: 'export'`, данные в `public/gh-pages-db.json`, запросы `/api/*` в браузере обрабатываются из снапшота и `localStorage`.

1. **Settings → Pages:** ветка **`gh-pages`**, папка **`/`**.
2. В [`.github/workflows/deploy-github-pages.yml`](.github/workflows/deploy-github-pages.yml) задайте **`NEXT_PUBLIC_BASE_PATH`** = имя репозитория, например `/360-feedback-app` → URL `https://<user>.github.io/360-feedback-app/`.
3. Пуш в **`main`** запускает `npm run build:gh-pages` и публикацию `out/` в **`gh-pages`**.

Локально:

```bash
npm run build:gh-pages
```

Просмотр: статический сервер с корнем в `out/`.
