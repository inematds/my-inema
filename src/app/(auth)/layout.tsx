import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <Link href="/" className="mb-8 text-2xl font-semibold tracking-tight">
        Andaime
      </Link>
      {children}
      <span className="mt-8 text-xs text-muted-foreground">
        v{process.env.NEXT_PUBLIC_APP_VERSION}
      </span>
    </div>
  );
}
