"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "signup";

// Phase-1 simplified auth: kid types a username + password. We don't validate
// emails. Internally we suffix the username with @andaime.local so Supabase's
// email-based auth keeps working without surfacing email to the user. When we
// reach Phase 2 (real schools / parental consent) we add proper email/SSO.
const INTERNAL_DOMAIN = "andaime.local";

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const u = normalizeUsername(username);
    if (u.length < 2) {
      setError("Escolha um usuário com pelo menos 2 letras.");
      setLoading(false);
      return;
    }
    if (!/^[a-z0-9._-]+$/.test(u)) {
      setError("Use só letras, números, ponto, hífen ou sublinhado.");
      setLoading(false);
      return;
    }

    const internalEmail = `${u}@${INTERNAL_DOMAIN}`;

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: internalEmail,
        password,
        options: { data: { name: u, username: u } },
      });
      if (error) {
        setError(translateError(error.message));
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });
      if (error) {
        setError(translateError(error.message));
        setLoading(false);
        return;
      }
    }

    const next = new URLSearchParams(window.location.search).get("next");
    // Sanity: only allow same-origin paths to prevent open redirect.
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    router.push(safeNext);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Usuário</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          spellCheck={false}
          autoCapitalize="none"
          required
          placeholder="ex: bruno"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
      </Button>
    </form>
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Usuário ou senha errados.";
  if (m.includes("already registered") || m.includes("user already"))
    return "Esse usuário já existe. Tenta entrar?";
  if (m.includes("password")) return "Senha precisa ter ao menos 6 caracteres.";
  return msg;
}
