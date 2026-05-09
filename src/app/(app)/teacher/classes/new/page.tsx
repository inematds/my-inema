import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewClassForm } from "@/components/new-class-form";

export default async function NewClassPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile?.role ?? "student") as "student" | "teacher" | "parent" | "admin";
  const isParent = role === "parent";

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <p className="body-serif italic text-[0.85rem] tracking-wide text-[var(--ink-faint)]">
          {isParent ? "novo grupo da família" : "nova turma"}
        </p>
        <h1 className="display text-[clamp(2rem,4vw,3rem)] tracking-tight mt-1">
          {isParent ? "Crie um grupo" : "Crie uma turma"}
        </h1>
        <p className="body-serif text-[0.95rem] text-[var(--ink-soft)] max-w-[58ch] mt-2">
          {isParent
            ? "Comece com um modelo, ou escolha um nome próprio. Depois cadastra os filhos com o código que aparecer."
            : "Comece com um modelo, ou escolha um nome próprio. Depois compartilhe o código gerado com a turma."}
        </p>
      </div>
      <NewClassForm role={role} />
    </div>
  );
}
