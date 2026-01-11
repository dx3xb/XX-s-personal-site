-- Voicemaker 自定义音色表（声音复刻）
create table if not exists public.voicemaker_custom_voices (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  description text,
  voice_id varchar(100) not null unique,  -- 豆包返回的音色ID
  audio_sample_url text,  -- 上传的音频样本URL
  audio_sample_data bytea,  -- 上传的音频样本数据
  status varchar(50) not null default 'pending',  -- pending, training, ready, failed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_voicemaker_custom_voices_status 
  on public.voicemaker_custom_voices(status);

create index if not exists idx_voicemaker_custom_voices_created_at 
  on public.voicemaker_custom_voices(created_at desc);

-- 自动更新 updated_at 触发器
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_voicemaker_custom_voices_updated_at'
  ) then
    create trigger set_voicemaker_custom_voices_updated_at
    before update on public.voicemaker_custom_voices
    for each row
    execute function public.set_updated_at();
  end if;
end $$;
