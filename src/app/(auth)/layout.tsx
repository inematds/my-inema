import { AppHeader } from "@/components/app-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <AppHeader />
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
