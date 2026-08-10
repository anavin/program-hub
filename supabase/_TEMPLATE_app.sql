-- ============================================================
-- TEMPLATE: เพิ่มแอปใหม่เข้า Supabase project ที่แชร์กัน
-- วิธีใช้:
--   1) รัน 00_shared.sql ไปแล้ว (ครั้งเดียวต่อ project)
--   2) copy ไฟล์นี้ → find/replace `myapp` เป็นชื่อแอปจริง (เช่น po, content)
--   3) รันใน Supabase SQL Editor
--   4) Settings → API → Exposed schemas → เพิ่มชื่อ schema ใหม่
--   5) ในโค้ดแอปนั้น: createClient(url, key, { db: { schema: 'myapp' } })
--   6) ตั้งสิทธิ์: insert public.app_members (..., app='myapp', role='admin', ...)
-- ============================================================
create schema if not exists myapp;
grant usage on schema myapp to anon, authenticated;

-- ── ตัวอย่างตาราง (แก้ตามจริง) ──
create table if not exists myapp.items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  visibility  text default 'all' check (visibility in ('all', 'admin')),
  depts       jsonb default '[]'::jsonb,      -- แผนกที่เห็นได้ (ว่าง = ทุกคน)
  created_at  timestamptz default now()
);

-- grant สิทธิ์บนของทั้ง schema ให้ API role (RLS กั้นจริง)
grant all on all tables in schema myapp to anon, authenticated;
grant all on all sequences in schema myapp to anon, authenticated;
alter default privileges in schema myapp grant all on tables to anon, authenticated;
alter default privileges in schema myapp grant all on sequences to anon, authenticated;

-- ── RLS (ใช้ helper กลางจาก 00_shared.sql) ──
alter table myapp.items enable row level security;

drop policy if exists items_select on myapp.items;
create policy items_select on myapp.items
  for select using (
    auth.role() = 'authenticated'
    and (
      public.has_role('myapp', 'admin')
      or (visibility = 'all' and (depts = '[]'::jsonb or depts ? public.member_dept('myapp')))
    )
  );

drop policy if exists items_insert on myapp.items;
create policy items_insert on myapp.items
  for insert with check (public.has_role('myapp', 'admin'));
drop policy if exists items_update on myapp.items;
create policy items_update on myapp.items
  for update using (public.has_role('myapp', 'admin')) with check (public.has_role('myapp', 'admin'));
drop policy if exists items_delete on myapp.items;
create policy items_delete on myapp.items
  for delete using (public.has_role('myapp', 'admin'));

select 'myapp schema ready ✅ — อย่าลืม expose schema + ตั้ง app_members' as status;
