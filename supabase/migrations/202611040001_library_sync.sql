-- Run once in the Supabase SQL editor. Never use a service-role key in the app.
create table if not exists public.moya_libraries (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null check (coalesce(jsonb_typeof(data) = 'object' and data->>'version' = '1'
  and jsonb_typeof(data->'books') = 'array' and jsonb_typeof(data->'quotes') = 'array'
  and jsonb_typeof(data->'shelves') = 'array' and jsonb_typeof(data->'settings') = 'object'
  and octet_length(data::text) <= 20971520, false)),
 revision bigint not null default 1 check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.moya_libraries enable row level security;
drop policy if exists "Read own library" on public.moya_libraries;
create policy "Read own library" on public.moya_libraries for select to authenticated using (auth.uid() = user_id);
revoke all on public.moya_libraries from anon, authenticated;
grant select on public.moya_libraries to authenticated;
-- Atomic compare-and-swap: two devices can never overwrite the same revision silently.
create or replace function public.save_moya_library(expected_user uuid, expected_revision bigint, library_data jsonb)
returns setof public.moya_libraries language plpgsql security definer set search_path = '' as $$
declare saved public.moya_libraries;
begin
 if auth.uid() is null then raise sqlstate 'PT401' using message = 'Authentication required'; end if;
 if auth.uid() is distinct from expected_user then raise sqlstate 'PT403' using message = 'Account changed'; end if;
 if expected_revision = 0 then
  insert into public.moya_libraries(user_id, data) values (auth.uid(), library_data)
   on conflict (user_id) do nothing returning * into saved;
 else
  update public.moya_libraries set data = library_data, revision = revision + 1, updated_at = now()
   where user_id = auth.uid() and revision = expected_revision returning * into saved;
 end if;
 if saved.user_id is null then raise sqlstate 'PT409' using message = 'Library revision conflict'; end if;
 return next saved;
end;
$$;
revoke all on function public.save_moya_library(uuid, bigint, jsonb) from public, anon;
grant execute on function public.save_moya_library(uuid, bigint, jsonb) to authenticated;
