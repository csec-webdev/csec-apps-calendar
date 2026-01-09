import { NextResponse } from "next/server";
import { getJson, putJson } from "@/lib/s3";
import { requireRole } from "@/lib/requireAdmin";
import { TEAMS, TeamConfigSchema } from "@/lib/schemas";

type Params = Promise<{ teamKey: string }>;

// GET team configuration
export async function GET(req: Request, { params }: { params: Params }) {
  await requireRole();
  const { teamKey } = await params;

  if (!TEAMS.find((t) => t.key === teamKey)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  try {
    const key = `public/data/${teamKey}/team-config.json`;
    const config = await getJson<unknown>(key);

    if (!config) {
      // Return default empty config if none exists
      return NextResponse.json({ seasonId: "", apiUrl: "" });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error(`Error fetching team config for ${teamKey}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST/PUT team configuration
export async function POST(req: Request, { params }: { params: Params }) {
  const { role } = await requireRole();
  const { teamKey } = await params;

  if (role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!TEAMS.find((t) => t.key === teamKey)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validated = TeamConfigSchema.parse(body);

    // Add timestamp
    validated.lastUpdated = new Date().toISOString();

    const key = `public/data/${teamKey}/team-config.json`;
    await putJson(key, validated);

    return NextResponse.json({ success: true, config: validated });
  } catch (error: any) {
    console.error(`Error updating team config for ${teamKey}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

