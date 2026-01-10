import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireAdmin";
import { getJson } from "@/lib/s3";

interface TokenCache {
  token: string;
  expiresAt: number;
}

const TOKEN_CACHE_KEY = "private/auth0-token-cache.json";

export async function GET() {
  try {
    await requireRole();

    const cachedData = await getJson<Record<string, TokenCache>>(TOKEN_CACHE_KEY);
    
    if (!cachedData) {
      return NextResponse.json({ 
        cached: false, 
        message: "No token cache found in S3" 
      });
    }

    const tokens = Object.entries(cachedData).map(([key, data]) => ({
      key,
      expiresAt: new Date(data.expiresAt).toISOString(),
      isValid: data.expiresAt > Date.now(),
      minutesUntilExpiry: Math.round((data.expiresAt - Date.now()) / 1000 / 60),
    }));

    return NextResponse.json({ 
      cached: true, 
      tokens,
      currentTime: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
