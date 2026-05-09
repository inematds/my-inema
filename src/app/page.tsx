import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: "student" | "teacher" | "admin" | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (profile?.role ?? null) as typeof role;
  }

  return (
    <main className="relative min-h-screen flex flex-col">
      <AppHeader />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-12 p-8 pb-24">
        <div className="flex flex-col items-center gap-4 max-w-[58ch]">
          <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
            ato 0 · escolha por onde começar
          </p>
          <h1 className="display text-[clamp(3rem,6vw,5rem)] leading-[0.95] text-[var(--ink)]">
            Andaime
          </h1>
          <p className="body-serif text-[1.05rem] text-center text-[var(--ink-soft)] leading-[1.55]">
            IA que ensina,{" "}
            <span className="display-italic text-[var(--magic)]">
              não responde por você.
            </span>{" "}
            Tutor socrático para aprendizagem real.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-4xl">
          <EntryCard
            href="/junior"
            eyebrow="ateliê de livros"
            title="Andaime Junior"
            subtitle="ver os livros que as crianças publicaram no mural"
            cta="abrir o mural"
            tone="magic"
          />
          <EntryCard
            href={user ? "/dashboard" : "/login"}
            eyebrow={role === "teacher" ? "professor" : "aluno"}
            title={role === "teacher" ? "Suas turmas" : "Suas tarefas"}
            subtitle={
              user
                ? "turmas, aulas e trabalhos publicados"
                : "entre pra ver suas turmas e aulas"
            }
            cta={user ? "abrir" : "entrar"}
          />
          <EntryCard
            href={user ? "/junior/criar" : "/login?next=/junior/criar"}
            eyebrow="começa do zero"
            title="Criar um livro"
            subtitle={
              user
                ? "personagens, objetos, cenas e o livro inteiro"
                : "precisa entrar — depois cria"
            }
            cta={user ? "criar" : "entrar"}
            tone="dashed"
          />
        </div>

        {!user && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <p className="body-serif italic text-[0.85rem] text-[var(--ink-faint)]">
              ainda sem conta?{" "}
              <Link
                href="/signup"
                className="text-[var(--magic)] hover:underline not-italic"
              >
                criar uma agora
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function EntryCard({
  href,
  eyebrow,
  title,
  subtitle,
  cta,
  tone = "plain",
}: {
  href: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  tone?: "magic" | "plain" | "dashed";
}) {
  const border =
    tone === "magic"
      ? "border-[var(--magic)]/40 hover:border-[var(--magic)]"
      : tone === "dashed"
        ? "border-dashed border-[var(--paper-edge)] hover:border-[var(--ink-soft)]/40"
        : "border-[var(--paper-edge)] hover:border-[var(--ink-soft)]/40";
  const ctaColor = tone === "magic" ? "var(--magic)" : "var(--ink)";
  return (
    <Link
      href={href}
      className={`flex flex-col gap-4 p-5 rounded-[18px] border-2 ${border} transition-all hover:translate-y-[-2px]`}
      style={{
        background: "var(--paper)",
        boxShadow: "0 18px 36px -22px rgba(29,25,22,0.28)",
      }}
    >
      <div>
        <p className="body-serif italic text-[0.78rem] tracking-wide text-[var(--ink-faint)] mb-2">
          {eyebrow}
        </p>
        <h2 className="display text-[1.4rem] leading-[1.05] text-[var(--ink)] tracking-tight">
          {title}
        </h2>
        <p className="body-serif text-[0.95rem] text-[var(--ink-soft)] mt-2 leading-snug">
          {subtitle}
        </p>
      </div>
      <span
        className="display-italic text-[1rem] self-start"
        style={{ color: ctaColor }}
      >
        {cta} →
      </span>
    </Link>
  );
}
