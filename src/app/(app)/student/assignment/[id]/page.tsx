import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssignmentWorkspace } from "@/components/assignment-workspace";
import { JuniorAssignmentEntry } from "@/components/junior/junior-assignment-entry";
import { MathWorkspace } from "@/components/math/math-workspace";

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

  // Math/Manim — render the math workspace.
  if (assignment.lesson_type === "math_manim") {
    const { data: mathAttempt } = await supabase
      .from("attempts")
      .select("id")
      .eq("assignment_id", id)
      .eq("student_id", user.id)
      .maybeSingle();

    const { data: mathTurns } = mathAttempt
      ? await supabase
          .from("turns")
          .select("id, author, kind, content, created_at")
          .eq("attempt_id", mathAttempt.id)
          .order("created_at", { ascending: true })
      : { data: null };

    return (
      <MathWorkspace
        assignmentId={assignment.id}
        attemptId={mathAttempt?.id ?? null}
        problem={assignment.prompt}
        initialTurns={mathTurns ?? []}
      />
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
