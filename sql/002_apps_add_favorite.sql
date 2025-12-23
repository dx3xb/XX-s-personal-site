-- Add favorite support and updated_at automation for apps
alter table public.apps
  add column if not exists is_favorite boolean not null default false;

alter table public.apps
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_apps_updated_at'
  ) then
    create trigger set_apps_updated_at
    before update on public.apps
    for each row
    execute function public.set_updated_at();
  end if;
end $$;
