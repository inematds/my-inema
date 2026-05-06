import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Bem-vindo</h1>
      <p className="text-muted-foreground">
        Você está autenticado como <strong>{user?.email}</strong>. Em breve, suas
        turmas e tarefas vão aparecer aqui.
      </p>
    </div>
  );
}
