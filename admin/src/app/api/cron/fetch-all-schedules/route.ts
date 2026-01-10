import { NextResponse } from "next/server";
import { TEAMS } from "@/lib/schemas";
import { putJson, getJson } from "@/lib/s3";
import { invalidateCache } from "@/lib/cloudfront";
import { getChampionDataAccessToken } from "@/lib/championDataAuth";

/**
 * Automated schedule fetcher - runs hourly via cron
 * Fetches latest schedules for all teams to update scores and game results
 * 
 * Trigger methods:
 * 1. Vercel Cron (add to vercel.json)
 * 2. AWS EventBridge Rule hitting API endpoint
 * 3. Manual trigger with API key
 */

// Configuration
const TEAMS_TO_FETCH = ["flames", "hitmen", "wranglers", "roughnecks"] as const;

// Import fetch functions from team fetch-schedule route
async function fetchTeamSchedule(teamKey: string) {
  const team = TEAMS.find((t) => t.key === teamKey);
  if (!team) {
    throw new Error(`Invalid team: ${teamKey}`);
  }

  console.log(`[${teamKey}] Starting schedule fetch...`);
  const startTime = Date.now();

  try {
    // Load team configuration
    const configKey = `public/data/${teamKey}/team-config.json`;
    const teamConfig = await getJson<any>(configKey);

    let scheduleData: any = {};
    let gamesCount = 0;

    if (team.league === "nhl") {
      // Fetch NHL schedule (Flames)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      let seasonStartYear;
      if (currentMonth >= 6 && currentMonth <= 8) {
        seasonStartYear = currentYear;
      } else if (currentMonth >= 9) {
        seasonStartYear = currentYear;
      } else {
        seasonStartYear = currentYear - 1;
      }
      
      const seasonId = `${seasonStartYear}${seasonStartYear + 1}`;
      
      const response = await fetch(
        `https://api-web.nhle.com/v1/club-schedule-season/CGY/${seasonId}`,
      );
      
      if (response.ok) {
        const nhlData = await response.json();
        scheduleData = processNHLSchedule(nhlData);
        gamesCount = Object.keys(scheduleData).length;
      } else {
        throw new Error(`NHL API returned ${response.status}`);
      }
      
    } else if ((team.league === "whl" || team.league === "ahl") && teamConfig?.hockeyTech) {
      // Fetch HockeyTech schedule (Hitmen, Wranglers)
      const { clientCode, apiKey, teamId } = teamConfig.hockeyTech;
      
      if (!clientCode || !apiKey || !teamId) {
        throw new Error("Missing HockeyTech configuration");
      }

      // Fetch seasons list
      const seasonsUrl = `https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=seasons&client_code=${clientCode}&key=${apiKey}`;
      const seasonsResponse = await fetch(seasonsUrl);
      
      if (!seasonsResponse.ok) {
        throw new Error("Failed to fetch seasons list");
      }

      const seasonsData = await seasonsResponse.json();
      const activeSeasonIds = getActiveSeasonIds(seasonsData.SiteKit.Seasons);
      
      // Fetch schedule for each active season
      for (const seasonId of activeSeasonIds) {
        const scheduleUrl = `https://lscluster.hockeytech.com/feed/index.php?feed=statviewfeed&view=schedule&team=${teamId}&season=${seasonId}&month=-1&key=${apiKey}&client_code=${clientCode}`;
        const response = await fetch(scheduleUrl);
        
        if (response.ok) {
          let text = await response.text();
          if (text.startsWith("(") && text.endsWith(")")) {
            text = text.substring(1, text.length - 1);
          }
          const seasonData = JSON.parse(text);
          const seasonGames = processHockeyTechSchedule(seasonData, team.league);
          Object.assign(scheduleData, seasonGames);
        }
      }
      
      gamesCount = Object.keys(scheduleData).length;
      
    } else if (team.league === "nll" && teamConfig?.championData) {
      // Fetch NLL schedule (Roughnecks)
      const { 
        apiBaseUrl, 
        authDomain, 
        audience, 
        clientId, 
        clientSecret, 
        leagueId, 
        levelId, 
        seasonId,
        teamId,
        teamCode
      } = teamConfig.championData;
      
      if (!apiBaseUrl || !authDomain || !audience || !clientId || !clientSecret) {
        throw new Error("Missing Champion Data configuration");
      }

      // Get OAuth2 token (uses S3-backed cache to minimize token requests)
      const accessToken = await getChampionDataAccessToken(authDomain, audience, clientId, clientSecret);

      // Fetch schedule
      const scheduleUrl = `${apiBaseUrl}/v1/leagues/${leagueId}/levels/${levelId}/seasons/${seasonId}/schedule`;
      const scheduleResponse = await fetch(scheduleUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!scheduleResponse.ok) {
        throw new Error(`NLL API returned ${scheduleResponse.status}`);
      }

      const nllData = await scheduleResponse.json();
      scheduleData = processNLLSchedule(nllData, teamId, teamCode);
      gamesCount = Object.keys(scheduleData).length;
    }

    // Save to S3
    const key = `public/data/${teamKey}/schedule.json`;
    await putJson(key, scheduleData);

    // Invalidate CloudFront cache
    await invalidateCache([`/data/${teamKey}/schedule.json`]);

    const duration = Date.now() - startTime;
    console.log(`[${teamKey}] ✅ Success: ${gamesCount} games (${duration}ms)`);

    return { teamKey, success: true, gamesCount, duration };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${teamKey}] ❌ Error:`, error.message);
    return { teamKey, success: false, error: error.message, duration };
  }
}

// Helper functions (simplified versions from fetch-schedule route)
function processNHLSchedule(apiData: any): Record<string, any> {
  const games: Record<string, any> = {};
  if (!apiData?.games) return games;

  apiData.games.forEach((game: any) => {
    const [year, month, day] = game.gameDate.split("-");
    const gameDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dateKey = formatDateKey(gameDate);

    const isHome = game.homeTeam.abbrev === "CGY";
    const opponent = isHome ? game.awayTeam : game.homeTeam;

    let gameTime = null;
    if (game.gameState === "FUT" || game.gameState === "PRE" || game.gameState === "LIVE") {
      const startTime = new Date(game.startTimeUTC);
      gameTime = formatTimeMT(startTime);
    }

    let result = null;
    let flamesScore = null;
    let opponentScore = null;
    let periodType = null;

    if (game.gameState === "FINAL" || game.gameState === "OFF") {
      flamesScore = isHome ? game.homeTeam.score : game.awayTeam.score;
      opponentScore = isHome ? game.awayTeam.score : game.homeTeam.score;
      const won = flamesScore > opponentScore;
      periodType = game.periodDescriptor?.periodType || null;

      if (won) {
        result = `W ${flamesScore}-${opponentScore}`;
      } else {
        if (periodType === "OT") {
          result = `OTL ${flamesScore}-${opponentScore}`;
        } else if (periodType === "SO") {
          result = `SOL ${flamesScore}-${opponentScore}`;
        } else {
          result = `L ${flamesScore}-${opponentScore}`;
        }
      }
    }

    games[dateKey] = {
      id: game.id,
      date: gameDate.toISOString(),
      isHome,
      opponent: {
        abbrev: opponent.abbrev,
        name: opponent.commonName.default,
        logo: opponent.logo,
        darkLogo: opponent.darkLogo,
      },
      gameState: game.gameState,
      time: gameTime,
      result: result,
      flamesScore: flamesScore,
      opponentScore: opponentScore,
      periodType: periodType,
      tvNetworks: "",
      tvBroadcasts: game.tvBroadcasts || [],
      venue: game.venue.default,
      ticketsLink: isHome ? (game.ticketsLink || null) : null,
    };
  });

  return games;
}

function processHockeyTechSchedule(apiData: any, league: string): Record<string, any> {
  const games: Record<string, any> = {};
  if (!apiData?.[0]?.sections?.[0]) return games;

  const gamesData = apiData[0].sections[0].data;
  const teamCity = "Calgary";

  gamesData.forEach((gameItem: any) => {
    const row = gameItem.row;
    const prop = gameItem.prop;

    const dateStr = row.date_with_day;
    const gameDate = parseWHLDate(dateStr);
    if (!gameDate) return;

    const dateKey = formatDateKey(gameDate);
    const isHome = row.home_team_city === teamCity;
    const opponentCity = isHome ? row.visiting_team_city : row.home_team_city;
    const opponentTeamId = isHome ? prop.visiting_team_city.teamLink : prop.home_team_city.teamLink;

    const homeScore = row.home_goal_count !== "-" ? parseInt(row.home_goal_count) : null;
    const visitingScore = row.visiting_goal_count !== "-" ? parseInt(row.visiting_goal_count) : null;
    const teamScore = isHome ? homeScore : visitingScore;
    const opponentScore = isHome ? visitingScore : homeScore;

    let gameState = "FUT";
    let result = null;
    let gameTime = null;
    let periodType = null;

    if (row.game_status && row.game_status.includes("Final")) {
      gameState = "FINAL";
      
      if (row.game_status.includes("OT")) {
        periodType = "OT";
      } else if (row.game_status.includes("SO") || row.game_status.includes("S/O")) {
        periodType = "SO";
      }
      
      if (teamScore !== null && opponentScore !== null) {
        const won = teamScore > opponentScore;
        if (won) {
          result = `W ${teamScore}-${opponentScore}`;
        } else {
          if (periodType === "OT") {
            result = `OTL ${teamScore}-${opponentScore}`;
          } else if (periodType === "SO") {
            result = `SOL ${teamScore}-${opponentScore}`;
          } else {
            result = `L ${teamScore}-${opponentScore}`;
          }
        }
      }
    } else {
      gameState = "FUT";
      gameTime = row.game_status;
    }

    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd37ygqmmhd03wh.cloudfront.net';
    const leagueFolder = league.toLowerCase();
    const opponentLogo = `https://${cloudfrontDomain}/assets/opponents/${leagueFolder}/${opponentTeamId}.png`;

    games[dateKey] = {
      id: row.game_id,
      date: gameDate.toISOString(),
      isHome,
      opponent: {
        abbrev: opponentCity.substring(0, 3).toUpperCase(),
        name: opponentCity,
        logo: opponentLogo,
        darkLogo: opponentLogo,
      },
      gameState: gameState,
      time: gameTime,
      result: result,
      flamesScore: teamScore,
      opponentScore: opponentScore,
      periodType: periodType,
      tvNetworks: "",
      tvBroadcasts: [],
      venue: row.venue_name,
      ticketsLink: prop.tickets_url?.ticketsUrl || null,
    };
  });

  return games;
}

function processNLLSchedule(apiData: any, calgaryTeamId: string, calgaryTeamCode: string): Record<string, any> {
  const games: Record<string, any> = {};
  if (!apiData?.phases) return games;

  const allMatches: any[] = [];
  apiData.phases.forEach((phase: any) => {
    if (phase.weeks && Array.isArray(phase.weeks)) {
      phase.weeks.forEach((week: any) => {
        if (week.matches && Array.isArray(week.matches)) {
          allMatches.push(...week.matches);
        }
      });
    }
  });

  allMatches.forEach((match: any) => {
    if (!match) return;

    const homeSquad = match.squads?.home;
    const awaySquad = match.squads?.away;
    if (!homeSquad || !awaySquad) return;

    const homeTeamId = homeSquad.id?.toString();
    const awayTeamId = awaySquad.id?.toString();
    const homeTeamCode = homeSquad.code;
    const awayTeamCode = awaySquad.code;

    const isCalgaryHome = homeTeamId === calgaryTeamId || homeTeamCode === calgaryTeamCode;
    const isCalgaryAway = awayTeamId === calgaryTeamId || awayTeamCode === calgaryTeamCode;
    if (!isCalgaryHome && !isCalgaryAway) return;

    const isHome = isCalgaryHome;
    const opponentSquad = isHome ? awaySquad : homeSquad;

    let gameDate: Date;
    if (match.date?.utcMatchStart) {
      gameDate = new Date(match.date.utcMatchStart);
    } else if (match.date?.startDate && match.date?.startTime) {
      gameDate = new Date(`${match.date.startDate}T${match.date.startTime}`);
    } else {
      return;
    }

    if (isNaN(gameDate.getTime())) return;

    const dateKey = formatDateKey(gameDate);

    const statusCode = match.status?.code || '';
    const statusName = match.status?.name || '';
    const isCompleted = statusCode === 'COMP' || statusName === 'Complete' || statusName === 'Final';

    let gameState = "FUT";
    let result = null;
    let roughnecksScore = null;
    let opponentScore = null;
    let gameTime = null;
    let periodType = null;

    if (isCompleted) {
      gameState = "FINAL";
      const homeScore = homeSquad.score?.goals ?? homeSquad.score?.score ?? null;
      const awayScore = awaySquad.score?.goals ?? awaySquad.score?.score ?? null;

      roughnecksScore = isHome ? homeScore : awayScore;
      opponentScore = isHome ? awayScore : homeScore;

      if (roughnecksScore !== null && opponentScore !== null) {
        const won = roughnecksScore > opponentScore;
        if (match.status?.period > 4) {
          periodType = "OT";
        }
        
        result = won 
          ? `W ${roughnecksScore}-${opponentScore}` 
          : `L ${roughnecksScore}-${opponentScore}`;
      }
    } else {
      gameState = "FUT";
      gameTime = formatTimeMT(gameDate);
    }

    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd37ygqmmhd03wh.cloudfront.net';
    const opponentCode = opponentSquad.code || opponentSquad.id;
    const opponentLogo = `https://${cloudfrontDomain}/assets/opponents/nll/${opponentCode}.png`;

    const gameId = match.id || null;
    const venue = match.venue?.name || (isHome ? "Scotiabank Saddledome" : "TBD");

    games[dateKey] = {
      id: gameId,
      date: gameDate.toISOString(),
      isHome,
      opponent: {
        abbrev: opponentSquad.code || opponentSquad.id?.toString() || "OPP",
        name: opponentSquad.displayName || `${opponentSquad.name || ''} ${opponentSquad.nickname || ''}`.trim() || "Unknown",
        logo: opponentLogo,
        darkLogo: opponentLogo,
      },
      gameState: gameState,
      time: gameTime,
      result: result,
      flamesScore: roughnecksScore,
      opponentScore: opponentScore,
      periodType: periodType,
      tvNetworks: "",
      tvBroadcasts: [],
      venue: venue,
      ticketsLink: isHome && gameId ? `https://www.ticketmaster.ca/calgary-roughnecks-tickets/artist/806208` : null,
    };
  });

  return games;
}

function getActiveSeasonIds(seasons: any[]): string[] {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  const fourMonthsAhead = new Date(now);
  fourMonthsAhead.setMonth(now.getMonth() + 4);
  
  const activeSeasons = seasons.filter(season => {
    if (season.career === "0") return false;
    const startDate = new Date(season.start_date);
    const endDate = new Date(season.end_date);
    return endDate >= sixMonthsAgo && startDate <= fourMonthsAhead;
  });
  
  return activeSeasons.map(s => s.season_id);
}

function parseWHLDate(dateStr: string): Date | null {
  try {
    const parts = dateStr.split(", ")[1].split(" ");
    const monthStr = parts[0];
    const day = parseInt(parts[1]);

    const monthMap: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };

    const month = monthMap[monthStr];
    if (month === undefined) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let seasonStartYear;
    if (currentMonth >= 8) {
      seasonStartYear = currentYear;
    } else if (currentMonth <= 3) {
      seasonStartYear = currentYear - 1;
    } else {
      seasonStartYear = currentYear;
    }
    
    const year = month >= 8 ? seasonStartYear : seasonStartYear + 1;
    return new Date(year, month, day);
  } catch (error) {
    return null;
  }
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeMT(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " MT";
}

// Main cron handler
export async function GET(req: Request) {
  // Verify cron authorization
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow requests from Vercel Cron (automatic auth) or with valid secret
  const isVercelCron = req.headers.get("user-agent")?.includes("vercel-cron");
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;
  
  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  console.log("🔄 Starting automated schedule fetch...");
  const startTime = Date.now();

  const results = await Promise.all(
    TEAMS_TO_FETCH.map(teamKey => fetchTeamSchedule(teamKey))
  );

  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Completed: ${successful} successful, ${failed} failed (${totalDuration}ms)`);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    totalDuration,
    summary: { successful, failed, total: results.length },
    results,
  });
}
