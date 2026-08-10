export type Status = "ok" | "warn" | "off";
export type Visibility = "all" | "admin";
export type Role = "admin" | "user";

export interface ProgramLink {
  label: string;
  url: string;
}

/** โน๊ต/บันทึกของโปรแกรม (มีได้หลายอันต่อโปรแกรม) */
export interface ProgramNote {
  id: string;
  text: string;
  kind: NoteKind;
  at: string; // ISO datetime
  by: string; // ชื่อผู้บันทึก
}

export type NoteKind = "info" | "update" | "todo" | "warn";

export const NOTE_KIND_META: Record<NoteKind, { label: string; icon: string; cls: string }> = {
  info: { label: "ข้อมูล", icon: "📌", cls: "nk-info" },
  update: { label: "อัปเดต", icon: "🔄", cls: "nk-update" },
  todo: { label: "ต้องทำ", icon: "✅", cls: "nk-todo" },
  warn: { label: "ระวัง", icon: "⚠️", cls: "nk-warn" },
};

export interface Program {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: Status;
  visibility: Visibility;
  owner: string;
  note: string;
  links: ProgramLink[];
  notes: ProgramNote[];
  claudeUrl: string; // ลิงก์โปรเจกต์/แชต Claude ที่ใช้สร้างโปรแกรมนี้
  logoUrl: string;   // โลโก้จริง (data URL หรือ URL รูป) — ถ้าว่างใช้ icon emoji
  depts: string[];   // แผนกที่เห็นได้ (ว่าง = ทุกคน) ใช้ร่วมกับ visibility
  openCount: number; // จำนวนครั้งที่กดเปิด
  sort: number;
}

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
  department: string;
}

export interface HubSettings {
  name: string;
  logoUrl: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  action: string;   // created | updated | deleted | note-added | note-removed
  target: string;   // ชื่อโปรแกรม
}

export const DEPARTMENTS = ["ส่วนกลาง", "จัดซื้อ", "ขาย", "การตลาด", "คลังสินค้า", "บัญชี", "ธุรการ"] as const;

export const CATEGORIES = [
  "ปฏิบัติการ",
  "เครื่องมือ",
  "การตลาด",
  "ขาย",
  "รายงาน",
  "ผู้ดูแลระบบ",
  "อื่นๆ",
] as const;

export const STATUS_META: Record<Status, { badge: string; dot: string; label: string }> = {
  ok: { badge: "b-ok", dot: "sd-ok", label: "ใช้งานได้" },
  warn: { badge: "b-warn", dot: "sd-warn", label: "ปิดปรับปรุง" },
  off: { badge: "b-off", dot: "sd-off", label: "ปิดใช้งาน" },
};

export const ICON_CHOICES = [
  "📦", "📝", "🧾", "📊", "📈", "💰", "🧴", "🏷️", "🛒", "🛍️",
  "📤", "👥", "⚙️", "📱", "🧪", "📅", "🗂️", "🚚", "🔔", "🌐",
  "🖨️", "🔓", "📄", "✂️", "🔗", "🛒", "💄",
];
