import type { Program, ProgramNote } from "./types";

/** โน๊ตตัวอย่างต่อโปรแกรม (key = program id) */
const SEED_NOTES: Record<string, ProgramNote[]> = {
  "po-pro": [
    { id: "n-po-1", text: "อัปเดตระบบงบประมาณ + ป้องกัน race condition ตอนออกเลข PO แล้ว", kind: "update", at: "2026-04-26T14:00:00.000Z", by: "ทีมพัฒนา" },
    { id: "n-po-2", text: "เจ้าของร้านพิมพ์ใบเสร็จให้ใช้ Chrome (Safari พิมพ์แล้วหน้าว่าง)", kind: "warn", at: "2026-05-01T09:00:00.000Z", by: "ทีมพัฒนา" },
  ],
  stock: [
    { id: "n-st-1", text: "กำลังย้ายฐานข้อมูลไป Supabase — ปิดใช้งานชั่วคราวถึงศุกร์นี้", kind: "warn", at: "2026-08-05T03:00:00.000Z", by: "คลังสินค้า" },
  ],
  "content-os": [
    { id: "n-co-1", text: "ต่อ Meta/GA4/YouTube/TikTok แบบ adapter + mock fallback (ยังไม่ครบทุก token)", kind: "info", at: "2026-08-09T04:00:00.000Z", by: "ทีมการตลาด" },
    { id: "n-co-2", text: "ต้องขอ long-lived token ของ TikTok เพิ่ม", kind: "todo", at: "2026-08-09T04:05:00.000Z", by: "ทีมการตลาด" },
  ],
  kingpower: [
    { id: "n-kp-1", text: "ยังไม่ได้ใส่ URL จริง — รอลิงก์จากทีมขาย", kind: "todo", at: "2026-08-10T02:00:00.000Z", by: "แอดมิน" },
  ],
};

/** ลิงก์โปรเจกต์ Claude ต่อโปรแกรม (key = program id) — เติมเพิ่มได้ในโหมดแอดมิน */
const SEED_CLAUDE: Record<string, string> = {
  "sales-guide": "https://claude.ai/code/artifact/59ca78f8-8f03-4b4a-8861-f026a8f1c314",
};

/** แผนกที่เห็นได้ต่อโปรแกรม (key = id, ว่าง = ทุกคน) */
const SEED_DEPTS: Record<string, string[]> = {
  "content-os": ["การตลาด"],
  budget: ["บัญชี", "จัดซื้อ"],
};

const RAW: Omit<Program, "notes" | "claudeUrl" | "logoUrl" | "depts" | "openCount">[] = [
  // ── ระบบหลัก ─────────────────────────────────────────────
  { id: "po-pro", name: "Lab Parfumo PO Pro", description: "ระบบใบสั่งซื้อ + รับของ + งบประมาณ ครบวงจร", category: "ปฏิบัติการ", icon: "📦", status: "ok", visibility: "all", owner: "ทีมจัดซื้อ", note: "ต้องล็อกอินก่อนใช้งาน", sort: 10, links: [{ label: "เปิด", url: "https://lab-parfumo-next.vercel.app" }] },
  { id: "central", name: "ระบบใบเบิกกลาง (CTW)", description: "ใบเบิกของ + dashboard รวม สำหรับทุกแผนก", category: "ปฏิบัติการ", icon: "🧾", status: "ok", visibility: "all", owner: "ส่วนกลาง", note: "", sort: 20, links: [{ label: "เปิด", url: "https://lab-parfumo-central.vercel.app" }] },
  { id: "stock", name: "ระบบสต๊อกวัตถุดิบ (STOCK)", description: "จัดการสต๊อกน้ำหอม/วัตถุดิบ", category: "ปฏิบัติการ", icon: "🧴", status: "ok", visibility: "all", owner: "คลังสินค้า", note: "", sort: 30, links: [{ label: "เปิด", url: "https://labparfumo-stock.vercel.app" }] },

  // ── ขาย ─────────────────────────────────────────────────
  { id: "sales-mobile", name: "หน้าพนักงานขาย /my", description: "หน้าเบิก/สั่งของสำหรับมือถือ ใช้งานหน้างาน", category: "ขาย", icon: "📱", status: "ok", visibility: "all", owner: "ทีมขาย", note: "ออกแบบสำหรับมือถือ", sort: 40, links: [{ label: "หลัก", url: "#" }] },
  { id: "sales-guide", name: "คู่มือพนักงานขาย", description: "คู่มือขั้นตอนการขาย + ข้อมูลสินค้า (เว็บเพจ)", category: "ขาย", icon: "📝", status: "ok", visibility: "all", owner: "ทีมขาย", note: "", sort: 50, links: [{ label: "เปิดคู่มือ", url: "https://claude.ai/code/artifact/59ca78f8-8f03-4b4a-8861-f026a8f1c314" }] },

  // ── การตลาด ─────────────────────────────────────────────
  { id: "content-os", name: "Content OS", description: "Marketing dashboard รวม Meta · GA4 · YouTube · TikTok", category: "การตลาด", icon: "📈", status: "ok", visibility: "admin", owner: "ทีมการตลาด", note: "", sort: 60, links: [{ label: "เปิด", url: "https://content-os-zeta-flax.vercel.app" }] },

  // ── รายงาน ──────────────────────────────────────────────
  { id: "budget", name: "ระบบงบประมาณ", description: "ติดตามงบรายหมวด + เปรียบเทียบแผน/จริง", category: "รายงาน", icon: "💰", status: "ok", visibility: "admin", owner: "บัญชี", note: "", sort: 70, links: [{ label: "หลัก", url: "#" }] },
  { id: "daily-report", name: "รายงานประจำวัน", description: "สรุปยอดสั่งซื้อ/เบิกรายวัน พร้อมพิมพ์ PDF", category: "รายงาน", icon: "📊", status: "ok", visibility: "all", owner: "ส่วนกลาง", note: "", sort: 80, links: [{ label: "หลัก", url: "#" }] },

  // ── เครื่องมือ (utility / marketplace) ───────────────────
  { id: "kingpower", name: "King Power Tools", description: "เว็บแอปช่วยงานเกี่ยวกับ King Power", category: "เครื่องมือ", icon: "🛒", status: "ok", visibility: "all", owner: "—", note: "เติม URL จริงในโหมดแอดมิน", sort: 90, links: [{ label: "เปิด", url: "#" }] },
  { id: "shopee", name: "Shopee Helper", description: "จัดการออเดอร์/ข้อมูลสินค้าบน Shopee", category: "เครื่องมือ", icon: "🛍️", status: "ok", visibility: "all", owner: "—", note: "เติม URL จริงในโหมดแอดมิน", sort: 100, links: [{ label: "เปิด", url: "#" }] },
  { id: "lazada", name: "Lazada Dashboard", description: "แดชบอร์ดยอดขาย/ออเดอร์บน Lazada", category: "เครื่องมือ", icon: "📊", status: "ok", visibility: "all", owner: "—", note: "เติม URL จริงในโหมดแอดมิน", sort: 110, links: [{ label: "เปิดแดชบอร์ด", url: "#" }] },
  { id: "eveandboy", name: "Eve and Boy Dashboard", description: "แดชบอร์ดยอดขาย/ข้อมูลช่องทาง Eve and Boy", category: "เครื่องมือ", icon: "📊", status: "ok", visibility: "all", owner: "—", note: "เติม URL จริงในโหมดแอดมิน", sort: 120, links: [{ label: "เปิดแดชบอร์ด", url: "#" }] },
  { id: "pdf-unlock", name: "ปลดล็อกรหัส PDF", description: "ลบรหัสผ่านออกจากไฟล์ PDF (Remove PDF Password)", category: "เครื่องมือ", icon: "🔓", status: "ok", visibility: "all", owner: "—", note: "เติม URL จริงในโหมดแอดมิน", sort: 130, links: [{ label: "เปิด", url: "#" }] },
  { id: "pdf-extract", name: "แยกข้อมูลจาก PDF", description: "ดึง/แยกข้อมูลจากไฟล์ PDF ออกมาเป็นตาราง", category: "เครื่องมือ", icon: "📄", status: "ok", visibility: "all", owner: "—", note: "เติม URL จริงในโหมดแอดมิน", sort: 140, links: [{ label: "เปิด", url: "#" }] },

  // ── อื่นๆ / โปรเจกต์แยก ─────────────────────────────────
  { id: "bhrc-registry", name: "BHRC Research Registry", description: "ระบบทะเบียนงานวิจัย + คู่มือ PI (เว็บ HTML)", category: "อื่นๆ", icon: "🧪", status: "ok", visibility: "all", owner: "BHRC", note: "ไฟล์ HTML ในเครื่อง ~/Desktop/BHRC-Registry", sort: 160, links: [{ label: "เปิด", url: "#" }] },
  { id: "nwm74", name: "NWM74", description: "เว็บแอป NWM74 (แก้คำอธิบายได้ในโหมดแอดมิน)", category: "อื่นๆ", icon: "🌐", status: "ok", visibility: "all", owner: "—", note: "", sort: 165, links: [{ label: "เปิด", url: "https://nwm74.vercel.app" }] },

  // ── ปฏิบัติการ (เพิ่มเติม) ──────────────────────────────
  { id: "platform-withdrawals", name: "ระบบเบิกสินค้าแยกแพลตฟอร์ม", description: "เบิกสินค้าคลังกลาง (Shopee ฯลฯ) + พิมพ์ใบเบิก/บาร์โค้ด + นับสต๊อก", category: "ปฏิบัติการ", icon: "🚚", status: "ok", visibility: "all", owner: "คลังสินค้า", note: "", sort: 32, links: [{ label: "หลัก", url: "#" }] },
  { id: "overtime", name: "ระบบลงโอที (OT)", description: "บันทึก/สรุปชั่วโมงโอทีของพนักงาน", category: "ปฏิบัติการ", icon: "⏱️", status: "ok", visibility: "all", owner: "HR", note: "", sort: 34, links: [{ label: "เปิด", url: "https://ot-seven-beryl.vercel.app" }] },

  // ── การตลาด/ขาย (เพิ่มเติม) ──────────────────────────────
  { id: "labparfumo-site", name: "เว็บไซต์ labparfumo.com", description: "หน้าร้านออนไลน์ (WordPress/WooCommerce)", category: "การตลาด", icon: "🌐", status: "ok", visibility: "all", owner: "การตลาด", note: "", sort: 62, links: [{ label: "เปิดเว็บ", url: "https://labparfumo.com" }] },

  // ── รายงาน/บัญชี (เพิ่มเติม) ─────────────────────────────
  { id: "petty-cash", name: "PrettyCash (เงินสดย่อย)", description: "แทนไฟล์ Excel เงินสดย่อย + ปิดรอบบัตรค่ายิงแอด", category: "รายงาน", icon: "💵", status: "ok", visibility: "admin", owner: "บัญชี", note: "ต้องล็อกอิน", sort: 75, links: [{ label: "เปิด", url: "https://prettycash.vercel.app/login" }] },

  // ── เครื่องมือ (เพิ่มเติม) ────────────────────────────────
  { id: "excise-tax", name: "ดึงยอดภาษีสรรพสามิต (ภส.07-02)", description: "ดึงยอด (๑๐.๑) จาก PDF เติมเทมเพลตยื่นภาษี", category: "เครื่องมือ", icon: "🧾", status: "ok", visibility: "admin", owner: "บัญชี", note: "", sort: 145, links: [{ label: "เปิด", url: "#" }] },

  // ── ผู้ดูแลระบบ ─────────────────────────────────────────
  { id: "docs", name: "ศูนย์เอกสาร & กฎหมาย", description: "สัญญา เอกสารบริษัท และเทมเพลตต่างๆ", category: "ผู้ดูแลระบบ", icon: "🗂️", status: "ok", visibility: "admin", owner: "ธุรการ", note: "", sort: 150, links: [{ label: "หลัก", url: "#" }] },
  { id: "program-hub-self", name: "Program Hub", description: "พอร์ทัลรวมโปรแกรมทั้งหมด (หน้านี้เอง)", category: "ผู้ดูแลระบบ", icon: "🧭", status: "ok", visibility: "admin", owner: "ส่วนกลาง", note: "", sort: 152, links: [{ label: "หลัก", url: "#" }] },
  { id: "app-starter", name: "App Starter (แม่แบบ)", description: "โครงมาตรฐานสร้างแอปใหม่ (Next.js + Supabase)", category: "ผู้ดูแลระบบ", icon: "🔷", status: "ok", visibility: "admin", owner: "dev", note: "GitHub template", sort: 154, links: [{ label: "GitHub", url: "https://github.com/anavin/app-starter" }] },
];

/**
 * ข้อมูลเริ่มต้น — โปรแกรมทั้งหมดที่ Lab Parfumo ทำไว้ (แนบโน๊ตตัวอย่าง)
 * ตัวที่ url เป็น "#" ให้เข้าโหมดแอดมินแล้วเติมลิงก์จริง
 * ชุดนี้ตรงกับ supabase/schema.sql (ใช้เป็น mock เมื่อยังไม่ตั้งค่า Supabase)
 */
export const SEED_PROGRAMS: Program[] = RAW.map((p) => ({
  ...p,
  notes: SEED_NOTES[p.id] ?? [],
  claudeUrl: SEED_CLAUDE[p.id] ?? "",
  logoUrl: "",
  depts: SEED_DEPTS[p.id] ?? [],
  openCount: 0,
}));
