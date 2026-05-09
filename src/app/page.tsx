import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { UserChip } from "@/components/user-chip";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: "student" | "teacher" | "admin" | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (profile?.role ?? null) as typeof role;
  }

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="px-6 py-5 flex items-center justify-end">
        <UserChip variant="plain" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-10 p-8">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">Andaime</h1>
          <p className="max-w-prose text-center text-muted-foreground">
            IA que ensina, não responde por você. Tutor socrático para
            aprendizagem real.
          </p>
        </div>

        {/* Entradas no sistema */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
          <EntryCard
            href="/junior"
            title="Andaime Junior"
            subtitle="o ateliê de livros das crianças"
            cta="ver mural"
          />
          <EntryCard
            href={user ? "/dashboard" : "/login"}
            title={role === "teacher" ? "Suas turmas" : "Suas tarefas"}
            subtitle="redação dissertativa com tutoria"
            cta={user ? "abrir" : "entrar"}
            variant="outline"
          />
          <EntryCard
            href={user ? "/junior/criar" : "/login?next=/junior/criar"}
            title="Criar livro"
            subtitle={
              user
                ? "começa um livro Junior agora"
                : "precisa entrar — começa um livro Junior"
            }
            cta={user ? "criar" : "entrar"}
            variant="ghost"
          />
        </div>

        {/* CTA conta */}
        {!user && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <Link
              href="/login"
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Criar conta
            </Link>
            <p className="text-xs text-muted-foreground">
              ou explora sem conta
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function EntryCard({
  href,
  title,
  subtitle,
  cta,
  variant = "default",
}: {
  href: string;
  title: string;
  subtitle: string;
  cta: string;
  variant?: "default" | "outline" | "ghost";
}) {
  const ring =
    variant === "default"
      ? "border-primary/40 hover:border-primary"
      : variant === "outline"
        ? "border-border hover:border-foreground/40"
        : "border-dashed border-border hover:border-foreground/30";
  return (
    <Link
      href={href}
      className={`flex flex-col gap-3 p-5 rounded-xl border-2 ${ring} bg-card hover:bg-accent/30 transition-all hover:translate-y-[-2px]`}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <span className="text-sm font-medium underline underline-offset-2 self-start">
        {cta} →
      </span>
    </Link>
  );
}
