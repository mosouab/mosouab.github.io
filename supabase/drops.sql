-- /repo on mosouab.github.io. Run ONCE in the SQL editor of the M2proj Supabase project
-- (it reuses that project's public.is_admin() and admin account).
-- Everyone can read; only the M2proj admin account can add or delete.

create table public.drops (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('link', 'text', 'file')),
  title text not null default '',
  url text check (url ~* '^https?://'),
  body text check (length(body) <= 20000),
  storage_path text,
  size_bytes bigint check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  constraint drops_kind_fields check (
    (kind = 'link' and url is not null and body is null and storage_path is null and size_bytes is null)
    or (kind = 'text' and body is not null and length(trim(body)) > 0 and url is null and storage_path is null and size_bytes is null)
    or (kind = 'file' and storage_path is not null and size_bytes is not null and url is null and body is null)
  )
);

grant select on public.drops to anon, authenticated;
grant insert, delete on public.drops to authenticated;

alter table public.drops enable row level security;
create policy drops_read on public.drops for select to anon, authenticated using (true);
create policy drops_insert on public.drops for insert to authenticated with check (public.is_admin());
create policy drops_delete on public.drops for delete to authenticated using (public.is_admin());

-- Public bucket: files download by link without login; only the admin can upload or delete.
insert into storage.buckets (id, name, public, file_size_limit)
values ('drops', 'drops', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;

create policy "drops files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'drops' and public.is_admin());
create policy "drops files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'drops' and public.is_admin());
-- Storage only deletes objects the caller can also select, so the admin needs this to remove files.
create policy "drops files select" on storage.objects for select to authenticated
  using (bucket_id = 'drops' and public.is_admin());
