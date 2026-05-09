import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      "id, title, prompt, criteria, class_id, lesson_type, classes!inner(teacher_id, name)",
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <Link
          href={`/teacher/classes/${assignment.class_id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {cls?.name}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">
          {assignment.title}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          tipo: {assignment.lesson_type === "junior_books" ? "Andaime Junior · Book" : "Redação dissertativa"}
        </p>
        {assignment.lesson_type === "junior_books" && (
          <Link
            href={`/aulas/${assignment.id}/mural`}
            className="text-sm underline mt-1 inline-block"
          >
            ver mural da turma →
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enunciado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {assignment.prompt}
          </p>
          {assignment.criteria && (
            <>
              <h3 className="text-sm font-medium mt-4 mb-1">Critérios</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {assignment.criteria}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-3">
          Tentativas ({attempts?.length ?? 0})
        </h2>
        {(attempts?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aluno começou esta tarefa ainda.
          </p>
        ) : (
          <div className="grid gap-2">
            {attempts?.map((a) => {
              const u = Array.isArray(a.users) ? a.users[0] : a.users;
              return (
                <Link
                  key={a.id}
                  href={
                    assignment.lesson_type === "junior_books"
                      ? `/teacher/junior/${a.id}`
                      : `/teacher/attempts/${a.id}`
                  }
                  className="rounded-md border p-3 hover:bg-accent/30 transition flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-medium">{u?.name}</div>
                    <div className="text-xs text-muted-foreground">{u?.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "submitted" ? (
                      assignment.lesson_type === "junior_books" ? (
                        <Badge>publicado</Badge>
                      ) : (
                        <Badge>autonomia {a.autonomy_score ?? "—"}</Badge>
                      )
                    ) : (
                      <Badge variant="outline">em andamento</Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
