-- Site Builder projects, conversations, and images
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled Project',
  user_prompt text not null,
  generated_html text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slot_id text,
  usage text not null,
  prompt text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists projects_created_at_idx
  on public.projects(created_at desc);

create index if not exists conversations_project_id_idx
  on public.conversations(project_id);

create index if not exists images_project_id_idx
  on public.images(project_id);
