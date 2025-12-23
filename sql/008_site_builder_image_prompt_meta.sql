alter table public.images
  add column if not exists negative_prompt text,
  add column if not exists style text,
  add column if not exists aspect_ratio text,
  add column if not exists size text,
  add column if not exists seed integer;
