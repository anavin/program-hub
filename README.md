# Lab Parfumo — Program Hub 🧭

พอร์ทัลรวมโปรแกรมทั้งหมดของ Lab Parfumo ไว้ที่เดียว — เก็บ URL, คำอธิบาย, สถานะ, สิทธิ์การเห็น
มี login แยก **user / admin** และ admin จัดการโปรแกรมได้ผ่านหน้าเว็บ

## ฟีเจอร์
- 🗂️ การ์ดโปรแกรม + ค้นหา/ฟิลเตอร์หมวดหมู่ + มุมมองการ์ด/รายการ
- 🔒 สิทธิ์การเห็นต่อโปรแกรม: ทุกคน / เฉพาะแผนก / admin เท่านั้น
- 📝 โน๊ต/บันทึกหลายอันต่อโปรแกรม (ข้อมูล/อัปเดต/ต้องทำ/ระวัง) + ✅ รวม "งานต้องทำ" ทุกโปรแกรม
- ⭐ ปักหมุด (ต่อเครื่อง) + 🔥 นับการเปิด + จัดเรียง "ใช้บ่อย"
- 🖼️ โลโก้จริง (อัปโหลด) หรือ emoji · 📱 QR เปิดบนมือถือ · 🟢 ปุ่มตรวจสถานะ URL
- ✨ ลิงก์โปรเจกต์ Claude ต่อโปรแกรม (กระโดดกลับไปแก้โค้ด)
- ⚙️ ตั้งค่า Hub (ชื่อ/โลโก้องค์กร) · 📜 ประวัติการแก้ไข (audit log)

- **Stack:** Next.js 14 (App Router) · TypeScript · Supabase · CSS ล้วน (design token แบรนด์เดิม)
- **Auth:** Supabase Auth + ตาราง `profiles.role` (`user` / `admin`)
- ยังไม่ตั้งค่า Supabase ก็รันได้ทันทีใน **โหมดตัวอย่าง (mock)**

---

## เริ่มใช้งาน (โหมดตัวอย่าง — ไม่ต้องมี Supabase)

```bash
cd program-hub
npm install
npm run dev
```

เปิด http://localhost:3030 แล้วล็อกอินด้วย:

| บทบาท | อีเมล | รหัสผ่าน |
|---|---|---|
| แอดมิน | `admin@labparfumo.local` | `admin1234` |
| พนักงาน | `user@labparfumo.local` | `user1234` |

> โหมดนี้ข้อมูลเก็บในหน่วยความจำ (รีสตาร์ทแล้วกลับเป็น seed) — ไว้ลองใช้/ดูดีไซน์

---

## ต่อ Supabase จริง

1. คัดลอก env และเติมค่า (Supabase → Project Settings → API):
   ```bash
   cp .env.example .env.local
   ```
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
2. รัน SQL (ตามลำดับ) ที่ Supabase → **SQL Editor**:
   - [`supabase/00_shared.sql`](supabase/00_shared.sql) — ของกลาง (`public.profiles`, `public.app_members`, helper) **รันครั้งเดียวต่อ project**
   - [`supabase/10_program_hub.sql`](supabase/10_program_hub.sql) — schema `program_hub` (programs, hub_settings, audit_log) + RLS + Storage bucket `hub-logos` + seed 16 โปรแกรม
3. **สำคัญ:** Supabase → **Settings → API → Exposed schemas** → เพิ่ม `program_hub` (ไม่งั้น client เรียกตารางไม่ได้)
4. สร้างผู้ใช้: Supabase → **Authentication → Users → Add user** (ระบบสร้าง `profiles` อัตโนมัติ)
5. ตั้งสิทธิ์ **ต่อแอป** ใน `app_members` (admin/แผนก) — รันใน SQL Editor:
   ```sql
   insert into public.app_members (user_id, app, role, dept)
   values ((select id from auth.users where email = 'you@labparfumo.com'),
           'program_hub', 'admin', 'ส่วนกลาง')
   on conflict (user_id, app) do update set role = excluded.role, dept = excluded.dept;
   ```
6. `npm run dev` แล้วล็อกอินด้วยผู้ใช้ Supabase จริง

> **ใช้ Supabase ร่วมหลายแอป:** รัน `00_shared.sql` ครั้งเดียว แล้วแต่ละแอปมี schema ของตัวเอง (`program_hub`, `po`, …) + ตั้ง `db.schema` ใน client · สิทธิ์แยกต่อแอปที่ `app_members` · ดูแผนภาพ/รายละเอียดในแชต
>
> โปรเจกต์นี้ **รัน migration มือ** — แก้ schema เมื่อไหร่ต้องรัน SQL บน Supabase เองทุกครั้ง

---

## Deploy (Vercel)

1. push โฟลเดอร์ `program-hub/` ขึ้น repo
2. Vercel → New Project → เลือก repo → **Root Directory = `program-hub`**
3. ใส่ env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — พอร์ต dev = **3030** (เลี่ยงชนกับ 3010/3020 ของโปรเจกต์อื่น)

---

## โครงสร้าง

```
program-hub/
├─ supabase/
│  ├─ 00_shared.sql           # ของกลาง (profiles + app_members + helper) — 1 ครั้ง/project
│  └─ 10_program_hub.sql      # schema program_hub + RLS + seed
├─ src/
│  ├─ app/
│  │  ├─ page.tsx             # หน้า hub (server: ดึงข้อมูล + กรองสิทธิ์)
│  │  ├─ login/page.tsx       # หน้า login
│  │  ├─ actions.ts           # server actions (auth + CRUD, เช็ค role)
│  │  └─ globals.css          # design system
│  ├─ components/Hub.tsx      # UI หลัก (ค้นหา/ฟิลเตอร์/การ์ด/modal)
│  ├─ lib/
│  │  ├─ auth.ts  data.ts     # ชั้น auth + ข้อมูล (มี mock fallback)
│  │  ├─ supabase/            # client/server ของ Supabase
│  │  ├─ seed.ts  mockStore.ts config.ts types.ts
│  └─ middleware.ts           # กันเข้าถึงหน้าถ้ายังไม่ล็อกอิน
```

## ความปลอดภัยของสิทธิ์
- โปรแกรม `admin-only` ถูกกรอง **ฝั่ง server** ก่อนส่งถึง browser (ไม่หลุด)
- การเพิ่ม/แก้/ลบ เช็ค role ใน server action **และ** RLS ของ Supabase อีกชั้น
