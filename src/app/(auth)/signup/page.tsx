import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <h1 className="text-2xl font-medium">Criar conta</h1>
      <AuthForm mode="signup" />
      <p className="text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
