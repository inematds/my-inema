import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <h1 className="text-2xl font-medium">Entrar</h1>
      <AuthForm mode="login" />
      <p className="text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/signup" className="underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
