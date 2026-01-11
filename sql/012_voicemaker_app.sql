-- 添加 Voicemaker 应用到 apps 表
insert into public.apps (slug, title, description, content, is_favorite)
values (
  'voicemaker',
  'Voicemaker',
  'AI 文字转语音工具 - 使用豆包 TTS 生成自然流畅的语音',
  '{}'::jsonb,
  false
)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  updated_at = now();
