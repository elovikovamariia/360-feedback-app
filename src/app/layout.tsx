import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { PreviewRoleBanner } from "@/components/PreviewRoleBanner";
import { RolePreviewProvider } from "@/components/RolePreviewProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "360° Feedback — оценка сотрудников",
  description:
    "Сервис оценки 360°: запуск цикла (HR), анкеты респондентов, контроль заполнения и отчёты с радаром по компетенциям.",
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
  themeColor: "#f5f3ff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="font-sans flex min-h-screen flex-col touch-manipulation antialiased overflow-x-hidden">
        <RolePreviewProvider>
          <AppHeader />
          <PreviewRoleBanner />
          <main className="relative flex-1 min-w-0 px-[max(0.75rem,env(safe-area-inset-left,0px))] pb-[max(3rem,env(safe-area-inset-bottom,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pt-5 sm:px-5 sm:pb-14 sm:pt-8 md:px-6">
            <div className="mx-auto w-full min-w-0 max-w-7xl animate-fade-in">{children}</div>
          </main>
          <footer className="mt-auto border-t border-slate-200/80 bg-white/80 px-[max(0.75rem,env(safe-area-inset-left,0px))] py-5 pr-[max(0.75rem,env(safe-area-inset-right,0px))] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] text-center text-[11px] leading-relaxed text-slate-500 sm:py-6">
            <div className="mx-auto max-w-2xl">
              В режиме предпросмотра вход по паролю не используется. Для персональных данных применяйте политики и
              настройки безопасности вашей организации.
            </div>
          </footer>
        </RolePreviewProvider>
      </body>
    </html>
  );
}
