import { NextResponse } from "next/server";
import { AllowListSchema, normalizeAllowList, roleForEmail } from "@/lib/allowlist";
import { getJson, putJson } from "@/lib/s3";
import { getSession } from "@/lib/session";

const ALLOWLIST_KEY = "allowed-emails.json";

export async function GET() {
  const session = await getSession();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await getJson<unknown>(ALLOWLIST_KEY);
  const allow = normalizeAllowList(AllowListSchema.parse(raw ?? { superAdmins: [], admins: [] }));

  const role = roleForEmail(allow, email);
  if (role === "none") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ allow, role });
}

export async function POST(req: Request) {
  const session = await getSession();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentRaw = await getJson<unknown>(ALLOWLIST_KEY);
  const current = normalizeAllowList(AllowListSchema.parse(currentRaw ?? { superAdmins: [], admins: [] }));

  const role = roleForEmail(current, email);
  if (role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const next = normalizeAllowList(AllowListSchema.parse(body?.allow ?? body));

  // Guardrail: must keep at least one SuperAdmin
  if (!next.superAdmins || next.superAdmins.length < 1) {
    return NextResponse.json(
      { error: "At least one SuperAdmin is required." },
      { status: 400 },
    );
  }

  // Optional sanity: ensure the current caller doesn't accidentally remove themselves
  // If you want to allow it, remove this check.
  if (!next.superAdmins.includes(email)) {
    return NextResponse.json(
      { error: "You must remain a SuperAdmin (safety rule)." },
      { status: 400 },
    );
  }

  await putJson(ALLOWLIST_KEY, next);
  return NextResponse.json({ success: true, allow: next });
}


