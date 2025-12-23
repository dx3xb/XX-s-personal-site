alter table public.projects
  add column if not exists page_plan jsonb,
  add column if not exists image_plan jsonb;
