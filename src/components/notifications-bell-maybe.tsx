import { createClient } from "@/lib/supabase/server";
import { NotificationsBell } from "@/components/notifications-bell";

// Shows the bell only for logged-in users. Server component so we can check
// auth without flashing UI.
export async function NotificationsBellMaybe() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return <NotificationsBell />;
}
