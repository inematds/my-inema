import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { UserChip } from "@/components/user-chip";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="px-6 py-5 flex items-center justify-end">
        <UserChip variant="plain" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-4xl font-semibold tracking-tight">Andaime</h1>
        <p className="max-w-prose text-center text-muted-foreground">
          IA que ensina, não responde por você. Tutor socrático para
          aprendizagem real.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/junior" className={buttonVariants()}>
            Andaime Junior · ver mural
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline" })}
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className={buttonVariants({ variant: "ghost" })}
          >
            Criar conta
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          ou pule direto para{" "}
          <Link href="/junior/criar" className="underline">
            criar um livro
          </Link>
        </p>
      </div>
    </main>
  );
}
