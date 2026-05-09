import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssignmentWorkspace } from "@/components/assignment-workspace";
import { JuniorAssignmentEntry } from "@/components/junior/junior-assignment-entry";

type Params = { id: string };

export default async function AssignmentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      "id, title, prompt, criteria, max_hints, min_initial_chars, class_id, lesson_type",
    )
    .eq("id", id)
    .single();
  if (!assignment) notFound();

  // Junior dispatch: render the workspace bound to the student's attempt.
  if (assignment.lesson_type === "junior_books") {
    return (
      <JuniorAssignmentEntry
        assignmentId={assignment.id}
        title={assignment.title}
        prompt={assignment.prompt}
        studentId={user.id}
      />
    );
  }

  // Math/Manim placeholder — vertical em desenvolvimento.
  if (assignment.lesson_type === "math_manim") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 max-w-2xl mx-auto">
        <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
          tarefa de matemática · {assignment.title}
        </p>
        <h2 className="display text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.05] text-[var(--ink)] text-center">
          em desenvolvimento
        </h2>
        <p className="body-serif italic text-[0.95rem] text-[var(--ink-faint)] text-center max-w-[52ch] leading-snug">
          Math via Manim ainda não está pronto. Quando ficar, o aluno
          resolverá problemas com animações geradas por IA. Volte em breve.
        </p>
        {assignment.prompt && (
          <p className="body-serif text-[0.95rem] text-[var(--ink-soft)] text-center max-w-[52ch] mt-4">
            briefing: {assignment.prompt}
          </p>
        )}
      </div>
    );
  }

  // Default essay path (legacy).
  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, status, autonomy_score")
    .eq("assignment_id", id)
    .eq("student_id", user.id)
    .maybeSingle();

  const { data: turns } = attempt
    ? await supabase
        .from("turns")
        .select("id, author, kind, content, created_at")
        .eq("attempt_id", attempt.id)
        .order("created_at", { ascending: true })
    : { data: null };

  return (
    <AssignmentWorkspace
      assignment={assignment}
      attempt={attempt}
      initialTurns={turns ?? []}
    />
  );
}
