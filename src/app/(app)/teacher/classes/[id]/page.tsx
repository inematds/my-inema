import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteBlock } from "@/components/teacher/invite-block";
import { ClassActions } from "@/components/teacher/class-actions";

type Params = { id: string };

export default async function TeacherClassPage({
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

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, code, teacher_id")
    .eq("id", id)
    .single();
  if (!cls || cls.teacher_id !== user.id) notFound();

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, prompt, lesson_type, created_at")
    .eq("class_id", id)
    .order("created_at", { ascending: false });

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, users!inner(name, email)")
    .eq("class_id", id);

  // Per-assignment status counts.
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: attempts } = assignmentIds.length
    ? await supabase
        .from("attempts")
        .select("assignment_id, status")
        .in("assignment_id", assignmentIds)
    : { data: [] };

  const counts = new Map<string, { inProgress: number; submitted: number }>();
  for (const a of attempts ?? []) {
    const c = counts.get(a.assignment_id) ?? { inProgress: 0, submitted: 0 };
    if (a.status === "submitted") c.submitted++;
    else if (a.status === "in_progress") c.inProgress++;
    counts.set(a.assignment_id, c);
  }

  const totalStudents = enrollments?.length ?? 0;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(2rem,4vw,3rem)] tracking-tight">
            {cls.name}
          </h1>
          <p className="body-serif italic text-[0.92rem] text-[var(--ink-faint)] mt-1">
            código de convite: <Badge variant="outline">{cls.code}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClassActions classId={cls.id} currentName={cls.name} />
          <Link
            href={`/teacher/classes/${cls.id}/assignments/new`}
            className={buttonVariants()}
          >
            Nova tarefa
          </Link>
        </div>
      </div>

      <InviteBlock code={cls.code} className={cls.name} />

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aulas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(assignments?.length ?? 0) === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Nenhuma aula criada ainda.
              </p>
            ) : (
              assignments?.map((a) => {
                const c = counts.get(a.id) ?? { inProgress: 0, submitted: 0 };
                const pct = totalStudents
                  ? Math.round((c.submitted / totalStudents) * 100)
                  : 0;
                return (
                  <Link
                    key={a.id}
                    href={`/teacher/assignments/${a.id}`}
                    className="rounded-md border-2 p-3 transition-colors"
                    style={{
                      borderColor: "var(--paper-edge)",
                      background: "var(--paper)",
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="display tracking-tight text-[1.1rem] truncate">
                            {a.title}
                          </span>
                          <span className="body-serif italic text-[0.72rem] text-[var(--ink-faint)] shrink-0">
                            {a.lesson_type === "junior_books" ? "book" : "redação"}
                          </span>
                        </div>
                        {a.prompt && (
                          <div className="text-xs text-[var(--ink-faint)] line-clamp-1 mt-1">
                            {a.prompt}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="display text-[1.05rem] tabular-nums">
                          {c.submitted}
                          <span className="text-[var(--ink-faint)]">
                            /{totalStudents}
                          </span>
                        </div>
                        <div className="body-serif italic text-[0.72rem] text-[var(--ink-faint)]">
                          {pct}% concluiu
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Alunos <Badge variant="outline">{totalStudents}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalStudents === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Compartilhe o código <strong>{cls.code}</strong> para os alunos
                entrarem.
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {enrollments?.map((e) => {
                  const u = Array.isArray(e.users) ? e.users[0] : e.users;
                  return (
                    <li
                      key={e.student_id}
                      className="flex justify-between gap-2"
                    >
                      <span>{u?.name}</span>
                      <span className="text-[var(--ink-faint)] text-xs">
                        {u?.email}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
