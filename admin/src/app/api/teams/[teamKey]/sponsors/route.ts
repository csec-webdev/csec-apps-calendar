import { NextResponse } from "next/server";
import { getJson, putJson } from "@/lib/s3";
import { requireRole } from "@/lib/requireAdmin";
import { SponsorsDataSchema, TEAMS } from "@/lib/schemas";
import { invalidateCache } from "@/lib/cloudfront";

type Params = Promise<{ teamKey: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
  await requireRole();
  const { teamKey } = await params;

  if (!TEAMS.find((t) => t.key === teamKey)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  const key = `public/data/${teamKey}/sponsors.json`;
  const data = await getJson<unknown>(key);

  return NextResponse.json(
    data ?? { comment: "Sponsor data for game modals", sponsors: {} },
  );
}

export async function POST(req: Request, { params }: { params: Params }) {
  await requireRole();
  const { teamKey } = await params;

  if (!TEAMS.find((t) => t.key === teamKey)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  const body = await req.json();
  const validated = SponsorsDataSchema.parse(body);

  const key = `public/data/${teamKey}/sponsors.json`;
  await putJson(key, validated);

  // Invalidate CloudFront cache
  await invalidateCache([`/data/${teamKey}/sponsors.json`]);

  return NextResponse.json({ success: true });
}

