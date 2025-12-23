alter table public.projects
  add column if not exists preview_password_hash text,
  add column if not exists preview_password_salt text;
