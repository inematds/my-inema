import { MuralGrid } from "@/components/junior/mural-grid";

export const metadata = {
  title: "Mural · Andaime",
};

export default function MuralPage() {
  return (
    <div className="relative w-full max-w-[1200px] mx-auto px-6 lg:px-10 pb-16 pt-2">
      <header className="mb-10">
        <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
          a parede dos livros
        </p>
        <h1 className="display text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] text-[var(--ink)] mt-2">
          mural
        </h1>
        <p className="body-serif text-[1rem] leading-[1.5] text-[var(--ink-soft)] max-w-[58ch] mt-3">
          tudo que foi publicado por crianças que passaram por aqui. clique
          num livro pra ler.
        </p>
      </header>
      <MuralGrid />
    </div>
  );
}
