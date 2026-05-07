import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Params = { id: string };

export default async function TeacherAttemptPage({
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

  const { data: attempt } = await supabase
    .from("attempts")
    .select(
      "id, status, autonomy_score, started_at, finished_at, assignment_id, student_id, users!inner(name, email), assignments!inner(title, class_id, classes!inner(teacher_id, name))",
    )
    .eq("id", id)
    .single();

  if (!attempt) notFound();
  const student = Array.isArray(attempt.users) ? attempt.users[0] : attempt.users;
  const assignment = Array.isArray(attempt.assignments)
    ? attempt.assignments[0]
    : attempt.assignments;
  const cls = assignment
    ? Array.isArray(assignment.classes)
      ? assignment.classes[0]
      : assignment.classes
    : null;
  if (cls?.teacher_id !== user.id) notFound();

  const { data: turns } = await supabase
    .from("turns")
    .select("id, author, kind, content, created_at, tokens_used")
    .eq("attempt_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <Link
          href={`/teacher/assignments/${attempt.assignment_id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {assignment?.title}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">
          {student?.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
          <span>{student?.email}</span>
          {attempt.status === "submitted" ? (
            <Badge>entregue · autonomia {attempt.autonomy_score ?? "—"}</Badge>
          ) : (
            <Badge variant="outline">em andamento</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Trilha completa de raciocínio ({turns?.length ?? 0} turnos)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(turns?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aluno ainda não começou.
            </p>
          ) : (
            turns?.map((t) => <TurnRow key={t.id} turn={t} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TurnRow({
  turn,
}: {
  turn: {
    id: string;
    author: string;
    kind: string;
    content: string;
    created_at: string;
    tokens_used: number | null;
  };
}) {
  const isStudent = turn.author === "student";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-normal">
          {isStudent ? "Aluno" : turn.author === "ai" ? "IA" : "Sistema"}
        </Badge>
        <Badge variant="outline" className="font-normal">
          {turn.kind}
        </Badge>
        <span>{new Date(turn.created_at).toLocaleString("pt-BR")}</span>
        {turn.tokens_used != null && (
          <span className="text-xs">{turn.tokens_used} tokens</span>
        )}
      </div>
      <div
        className={`rounded-md border p-3 text-sm whitespace-pre-wrap ${
          isStudent ? "bg-primary/5" : "bg-muted/50"
        }`}
      >
        {turn.content}
      </div>
    </div>
  );
}
