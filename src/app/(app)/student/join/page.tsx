import { JoinClassForm } from "@/components/join-class-form";

export default function JoinPage() {
  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight">Entrar em uma turma</h1>
      <p className="text-muted-foreground">
        Digite o código que o professor compartilhou.
      </p>
      <JoinClassForm />
    </div>
  );
}
