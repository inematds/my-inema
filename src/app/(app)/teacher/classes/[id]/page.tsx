import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
    .select("id, title, prompt, created_at")
    .eq("class_id", id)
    .order("created_at", { ascending: false });

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, users!inner(name, email)")
    .eq("class_id", id);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{cls.name}</h1>
          <p className="text-muted-foreground mt-1">
            Código de convite: <Badge variant="outline">{cls.code}</Badge>
          </p>
        </div>
        <Link
          href={`/teacher/classes/${cls.id}/assignments/new`}
          className={buttonVariants()}
        >
          Nova tarefa
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tarefas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(assignments?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma tarefa criada ainda.
              </p>
            ) : (
              assignments?.map((a) => (
                <Link
                  key={a.id}
                  href={`/teacher/assignments/${a.id}`}
                  className="rounded-md border p-3 hover:bg-accent/30 transition"
                >
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {a.prompt}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alunos ({enrollments?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {(enrollments?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                Compartilhe o código <strong>{cls.code}</strong> para os alunos entrarem.
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {enrollments?.map((e) => {
                  const u = Array.isArray(e.users) ? e.users[0] : e.users;
                  return (
                    <li key={e.student_id} className="flex justify-between gap-2">
                      <span>{u?.name}</span>
                      <span className="text-muted-foreground text-xs">{u?.email}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">
              Os alunos entram em <code className="text-xs">/student/join</code> com o código.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
