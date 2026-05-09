import { AppHeader } from "@/components/app-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <AppHeader />
      <main className="relative z-10 flex-1 px-6 lg:px-10 pb-12 pt-2">
        {children}
      </main>
    </div>
  );
}
