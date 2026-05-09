-- Enable realtime for notifications + chat. Self-hosted Supabase requires
-- explicit publication membership.

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.attempt_messages;
