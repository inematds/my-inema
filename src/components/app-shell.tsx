import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user!.id)
    .single();

  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr] bg-background text-foreground">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold tracking-tight flex items-baseline gap-2">
          Andaime
          <span className="text-xs font-normal text-muted-foreground">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {profile?.name} · {profile?.role}
          </span>
          <form action="/api/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
