import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Server component. Renders the current user's display name with a sign-out
// link, or an "entrar" link when anonymous. Drop into any layout/page header.
export async function UserChip({
  variant = "junior",
}: {
  variant?: "junior" | "plain";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (variant === "junior") {
      return (
        <Link
          href="/login"
          className="body-serif italic text-[0.92rem] text-[var(--ink-soft)] hover:text-[var(--magic)] transition-colors"
        >
          entrar
        </Link>
      );
    }
    return (
      <Link href="/login" className="text-sm hover:underline">
        Entrar
      </Link>
    );
  }

  // Prefer name from user metadata (set at signup); fall back to local-part of email.
  const displayName =
    (user.user_metadata?.name as string | undefined)?.trim() ||
    (user.user_metadata?.username as string | undefined)?.trim() ||
    (user.email ? user.email.split("@")[0] : "você");

  if (variant === "junior") {
    return (
      <span className="flex items-baseline gap-3">
        <span className="body-serif italic text-[0.92rem] text-[var(--ink-soft)]">
          oi, {displayName}
        </span>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="body-serif italic text-[0.78rem] text-[var(--ink-faint)] hover:text-[var(--crimson)] transition-colors"
          >
            sair
          </button>
        </form>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">olá, {displayName}</span>
      <form action="/api/auth/signout" method="post">
        <button type="submit" className="text-xs text-muted-foreground hover:text-destructive">
          sair
        </button>
      </form>
    </span>
  );
}
