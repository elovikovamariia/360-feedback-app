import { Breadcrumbs, PageHero } from "@/components/PageChrome";
import { RespondentTasksClient } from "@/components/RespondentTasksClient";
import { RoleGuard } from "@/components/RoleGuard";

export default function TasksPage() {
  return (
    <RoleGuard need="respondent_tasks">
      <div className="space-y-6 sm:space-y-8">
        <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Мои анкеты" }]} />
        <PageHero
          kicker="Анкеты к заполнению"
          title="Мои анкеты"
          description="Сначала самооценка по циклу, затем оценка коллеги или подчинённого — те же компетенции и шкала. В шапке: сотрудник Анна Соколова, руководитель Дмитрий Волков, респондент Борис Панов (анкета на Анну); ссылки из карточки цикла HR открывают ту же анкету."
        />
        <RespondentTasksClient />
      </div>
    </RoleGuard>
  );
}
