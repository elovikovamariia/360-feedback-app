import { Breadcrumbs, PageHero } from "@/components/PageChrome";
import { RespondentTasksClient } from "@/components/RespondentTasksClient";
import { RoleGuard } from "@/components/RoleGuard";

export default function TasksPage() {
  return (
    <RoleGuard need="respondent_tasks">
      <div className="space-y-8">
        <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Мои анкеты" }]} />
        <PageHero
          kicker="UC-3 · Анкеты"
          title="Мои анкеты"
          description="Два раздела: самооценка (обязательный шаг по циклу для каждого участника) и оценка других — коллега, руководитель по команде и т.д. Одинаковая структура для сотрудника, руководителя и респондента. В демо: Анна / Дмитрий по роли «Просмотр как…»; ссылки из HR-цикла работают как приглашение."
        />
        <RespondentTasksClient />
      </div>
    </RoleGuard>
  );
}
