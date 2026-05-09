-- Add 'parent' role: same powers as teacher but semantically different
-- (pai/mãe atribuindo tarefas pros próprios filhos em casa).

alter type public.user_role add value if not exists 'parent';

-- Trigger now respects raw_user_meta_data->>'role' if it's a valid enum value.
-- Falls back to 'student' on miss / unknown / unauthorized escalation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  resolved_role public.user_role;
begin
  requested_role := new.raw_user_meta_data->>'role';
  if requested_role in ('student', 'teacher', 'parent') then
    resolved_role := requested_role::public.user_role;
  else
    resolved_role := 'student';
  end if;

  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    resolved_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
