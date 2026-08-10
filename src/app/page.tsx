import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listPrograms, getHubSettings, listAudit } from "@/lib/data";
import Hub from "@/components/Hub";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [all, hub, audit] = await Promise.all([
    listPrograms(),
    getHubSettings(),
    user.role === "admin" ? listAudit() : Promise.resolve([]),
  ]);

  // กรองฝั่ง server: admin เห็นทุกอัน; คนอื่นเห็นเฉพาะ visibility='all'
  // และถ้าโปรแกรมกำหนดแผนกไว้ ต้องอยู่ในแผนกนั้น (ว่าง = ทุกคน)
  const programs =
    user.role === "admin"
      ? all
      : all.filter(
          (p) =>
            p.visibility === "all" &&
            ((p.depts?.length ?? 0) === 0 || p.depts.includes(user.department))
        );

  return <Hub user={user} programs={programs} hub={hub} audit={audit} />;
}
