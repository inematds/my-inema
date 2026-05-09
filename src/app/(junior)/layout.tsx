import Link from "next/link";
import { UserChip } from "@/components/user-chip";

export default function JuniorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="junior" className="relative min-h-screen flex flex-col">
      <header className="relative z-10 px-8 py-6 flex items-baseline justify-between gap-4">
        <Link href="/junior" className="display text-[clamp(1.6rem,2.4vw,2rem)] tracking-tight">
          Andaime
          <span className="display-italic text-[0.65em] ml-1 text-[var(--magic)]">junior</span>
        </Link>
        <nav className="flex items-baseline gap-5">
          <Link
            href="/junior/criar"
            className="body-serif italic text-[0.95rem] text-[var(--ink-soft)] hover:text-[var(--magic)] transition-colors"
          >
            criar
          </Link>
          <UserChip />
          <span className="body-serif text-[0.75rem] tracking-[0.18em] uppercase text-[var(--ink-faint)]">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        </nav>
      </header>
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
