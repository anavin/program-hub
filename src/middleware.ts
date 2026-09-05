import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { HAS_SUPABASE, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

/**
 * เปิดสาธารณะ — ไม่บังคับ login เข้าหน้าเว็บ
 * middleware แค่รีเฟรช session ของ Supabase (ถ้ามี) ให้ token ไม่หมดอายุ
 * การล็อกอินทำผ่านปุ่ม/โมดัลในหน้าเว็บ ไม่มีการ redirect
 */
export async function middleware(request: NextRequest) {
  if (!HAS_SUPABASE) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
