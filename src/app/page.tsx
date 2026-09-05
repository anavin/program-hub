import { getSessionUser } from "@/lib/auth";
import { listPrograms, getHubSettings, listAudit } from "@/lib/data";
import Hub from "@/components/Hub";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // เปิดสาธารณะ — ไม่บังคับ login (user เป็น null = ผู้ชมทั่วไป)
  const user = await getSessionUser();
  const isAdmin = user?.role === "admin";

  const [all, hub, audit] = await Promise.all([
    listPrograms(),
    getHubSettings(),
    isAdmin ? listAudit() : Promise.resolve([]),
  ]);

  // admin เห็นทุกอัน; ผู้ชม/ผู้ใช้ทั่วไปเห็นเฉพาะ visibility='all' + ตรงแผนก (ว่าง = ทุกคน)
  const dept = user?.department ?? "";
  const programs = isAdmin
    ? all
    : all.filter((p) => p.visibility === "all" && ((p.depts?.length ?? 0) === 0 || p.depts.includes(dept)));

  return <Hub user={user} programs={programs} hub={hub} audit={audit} />;
}
