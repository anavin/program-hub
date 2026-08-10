import "server-only";
import { cookies } from "next/headers";
import { HAS_SUPABASE, MOCK_USERS, SESSION_COOKIE } from "./config";
import { getServerSupabase } from "./supabase/server";
import type { Role, SessionUser } from "./types";

/** อ่านผู้ใช้ปัจจุบันจาก session (คืน null ถ้ายังไม่ล็อกอิน) */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!HAS_SUPABASE) {
    const raw = cookies().get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    try {
      const u = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
      if (u?.email && u?.role) return u as SessionUser;
    } catch {
      /* cookie เสีย */
    }
    return null;
  }

  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // role จากตาราง profiles (ค่าเริ่มต้น = user)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, department")
    .eq("id", user.id)
    .maybeSingle();

  return {
    email: user.email ?? "",
    name: profile?.full_name || user.email?.split("@")[0] || "ผู้ใช้",
    role: (profile?.role as Role) === "admin" ? "admin" : "user",
    department: profile?.department || "",
  };
}

/** เข้าสู่ระบบ — คืน error message ถ้าไม่สำเร็จ, null ถ้าสำเร็จ */
export async function signIn(email: string, password: string): Promise<string | null> {
  if (!HAS_SUPABASE) {
    const found = MOCK_USERS.find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password
    );
    if (!found) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    const payload: SessionUser = { email: found.email, name: found.name, role: found.role, department: found.department };
    cookies().set(SESSION_COOKIE, Buffer.from(JSON.stringify(payload)).toString("base64"), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return null;
  }

  const supabase = getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return error ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : null;
}

/** ออกจากระบบ */
export async function signOut(): Promise<void> {
  if (!HAS_SUPABASE) {
    cookies().delete(SESSION_COOKIE);
    return;
  }
  await getServerSupabase().auth.signOut();
}
