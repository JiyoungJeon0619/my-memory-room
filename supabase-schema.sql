-- =============================================
-- 기억의 방 — Supabase SQL Schema
-- Supabase Dashboard > SQL Editor 에 붙여넣고 실행
-- =============================================

-- 1. 사용자 프로필
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  kakao_id    text unique,
  name        text not null default '',
  birth_year  text default '',
  topics      text[] default '{}',
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. 대화 세션
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text default '새 대화',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 3. 메시지
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  created_at  timestamptz default now()
);

-- 4. 기억 카드 (책에 담긴 것들)
create table if not exists memories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  session_id  uuid references sessions(id) on delete set null,
  quote       text not null,
  wc_index    int default 0,
  created_at  timestamptz default now()
);

-- =============================================
-- RLS (Row Level Security) — 본인 데이터만 접근
-- =============================================
alter table profiles  enable row level security;
alter table sessions  enable row level security;
alter table messages  enable row level security;
alter table memories  enable row level security;

-- profiles
create policy "본인 프로필 읽기"   on profiles for select using (auth.uid() = id);
create policy "본인 프로필 수정"   on profiles for update using (auth.uid() = id);

-- sessions
create policy "본인 세션 전체"     on sessions for all using (auth.uid() = user_id);

-- messages
create policy "본인 메시지 전체"   on messages for all using (auth.uid() = user_id);

-- memories
create policy "본인 기억 전체"     on memories for all using (auth.uid() = user_id);

-- =============================================
-- updated_at 자동 갱신 트리거
-- =============================================
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_profiles_updated
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_sessions_updated
  before update on sessions
  for each row execute function update_updated_at();
