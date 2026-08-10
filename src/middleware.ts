import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { HAS_SUPABASE, SESSION_COOKIE, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // ── โหมด mock: เช็คแค่ cookie ตัวอย่าง ──
  if (!HAS_SUPABASE) {
    const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
    if (!hasSession && !isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (hasSession && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // ── โหมด Supabase: refresh session + guard ──
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
