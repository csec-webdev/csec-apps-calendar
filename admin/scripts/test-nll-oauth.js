#!/usr/bin/env node

/**
 * Test script for Champion Data NLL API with OAuth2
 * Usage: node test-nll-oauth.js [command]
 * Commands: token, squads, levels, fixtures
 */

const API_BASE_URL = "https://api.nll.championdata.io";
const AUTH_DOMAIN = "https://championdata.au.auth0.com";
const API_AUDIENCE = "https://api.nll.championdata.io/";
const CLIENT_ID = "rkMUPT1xOqO5tYR44xW4b2Ibtw7tli05";
const CLIENT_SECRET = "nn3U2-MeJ28Xi-AbA8kO8Bn_GteFh83WSDznku7Nm1_vaxlDJcblnCjeQaq8tKO_";
const LEAGUE_ID = "1"; // NLL
const LEVEL_ID = "1";
const SEASON_ID = "225"; // 2025-26 season
const CALGARY_TEAM_ID = "524";
const CALGARY_TEAM_CODE = "CGY";

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get OAuth2 access token from Auth0
 */
async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    console.log("Using cached token");
    return cachedToken;
  }

  console.log("Requesting new Auth0 token...");
  const tokenUrl = `${AUTH_DOMAIN}/oauth/token`;
  
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    audience: API_AUDIENCE,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth0 token request failed: ${response.status} ${response.statusText}\n${text}`);
  }

  const data = await response.json();
  console.log("✅ Auth0 token acquired successfully");
  console.log(`   Expires in: ${data.expires_in} seconds`);
  
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; // Refresh 5 min early
  
  return cachedToken;
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint) {
  const token = await getAccessToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`\nGET ${url}`);
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText}\n${text}`);
  }

  return await response.json();
}

/**
 * Get schedule (uses phases > weeks > matches structure)
 */
async function getSchedule() {
  console.log(`\n🏒 Fetching NLL schedule for season ${SEASON_ID}...\n`);
  const schedule = await apiRequest(
    `/v1/leagues/${LEAGUE_ID}/levels/${LEVEL_ID}/seasons/${SEASON_ID}/schedule`
  );
  
  // Extract all matches from phases > weeks > matches
  const allMatches = [];
  if (schedule.phases) {
    schedule.phases.forEach(phase => {
      if (phase.weeks && Array.isArray(phase.weeks)) {
        phase.weeks.forEach(week => {
          if (week.matches && Array.isArray(week.matches)) {
            allMatches.push(...week.matches);
          }
        });
      }
    });
  }
  
  console.log(`Found ${allMatches.length} total matches in schedule\n`);
  
  // Filter for Calgary Roughnecks
  const calgaryGames = allMatches.filter(match => {
    const homeId = match.squads?.home?.id?.toString();
    const awayId = match.squads?.away?.id?.toString();
    const homeCode = match.squads?.home?.code;
    const awayCode = match.squads?.away?.code;
    
    return homeId === CALGARY_TEAM_ID || awayId === CALGARY_TEAM_ID ||
           homeCode === CALGARY_TEAM_CODE || awayCode === CALGARY_TEAM_CODE;
  });
  
  console.log(`📍 Calgary Roughnecks games: ${calgaryGames.length}\n`);
  
  calgaryGames.slice(0, 10).forEach(match => {
    const homeSquad = match.squads?.home;
    const awaySquad = match.squads?.away;
    const date = match.date?.utcMatchStart 
      ? new Date(match.date.utcMatchStart).toLocaleDateString() 
      : match.date?.startDate || 'TBD';
    const homeScore = homeSquad?.score?.goals ?? homeSquad?.score?.score ?? '-';
    const awayScore = awaySquad?.score?.goals ?? awaySquad?.score?.score ?? '-';
    const status = match.status?.name || 'Scheduled';
    
    console.log(`${date}: ${awaySquad?.displayName || 'TBD'} @ ${homeSquad?.displayName || 'TBD'}`);
    console.log(`   Score: ${awayScore}-${homeScore} [${status}]`);
  });
  
  if (calgaryGames.length > 10) {
    console.log(`\n... and ${calgaryGames.length - 10} more Calgary games`);
  }
  
  return { schedule, calgaryGames };
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2] || 'squads';
  
  try {
    switch (command) {
      case 'token':
        await getAccessToken();
        console.log("\n✅ Auth0 token test successful");
        break;
        
      case 'schedule':
        await getSchedule();
        break;
        
      default:
        console.log("Unknown command:", command);
        console.log("\nAvailable commands:");
        console.log("  token    - Test Auth0 token acquisition");
        console.log("  schedule - Get full NLL schedule (Calgary Roughnecks games)");
        console.log("\nExample:");
        console.log("  node test-nll-oauth.js schedule");
        process.exit(1);
    }
    
    console.log("\n✅ Done!");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.cause) {
      console.error("Cause:", error.cause);
    }
    process.exit(1);
  }
}

main();
