import { NextResponse } from "next/server";
import { getJson } from "@/lib/s3";
import { requireRole } from "@/lib/requireAdmin";
import { TEAMS } from "@/lib/schemas";

type Params = Promise<{ teamKey: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
  await requireRole();
  const { teamKey } = await params;

  if (!TEAMS.find((t) => t.key === teamKey)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  const key = `public/data/${teamKey}/schedule.json`;
  const data = await getJson<unknown>(key);

  if (!data) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  // Return as downloadable JSON file
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${teamKey}-schedule.json"`,
    },
  });
}

