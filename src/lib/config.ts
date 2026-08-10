export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true = ต่อ Supabase จริง, false = โหมดตัวอย่าง (mock ในเครื่อง) */
export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** ผู้ใช้ตัวอย่างสำหรับโหมด mock (ไม่มี Supabase) */
export const MOCK_USERS = [
  { email: "admin@labparfumo.local", password: "admin1234", name: "แอดมิน (ตัวอย่าง)", role: "admin" as const, department: "ส่วนกลาง" },
  { email: "user@labparfumo.local", password: "user1234", name: "พนักงาน (ตัวอย่าง)", role: "user" as const, department: "การตลาด" },
];

export const SESSION_COOKIE = "hub_demo_session";

/** ค่าเริ่มต้นของ hub (ใช้เมื่อยังไม่ตั้งค่า) */
export const DEFAULT_HUB = { name: "Lab Parfumo", logoUrl: "" };
