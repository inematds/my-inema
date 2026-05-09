import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MuralGrid } from "@/components/junior/mural-grid";

export const metadata = {
  title: "Mural da aula · Andaime",
};

export default async function AulaMuralPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, lesson_type, classes(id, name)")
    .eq("id", id)
    .single();
  if (!assignment) notFound();

  type ClassRel = { id: string; name: string } | { id: string; name: string }[] | null;
  const cls = (assignment as unknown as { classes: ClassRel }).classes;
  const className = Array.isArray(cls) ? cls[0]?.name : cls?.name;

  return (
    <div className="relative w-full max-w-[1200px] mx-auto px-6 lg:px-10 pb-16 pt-2">
      <header className="mb-10 flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="body-serif italic text-[0.92rem] text-[var(--ink-faint)] hover:text-[var(--magic)] transition-colors w-fit"
        >
          ← voltar pro dashboard
        </Link>
        <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
          mural da aula{className ? ` · ${className}` : ""}
        </p>
        <h1 className="display text-[clamp(2rem,4.4vw,3.4rem)] leading-[0.95] text-[var(--ink)]">
          {assignment.title}
        </h1>
        <p className="body-serif text-[1rem] leading-[1.5] text-[var(--ink-soft)] max-w-[58ch] mt-1">
          tudo que os colegas dessa aula publicaram só pra turma. clique
          num livro pra ler.
        </p>
      </header>
      <MuralGrid assignmentId={assignment.id} />
    </div>
  );
}
