import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/**
 * Supabase client ฝั่ง server (อ่าน/เขียน cookie session)
 * เรียกใน Server Component / Server Action / Route Handler เท่านั้น
 */
export function getServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: "program_hub" },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // เรียกจาก Server Component — ปล่อยผ่าน (middleware จัดการ refresh ให้)
        }
      },
    },
  });
}
