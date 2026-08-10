"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CATEGORIES,
  DEPARTMENTS,
  ICON_CHOICES,
  STATUS_META,
  NOTE_KIND_META,
  type NoteKind,
  type Program,
  type ProgramLink,
  type ProgramNote,
  type SessionUser,
  type HubSettings,
  type AuditEntry,
} from "@/lib/types";
import {
  saveProgramAction,
  deleteProgramAction,
  saveNotesAction,
  signOutAction,
  trackOpenAction,
  checkHealthAction,
  saveHubSettingsAction,
} from "@/app/actions";
import Qr from "./Qr";

type Health = { ok: boolean; ms: number; note: string } | "loading";
const FAV_KEY = "hub-favorites";

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return "";
  }
}

const CHIP_CATS = ["ทั้งหมด", ...CATEGORIES];

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

type FormState = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: Program["status"];
  icon: string;
  visibility: Program["visibility"];
  owner: string;
  note: string;
  claudeUrl: string;
  logoUrl: string;
  depts: string[];
  sort: number;
  links: ProgramLink[];
};

const EMPTY_FORM: FormState = {
  id: "",
  name: "",
  description: "",
  category: "ปฏิบัติการ",
  status: "ok",
  icon: "📦",
  visibility: "all",
  owner: "",
  note: "",
  claudeUrl: "",
  logoUrl: "",
  depts: [],
  sort: 100,
  links: [{ label: "หลัก", url: "" }],
};

function ProgramIcon({ p, size = 46 }: { p: { logoUrl?: string; icon: string }; size?: number }) {
  if (p.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="app-icon app-logo" src={p.logoUrl} alt="" style={{ width: size, height: size }} />;
  }
  return <div className="app-icon" style={{ width: size, height: size, fontSize: size * 0.5 }}>{p.icon}</div>;
}

export default function Hub({
  user,
  programs,
  hub,
  audit,
}: {
  user: SessionUser;
  programs: Program[];
  hub: HubSettings;
  audit: AuditEntry[];
}) {
  const isAdmin = user.role === "admin";
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ทั้งหมด");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"default" | "popular">("default");

  // favorites (เก็บใน localStorage ต่อเครื่อง/ต่อคน)
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    try {
      setFavs(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
    } catch {
      setFavs([]);
    }
  }, []);
  function toggleFav(id: string) {
    setFavs((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  // health check per program
  const [health, setHealth] = useState<Record<string, Health>>({});
  function checkHealth(p: Program) {
    const url = p.links?.[0]?.url ?? "";
    setHealth((h) => ({ ...h, [p.id]: "loading" }));
    startTransition(async () => {
      const res = await checkHealthAction(url);
      setHealth((h) => ({ ...h, [p.id]: res }));
    });
  }

  // panels
  const [todoOpen, setTodoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "audit">("general");
  const [hubName, setHubName] = useState(hub.name);
  const [hubLogo, setHubLogo] = useState(hub.logoUrl);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ── detail drawer + notes ──
  const [detail, setDetail] = useState<Program | null>(null);
  const [notes, setNotes] = useState<ProgramNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteKind, setNoteKind] = useState<NoteKind>("info");

  function openDetail(p: Program) {
    setDetail({ ...p, links: p.links ?? [], notes: p.notes ?? [], claudeUrl: p.claudeUrl ?? "" });
    setNotes(p.notes ?? []);
    setNoteText("");
    setNoteKind("info");
  }

  function persistNotes(next: ProgramNote[]) {
    if (!detail) return;
    setNotes(next);
    const fd = new FormData();
    fd.set("id", detail.id);
    fd.set("name", detail.name);
    fd.set("notes", JSON.stringify(next));
    startTransition(async () => {
      try {
        await saveNotesAction(fd);
      } catch {
        /* ถ้าพลาด ค่อยเห็นตอน refresh */
      }
    });
  }

  function addNote() {
    const text = noteText.trim();
    if (!text) return;
    const note: ProgramNote = {
      id: `n-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
      text,
      kind: noteKind,
      at: new Date().toISOString(),
      by: user.name,
    };
    persistNotes([note, ...notes]);
    setNoteText("");
  }

  function delNote(id: string) {
    persistNotes(notes.filter((n) => n.id !== id));
  }

  const filtered = useMemo(() => {
    const list = programs.filter((p) => {
      if (cat !== "ทั้งหมด" && p.category !== cat) return false;
      if (q) {
        const hay = (p.name + p.description + p.category + p.owner).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    const favSet = new Set(favs);
    return [...list].sort((a, b) => {
      // ปักหมุดขึ้นก่อนเสมอ
      const fa = favSet.has(a.id) ? 0 : 1;
      const fb = favSet.has(b.id) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      if (sortMode === "popular") return (b.openCount ?? 0) - (a.openCount ?? 0);
      return a.sort - b.sort;
    });
  }, [programs, cat, q, favs, sortMode]);

  // งานที่ต้องทำ = โน๊ตชนิด todo จากทุกโปรแกรม
  const todos = useMemo(() => {
    const out: { program: Program; note: ProgramNote }[] = [];
    for (const p of programs) for (const n of p.notes ?? []) if (n.kind === "todo") out.push({ program: p, note: n });
    return out.sort((a, b) => (a.note.at < b.note.at ? 1 : -1));
  }, [programs]);

  const stats = useMemo(() => {
    const ok = programs.filter((p) => p.status === "ok").length;
    const warn = programs.length - ok;
    return { total: programs.length, ok, warn };
  }, [programs]);

  function toggleTheme() {
    const cur =
      theme ??
      (document.documentElement.getAttribute("data-theme") as "light" | "dark" | null) ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("hub-theme", next);
    } catch {}
    setTheme(next);
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormErr(null);
    setModalOpen(true);
  }
  function openEdit(p: Program) {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      status: p.status,
      icon: p.icon,
      visibility: p.visibility,
      owner: p.owner,
      note: p.note,
      claudeUrl: p.claudeUrl,
      logoUrl: p.logoUrl ?? "",
      depts: [...(p.depts ?? [])],
      sort: p.sort,
      links: p.links.length ? p.links.map((l) => ({ ...l })) : [{ label: "หลัก", url: "" }],
    });
    setFormErr(null);
    setModalOpen(true);
  }

  function submit() {
    if (!form.name.trim()) {
      setFormErr("กรุณาใส่ชื่อโปรแกรม");
      return;
    }
    const fd = new FormData();
    fd.set("id", form.id);
    fd.set("name", form.name);
    fd.set("description", form.description);
    fd.set("category", form.category);
    fd.set("status", form.status);
    fd.set("icon", form.icon);
    fd.set("visibility", form.visibility);
    fd.set("owner", form.owner);
    fd.set("note", form.note);
    fd.set("claudeUrl", form.claudeUrl);
    fd.set("logoUrl", form.logoUrl);
    fd.set("depts", JSON.stringify(form.depts));
    fd.set("sort", String(form.sort));
    fd.set("links", JSON.stringify(form.links));
    startTransition(async () => {
      try {
        await saveProgramAction(fd);
        setModalOpen(false);
      } catch (e) {
        setFormErr(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      }
    });
  }

  function del(p: Program) {
    if (!confirm(`ลบ “${p.name}” ?`)) return;
    const fd = new FormData();
    fd.set("id", p.id);
    fd.set("name", p.name);
    startTransition(async () => {
      await deleteProgramAction(fd);
    });
  }

  // นับการเปิด (ไม่บล็อกการนำทาง)
  function trackOpen(id: string) {
    startTransition(async () => {
      try {
        await trackOpenAction(id);
      } catch {}
    });
  }

  function saveHub() {
    const fd = new FormData();
    fd.set("name", hubName);
    fd.set("logoUrl", hubLogo);
    startTransition(async () => {
      try {
        await saveHubSettingsAction(fd);
        setSettingsOpen(false);
      } catch {}
    });
  }

  // อ่านไฟล์รูปเป็น data URL (สำหรับอัปโหลดโลโก้)
  function readImage(file: File, onDone: (dataUrl: string) => void) {
    if (file.size > 400 * 1024) {
      alert("ไฟล์ใหญ่เกิน 400KB — กรุณาย่อรูปก่อน");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onDone(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  const avatarLetter = (user.name || "?").trim()[0] ?? "?";

  return (
    <div onClick={() => setOpenMenu(null)}>
      {/* ── Top bar ── */}
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="brand">
            {hub.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="brand-logo" src={hub.logoUrl} alt="" style={{ objectFit: "cover" }} />
            ) : (
              <div className="brand-logo">🧭</div>
            )}
            <div>
              <div className="brand-name">{hub.name}</div>
              <div className="brand-tag">Program Hub</div>
            </div>
          </div>
          <div className="search">
            <svg className="sicon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาโปรแกรม เช่น PO, ใบเบิก, การตลาด…"
              autoComplete="off"
            />
          </div>
          <div className="top-actions">
            {todos.length > 0 && (
              <button className="icon-btn" onClick={() => setTodoOpen(true)} title="งานที่ต้องทำ" type="button" style={{ position: "relative" }}>
                ✅<span className="dot-badge">{todos.length}</span>
              </button>
            )}
            {isAdmin && (
              <button className="icon-btn" onClick={() => { setHubName(hub.name); setHubLogo(hub.logoUrl); setSettingsTab("general"); setSettingsOpen(true); }} title="ตั้งค่า Hub" type="button">⚙️</button>
            )}
            <button className="icon-btn" onClick={toggleTheme} title="สลับธีม" type="button">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <div className="user-pill">
              <div className="avatar">{avatarLetter}</div>
              <div className="user-meta">
                <div className="user-name">{user.name}</div>
                <div className="user-role">{(isAdmin ? "ผู้ดูแลระบบ" : "พนักงาน") + (user.department ? ` · ${user.department}` : "")}</div>
              </div>
            </div>
            <form action={signOutAction}>
              <button className="icon-btn" title="ออกจากระบบ" type="submit">🚪</button>
            </form>
          </div>
        </div>
      </header>

      <div className="wrap">
        {/* ── Hero ── */}
        <section className="hero">
          <div className="hero-row">
            <div>
              <h1>ศูนย์รวมโปรแกรมทั้งหมด</h1>
              <p>
                {isAdmin
                  ? "จัดการโปรแกรม ลิงก์ และสิทธิ์การมองเห็นทั้งหมด"
                  : "เลือกโปรแกรมที่ต้องการใช้งานได้จากที่นี่ที่เดียว"}
              </p>
            </div>
            <div className="stat-row">
              <div className="stat">
                <div className="stat-n">{stats.total}</div>
                <div className="stat-l">โปรแกรม</div>
              </div>
              <div className="stat">
                <div className="stat-n ok">{stats.ok}</div>
                <div className="stat-l">ใช้งานได้</div>
              </div>
              {stats.warn > 0 && (
                <div className="stat">
                  <div className="stat-n warn">{stats.warn}</div>
                  <div className="stat-l">ปรับปรุง</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {isAdmin && (
          <div className="admin-banner">
            🛠️ โหมดผู้ดูแล — เพิ่ม แก้ไข หรือลบโปรแกรม และตั้งค่าการมองเห็นของแต่ละตัว
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="toolbar">
          <div className="chips">
            {CHIP_CATS.map((c) => {
              const n =
                c === "ทั้งหมด"
                  ? programs.length
                  : programs.filter((p) => p.category === c).length;
              if (c !== "ทั้งหมด" && n === 0) return null;
              return (
                <button
                  key={c}
                  className={`chip ${cat === c ? "active" : ""}`}
                  onClick={() => setCat(c)}
                  type="button"
                >
                  {c}
                  <span className="cnt">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="spacer" />
          <select className="note-kind-select" value={sortMode} onChange={(e) => setSortMode(e.target.value as "default" | "popular")} title="จัดเรียง">
            <option value="default">เรียง: แนะนำ</option>
            <option value="popular">เรียง: ใช้บ่อย</option>
          </select>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openAdd} type="button">
              ＋ เพิ่มโปรแกรม
            </button>
          )}
          <div className="seg">
            <button className={view === "grid" ? "on" : ""} onClick={() => setView("grid")} type="button" title="การ์ด">▦</button>
            <button className={view === "list" ? "on" : ""} onClick={() => setView("list")} type="button" title="รายการ">☰</button>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className={`grid ${view === "list" ? "list" : ""}`}>
          {filtered.length === 0 && (
            <div className="empty">
              <div className="em-ico">🔍</div>
              <p>ไม่พบโปรแกรมที่ตรงกับเงื่อนไข</p>
            </div>
          )}
          {filtered.map((p) => {
            const meta = STATUS_META[p.status] ?? STATUS_META.ok;
            const plinks = p.links ?? [];
            const first = plinks[0] ?? { label: "เปิด", url: "#" };
            const more = plinks.length > 1;
            return (
              <div key={p.id} className={`card ${p.status !== "ok" ? "dim" : ""}`}>
                <div className="card-admin">
                  <button
                    className={`mini-btn star ${favs.includes(p.id) ? "on" : ""}`}
                    onClick={() => toggleFav(p.id)}
                    title={favs.includes(p.id) ? "เลิกปักหมุด" : "ปักหมุด"}
                    type="button"
                  >
                    {favs.includes(p.id) ? "★" : "☆"}
                  </button>
                  {isAdmin && (
                    <>
                      <button className="mini-btn" onClick={() => openEdit(p)} title="แก้ไข" type="button">✎</button>
                      <button className="mini-btn del" onClick={() => del(p)} title="ลบ" type="button">🗑</button>
                    </>
                  )}
                </div>
                <div className="card-body-btn" onClick={() => openDetail(p)} title="ดูรายละเอียด + โน๊ต">
                  <div className="card-top">
                    <ProgramIcon p={p} />
                    <div className="card-head">
                      <div className="card-title">
                        {p.name}
                        {p.visibility === "admin" && <span className="badge b-lock">🔒 admin</span>}
                      </div>
                      <div className="card-cat">{p.category}</div>
                    </div>
                  </div>
                  <div className="card-mid">
                    <div className="card-desc">{p.description}</div>
                    {p.note && <div className="card-note">⚠️ {p.note}</div>}
                  </div>
                </div>
                <div className="card-foot">
                  <span className={`badge ${meta.badge}`}>
                    <span className={`status-dot ${meta.dot}`} />
                    {meta.label}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {(p.openCount ?? 0) > 0 && <span className="notes-pill" title="เปิดไปแล้ว">🔥 {p.openCount}</span>}
                    {(p.notes?.length ?? 0) > 0 && <span className="notes-pill">📝 {p.notes.length}</span>}
                    <span className="owner">
                      <span className="dot">{(p.owner || "?")[0]}</span>
                      {p.owner || "—"}
                    </span>
                  </span>
                </div>
                <div className="card-actions">
                  <a className="btn btn-primary open-btn" href={first.url} target="_blank" rel="noopener noreferrer" onClick={() => trackOpen(p.id)}>
                    เปิด {more ? "" : "↗"}
                  </a>
                  {more && (
                    <div className="link-menu-wrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                      >
                        ▾
                      </button>
                      {openMenu === p.id && (
                        <div className="link-menu">
                          {plinks.map((l, i) => (
                            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">
                              ↗ {l.label || "ลิงก์"}
                              <span className="lk-tag">{hostOf(l.url)}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detail drawer ── */}
      {detail && (
        <div className="drawer-bg" onClick={() => setDetail(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <ProgramIcon p={detail} size={52} />
              <div className="drawer-title">
                <h2>{detail.name}</h2>
                <div className="sub">
                  {detail.category}
                  {detail.visibility === "admin" && " · 🔒 admin เท่านั้น"}
                </div>
              </div>
              <button
                className={`mini-btn star ${favs.includes(detail.id) ? "on" : ""}`}
                onClick={() => toggleFav(detail.id)}
                title="ปักหมุด"
                type="button"
              >
                {favs.includes(detail.id) ? "★" : "☆"}
              </button>
              <button className="icon-btn" onClick={() => setDetail(null)} type="button">✕</button>
            </div>

            <div className="drawer-body">
              {detail.description && <div className="drawer-desc">{detail.description}</div>}

              <div className="meta-grid">
                <div className="meta-item">
                  <div className="k">สถานะ</div>
                  <div className="v">{STATUS_META[detail.status].label}</div>
                </div>
                <div className="meta-item">
                  <div className="k">เจ้าของ</div>
                  <div className="v">{detail.owner || "—"}</div>
                </div>
                <div className="meta-item">
                  <div className="k">เปิดไปแล้ว</div>
                  <div className="v">{detail.openCount ?? 0} ครั้ง</div>
                </div>
                <div className="meta-item">
                  <div className="k">การมองเห็น</div>
                  <div className="v">
                    {detail.visibility === "admin"
                      ? "admin เท่านั้น"
                      : (detail.depts?.length ?? 0) > 0
                      ? detail.depts.join(", ")
                      : "ทุกคน"}
                  </div>
                </div>
              </div>

              {detail.note && <div className="card-note">⚠️ {detail.note}</div>}

              <div>
                <div className="drawer-section-h">
                  🔗 ลิงก์
                  <div className="spacer" />
                  <button className="btn" type="button" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={() => checkHealth(detail)} disabled={health[detail.id] === "loading"}>
                    {health[detail.id] === "loading" ? "กำลังตรวจ…" : "🔄 ตรวจสถานะ"}
                  </button>
                </div>
                {health[detail.id] && health[detail.id] !== "loading" && (
                  <div className={`health ${(health[detail.id] as { ok: boolean }).ok ? "up" : "down"}`}>
                    {(health[detail.id] as { ok: boolean }).ok ? "🟢 ออนไลน์" : "🔴 เข้าไม่ได้"} ·{" "}
                    {(health[detail.id] as { note: string; ms: number }).note}
                    {(health[detail.id] as { ms: number }).ms ? ` · ${(health[detail.id] as { ms: number }).ms}ms` : ""}
                  </div>
                )}
                <div className="drawer-links" style={{ marginTop: 8 }}>
                  {detail.links.map((l, i) => (
                    <a key={i} className="drawer-link" href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => i === 0 && trackOpen(detail.id)}>
                      ↗ {l.label || "ลิงก์"}
                      <span className="lk-host">{hostOf(l.url)}</span>
                    </a>
                  ))}
                  {detail.claudeUrl && (
                    <a className="drawer-link" href={detail.claudeUrl} target="_blank" rel="noopener noreferrer" style={{ borderColor: "var(--lock)", color: "var(--lock)" }}>
                      ✨ เปิดโปรเจกต์ใน Claude
                      <span className="lk-host">{hostOf(detail.claudeUrl)}</span>
                    </a>
                  )}
                </div>
              </div>

              {detail.links[0]?.url && /^https?:\/\//i.test(detail.links[0].url) && (
                <div className="qr-box">
                  <Qr value={detail.links[0].url} />
                  <div className="qr-cap">📱 สแกนเปิดบนมือถือ</div>
                </div>
              )}

              <div>
                <div className="drawer-section-h">📝 โน๊ต / บันทึก <span className="notes-pill">{notes.length}</span></div>

                {isAdmin && (
                  <div className="note-composer" style={{ marginTop: 8 }}>
                    <textarea
                      rows={2}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="เพิ่มโน๊ต เช่น อัปเดตล่าสุด, วิธีใช้, ที่เก็บรหัส, สิ่งที่ต้องทำ…"
                    />
                    <div className="note-composer-row">
                      <select className="note-kind-select" value={noteKind} onChange={(e) => setNoteKind(e.target.value as NoteKind)}>
                        {(Object.keys(NOTE_KIND_META) as NoteKind[]).map((k) => (
                          <option key={k} value={k}>{NOTE_KIND_META[k].icon} {NOTE_KIND_META[k].label}</option>
                        ))}
                      </select>
                      <div className="spacer" />
                      <button className="btn btn-primary" type="button" onClick={addNote} disabled={pending || !noteText.trim()}>
                        ＋ เพิ่มโน๊ต
                      </button>
                    </div>
                  </div>
                )}

                <div className="notes-list" style={{ marginTop: 10 }}>
                  {notes.length === 0 && <div className="note-empty">ยังไม่มีโน๊ต</div>}
                  {notes.map((n) => {
                    const km = NOTE_KIND_META[n.kind] ?? NOTE_KIND_META.info;
                    return (
                      <div key={n.id} className={`note-item ${km.cls}`}>
                        {isAdmin && (
                          <button className="note-del" type="button" onClick={() => delNote(n.id)} title="ลบโน๊ต">✕</button>
                        )}
                        <div className="note-top">
                          <span className="note-kind">{km.icon} {km.label}</span>
                          <span className="note-meta">{n.by} · {fmtWhen(n.at)}</span>
                        </div>
                        <div className="note-text">{n.text}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="drawer-foot">
              <a className="btn btn-primary" href={detail.links[0]?.url ?? "#"} target="_blank" rel="noopener noreferrer" onClick={() => trackOpen(detail.id)}>
                เปิดโปรแกรม ↗
              </a>
              {isAdmin && (
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    const p = detail;
                    setDetail(null);
                    openEdit(p);
                  }}
                >
                  ✎ แก้ไขข้อมูล
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal (admin) ── */}
      {modalOpen && (
        <div className="modal-bg" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{form.id ? "แก้ไขโปรแกรม" : "เพิ่มโปรแกรมใหม่"}</h3>
              <button className="icon-btn" onClick={() => setModalOpen(false)} type="button">✕</button>
            </div>
            <div className="modal-body">
              {formErr && <div className="login-err">⚠️ {formErr}</div>}
              <div className="field">
                <label>ชื่อโปรแกรม <span className="req">*</span></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น ระบบใบสั่งซื้อ PO Pro" />
              </div>
              <div className="field">
                <label>คำอธิบายสั้น</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="โปรแกรมนี้ใช้ทำอะไร" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>หมวดหมู่</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>สถานะ</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Program["status"] })}>
                    <option value="ok">🟢 ใช้งานได้</option>
                    <option value="warn">🟡 ปิดปรับปรุง</option>
                    <option value="off">🔴 ปิดใช้งาน</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>ไอคอน / โลโก้</label>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div className="icon-picker" style={{ flex: 1 }}>
                    {Array.from(new Set(ICON_CHOICES)).map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        className={`icon-opt ${!form.logoUrl && form.icon === ic ? "sel" : ""}`}
                        onClick={() => setForm({ ...form, icon: ic, logoUrl: "" })}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                    <ProgramIcon p={form} size={46} />
                    <label className="btn" style={{ padding: "6px 10px", fontSize: 11.5, cursor: "pointer" }}>
                      🖼️ อัปโหลด
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) readImage(f, (url) => setForm((cur) => ({ ...cur, logoUrl: url })));
                        }}
                      />
                    </label>
                    {form.logoUrl && (
                      <button className="btn" type="button" style={{ padding: "5px 9px", fontSize: 11 }} onClick={() => setForm({ ...form, logoUrl: "" })}>
                        ใช้ emoji แทน
                      </button>
                    )}
                  </div>
                </div>
                <div className="hint">อัปโหลดโลโก้จริง (≤400KB) หรือเลือก emoji</div>
              </div>
              <div className="field">
                <label>ลิงก์ (URL) — ใส่ได้หลายอัน</label>
                <div className="url-list">
                  {form.links.map((l, i) => (
                    <div className="url-row" key={i}>
                      <input
                        placeholder="ป้าย"
                        value={l.label}
                        onChange={(e) => {
                          const links = [...form.links];
                          links[i] = { ...links[i], label: e.target.value };
                          setForm({ ...form, links });
                        }}
                      />
                      <input
                        placeholder="https://…"
                        value={l.url}
                        onChange={(e) => {
                          const links = [...form.links];
                          links[i] = { ...links[i], url: e.target.value };
                          setForm({ ...form, links });
                        }}
                      />
                      <button
                        className="mini-btn del"
                        type="button"
                        onClick={() => setForm({ ...form, links: form.links.filter((_, j) => j !== i) })}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button className="btn add-url" type="button" onClick={() => setForm({ ...form, links: [...form.links, { label: "", url: "" }] })}>
                  ＋ เพิ่มลิงก์
                </button>
                <div className="hint">ป้ายกำกับ เช่น หลัก, ทดสอบ, คู่มือ — ลิงก์แรกจะเป็นปุ่ม “เปิด”</div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>เจ้าของ / ผู้ดูแล</label>
                  <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="เช่น ทีมจัดซื้อ" />
                </div>
                <div className="field">
                  <label>ใครเห็นได้บ้าง</label>
                  <div className="seg-vis">
                    <button type="button" className={form.visibility === "all" ? "on" : ""} onClick={() => setForm({ ...form, visibility: "all" })}>👥 ทุกคน</button>
                    <button type="button" className={form.visibility === "admin" ? "on" : ""} onClick={() => setForm({ ...form, visibility: "admin" })}>🔒 admin</button>
                  </div>
                </div>
              </div>
              {form.visibility === "all" && (
                <div className="field">
                  <label>จำกัดเฉพาะแผนก (ไม่เลือก = ทุกคนเห็น)</label>
                  <div className="dept-picker">
                    {DEPARTMENTS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`chip ${form.depts.includes(d) ? "active" : ""}`}
                        onClick={() =>
                          setForm({
                            ...form,
                            depts: form.depts.includes(d) ? form.depts.filter((x) => x !== d) : [...form.depts, d],
                          })
                        }
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="field-row">
                <div className="field">
                  <label>หมายเหตุ (ภายใน)</label>
                  <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="เช่น ต้อง VPN ก่อนเข้า" />
                </div>
                <div className="field">
                  <label>ลำดับการแสดง</label>
                  <input type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
                </div>
              </div>
              <div className="field">
                <label>✨ ลิงก์โปรเจกต์ Claude (ที่ใช้สร้าง/แก้โปรแกรมนี้)</label>
                <input value={form.claudeUrl} onChange={(e) => setForm({ ...form, claudeUrl: e.target.value })} placeholder="https://claude.ai/…" />
                <div className="hint">ไว้กระโดดกลับไปแก้โค้ดตัวนี้ใน Claude ได้เร็ว</div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModalOpen(false)} type="button">ยกเลิก</button>
              <button className="btn btn-primary" onClick={submit} type="button" disabled={pending}>
                {pending ? "กำลังบันทึก…" : "บันทึกโปรแกรม"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Todo panel ── */}
      {todoOpen && (
        <div className="modal-bg" onClick={() => setTodoOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>✅ งานที่ต้องทำ ({todos.length})</h3>
              <button className="icon-btn" onClick={() => setTodoOpen(false)} type="button">✕</button>
            </div>
            <div className="modal-body">
              {todos.length === 0 && <div className="note-empty">ไม่มีงานค้าง 🎉</div>}
              {todos.map(({ program, note }) => (
                <div
                  key={note.id}
                  className="note-item nk-todo"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setTodoOpen(false);
                    openDetail(program);
                  }}
                >
                  <div className="note-top">
                    <span className="note-kind">{program.icon} {program.name}</span>
                    <span className="note-meta">{note.by} · {fmtWhen(note.at)}</span>
                  </div>
                  <div className="note-text">{note.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Settings + audit (admin) ── */}
      {settingsOpen && isAdmin && (
        <div className="modal-bg" onClick={() => setSettingsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>⚙️ ตั้งค่า Hub</h3>
              <button className="icon-btn" onClick={() => setSettingsOpen(false)} type="button">✕</button>
            </div>
            <div className="seg" style={{ margin: "12px 22px 0" }}>
              <button className={settingsTab === "general" ? "on" : ""} onClick={() => setSettingsTab("general")} type="button">ทั่วไป</button>
              <button className={settingsTab === "audit" ? "on" : ""} onClick={() => setSettingsTab("audit")} type="button">📜 ประวัติการแก้ไข</button>
            </div>
            <div className="modal-body">
              {settingsTab === "general" ? (
                <>
                  <div className="field">
                    <label>ชื่อองค์กร / Hub</label>
                    <input value={hubName} onChange={(e) => setHubName(e.target.value)} placeholder="Lab Parfumo" />
                  </div>
                  <div className="field">
                    <label>โลโก้องค์กร</label>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {hubLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={hubLogo} alt="" style={{ width: 46, height: 46, borderRadius: 11, objectFit: "cover", border: "1px solid var(--border)" }} />
                      ) : (
                        <div className="brand-logo">🧭</div>
                      )}
                      <label className="btn" style={{ cursor: "pointer" }}>
                        🖼️ อัปโหลด
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) readImage(f, setHubLogo); }} />
                      </label>
                      {hubLogo && <button className="btn" type="button" onClick={() => setHubLogo("")}>ลบโลโก้</button>}
                    </div>
                    <div className="hint">โลโก้ ≤400KB — แสดงมุมซ้ายบนของ Hub</div>
                  </div>
                </>
              ) : (
                <div className="notes-list">
                  {audit.length === 0 && <div className="note-empty">ยังไม่มีประวัติ</div>}
                  {audit.map((a) => (
                    <div key={a.id} className="audit-row">
                      <span className="audit-act">{a.action}</span>
                      <span className="audit-target">{a.target}</span>
                      <span className="audit-meta">{a.by} · {fmtWhen(a.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {settingsTab === "general" && (
              <div className="modal-foot">
                <button className="btn" onClick={() => setSettingsOpen(false)} type="button">ยกเลิก</button>
                <button className="btn btn-primary" onClick={saveHub} type="button" disabled={pending}>
                  {pending ? "กำลังบันทึก…" : "บันทึกตั้งค่า"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
