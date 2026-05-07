import { NewClassForm } from "@/components/new-class-form";

export default function NewClassPage() {
  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight">Nova turma</h1>
      <NewClassForm />
    </div>
  );
}
