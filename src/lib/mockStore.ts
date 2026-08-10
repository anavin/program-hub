import type { Program, HubSettings, AuditEntry } from "./types";
import { SEED_PROGRAMS } from "./seed";
import { DEFAULT_HUB } from "./config";

/**
 * ที่เก็บข้อมูลชั่วคราวในหน่วยความจำ สำหรับโหมด mock (ไม่มี Supabase)
 * ผูกกับ globalThis เพื่อไม่ให้ถูกรีเซ็ตตอน hot-reload ระหว่าง dev
 * ข้อมูลจะหายเมื่อรีสตาร์ท server — ใช้เพื่อลองใช้งานเท่านั้น
 */
type Store = { programs: Program[]; hub: HubSettings; audit: AuditEntry[] };
const g = globalThis as unknown as { __hub?: Store };

function freshSeed(): Program[] {
  return SEED_PROGRAMS.map((p) => ({
    ...p,
    links: p.links.map((l) => ({ ...l })),
    notes: (p.notes ?? []).map((n) => ({ ...n })),
    depts: [...(p.depts ?? [])],
  }));
}

// re-seed ถ้ายังว่าง หรือ shape เก่า — กัน globalThis ค้างข้าม HMR
const stale =
  !g.__hub ||
  g.__hub.programs.some(
    (p) => p.notes === undefined || p.claudeUrl === undefined || p.openCount === undefined || p.depts === undefined
  );
if (stale) {
  g.__hub = { programs: freshSeed(), hub: { ...DEFAULT_HUB }, audit: [] };
}

export const mockDb = {
  list(): Program[] {
    return [...g.__hub!.programs].sort((a, b) => a.sort - b.sort);
  },
  create(p: Omit<Program, "id">): Program {
    const item: Program = { ...p, id: `p-${Date.now()}` };
    g.__hub!.programs.push(item);
    return item;
  },
  update(id: string, patch: Partial<Program>): void {
    const i = g.__hub!.programs.findIndex((x) => x.id === id);
    if (i >= 0) g.__hub!.programs[i] = { ...g.__hub!.programs[i], ...patch, id };
  },
  remove(id: string): void {
    g.__hub!.programs = g.__hub!.programs.filter((x) => x.id !== id);
  },
  incrementOpen(id: string): void {
    const p = g.__hub!.programs.find((x) => x.id === id);
    if (p) p.openCount = (p.openCount ?? 0) + 1;
  },
  getHub(): HubSettings {
    return { ...g.__hub!.hub };
  },
  setHub(h: HubSettings): void {
    g.__hub!.hub = { ...h };
  },
  listAudit(): AuditEntry[] {
    return [...g.__hub!.audit];
  },
  addAudit(e: AuditEntry): void {
    g.__hub!.audit.unshift(e);
    g.__hub!.audit = g.__hub!.audit.slice(0, 100);
  },
};
