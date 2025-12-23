-- Site Builder conversations and messages
create table if not exists public.app_conversations (
  id uuid primary key default gen_random_uuid(),
  app_slug text not null,
  title text not null default 'New Conversation',
  created_at timestamptz not null default now()
);

create table if not exists public.app_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.app_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists app_conversations_app_slug_idx
  on public.app_conversations(app_slug);

create index if not exists app_messages_conversation_id_idx
  on public.app_messages(conversation_id);
