"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInAction } from "../actions";
import { HAS_SUPABASE } from "@/lib/config";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending} style={{ justifyContent: "center", padding: "11px" }}>
      {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(signInAction, { error: null });

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-logo">🧭</div>
          <div>
            <h1>Lab Parfumo Hub</h1>
            <p>ศูนย์รวมโปรแกรมทั้งหมด</p>
          </div>
        </div>

        <form className="login-form" action={formAction}>
          {state.error && <div className="login-err">⚠️ {state.error}</div>}
          <div className="field">
            <label>อีเมล</label>
            <input name="email" type="email" placeholder="you@labparfumo.com" autoComplete="email" required />
          </div>
          <div className="field">
            <label>รหัสผ่าน</label>
            <input name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
          </div>
          <SubmitButton />
        </form>

        {!HAS_SUPABASE && (
          <div className="login-hint">
            <span className="demo-flag">โหมดตัวอย่าง</span> ยังไม่ได้ตั้งค่า Supabase — ลองล็อกอินด้วย:
            <br />
            แอดมิน: <code>admin@labparfumo.local</code> / <code>admin1234</code>
            <br />
            พนักงาน: <code>user@labparfumo.local</code> / <code>user1234</code>
          </div>
        )}
      </div>
    </div>
  );
}
