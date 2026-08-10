import "server-only";
import { HAS_SUPABASE, DEFAULT_HUB } from "./config";
import { getServerSupabase } from "./supabase/server";
import { mockDb } from "./mockStore";
import type { Program, HubSettings, AuditEntry } from "./types";

type Row = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  status: string | null;
  visibility: string | null;
  owner: string | null;
  note: string | null;
  links: unknown;
  notes: unknown;
  claude_url: string | null;
  logo_url: string | null;
  depts: unknown;
  open_count: number | null;
  sort: number | null;
};

function rowToProgram(r: Row): Program {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    category: r.category ?? "อื่นๆ",
    icon: r.icon ?? "🔗",
    status: (r.status as Program["status"]) ?? "ok",
    visibility: (r.visibility as Program["visibility"]) ?? "all",
    owner: r.owner ?? "",
    note: r.note ?? "",
    links: Array.isArray(r.links) ? (r.links as Program["links"]) : [],
    notes: Array.isArray(r.notes) ? (r.notes as Program["notes"]) : [],
    claudeUrl: r.claude_url ?? "",
    logoUrl: r.logo_url ?? "",
    depts: Array.isArray(r.depts) ? (r.depts as string[]) : [],
    openCount: r.open_count ?? 0,
    sort: r.sort ?? 0,
  };
}

/** ดึงโปรแกรมทั้งหมด (เรียงตาม sort) */
export async function listPrograms(): Promise<Program[]> {
  if (!HAS_SUPABASE) return mockDb.list();
  const { data, error } = await getServerSupabase()
    .from("programs")
    .select("*")
    .order("sort", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as Row[]).map(rowToProgram);
}

export async function createProgram(p: Omit<Program, "id">): Promise<void> {
  if (!HAS_SUPABASE) {
    mockDb.create(p);
    return;
  }
  const { error } = await getServerSupabase().from("programs").insert({
    name: p.name,
    description: p.description,
    category: p.category,
    icon: p.icon,
    status: p.status,
    visibility: p.visibility,
    owner: p.owner,
    note: p.note,
    links: p.links,
    notes: p.notes,
    claude_url: p.claudeUrl,
    logo_url: p.logoUrl,
    depts: p.depts,
    open_count: p.openCount,
    sort: p.sort,
  });
  if (error) throw new Error(error.message);
}

/** อัปเดตเฉพาะโน๊ตของโปรแกรม (ไม่แตะฟิลด์อื่น) */
export async function updateProgramNotes(id: string, notes: Program["notes"]): Promise<void> {
  if (!HAS_SUPABASE) {
    mockDb.update(id, { notes });
    return;
  }
  const { error } = await getServerSupabase().from("programs").update({ notes }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateProgram(id: string, p: Omit<Program, "id">): Promise<void> {
  if (!HAS_SUPABASE) {
    // ไม่แตะ notes / openCount ตอนแก้ข้อมูลโปรแกรม (จัดการแยก)
    const { notes: _n, openCount: _o, ...rest } = p;
    void _n;
    void _o;
    mockDb.update(id, rest);
    return;
  }
  const { error } = await getServerSupabase()
    .from("programs")
    .update({
      name: p.name,
      description: p.description,
      category: p.category,
      icon: p.icon,
      status: p.status,
      visibility: p.visibility,
      owner: p.owner,
      note: p.note,
      links: p.links,
      claude_url: p.claudeUrl,
      logo_url: p.logoUrl,
      depts: p.depts,
      sort: p.sort,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** เพิ่มตัวนับการเปิด (fire-and-forget) */
export async function trackOpen(id: string): Promise<void> {
  if (!HAS_SUPABASE) {
    mockDb.incrementOpen(id);
    return;
  }
  // ใช้ RPC (security definer) เพื่อให้ผู้ใช้ทั่วไปนับได้โดยไม่ต้องมีสิทธิ์ update
  await getServerSupabase().rpc("increment_program_open", { pid: id });
}

// ── Hub settings ────────────────────────────────────────
export async function getHubSettings(): Promise<HubSettings> {
  if (!HAS_SUPABASE) return mockDb.getHub();
  const { data } = await getServerSupabase()
    .from("hub_settings")
    .select("name, logo_url")
    .eq("id", 1)
    .maybeSingle();
  return { name: data?.name || DEFAULT_HUB.name, logoUrl: data?.logo_url || "" };
}

export async function saveHubSettings(h: HubSettings): Promise<void> {
  if (!HAS_SUPABASE) {
    mockDb.setHub(h);
    return;
  }
  await getServerSupabase()
    .from("hub_settings")
    .upsert({ id: 1, name: h.name, logo_url: h.logoUrl });
}

// ── Audit log ───────────────────────────────────────────
export async function listAudit(): Promise<AuditEntry[]> {
  if (!HAS_SUPABASE) return mockDb.listAudit();
  const { data } = await getServerSupabase()
    .from("audit_log")
    .select("id, at, by_name, action, target")
    .order("at", { ascending: false })
    .limit(100);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    at: r.at as string,
    by: (r.by_name as string) ?? "",
    action: (r.action as string) ?? "",
    target: (r.target as string) ?? "",
  }));
}

export async function addAudit(e: Omit<AuditEntry, "id">): Promise<void> {
  if (!HAS_SUPABASE) {
    mockDb.addAudit({ ...e, id: `a-${Date.now()}-${Math.round(Math.random() * 1e4)}` });
    return;
  }
  await getServerSupabase()
    .from("audit_log")
    .insert({ at: e.at, by_name: e.by, action: e.action, target: e.target });
}

export async function deleteProgram(id: string): Promise<void> {
  if (!HAS_SUPABASE) {
    mockDb.remove(id);
    return;
  }
  const { error } = await getServerSupabase().from("programs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
