import Link from "next/link";
import { requireRole } from "@/lib/requireAdmin";
import { AccessClient } from "./AccessClient";

export default async function AccessPage() {
  const { allow, role } = await requireRole();

  return (
    <>
      <div style={{ maxWidth: 900, margin: "16px auto 0", padding: "0 16px" }}>
        <Link href="/admin">← Back</Link>
      </div>
      <AccessClient initialAllow={allow} role={role} />
    </>
  );
}


