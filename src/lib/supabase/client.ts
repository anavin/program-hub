import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/** Supabase client ฝั่ง browser (ใช้ใน 'use client' component) */
export function getBrowserSupabase() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: "program_hub" },
  });
}
