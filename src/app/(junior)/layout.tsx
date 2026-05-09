import Link from "next/link";
import { AppHeader } from "@/components/app-header";

export default function JuniorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <AppHeader
        extra={
          <Link
            href="/junior/criar"
            className="body-serif italic text-[0.95rem] text-[var(--ink-soft)] hover:text-[var(--magic)] transition-colors"
          >
            criar
          </Link>
        }
      />
      <main className="relative z-10 flex-1 flex flex-col">{children}</main>
      <footer className="relative z-10 px-8 py-5 body-serif text-[0.78rem] italic text-[var(--ink-faint)] flex justify-between">
        <span>uma página em branco esperando você</span>
        <Link href="/" className="hover:text-[var(--magic)] transition-colors">
          ← voltar pra Andaime
        </Link>
      </footer>
    </div>
  );
}
