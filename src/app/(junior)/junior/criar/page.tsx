import { redirect } from "next/navigation";
import { Workspace } from "@/components/junior/workspace";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Andaime Junior · seu livro",
};

export default async function JuniorCriarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/junior/criar");
  }
  return <Workspace />;
}
