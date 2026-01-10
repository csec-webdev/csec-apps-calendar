import { getJson, putJson } from "./s3";

/**
 * Persistent Auth0 token cache for Champion Data API
 * Stores tokens in S3 to survive serverless cold starts
 */

interface TokenCache {
  token: string;
  expiresAt: number;
}

const TOKEN_CACHE_KEY = "private/auth0-token-cache.json";

/**
 * Get OAuth2 access token for Champion Data API via Auth0
 * Uses S3-backed persistent cache to minimize token requests
 */
export async function getChampionDataAccessToken(
  authDomain: string,
  audience: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const cacheKey = `${authDomain}:${clientId}`;

  try {
    // Try to get cached token from S3
    const cachedData = await getJson<Record<string, TokenCache>>(TOKEN_CACHE_KEY);
    const cached = cachedData?.[cacheKey];
    
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`✅ Using cached Auth0 token (expires in ${Math.round((cached.expiresAt - Date.now()) / 1000 / 60)} minutes)`);
      return cached.token;
    }
  } catch (error) {
    // Cache doesn't exist or is invalid, continue to request new token
    console.log("No valid cached token found, requesting new one...");
  }

  // Request new token from Auth0
  const tokenUrl = `${authDomain}/oauth/token`;
  console.log(`🔄 Requesting new Auth0 token from: ${tokenUrl}`);

  const formData = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    audience: audience,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Auth0 token request failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("No access_token in Auth0 response");
  }

  // Cache the token (expires in seconds, typically 86400 = 24 hours)
  const expiresIn = data.expires_in || 86400;
  const expiresAt = Date.now() + (expiresIn - 300) * 1000; // Refresh 5 minutes early

  // Store in S3
  try {
    const cacheData = await getJson<Record<string, TokenCache>>(TOKEN_CACHE_KEY).catch(() => ({}));
    cacheData[cacheKey] = {
      token: data.access_token,
      expiresAt,
    };
    await putJson(TOKEN_CACHE_KEY, cacheData);
    console.log(`✅ Auth0 token cached in S3 (expires in ${Math.round(expiresIn / 60)} minutes)`);
  } catch (error) {
    console.warn("Failed to cache token in S3:", error);
    // Continue anyway - we have the token
  }

  return data.access_token;
}
