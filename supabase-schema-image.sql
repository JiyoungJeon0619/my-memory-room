-- =============================================
-- 기억의 방 — Supabase Schema 업데이트
-- 기존 schema에 이미지 관련 필드 추가
-- =============================================

-- memories 테이블에 이미지 컬럼 추가
alter table memories
  add column if not exists image_url    text,
  add column if not exists image_prompt text,
  add column if not exists image_status text default 'none'
    check (image_status in ('none','pending','done','error'));

-- =============================================
-- Storage 버킷 생성 (Dashboard > Storage에서도 가능)
-- =============================================
insert into storage.buckets (id, name, public)
values ('memory-images', 'memory-images', true)
on conflict do nothing;

-- Storage RLS: 본인 폴더만 업로드/읽기 가능
create policy "본인 이미지 업로드"
  on storage.objects for insert
  with check (
    bucket_id = 'memory-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "이미지 공개 읽기"
  on storage.objects for select
  using (bucket_id = 'memory-images');

create policy "본인 이미지 삭제"
  on storage.objects for delete
  using (
    bucket_id = 'memory-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
