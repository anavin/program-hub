-- ============================================================
-- Program Hub — schema ของแอปนี้ (รัน "หลัง" 00_shared.sql)
-- ต้องเพิ่ม 'program_hub' ใน Dashboard → API → Exposed schemas ด้วย
-- ============================================================
create schema if not exists program_hub;

-- ให้ role ของ API เข้าถึง schema ได้ (RLS ยังกั้นข้อมูลจริงอยู่)
grant usage on schema program_hub to anon, authenticated;

-- ── ตาราง programs ──
create table if not exists program_hub.programs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  category    text default 'อื่นๆ',
  icon        text default '🔗',
  status      text default 'ok'  check (status in ('ok', 'warn', 'off')),
  visibility  text default 'all' check (visibility in ('all', 'admin')),
  owner       text default '',
  note        text default '',
  links       jsonb default '[]'::jsonb,
  notes       jsonb default '[]'::jsonb,
  claude_url  text default '',
  logo_url    text default '',
  depts       jsonb default '[]'::jsonb,
  open_count  int  default 0,
  sort        int  default 100,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists programs_sort_idx on program_hub.programs (sort);

create table if not exists program_hub.hub_settings (
  id       int primary key default 1,
  name     text default 'Lab Parfumo',
  logo_url text default '',
  constraint hub_singleton check (id = 1)
);
insert into program_hub.hub_settings (id, name) values (1, 'Lab Parfumo') on conflict (id) do nothing;

create table if not exists program_hub.audit_log (
  id      bigint generated always as identity primary key,
  at      timestamptz default now(),
  by_name text default '',
  action  text default '',
  target  text default ''
);

-- grant สิทธิ์บนตาราง/sequence/function ให้ API role (RLS กั้นจริง)
grant all on all tables in schema program_hub to anon, authenticated;
grant all on all sequences in schema program_hub to anon, authenticated;
alter default privileges in schema program_hub grant all on tables to anon, authenticated;
alter default privileges in schema program_hub grant all on sequences to anon, authenticated;

-- นับการเปิด: ผู้ใช้ทั่วไปเรียกได้โดยไม่ต้องมีสิทธิ์ update ทั้งแถว
create or replace function program_hub.increment_program_open(pid uuid)
returns void language sql security definer set search_path = program_hub as $$
  update program_hub.programs set open_count = coalesce(open_count, 0) + 1 where id = pid;
$$;
grant execute on function program_hub.increment_program_open(uuid) to anon, authenticated;

-- ── RLS ──
alter table program_hub.programs     enable row level security;
alter table program_hub.hub_settings enable row level security;
alter table program_hub.audit_log    enable row level security;

-- programs: admin เห็นหมด; คนอื่นเห็น 'all' ที่ตรงแผนก (ว่าง = ทุกคน)
drop policy if exists programs_select on program_hub.programs;
create policy programs_select on program_hub.programs
  for select using (
    auth.role() = 'authenticated'
    and (
      public.has_role('program_hub', 'admin')
      or (
        visibility = 'all'
        and (depts = '[]'::jsonb or depts ? public.member_dept('program_hub'))
      )
    )
  );

drop policy if exists programs_insert on program_hub.programs;
create policy programs_insert on program_hub.programs
  for insert with check (public.has_role('program_hub', 'admin'));
drop policy if exists programs_update on program_hub.programs;
create policy programs_update on program_hub.programs
  for update using (public.has_role('program_hub', 'admin')) with check (public.has_role('program_hub', 'admin'));
drop policy if exists programs_delete on program_hub.programs;
create policy programs_delete on program_hub.programs
  for delete using (public.has_role('program_hub', 'admin'));

drop policy if exists hub_settings_select on program_hub.hub_settings;
create policy hub_settings_select on program_hub.hub_settings
  for select using (auth.role() = 'authenticated');
drop policy if exists hub_settings_write on program_hub.hub_settings;
create policy hub_settings_write on program_hub.hub_settings
  for all using (public.has_role('program_hub', 'admin')) with check (public.has_role('program_hub', 'admin'));

drop policy if exists audit_select on program_hub.audit_log;
create policy audit_select on program_hub.audit_log
  for select using (public.has_role('program_hub', 'admin'));
drop policy if exists audit_insert on program_hub.audit_log;
create policy audit_insert on program_hub.audit_log
  for insert with check (public.has_role('program_hub', 'admin'));

-- ── seed 16 โปรแกรม ──
insert into program_hub.programs (name, description, category, icon, status, visibility, owner, note, links, sort) values
  ('Lab Parfumo PO Pro', 'ระบบใบสั่งซื้อ + รับของ + งบประมาณ ครบวงจร', 'ปฏิบัติการ', '📦', 'ok', 'all', 'ทีมจัดซื้อ', '', '[{"label":"หลัก","url":"#"},{"label":"คู่มือ","url":"#"}]', 10),
  ('ระบบใบเบิกกลาง', 'ใบเบิกของ + dashboard รวม สำหรับทุกแผนก', 'ปฏิบัติการ', '🧾', 'ok', 'all', 'ส่วนกลาง', '', '[{"label":"หลัก","url":"#"}]', 20),
  ('ระบบสต๊อกวัตถุดิบ', 'จัดการสต๊อกน้ำหอม/วัตถุดิบ', 'ปฏิบัติการ', '🧴', 'warn', 'all', 'คลังสินค้า', 'อยู่ระหว่างย้ายฐานข้อมูล', '[{"label":"หลัก","url":"#"}]', 30),
  ('หน้าพนักงานขาย /my', 'หน้าเบิก/สั่งของสำหรับมือถือ ใช้งานหน้างาน', 'ขาย', '📱', 'ok', 'all', 'ทีมขาย', 'ออกแบบสำหรับมือถือ', '[{"label":"หลัก","url":"#"}]', 40),
  ('คู่มือพนักงานขาย', 'คู่มือขั้นตอนการขาย + ข้อมูลสินค้า (เว็บเพจ)', 'ขาย', '📝', 'ok', 'all', 'ทีมขาย', '', '[{"label":"เปิดคู่มือ","url":"https://claude.ai/code/artifact/59ca78f8-8f03-4b4a-8861-f026a8f1c314"}]', 50),
  ('Content OS', 'Marketing dashboard รวม Meta · GA4 · YouTube · TikTok', 'การตลาด', '📈', 'ok', 'admin', 'ทีมการตลาด', '', '[{"label":"หลัก","url":"#"}]', 60),
  ('ระบบงบประมาณ', 'ติดตามงบรายหมวด + เปรียบเทียบแผน/จริง', 'รายงาน', '💰', 'ok', 'admin', 'บัญชี', '', '[{"label":"หลัก","url":"#"}]', 70),
  ('รายงานประจำวัน', 'สรุปยอดสั่งซื้อ/เบิกรายวัน พร้อมพิมพ์ PDF', 'รายงาน', '📊', 'ok', 'all', 'ส่วนกลาง', '', '[{"label":"หลัก","url":"#"}]', 80),
  ('King Power Tools', 'เว็บแอปช่วยงานเกี่ยวกับ King Power', 'เครื่องมือ', '🛒', 'ok', 'all', '', 'เติม URL จริงในโหมดแอดมิน', '[{"label":"เปิด","url":"#"}]', 90),
  ('Shopee Helper', 'จัดการออเดอร์/ข้อมูลสินค้าบน Shopee', 'เครื่องมือ', '🛍️', 'ok', 'all', '', 'เติม URL จริงในโหมดแอดมิน', '[{"label":"เปิด","url":"#"}]', 100),
  ('Lazada Dashboard', 'แดชบอร์ดยอดขาย/ออเดอร์บน Lazada', 'เครื่องมือ', '📊', 'ok', 'all', '', 'เติม URL จริงในโหมดแอดมิน', '[{"label":"เปิดแดชบอร์ด","url":"#"}]', 110),
  ('Eve and Boy Dashboard', 'แดชบอร์ดยอดขาย/ข้อมูลช่องทาง Eve and Boy', 'เครื่องมือ', '📊', 'ok', 'all', '', 'เติม URL จริงในโหมดแอดมิน', '[{"label":"เปิดแดชบอร์ด","url":"#"}]', 120),
  ('ปลดล็อกรหัส PDF', 'ลบรหัสผ่านออกจากไฟล์ PDF (Remove PDF Password)', 'เครื่องมือ', '🔓', 'ok', 'all', '', 'เติม URL จริงในโหมดแอดมิน', '[{"label":"เปิด","url":"#"}]', 130),
  ('แยกข้อมูลจาก PDF', 'ดึง/แยกข้อมูลจากไฟล์ PDF ออกมาเป็นตาราง', 'เครื่องมือ', '📄', 'ok', 'all', '', 'เติม URL จริงในโหมดแอดมิน', '[{"label":"เปิด","url":"#"}]', 140),
  ('ศูนย์เอกสาร & กฎหมาย', 'สัญญา เอกสารบริษัท และเทมเพลตต่างๆ', 'ผู้ดูแลระบบ', '🗂️', 'ok', 'admin', 'ธุรการ', '', '[{"label":"หลัก","url":"#"}]', 150),
  ('BHRC Research Registry', 'ระบบทะเบียนงานวิจัย + คู่มือ PI (เว็บ HTML)', 'อื่นๆ', '🧪', 'ok', 'all', 'BHRC', 'ไฟล์ HTML ในเครื่อง ~/Desktop/BHRC-Registry', '[{"label":"เปิด","url":"#"}]', 160)
on conflict do nothing;

-- ลิงก์ Claude + จำกัดแผนกตัวอย่าง
update program_hub.programs set claude_url = 'https://claude.ai/code/artifact/59ca78f8-8f03-4b4a-8861-f026a8f1c314' where name = 'คู่มือพนักงานขาย';
update program_hub.programs set depts = '["การตลาด"]'::jsonb where name = 'Content OS';
update program_hub.programs set depts = '["บัญชี","จัดซื้อ"]'::jsonb where name = 'ระบบงบประมาณ';

select 'program_hub schema ready ✅' as status;
