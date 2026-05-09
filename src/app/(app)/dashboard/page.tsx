import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user!.id)
    .single();

  const isParent = profile?.role === "parent";
  const isTeacher = profile?.role === "teacher" || isParent;

  if (isTeacher) {
    // Teacher / parent view: list classes (own).
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name, code")
      .eq("teacher_id", user!.id)
      .order("created_at", { ascending: false });

    const groupLabel = isParent ? "Sua casa" : "Suas turmas";
    const newLabel = isParent ? "Novo grupo" : "Nova turma";
    const emptyText = isParent
      ? "Crie um grupo pra cadastrar seus filhos e mandar tarefas pra eles."
      : "Você ainda não criou nenhuma turma. Comece criando uma.";

    return (
      <div className="flex flex-col gap-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="display text-[clamp(2rem,4vw,3rem)] tracking-tight">
            {groupLabel}
          </h1>
          <Link href="/teacher/classes/new" className={buttonVariants()}>
            {newLabel}
          </Link>
        </div>
        {(classes?.length ?? 0) === 0 ? (
          <p className="text-muted-foreground italic body-serif">{emptyText}</p>
        ) : (
          <div className="grid gap-3">
            {classes?.map((c) => (
              <Link key={c.id} href={`/teacher/classes/${c.id}`}>
                <Card className="hover:bg-accent/30 transition">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{c.name}</CardTitle>
                      <Badge variant="outline">código: {c.code}</Badge>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Student view: list available assignments
  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      "id, title, prompt, class_id, classes!inner(name)",
    )
    .order("created_at", { ascending: false });

  const { data: myAttempts } = await supabase
    .from("attempts")
    .select("assignment_id, status, autonomy_score")
    .eq("student_id", user!.id);

  const attemptByAssignment = new Map(
    (myAttempts ?? []).map((a) => [a.assignment_id, a]),
  );

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Suas tarefas</h1>
        <p className="text-muted-foreground">
          Olá, {profile?.name}. Cada tarefa começa com sua tentativa antes de qualquer ajuda da IA.
        </p>
      </div>
      {(assignments?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Nenhuma tarefa disponível. Entre em uma turma usando o código que seu professor enviou.
            </p>
            <Link href="/student/join" className={buttonVariants({ variant: "outline" }) + " mt-4 inline-flex"}>
              Entrar em turma
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {assignments?.map((a) => {
            const attempt = attemptByAssignment.get(a.id);
            return (
              <Link key={a.id} href={`/student/assignment/${a.id}`}>
                <Card className="hover:bg-accent/30 transition">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-lg">{a.title}</CardTitle>
                      {attempt?.status === "submitted" ? (
                        <Badge>entregue · autonomia {attempt.autonomy_score}</Badge>
                      ) : attempt?.status === "in_progress" ? (
                        <Badge variant="outline">em andamento</Badge>
                      ) : (
                        <Badge variant="outline">a fazer</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{a.prompt}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      <Link href="/student/join" className={buttonVariants({ variant: "outline" }) + " self-start"}>
        Entrar em outra turma
      </Link>
      <Link
        href="/junior"
        className="text-sm text-muted-foreground hover:underline self-start mt-2"
      >
        ver o mural do Andaime Junior →
      </Link>
    </div>
  );
}
