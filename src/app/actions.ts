"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, signIn, signOut } from "@/lib/auth";
import {
  createProgram,
  updateProgram,
  deleteProgram,
  updateProgramNotes,
  trackOpen,
  saveHubSettings,
  addAudit,
} from "@/lib/data";
import type { Program, ProgramNote } from "@/lib/types";

// ── Auth ────────────────────────────────────────────────
export async function signInAction(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "กรุณากรอกอีเมลและรหัสผ่าน" };

  const err = await signIn(email, password);
  if (err) return { error: err };
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}

// ── Program CRUD (admin only) ───────────────────────────
async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    throw new Error("ต้องเป็นผู้ดูแลระบบเท่านั้น");
  }
  return user;
}

function nowIso() {
  return new Date().toISOString();
}

function parsePayload(formData: FormData): Omit<Program, "id"> {
  const links = JSON.parse(String(formData.get("links") ?? "[]")) as Program["links"];
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    category: String(formData.get("category") ?? "อื่นๆ"),
    icon: String(formData.get("icon") ?? "🔗"),
    status: (String(formData.get("status") ?? "ok") as Program["status"]),
    visibility: (String(formData.get("visibility") ?? "all") as Program["visibility"]),
    owner: String(formData.get("owner") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
    links: links.filter((l) => l.url && l.url.trim()),
    notes: [], // โน๊ตจัดการแยกผ่าน saveNotesAction — ไม่ยุ่งตอนแก้ข้อมูลโปรแกรม
    claudeUrl: String(formData.get("claudeUrl") ?? "").trim(),
    logoUrl: String(formData.get("logoUrl") ?? "").trim(),
    depts: JSON.parse(String(formData.get("depts") ?? "[]")) as string[],
    openCount: 0, // ตัวนับจัดการแยก — ไม่ยุ่งตอนแก้
    sort: Number(formData.get("sort") ?? 100) || 100,
  };
}

export async function saveProgramAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const payload = parsePayload(formData);
  if (!payload.name) throw new Error("กรุณาใส่ชื่อโปรแกรม");
  if (payload.links.length === 0) payload.links = [{ label: "เปิด", url: "#" }];

  if (id) await updateProgram(id, payload);
  else await createProgram(payload);
  await addAudit({ at: nowIso(), by: user.name, action: id ? "แก้ไข" : "เพิ่ม", target: payload.name });
  revalidatePath("/");
}

export async function deleteProgramAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  if (id) await deleteProgram(id);
  await addAudit({ at: nowIso(), by: user.name, action: "ลบ", target: name });
  revalidatePath("/");
}

/** บันทึกรายการโน๊ตทั้งหมดของโปรแกรม (admin เท่านั้น) */
export async function saveNotesAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  if (!id) throw new Error("ไม่พบโปรแกรม");
  const notes = JSON.parse(String(formData.get("notes") ?? "[]")) as ProgramNote[];
  await updateProgramNotes(id, notes);
  await addAudit({ at: nowIso(), by: user.name, action: "แก้โน๊ต", target: name });
  revalidatePath("/");
}

/** นับการเปิดโปรแกรม (ทุกคนที่ล็อกอิน) */
export async function trackOpenAction(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user || !id) return;
  await trackOpen(id);
}

/** ตรวจสถานะ URL (ping) — คืน online/down + เวลาตอบสนอง */
export async function checkHealthAction(url: string): Promise<{ ok: boolean; ms: number; note: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, ms: 0, note: "ยังไม่ได้ล็อกอิน" };
  if (!url || url === "#" || !/^https?:\/\//i.test(url)) {
    return { ok: false, ms: 0, note: "ยังไม่มี URL จริง" };
  }
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    clearTimeout(t);
    const ms = Date.now() - start;
    return { ok: res.ok || res.status < 500, ms, note: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, ms: Date.now() - start, note: e instanceof Error && e.name === "AbortError" ? "หมดเวลา (timeout)" : "เชื่อมต่อไม่ได้" };
  }
}

/** บันทึกตั้งค่า hub (admin เท่านั้น) */
export async function saveHubSettingsAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim() || "Lab Parfumo";
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();
  await saveHubSettings({ name, logoUrl });
  await addAudit({ at: nowIso(), by: user.name, action: "แก้ตั้งค่า", target: "ตั้งค่า Hub" });
  revalidatePath("/");
}
