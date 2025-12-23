create table if not exists public.preview_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_preview_tokens_project_id on public.preview_tokens(project_id);
create index if not exists idx_preview_tokens_token on public.preview_tokens(token);
