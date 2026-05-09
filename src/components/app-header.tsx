import Link from "next/link";
import { UserChip } from "@/components/user-chip";
import { NotificationsBellMaybe } from "@/components/notifications-bell-maybe";

// Shared header for every page. Logo top-left → /. UserChip top-right.
// Storybook aesthetic (cream/parchment) — uses junior theme tokens which are
// applied at <body data-theme="junior"> in the root layout.
export function AppHeader({ extra }: { extra?: React.ReactNode }) {
  return (
    <header className="relative z-10 px-6 lg:px-8 py-5 flex items-baseline justify-between gap-4">
      <Link
        href="/"
        className="display text-[clamp(1.5rem,2.4vw,2rem)] tracking-tight"
      >
        Andaime
        <span className="display-italic text-[0.55em] ml-1 text-[var(--magic)]">
          junior
        </span>
      </Link>
      <nav className="flex items-baseline gap-5">
        {extra}
        <NotificationsBellMaybe />
        <UserChip />
        <span className="body-serif text-[0.72rem] tracking-[0.18em] uppercase text-[var(--ink-faint)]">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </span>
      </nav>
    </header>
  );
}
