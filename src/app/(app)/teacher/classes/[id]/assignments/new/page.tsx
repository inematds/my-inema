import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewAssignmentForm } from "@/components/new-assignment-form";

type Params = { id: string };

export default async function NewAssignmentPage({
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
    .select("id, name, teacher_id")
    .eq("id", id)
    .single();
  if (!cls || cls.teacher_id !== user.id) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Nova tarefa</h1>
        <p className="text-muted-foreground">Para a turma: {cls.name}</p>
      </div>
      <NewAssignmentForm classId={cls.id} />
    </div>
  );
}
