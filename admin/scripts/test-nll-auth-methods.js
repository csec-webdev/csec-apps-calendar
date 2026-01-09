#!/usr/bin/env node

/**
 * Test different authentication methods for Champion Data NLL API
 */

const API_BASE_URL = "https://api.nll.championdata.io";
const CLIENT_ID = "rkMUPT1xOqO5tYR44xW4b2Ibtw7tli05";
const CLIENT_SECRET = "nn3U2-MeJ28Xi-AbA8kO8Bn_GteFh83WSDznku7Nm1_vaxlDJcblnCjeQaq8tKO_";

/**
 * Method 1: OAuth2 with /connect/token
 */
async function testOAuth2ConnectToken() {
  console.log("\n1️⃣ Testing OAuth2 with /connect/token...");
  
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const response = await fetch(`${API_BASE_URL}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  console.log(`   Status: ${response.status} ${response.statusText}`);
  const text = await response.text();
  console.log(`   Response: ${text.substring(0, 200)}`);
  return response.ok;
}

/**
 * Method 2: OAuth2 with /oauth/token
 */
async function testOAuth2OauthToken() {
  console.log("\n2️⃣ Testing OAuth2 with /oauth/token...");
  
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const response = await fetch(`${API_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  console.log(`   Status: ${response.status} ${response.statusText}`);
  const text = await response.text();
  console.log(`   Response: ${text.substring(0, 200)}`);
  return response.ok;
}

/**
 * Method 3: OAuth2 with Basic Auth header
 */
async function testOAuth2WithBasicAuth() {
  console.log("\n3️⃣ Testing OAuth2 with Basic Auth header...");
  
  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const params = new URLSearchParams({
    grant_type: "client_credentials",
  });

  const response = await fetch(`${API_BASE_URL}/connect/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  console.log(`   Status: ${response.status} ${response.statusText}`);
  const text = await response.text();
  console.log(`   Response: ${text.substring(0, 200)}`);
  return response.ok;
}

/**
 * Method 4: Direct API key in header (x-api-key)
 */
async function testApiKeyHeader() {
  console.log("\n4️⃣ Testing x-api-key header...");
  
  const response = await fetch(`${API_BASE_URL}/v1/leagues`, {
    headers: {
      "x-api-key": CLIENT_ID,
    },
  });

  console.log(`   Status: ${response.status} ${response.statusText}`);
  const text = await response.text();
  console.log(`   Response: ${text.substring(0, 200)}`);
  return response.ok;
}

/**
 * Method 5: Bearer token directly (client_id as token)
 */
async function testBearerToken() {
  console.log("\n5️⃣ Testing Bearer token (client_id)...");
  
  const response = await fetch(`${API_BASE_URL}/v1/leagues`, {
    headers: {
      "Authorization": `Bearer ${CLIENT_ID}`,
    },
  });

  console.log(`   Status: ${response.status} ${response.statusText}`);
  const text = await response.text();
  console.log(`   Response: ${text.substring(0, 200)}`);
  return response.ok;
}

/**
 * Method 6: Try /token endpoint
 */
async function testTokenEndpoint() {
  console.log("\n6️⃣ Testing /token endpoint...");
  
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const response = await fetch(`${API_BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  console.log(`   Status: ${response.status} ${response.statusText}`);
  const text = await response.text();
  console.log(`   Response: ${text.substring(0, 200)}`);
  return response.ok;
}

/**
 * Method 7: Query parameters
 */
async function testQueryParams() {
  console.log("\n7️⃣ Testing query parameters...");
  
  const url = `${API_BASE_URL}/v1/leagues?client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}`;
  const response = await fetch(url);

  console.log(`   Status: ${response.status} ${response.statusText}`);
  const text = await response.text();
  console.log(`   Response: ${text.substring(0, 200)}`);
  return response.ok;
}

async function main() {
  console.log("🔍 Testing Champion Data NLL API Authentication Methods");
  console.log("=".repeat(60));
  
  const methods = [
    { name: "OAuth2 /connect/token", fn: testOAuth2ConnectToken },
    { name: "OAuth2 /oauth/token", fn: testOAuth2OauthToken },
    { name: "OAuth2 with Basic Auth", fn: testOAuth2WithBasicAuth },
    { name: "x-api-key header", fn: testApiKeyHeader },
    { name: "Bearer token (client_id)", fn: testBearerToken },
    { name: "/token endpoint", fn: testTokenEndpoint },
    { name: "Query parameters", fn: testQueryParams },
  ];
  
  let successMethod = null;
  
  for (const method of methods) {
    try {
      const success = await method.fn();
      if (success && !successMethod) {
        successMethod = method.name;
        console.log(`   ✅ SUCCESS!`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  if (successMethod) {
    console.log(`\n🎉 Working method found: ${successMethod}`);
  } else {
    console.log("\n❌ No working authentication method found");
    console.log("\nPlease check:");
    console.log("  - Are the credentials correct?");
    console.log("  - Is there a different authentication endpoint?");
    console.log("  - Does the API require additional parameters?");
  }
}

main().catch(console.error);
