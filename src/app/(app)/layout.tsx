import { requireUser } from "@/lib/auth/require-user";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <AppShell>{children}</AppShell>;
}
