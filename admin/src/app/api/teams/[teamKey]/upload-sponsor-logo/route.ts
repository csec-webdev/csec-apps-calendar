import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireAdmin";
import { TEAMS } from "@/lib/schemas";
import { uploadSponsorLogo } from "@/lib/upload";

type Params = Promise<{ teamKey: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
  await requireRole();
  const { teamKey } = await params;

  if (!TEAMS.find((t) => t.key === teamKey)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const url = await uploadSponsorLogo(teamKey, file);

  return NextResponse.json({ url });
}

