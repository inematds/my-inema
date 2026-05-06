import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background text-foreground">
      <h1 className="text-4xl font-semibold tracking-tight">Andaime</h1>
      <p className="max-w-prose text-center text-muted-foreground">
        IA que ensina, não responde por você. Tutor socrático para aprendizagem real.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Entrar
        </Link>
        <Link
          href="/signup"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Criar conta
        </Link>
      </div>
    </main>
  );
}
