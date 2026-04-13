import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { PreviewRoleBanner } from "@/components/PreviewRoleBanner";
import { RolePreviewProvider } from "@/components/RolePreviewProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "360° Feedback — демо для тестового задания",
  description:
    "Демо-сервис оценки 360°: запуск цикла на компанию (HR), анкеты респондентов, статус заполнения и отчёты с радаром по компетенциям.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <RolePreviewProvider>
          <AppHeader />
          <PreviewRoleBanner />
          <main className="relative flex-1 px-4 pb-12 pt-8 sm:px-6 sm:pb-14 sm:pt-10">
            <div className="mx-auto w-full max-w-7xl animate-fade-in">{children}</div>
          </main>
          <footer className="mt-auto border-t border-slate-200/80 bg-white/80 py-6 text-center text-[11px] leading-relaxed text-slate-500">
            <div className="mx-auto max-w-2xl px-4">
              Локальное демо для тестового задания · без реальной аутентификации · не для персональных данных без
              доработки безопасности
            </div>
          </footer>
        </RolePreviewProvider>
      </body>
    </html>
  );
}
