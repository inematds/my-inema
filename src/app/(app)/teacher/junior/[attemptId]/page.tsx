import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { TeacherJuniorReader } from "@/components/junior/teacher-junior-reader";

type Params = { attemptId: string };

export default async function TeacherJuniorPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Confirm caller is the teacher of the class that owns this attempt.
  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, student_id, status, assignments!inner(id, title, class_id, classes!inner(teacher_id, name))")
    .eq("id", attemptId)
    .single();
  if (!attempt) notFound();

  type AssignmentRel = {
    id: string;
    title: string;
    class_id: string;
    classes: { teacher_id: string; name: string } | { teacher_id: string; name: string }[];
  };
  const a = (attempt as unknown as { assignments: AssignmentRel | AssignmentRel[] }).assignments;
  const arow = Array.isArray(a) ? a[0] : a;
  const cls = Array.isArray(arow.classes) ? arow.classes[0] : arow.classes;
  if (cls.teacher_id !== user.id) notFound();

  // Pull book + scenes via service client (bypasses RLS for the junior tables).
  const service = createServiceClient();
  const { data: book } = await service
    .from("junior_books")
    .select("id, published_at, published_title, published_scope")
    .eq("attempt_id", attemptId)
    .maybeSingle();

  const { data: studentProfile } = await supabase
    .from("users")
    .select("name")
    .eq("id", attempt.student_id)
    .single();

  if (!book) {
    return (
      <div className="p-8 max-w-2xl mx-auto flex flex-col gap-3">
        <Link href="/dashboard" className="text-sm underline">
          ← voltar
        </Link>
        <p className="text-muted-foreground italic">
          {studentProfile?.name ?? "esse aluno"} ainda não começou o livro dessa aula.
        </p>
      </div>
    );
  }

  const { data: scenes } = await service
    .from("junior_scenes")
    .select("id, name, epithet, image_data, position")
    .eq("book_id", book.id)
    .order("position", { ascending: true });

  return (
    <TeacherJuniorReader
      assignmentTitle={arow.title}
      className={cls.name}
      studentName={studentProfile?.name ?? "aluno"}
      attemptStatus={attempt.status}
      book={book}
      scenes={scenes ?? []}
    />
  );
}
