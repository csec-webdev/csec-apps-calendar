import { NextResponse } from "next/server";
import { getJson, putJson } from "@/lib/s3";
import { requireRole } from "@/lib/requireAdmin";
import { CustomTicketsDataSchema, TEAMS } from "@/lib/schemas";
import { invalidateCache } from "@/lib/cloudfront";

type Params = Promise<{ teamKey: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
  await requireRole();
  const { teamKey } = await params;

  if (!TEAMS.find((t) => t.key === teamKey)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  const key = `public/data/${teamKey}/custom-tickets.json`;
  const data = await getJson<unknown>(key);

  return NextResponse.json(
    data ?? { comment: "Custom ticket links override API links", customLinks: {} },
  );
}

export async function POST(req: Request, { params }: { params: Params }) {
  await requireRole();
  const { teamKey } = await params;

  if (!TEAMS.find((t) => t.key === teamKey)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  const body = await req.json();
  const validated = CustomTicketsDataSchema.parse(body);

  const key = `public/data/${teamKey}/custom-tickets.json`;
  await putJson(key, validated);

  // Invalidate CloudFront cache
  await invalidateCache([`/data/${teamKey}/custom-tickets.json`]);

  return NextResponse.json({ success: true });
}

