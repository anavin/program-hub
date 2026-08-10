-- ============================================================
-- Lab Parfumo Program Hub — schema
-- รันบน Supabase → SQL Editor (โปรเจกต์นี้รัน migration มือ)
-- ============================================================

-- ── ตาราง profiles: เก็บ role ของผู้ใช้ (ผูกกับ auth.users) ──
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text default '',
  role       text not null default 'user' check (role in ('user', 'admin')),
  department text default '',
  created_at timestamptz default now()
);
alter table public.profiles add column if not exists department text default '';

-- สร้าง profile อัตโนมัติเมื่อมีผู้ใช้ใหม่ (role เริ่มต้น = user)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── ตาราง programs ────────────────────────────────────────
create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  category    text default 'อื่นๆ',
  icon        text default '🔗',
  status      text default 'ok'  check (status in ('ok', 'warn', 'off')),
  visibility  text default 'all' check (visibility in ('all', 'admin')),
  owner       text default '',
  note        text default '',
  links       jsonb default '[]'::jsonb,   -- [{ "label": "หลัก", "url": "https://…" }]
  notes       jsonb default '[]'::jsonb,   -- [{ "id","text","kind","at","by" }]
  claude_url  text default '',              -- ลิงก์โปรเจกต์/แชต Claude ที่สร้างโปรแกรมนี้
  logo_url    text default '',              -- โลโก้จริง (data URL หรือ URL รูป)
  depts       jsonb default '[]'::jsonb,    -- แผนกที่เห็นได้ (ว่าง = ทุกคน)
  open_count  int  default 0,               -- จำนวนครั้งที่กดเปิด
  sort        int  default 100,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- เผื่อกรณีตารางมีอยู่แล้ว (รัน schema ซ้ำ) — เพิ่มคอลัมน์ใหม่
alter table public.programs add column if not exists notes jsonb default '[]'::jsonb;
alter table public.programs add column if not exists claude_url text default '';
alter table public.programs add column if not exists logo_url text default '';
alter table public.programs add column if not exists depts jsonb default '[]'::jsonb;
alter table public.programs add column if not exists open_count int default 0;

create index if not exists programs_sort_idx on public.programs (sort);

-- ── Row Level Security ────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.programs enable row level security;

-- helper: ผู้ใช้ปัจจุบันเป็น admin ไหม
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- profiles: อ่านของตัวเองได้ / admin อ่านได้ทุกคน
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- programs: admin เห็นทุกอัน; คนอื่นเห็น 'all' ที่ตรงแผนก (ว่าง = ทุกคน)
drop policy if exists programs_select on public.programs;
create policy programs_select on public.programs
  for select using (
    auth.role() = 'authenticated'
    and (
      public.is_admin()
      or (
        visibility = 'all'
        and (
          depts = '[]'::jsonb
          or depts ? coalesce((select department from public.profiles where id = auth.uid()), '')
        )
      )
    )
  );

-- เพิ่ม/แก้/ลบ: เฉพาะ admin
drop policy if exists programs_insert on public.programs;
create policy programs_insert on public.programs
  for insert with check (public.is_admin());

drop policy if exists programs_update on public.programs;
create policy programs_update on public.programs
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists programs_delete on public.programs;
create policy programs_delete on public.programs
  for delete using (public.is_admin());

-- นับการเปิด: ให้ผู้ใช้ที่ล็อกอินเพิ่มตัวนับได้ โดยไม่ต้องมีสิทธิ์ update ทั้งแถว
create or replace function public.increment_program_open(pid uuid)
returns void language sql security definer set search_path = public as $$
  update public.programs set open_count = coalesce(open_count, 0) + 1 where id = pid;
$$;

-- ── ตั้งค่า Hub (singleton) ────────────────────────────────
create table if not exists public.hub_settings (
  id       int primary key default 1,
  name     text default 'Lab Parfumo',
  logo_url text default '',
  constraint hub_singleton check (id = 1)
);
insert into public.hub_settings (id, name) values (1, 'Lab Parfumo') on conflict (id) do nothing;
alter table public.hub_settings enable row level security;
drop policy if exists hub_settings_select on public.hub_settings;
create policy hub_settings_select on public.hub_settings for select using (auth.role() = 'authenticated');
drop policy if exists hub_settings_write on public.hub_settings;
create policy hub_settings_write on public.hub_settings for all using (public.is_admin()) with check (public.is_admin());

-- ── ประวัติการแก้ไข (audit log) ───────────────────────────
create table if not exists public.audit_log (
  id      bigint generated always as identity primary key,
  at      timestamptz default now(),
  by_name text default '',
  action  text default '',
  target  text default ''
);
alter table public.audit_log enable row level security;
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select using (public.is_admin());
drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log for insert with check (public.is_admin());

-- ── ข้อมูลเริ่มต้น (seed) ─────────────────────────────────
insert into public.programs (name, description, category, icon, status, visibility, owner, note, links, sort) values
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

-- โน๊ตตัวอย่าง (จับคู่ตามชื่อโปรแกรม)
update public.programs set notes = '[
  {"id":"n-po-1","text":"อัปเดตระบบงบประมาณ + ป้องกัน race condition ตอนออกเลข PO แล้ว","kind":"update","at":"2026-04-26T14:00:00.000Z","by":"ทีมพัฒนา"},
  {"id":"n-po-2","text":"เจ้าของร้านพิมพ์ใบเสร็จให้ใช้ Chrome (Safari พิมพ์แล้วหน้าว่าง)","kind":"warn","at":"2026-05-01T09:00:00.000Z","by":"ทีมพัฒนา"}
]'::jsonb where name = 'Lab Parfumo PO Pro';

update public.programs set notes = '[
  {"id":"n-st-1","text":"กำลังย้ายฐานข้อมูลไป Supabase — ปิดใช้งานชั่วคราวถึงศุกร์นี้","kind":"warn","at":"2026-08-05T03:00:00.000Z","by":"คลังสินค้า"}
]'::jsonb where name = 'ระบบสต๊อกวัตถุดิบ';

update public.programs set notes = '[
  {"id":"n-co-1","text":"ต่อ Meta/GA4/YouTube/TikTok แบบ adapter + mock fallback (ยังไม่ครบทุก token)","kind":"info","at":"2026-08-09T04:00:00.000Z","by":"ทีมการตลาด"},
  {"id":"n-co-2","text":"ต้องขอ long-lived token ของ TikTok เพิ่ม","kind":"todo","at":"2026-08-09T04:05:00.000Z","by":"ทีมการตลาด"}
]'::jsonb where name = 'Content OS';

update public.programs set notes = '[
  {"id":"n-kp-1","text":"ยังไม่ได้ใส่ URL จริง — รอลิงก์จากทีมขาย","kind":"todo","at":"2026-08-10T02:00:00.000Z","by":"แอดมิน"}
]'::jsonb where name = 'King Power Tools';

-- ลิงก์โปรเจกต์ Claude ตัวอย่าง
update public.programs set claude_url = 'https://claude.ai/code/artifact/59ca78f8-8f03-4b4a-8861-f026a8f1c314'
where name = 'คู่มือพนักงานขาย';

-- จำกัดแผนกตัวอย่าง
update public.programs set depts = '["การตลาด"]'::jsonb where name = 'Content OS';
update public.programs set depts = '["บัญชี","จัดซื้อ"]'::jsonb where name = 'ระบบงบประมาณ';

select 'program hub schema ready ✅' as status;
