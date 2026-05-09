import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssignmentMetrics } from "@/components/teacher/assignment-metrics";
import { AttemptList } from "@/components/teacher/attempt-list";

type Params = { id: string };

export default async function TeacherAssignmentPage({
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
      "id, title, prompt, criteria, class_id, lesson_type, featured_attempt_id, classes!inner(teacher_id, name)",
    )
    .eq("id", id)
    .single();
  if (!assignment) notFound();
  const cls = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
  if (cls?.teacher_id !== user.id) notFound();

  const { data: attempts } = await supabase
    .from("attempts")
    .select(
      "id, status, autonomy_score, started_at, finished_at, student_id, users!inner(name, email)",
    )
    .eq("assignment_id", id)
    .order("started_at", { ascending: false });

  // Junior books: count published per attempt to show in list / metrics.
  let publishedAttemptIds = new Set<string>();
  if (assignment.lesson_type === "junior_books") {
    const { data: published } = await supabase
      .from("junior_books")
      .select("attempt_id")
      .not("published_at", "is", null);
    publishedAttemptIds = new Set(
      (published ?? []).map((b) => b.attempt_id).filter(Boolean) as string[],
    );
  }

  // Class enrollment count for ratio.
  const { count: enrollmentCount } = await supabase
    .from("enrollments")
    .select("student_id", { count: "exact", head: true })
    .eq("class_id", assignment.class_id);

  const total = enrollmentCount ?? 0;
  const submittedCount =
    (attempts ?? []).filter((a) => a.status === "submitted").length;
  const inProgressCount =
    (attempts ?? []).filter((a) => a.status === "in_progress").length;
  const publishedCount =
    assignment.lesson_type === "junior_books"
      ? (attempts ?? []).filter((a) => publishedAttemptIds.has(a.id)).length
      : submittedCount;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <Link
          href={`/teacher/classes/${assignment.class_id}`}
          className="body-serif italic text-[0.9rem] text-[var(--ink-faint)] hover:text-[var(--magic)] transition-colors"
        >
          ← {cls?.name}
        </Link>
        <h1 className="display text-[clamp(2rem,4vw,3rem)] tracking-tight mt-1">
          {assignment.title}
        </h1>
        <p className="body-serif italic text-[0.85rem] text-[var(--ink-faint)] mt-1">
          tipo: {assignment.lesson_type === "junior_books"
            ? "Andaime Junior · Book"
            : "Redação dissertativa"}
        </p>
        {assignment.lesson_type === "junior_books" && (
          <Link
            href={`/aulas/${assignment.id}/mural`}
            className="text-sm text-[var(--magic)] hover:underline mt-1 inline-block"
          >
            ver mural da turma →
          </Link>
        )}
      </div>

      <AssignmentMetrics
        totalStudents={total}
        inProgress={inProgressCount}
        submitted={submittedCount}
        published={publishedCount}
        lessonType={assignment.lesson_type}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {assignment.lesson_type === "junior_books"
              ? "Briefing"
              : "Enunciado"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignment.prompt && assignment.prompt.trim().length > 0 ? (
            <p className="text-sm whitespace-pre-wrap text-[var(--ink-soft)]">
              {assignment.prompt}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              sem briefing — alunos começam livres
            </p>
          )}
          {assignment.criteria && (
            <>
              <h3 className="text-sm font-medium mt-4 mb-1">Critérios</h3>
              <p className="text-sm whitespace-pre-wrap text-[var(--ink-soft)]">
                {assignment.criteria}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="display text-[1.5rem] tracking-tight mb-3">
          Tentativas <Badge variant="outline">{attempts?.length ?? 0}</Badge>
        </h2>
        <AttemptList
          assignmentId={assignment.id}
          lessonType={assignment.lesson_type}
          featuredAttemptId={assignment.featured_attempt_id}
          attempts={(attempts ?? []).map((a) => ({
            id: a.id,
            status: a.status,
            autonomy_score: a.autonomy_score,
            user_name: Array.isArray(a.users) ? a.users[0]?.name : a.users?.name,
            user_email: Array.isArray(a.users) ? a.users[0]?.email : a.users?.email,
            published: publishedAttemptIds.has(a.id),
          }))}
        />
      </div>
    </div>
  );
}
