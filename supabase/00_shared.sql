-- ============================================================
-- Shared foundation — รัน "ครั้งเดียวต่อ project" ก่อนของทุกแอป
-- ใช้ร่วมกับทุกแอปที่แชร์ Supabase project เดียวกัน
-- ============================================================

-- ── ข้อมูลผู้ใช้กลาง (ผูกกับ auth.users ที่ Supabase จัดการ) ──
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text default '',
  created_at timestamptz default now()
);

-- ── สิทธิ์ "ต่อแอป": คนเดียวมี role/แผนก ต่างกันในแต่ละแอปได้ ──
create table if not exists public.app_members (
  user_id    uuid references auth.users (id) on delete cascade,
  app        text not null,                 -- 'program_hub' | 'po' | 'content' ...
  role       text not null default 'user' check (role in ('user', 'admin')),
  dept       text default '',
  created_at timestamptz default now(),
  primary key (user_id, app)
);

-- สร้าง profile อัตโนมัติเมื่อมีผู้ใช้ใหม่
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

-- ── helper กลาง (ใช้ใน RLS ของทุกแอป) ──
create or replace function public.has_role(_app text, _role text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.app_members
    where user_id = auth.uid() and app = _app and role = _role
  );
$$;

create or replace function public.member_dept(_app text)
returns text language sql security definer stable set search_path = public as $$
  select coalesce(
    (select dept from public.app_members where user_id = auth.uid() and app = _app),
    ''
  );
$$;

-- ── RLS: ผู้ใช้เห็นได้เฉพาะข้อมูลตัวเอง (admin จัดการผ่าน dashboard/service role) ──
alter table public.profiles     enable row level security;
alter table public.app_members  enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for select using (id = auth.uid());

drop policy if exists members_self on public.app_members;
create policy members_self on public.app_members
  for select using (user_id = auth.uid());

select 'shared foundation ready ✅' as status;

-- ────────────────────────────────────────────────────────────
-- วิธีตั้งแอดมิน/แผนก ต่อแอป (รันแยกเมื่อมีผู้ใช้แล้ว):
--   insert into public.app_members (user_id, app, role, dept)
--   values ((select id from auth.users where email='you@labparfumo.com'),
--           'program_hub', 'admin', 'ส่วนกลาง')
--   on conflict (user_id, app) do update set role=excluded.role, dept=excluded.dept;
-- ────────────────────────────────────────────────────────────
