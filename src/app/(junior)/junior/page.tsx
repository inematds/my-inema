import Link from "next/link";
import { MuralGrid } from "@/components/junior/mural-grid";

export const metadata = {
  title: "Andaime Junior · mural",
};

export default function JuniorLandingPage() {
  return (
    <div className="relative w-full max-w-[1200px] mx-auto px-6 lg:px-10 pb-16 pt-2">
      <header className="mb-10 flex flex-col gap-3">
        <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
          a parede dos livros
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="display text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] text-[var(--ink)]">
            mural do Junior
          </h1>
          <Link
            href="/junior/criar"
            className="body-serif text-[0.95rem] tracking-[0.02em] px-5 py-2.5 rounded-full transition-all hover:translate-y-[-1px]"
            style={{
              background: "var(--magic)",
              color: "var(--paper)",
              boxShadow: "0 8px 20px -10px rgba(14,84,76,0.5)",
            }}
          >
            criar meu livro →
          </Link>
        </div>
        <p className="body-serif text-[1rem] leading-[1.5] text-[var(--ink-soft)] max-w-[58ch] mt-1">
          tudo que foi publicado por crianças que passaram por aqui. clique
          num livro pra ler — ou aperte criar pra fazer o seu.
        </p>
      </header>
      <MuralGrid />
    </div>
  );
}
