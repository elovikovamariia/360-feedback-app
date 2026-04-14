# Сдача задания 4 — чеклист артефактов

Соответствие блоку **«Что сдать»** из задания (файл с формулировкой задания у заказчика).

| № | Требование | Артефакт в репозитории / действие |
|---|------------|-----------------------------------|
| 1 | Ссылка на работающее приложение | Подставьте URL после деплоя. **GitHub Pages:** `https://<user>.github.io/<repo>/` при ветке `gh-pages` и корректном `NEXT_PUBLIC_BASE_PATH` в workflow. **Локально:** `npm run dev` → `http://localhost:3000`. |
| 2 | Ссылка на репозиторий | URL GitHub/GitLab с историей коммитов (например `https://github.com/<org>/<repo>`). |
| 3 | README | [README.md](../README.md) — стек, запуск, архитектура, GitHub Pages, ИИ-агент. |
| 4 | История промптов (.md) | [prompts.md](../prompts.md) |

## Дополнительно (не требуются формулировкой ТЗ, но упрощают приёмку)

| Документ | Назначение |
|----------|------------|
| [TEST_SCENARIO_360.md](./TEST_SCENARIO_360.md) | Пошаговый сценарий проверки UX |
| [product/Концепция 360° оценки сотрудников.txt](./product/Концепция%20360°%20оценки%20сотрудников.txt) | Концепция 360° |
| [product/business_analysis_360_feedback_service.md](./product/business_analysis_360_feedback_service.md) | Бизнес-анализ и use case |
| [product/task-4.html](./product/task-4.html) | Задание 4 (оригинал) |
| Этот файл | Единый чеклист для письма при сдаче |

## Обновление публичной сборки (GitHub Pages)

После пуша в ветку **`main`** workflow [.github/workflows/deploy-github-pages.yml](../.github/workflows/deploy-github-pages.yml) выполняет `db:seed`, экспорт снапшота и сборку статики в `out/`, затем публикует в **`gh-pages`**.

Убедитесь, что в workflow значение **`NEXT_PUBLIC_BASE_PATH`** совпадает с именем репозитория (например `/360-feedback-app`).

Локальная проверка перед пушем:

```bash
npm ci
npx prisma db push
npm run db:seed
npm run build:gh-pages
```

## Шаблон текста письма при сдаче

Заполните угловые скобки и вставьте в ответ заказчику.

```
Добрый день.

Задание 4 — сервис 360° с AI-аналитикой.

1. Приложение: <URL>
2. Репозиторий: <URL>
3. README: см. корень репозитория README.md
4. История промптов: prompts.md

Кратко по стеку: Next.js 13 (App Router), Prisma + SQLite, Recharts, ИИ-отчёт v2 (OpenAI-совместимый API или локальный шаблон при отсутствии ключа).

С уважением,
<ФИО>
```
