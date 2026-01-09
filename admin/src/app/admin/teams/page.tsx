import { requireRole } from "@/lib/requireAdmin";
import { TeamsClient } from "./TeamsClient";

export default async function TeamsPage() {
  await requireRole();
  return <TeamsClient />;
}

