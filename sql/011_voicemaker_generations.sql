-- Voicemaker 语音生成记录表
create table if not exists public.voicemaker_generations (
  id uuid primary key default gen_random_uuid(),
  text_content text not null,
  voice_id varchar(100) not null,
  audio_url text,
  audio_data bytea,
  file_name varchar(255),
  file_size integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_voicemaker_generations_created_at 
  on public.voicemaker_generations(created_at desc);

-- 自动更新 updated_at 触发器
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_voicemaker_generations_updated_at'
  ) then
    create trigger set_voicemaker_generations_updated_at
    before update on public.voicemaker_generations
    for each row
    execute function public.set_updated_at();
  end if;
end $$;
