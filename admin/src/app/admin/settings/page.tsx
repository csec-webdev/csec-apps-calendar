import { requireRole } from "@/lib/requireAdmin";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  await requireRole();
  return <SettingsClient />;
}

