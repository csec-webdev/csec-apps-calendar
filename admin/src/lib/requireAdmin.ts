import { redirect } from "next/navigation";
import { AllowListSchema, roleForEmail } from "@/lib/allowlist";
import { getJson } from "@/lib/s3";
import { getSession } from "@/lib/session";

const ALLOWLIST_KEY = "allowed-emails.json";

export async function requireSignedIn() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/api/auth/signin");
  return session;
}

export async function requireRole() {
  const session = await requireSignedIn();
  const allowRaw = await getJson<unknown>(ALLOWLIST_KEY);
  const allow = AllowListSchema.parse(allowRaw ?? { superAdmins: [], admins: [] });

  // session.user is guaranteed to exist after requireSignedIn()
  if (!session.user?.email) redirect("/api/auth/signin");
  
  const role = roleForEmail(allow, session.user.email);
  if (role === "none") redirect("/unauthorized");

  return { session, allow, role };
}


